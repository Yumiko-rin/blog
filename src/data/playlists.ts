import type { Playlist, Song } from '@/types'
import { LIVE_PLAYLIST } from './livePlaylist'

/**
 * 歌单数据源
 * --------------------------------------------------
 * 音乐 API 使用自建 Meting-API 转发（http://47.104.189.4/music/，CORS 全开放）：
 *   GET /music/?type=playlist&id=8832161095（二次元日漫金曲 · 2023 新番 OPED）
 * 返回标准 Meting 结构 [{ name, artist, url, pic, lrc }]：
 *   - url  → 播放地址（Meting 转发，302 到带签名网易云 mp3）
 *   - pic  → 封面
 *   - lrc  → 歌词源（返回标准 LRC 文本）
 *
 * 地址统一为同源相对路径 /music/...（浏览器端无跨域、无 mixed-content 问题）：
 *   - 本地开发：vite server.proxy /music → 47.104.189.4
 *   - 本地预览：preview-server.cjs /music 代理
 *   - Cloudflare Pages：functions/music/[[path]].ts 代理
 */

const LIVE_API = '/music/?type=playlist&id=9564103735'

const CACHE_DURATION = 5 * 60 * 1000 // 5 分钟
let cachedPlaylists: Playlist[] | null = null
let cacheTime = 0

/** 从 Meting 播放地址中提取网易云歌曲 ID（用于匹配内嵌歌词） */
function extractNeteaseId(raw: Record<string, any>, url: string): number | undefined {
  const m = url.match(/[?&]id=(\d+)/)
  if (m) return Number(m[1])
  const n = Number(raw.id)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/** Meting 返回的绝对地址 → 同源相对路径（避免 https 页面 mixed-content） */
function toSameOrigin(u: string): string {
  const s = String(u || '')
  return s.replace(/^https?:\/\/47\.104\.189\.4\/music/, '/music')
}

/** 把线上接口返回的一行数据映射为本地 Song（Meting: name/artist/url/pic/lrc） */
function mapSong(raw: Record<string, any>): Song {
  const url = toSameOrigin(raw.url || '')
  const neteaseId = extractNeteaseId(raw, url)
  const embedded = neteaseId ? LIVE_PLAYLIST.songs.find((s) => s.neteaseId === neteaseId) : undefined
  return {
    id: neteaseId ? `netease-${neteaseId}` : url,
    name: String(raw.name || raw.title || '未知歌曲'),
    artist: String(raw.artist || raw.author || '未知歌手'),
    album: embedded?.album || '',
    cover: toSameOrigin(raw.pic || '') || embedded?.cover || '',
    src: url || embedded?.src || '',
    duration: 0,
    neteaseId,
    lrcUrl: toSameOrigin(raw.lrc || '') || embedded?.lrcUrl || '',
    lyric: embedded?.lyric || [],
  }
}

/** 把线上接口返回的整体映射为一个歌单 */
function toPlaylist(raw: Record<string, any>[]): Playlist {
  const songs = raw.map(mapSong)
  return {
    id: 'live-anime',
    name: '二次元日漫精选',
    cover: songs[0]?.cover || '',
    description: '二次元日漫歌曲精选（网易云歌单 9564103735）',
    songs,
  }
}

/** 已内嵌的兜底歌单（与 boke.hiromu.top 一致，含逐字歌词） */
export const PLAYLISTS: Playlist[] = [LIVE_PLAYLIST]

/** 扁平化所有歌曲 */
export const ALL_SONGS: Song[] = LIVE_PLAYLIST.songs

/**
 * 返回歌单：优先线上接口，失败回退内嵌。
 */
export async function loadPlaylists(): Promise<Playlist[]> {
  if (cachedPlaylists && Date.now() - cacheTime < CACHE_DURATION) {
    return cachedPlaylists
  }
  try {
    const res = await fetch(LIVE_API)
    if (!res.ok) throw new Error(`bad status ${res.status}`)
    const raw = await res.json()
    const list = Array.isArray(raw) ? raw : []
    if (list.length === 0) throw new Error('empty')
    const pls = [toPlaylist(list)]
    cachedPlaylists = pls
    cacheTime = Date.now()
    return pls
  } catch {
    // 网络失败 / 接口异常 → 使用内嵌歌单
    return [LIVE_PLAYLIST]
  }
}

/** 本地兜底歌单（当真实歌单缺失时使用） */
export const LOCAL_PLAYLISTS: Playlist[] = [LIVE_PLAYLIST]
