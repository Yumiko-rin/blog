// 一次性脚本：从 Meting 拉取二次元歌单(8832161095)前 N 首，生成 livePlaylist.ts 内嵌兜底歌单
const fs = require('fs')
const path = require('path')

const PLAYLIST_ID = '8832161095'
const COUNT = 15
const API = `http://47.104.189.4/music/?type=playlist&id=${PLAYLIST_ID}`
const OUT = path.resolve(__dirname, '..', 'src', 'data', 'livePlaylist.ts')

function sameOrigin(u) {
  return String(u || '').replace(/^https?:\/\/47\.104\.189\.4\/music/, '/music')
}

async function main() {
  const r = await fetch(API)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const raw = await r.json()
  if (!Array.isArray(raw) || !raw.length) throw new Error('empty playlist')
  const songs = raw.slice(0, COUNT).map((x) => {
    const url = sameOrigin(x.url)
    const m = url.match(/[?&]id=(\d+)/)
    const neteaseId = m ? Number(m[1]) : 0
    return {
      id: `netease-${neteaseId}`,
      name: x.name,
      artist: x.artist,
      album: '',
      cover: sameOrigin(x.pic),
      src: url,
      duration: 0,
      neteaseId,
      lrcUrl: sameOrigin(x.lrc),
      lyric: [],
    }
  })

  const lines = [
    '// AUTO-GENERATED from Meting 歌单 8832161095（二次元日漫金曲 · 2023新番OPED）',
    '// 内嵌兜底歌单：优先从 /music 线上接口拉取最新播放地址，本文件用于离线/接口异常时兜底。',
    "import type { Playlist } from '@/types'",
    '',
    'export const LIVE_PLAYLIST: Playlist = {',
    "  id: 'live-anime-2023',",
    "  name: '二次元日漫金曲 · 2023新番OPED',",
    "  cover: '" + (songs[0]?.cover || '') + "',",
    "  description: '动漫主题曲合集（网易云歌单 8832161095）· 内嵌兜底',",
    '  songs: [',
  ]
  for (const s of songs) {
    lines.push('    {')
    for (const k of ['id', 'name', 'artist', 'album', 'cover', 'src']) {
      lines.push(`      ${k}: ${JSON.stringify(s[k])},`)
    }
    lines.push(`      duration: 0,`)
    lines.push(`      neteaseId: ${s.neteaseId},`)
    lines.push(`      lrcUrl: ${JSON.stringify(s.lrcUrl)},`)
    lines.push('      lyric: [],')
    lines.push('    },')
  }
  lines.push('  ],')
  lines.push('}')
  lines.push('')

  fs.writeFileSync(OUT, lines.join('\n'), 'utf8')
  console.log(`OK: ${songs.length} 首写入 ${OUT}`)
}

main().catch((e) => {
  console.error('失败:', e.message)
  process.exit(1)
})
