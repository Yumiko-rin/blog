/**
 * 网易云音乐 API 服务
 * 使用网易云官方 API 获取歌单和歌曲
 */

const BASE_URL = 'https://music.163.com/api'

/** 网易云歌单 ID */
export const NETEASE_PLAYLIST_IDS = [
  2829883282,  // 华语私人雷达
  3778678,     // 华语经典老歌
  24381616,    // 华语私人订制
  19723756,    // 华语流行
  1177761133,  // 动漫音乐
  5279621502,  // 日语经典
]

/** 网易云 API 返回的歌曲类型 */
interface NeteaseTrack {
  id: number
  name: string
  artists: Array<{ name: string; id: number }>
  album: {
    name: string
    picUrl: string
    id: number
  }
  duration: number
}

/** 转换为我们的歌曲类型 */
function transformTrack(track: NeteaseTrack) {
  return {
    id: `netease-${track.id}`,
    name: track.name,
    artist: track.artists.map(a => a.name).join(' / '),
    album: track.album.name,
    cover: track.album.picUrl || '/bg/42.webp',
    src: '', // 需要单独获取播放 URL
    duration: Math.floor(track.duration / 1000),
    neteaseId: track.id,
    lyric: [],
  }
}

/** 获取歌单详情 */
export async function fetchPlaylist(playlistId: number) {
  try {
    const response = await fetch(`${BASE_URL}/playlist/detail?id=${playlistId}`)
    const data = await response.json()
    if (data.code === 200 && data.result) {
      return {
        id: `netease-pl-${playlistId}`,
        name: data.result.name,
        cover: data.result.coverImgUrl,
        description: data.result.description || '',
        songs: (data.result.tracks || []).slice(0, 20).map(transformTrack),
      }
    }
  } catch (err) {
    console.error('Failed to fetch playlist:', err)
  }
  return null
}

/** 获取歌曲播放 URL */
export async function fetchSongUrl(songId: number): Promise<string> {
  try {
    const response = await fetch(`${BASE_URL}/song/enhance/player/url?id=${songId}&ids=[${songId}]&br=320000`)
    const data = await response.json()
    if (data.code === 200 && data.data && data.data[0]) {
      return data.data[0].url || ''
    }
  } catch (err) {
    console.error('Failed to fetch song URL:', err)
  }
  return ''
}

/** 批量获取歌曲 URL */
export async function fetchSongUrls(songIds: number[]): Promise<Record<number, string>> {
  const result: Record<number, string> = {}
  try {
    const idsStr = songIds.join(',')
    const response = await fetch(`${BASE_URL}/song/enhance/player/url?ids=[${idsStr}]&br=320000`)
    const data = await response.json()
    if (data.code === 200 && data.data) {
      data.data.forEach((item: { id: number; url: string }) => {
        if (item.url) {
          result[item.id] = item.url
        }
      })
    }
  } catch (err) {
    console.error('Failed to fetch song URLs:', err)
  }
  return result
}
