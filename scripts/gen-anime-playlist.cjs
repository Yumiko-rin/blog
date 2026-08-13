// 一次性脚本：从自建 Meting-API 拉取日漫歌单 7747893098 的前 9 首（含逐字歌词），
// 生成 src/data/livePlaylist.ts 内嵌兜底歌单（替换旧中文歌单）。
const fs = require('fs')
const path = require('path')

const API = 'http://47.104.189.4/music/'
const PLAYLIST_ID = 9564103735
const COUNT = 9
const OUT = path.resolve(__dirname, '..', 'src', 'data', 'livePlaylist.ts')

function get(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? require('https') : require('http')
    mod.get(url, { timeout: 15000 }, (res) => {
      let s = ''
      res.on('data', (d) => (s += d))
      res.on('end', () => resolve(s))
    }).on('error', reject).on('timeout', () => reject(new Error('timeout ' + url)))
  })
}

/** LRC 文本 → [[毫秒, 歌词], ...] */
function parseLrc(text) {
  const lines = String(text || '').split('\n')
  const out = []
  const re = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]\s*(.*)/
  for (const line of lines) {
    const m = line.match(re)
    if (!m) continue
    const min = Number(m[1])
    const sec = Number(m[2])
    const frac = Number((m[3] || '0').padEnd(3, '0'))
    const ms = min * 60000 + sec * 1000 + frac
    const text = (m[4] || '').trim()
    if (text) out.push([ms, text])
  }
  return out
}

async function main() {
  const playlist = JSON.parse(await get(`${API}?type=playlist&id=${PLAYLIST_ID}`))
  const songs = playlist.slice(0, COUNT)
  const rows = []

  for (const s of songs) {
    const idMatch = String(s.url || '').match(/[?&]id=(\d+)/)
    const nid = idMatch ? Number(idMatch[1]) : null
    let lyric = []
    try {
      const lrcText = await get(s.lrc || `${API}?server=netease&type=lrc&id=${nid}`)
      lyric = parseLrc(lrcText)
    } catch { /* 歌词拉取失败则留空 */ }
    rows.push({
      id: `netease-${nid}`,
      name: s.name,
      artist: s.artist,
      album: '',
      cover: s.pic || '',
      src: s.url || '',
      duration: 0,
      neteaseId: nid,
      lrcUrl: s.lrc || '',
      lyric,
    })
    console.log(`  [${rows.length}/${COUNT}] ${s.name} - ${s.artist} (歌词 ${lyric.length} 行)`)
  }

  const json = JSON.stringify(rows, null, 2)
    .replace(/"neteaseId": (\d+)/g, 'neteaseId: $1')
    .replace(/"name": /g, 'name: ')
    .replace(/"artist": /g, 'artist: ')
    .replace(/"album": /g, 'album: ')
    .replace(/"cover": /g, 'cover: ')
    .replace(/"src": /g, 'src: ')
    .replace(/"lrcUrl": /g, 'lrcUrl: ')
    .replace(/"duration": 0/g, 'duration: 0')
    .replace(/"lyric": /g, 'lyric: ')

  const content = `// AUTO-GENERATED from 网易云歌单 id 9564103735「二次元日漫精选 · 2024新番OPED」
// 数据源：自建 Meting-API（47.104.189.4），含逐字歌词，作为音乐模块的离线兜底歌单。
import type { Playlist } from '@/types'

export const LIVE_PLAYLIST: Playlist = {
  id: 'live-9564103735',
  name: '二次元日漫精选',
  cover: ${JSON.stringify(rows[0]?.cover || '')},
  description: '网易云歌单 9564103735「二次元日漫精选」(前 ${COUNT} 首)',
  songs: [${json.replace(/\[([\s\S]*)\]/s, '$1')}],
}
`

  fs.writeFileSync(OUT, content, 'utf8')
  console.log(`\nOK: 生成 ${OUT}（${rows.length} 首）`)
}

main().catch((e) => {
  console.error('失败：', e)
  process.exit(1)
})
