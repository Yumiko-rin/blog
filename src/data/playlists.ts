import type { Playlist, Song } from '@/types'
import { FALLBACK_PLAYLISTS } from './livePlaylist'

/**
 * 歌单数据源（多歌单）
 * --------------------------------------------------
 * 音乐 API 使用自建 Meting-API 转发（http://47.104.189.4/music/，CORS 全开放）：
 *   GET /music/?type=playlist&id=<网易云歌单ID>
 * 返回标准 Meting 结构 [{ name, artist, url, pic, lrc }]：
 *   - url  → 播放地址（Meting 转发，302 到带签名网易云 mp3）
 *   - pic  → 封面
 *   - lrc  → 歌词源（返回标准 LRC 文本，运行时按 lrcUrl 拉取）
 *
 * 地址统一为同源相对路径 /music/...（浏览器端无跨域、无 mixed-content 问题）：
 *   - 本地开发：vite server.proxy /music → 47.104.189.4
 *   - 本地预览：preview-server.cjs /music 代理
 *   - Cloudflare Pages：functions/music/[[path]].ts 代理（服务端跟随 302 回传字节）
 */

/** 精选日漫歌单列表（多个歌单，并行加载） */
const PLAYLIST_SOURCES = [
  { id: 'netease-9564103735', apiId: 9564103735, name: '二次元日漫精选 · 2024新番OP/ED' },
  { id: 'netease-8832161095', apiId: 8832161095, name: '二次元日漫精选 · 2023新番OP/ED' },
  { id: 'netease-7747893098', apiId: 7747893098, name: '经典日漫金曲 · 评论过万' },
]

const CACHE_DURATION = 5 * 60 * 1000 // 5 分钟
let cachedPlaylists: Playlist[] | null = null
let cacheTime = 0

/** Meting 返回的绝对地址 → 同源相对路径（避免 https 页面 mixed-content） */
function toSameOrigin(u: string): string {
  return String(u || '').replace(/^https?:\/\/47\.104\.189\.4\/music/, '/music')
}

/** 从 Meting 播放地址中提取网易云歌曲 ID */
function extractNeteaseId(raw: Record<string, any>, url: string): number | undefined {
  const m = url.match(/[?&]id=(\d+)/)
  if (m) return Number(m[1])
  const n = Number(raw.id)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/** 把线上接口返回的一行数据映射为本地 Song（Meting: name/artist/url/pic/lrc） */
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

/** 把单个线上歌单映射为一个 Playlist */
function toPlaylist(raw: Record<string, any>[], source: { id: string; name: string }): Playlist {
  const songs = raw.map(mapSong)
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
 * 并行加载所有歌单：优先线上接口（返回完整歌曲列表），单个失败不影响其它；
 * 全部失败则回退到内嵌多歌单兜底。
 */
export async function loadPlaylists(): Promise<Playlist[]> {
  if (cachedPlaylists && Date.now() - cacheTime < CACHE_DURATION) {
    return cachedPlaylists
  }
  try {
    const results = await Promise.all(
      PLAYLIST_SOURCES.map(async (src) => {
        const res = await fetch(`/music/?type=playlist&id=${src.apiId}`)
        if (!res.ok) throw new Error(`bad status ${res.status}`)
        const raw = await res.json()
        const list = Array.isArray(raw) ? raw : []
        if (list.length === 0) throw new Error('empty')
        return toPlaylist(list, src)
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
