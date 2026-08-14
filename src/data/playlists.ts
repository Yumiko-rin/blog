import type { Playlist, Song } from '@/types'
import { FALLBACK_PLAYLISTS } from './livePlaylist'

/**
 * 歌单数据源（多歌单）
 * --------------------------------------------------
 * 音乐 API 使用 NaiHe Meting 公共实例（meting.naihee.com/api，HTTPS + CORS）：
 *   GET /music/?type=playlist&id=<网易云歌单ID>
 * 返回标准 Meting 结构 [{ title, author, url, pic, lrc }]：
 *   - url  → 播放地址（直接返回音频流，无需跟随 302）
 *   - pic  → 封面
 *   - lrc  → 歌词源（返回标准 LRC 文本，运行时按 lrcUrl 拉取）
 *
 * 地址统一为同源相对路径 /local-api/music-stream?...（浏览器端无跨域、无 mixed-content 问题）：
 *   - 本地开发：vite server.proxy /music → meting.naihee.com/api
 *   - Cloudflare Pages：functions/music/[[path]].ts 代理（服务端转发回传字节）
 */

/**
 * 精选日漫歌单列表（多个歌单，并行加载）
 * 上游 API：meting.naihee.com/api（NaiHe 公共 Meting 实例）
 */
const PLAYLIST_SOURCES = [
  { id: 'netease-9564103735', apiId: 9564103735, name: '二次元日漫精选 · 2024新番OP/ED' },
  { id: 'netease-8832161095', apiId: 8832161095, name: '二次元日漫精选 · 2023新番OP/ED' },
  { id: 'netease-7747893098', apiId: 7747893098, name: '经典日漫金曲 · 评论过万' },
  { id: 'netease-440999611', apiId: 440999611, name: '那些好听的日漫主题曲' },
  { id: 'netease-2733943066', apiId: 2733943066, name: '日系高燃动漫神曲' },
  { id: 'netease-2394764121', apiId: 2394764121, name: '宫崎骏 & 久石让' },
]

const CACHE_DURATION = 5 * 60 * 1000 // 5 分钟
let cachedPlaylists: Playlist[] | null = null
let cacheTime = 0

/** Meting 返回的绝对地址 → 同源代理路径（避免 302 跨域重定向导致音频/图片加载失败） */
function toSameOrigin(u: string): string {
  let url = String(u || '')
  if (!url) return ''

  // 匹配各种 Meting API 域名 + 任意参数顺序
  const metingPatterns = [
    /^https?:\/\/meting\.naihee\.com\/api\?/,
    /^https?:\/\/api\.injahow\.cn\/meting\/\?/,
    /^https?:\/\/47\.104\.189\.4\/music\/\?/,
    /^\/music\/\?/,
    /^\/local-api\/music-stream\?/,
  ]

  for (const pattern of metingPatterns) {
    if (pattern.test(url)) {
      const typeMatch = url.match(/[?&]type=([^&]+)/)
      const idMatch = url.match(/[?&]id=([^&]+)/)
      const type = typeMatch ? typeMatch[1] : 'url'
      const id = idMatch ? idMatch[1] : ''
      // 图片、音频和歌词统一走 /local-api/music-stream（服务端代理跟随 302 并加 Referer 头）
      return `/local-api/music-stream?type=${type}&id=${id}`
    }
  }

  // 网易云 CDN 图片直接升级 https
  if (/^http:\/\/p\d*\.music\.126\.net\//.test(url)) {
    return 'https://' + url.slice(7)
  }

  // 非 Meting URL：升级 http → https 避免 mixed-content
  if (url.startsWith('http://')) {
    url = 'https://' + url.slice(7)
  }

  return url
}

/** 从 Meting 播放地址中提取网易云歌曲 ID */
function extractNeteaseId(raw: Record<string, any>, url: string): number | undefined {
  const m = url.match(/[?&]id=(\d+)/)
  if (m) return Number(m[1])
  const n = Number(raw.id)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/** 把线上接口返回的一行数据映射为本地 Song（兼容 injahow 的 name/artist 和 NaiHe 的 title/author） */
function mapSong(raw: Record<string, any>): Song {
  const url = toSameOrigin(raw.url || '')
  const neteaseId = extractNeteaseId(raw, url)
  return {
    id: neteaseId ? `netease-${neteaseId}` : url,
    name: String(raw.name || raw.title || '未知歌曲'),
    artist: String(raw.artist || raw.author || '未知歌手'),
    album: '',
    cover: toSameOrigin(raw.pic || ''),
    src: url,
    duration: 0,
    neteaseId,
    // 歌词由运行时按 lrcUrl 拉取，兜底的 FALLBACK_PLAYLISTS 同样带 lrcUrl
    lrcUrl: toSameOrigin(raw.lrc || ''),
    lyric: [],
  }
}

/** 每个歌单在列表中展示的歌曲上限（避免列表过长） */
export const PLAYLIST_SONG_LIMIT = 10

/** 把单个线上歌单映射为一个 Playlist（歌曲数限制为 PLAYLIST_SONG_LIMIT） */
function toPlaylist(raw: Record<string, any>[], source: { id: string; name: string }): Playlist {
  const songs = raw.slice(0, PLAYLIST_SONG_LIMIT).map(mapSong)
  return {
    id: source.id,
    name: source.name,
    cover: songs[0]?.cover || '',
    description: '二次元日漫歌曲精选（网易云歌单）',
    songs,
  }
}

/** 多歌单兜底（与线上一致，含多个歌单与大量歌曲，离线也可用） */
export const PLAYLISTS: Playlist[] = FALLBACK_PLAYLISTS

/** 扁平化所有歌曲（用于播放模式兜底） */
export const ALL_SONGS: Song[] = FALLBACK_PLAYLISTS.flatMap((p) => p.songs)

/**
 * 并行加载所有歌单：优先线上接口（每个歌单取 PLAYLIST_SONG_LIMIT 首，跨歌单去重），
 * 单个失败不影响其它；全部失败则回退到内嵌多歌单兜底。
 */
export async function loadPlaylists(): Promise<Playlist[]> {
  if (cachedPlaylists && Date.now() - cacheTime < CACHE_DURATION) {
    return cachedPlaylists
  }
  try {
    // 跨歌单去重：同一首歌（neteaseId）只保留在第一个出现的歌单中
    const seen = new Set<number>()
    const results = await Promise.all(
      PLAYLIST_SOURCES.map(async (src) => {
        const res = await fetch(`/music?server=netease&type=playlist&id=${src.apiId}`)
        if (!res.ok) throw new Error(`bad status ${res.status}`)
        const raw = await res.json()
        const list = Array.isArray(raw) ? raw : []
        const picked: Record<string, any>[] = []
        for (const row of list) {
          if (picked.length >= PLAYLIST_SONG_LIMIT) break
          const url = toSameOrigin(row.url || '')
          const nid = extractNeteaseId(row, url)
          if (nid !== undefined && seen.has(nid)) continue
          if (nid !== undefined) seen.add(nid)
          picked.push(row)
        }
        if (picked.length === 0) throw new Error('empty')
        return toPlaylist(picked, src)
      })
    )
    if (results.length === 0) throw new Error('none')
    cachedPlaylists = results
    cacheTime = Date.now()
    return results
  } catch {
    // 网络失败 / 接口异常 → 使用内嵌多歌单兜底
    return FALLBACK_PLAYLISTS
  }
}
