/**
 * 歌词工具：解析 LRC 文本 + 按 lrcUrl 运行时拉取歌词
 * --------------------------------------------------
 * 歌曲的 lyric 字段默认留空，选中时按 lrcUrl 异步拉取并解析，
 * 避免把所有歌词内嵌进打包产物，同时保证线上任意歌曲都有歌词。
 */

/** 解析 LRC 文本为 [时间戳(ms), 文本][] */
export function parseLrc(text: string): [number, string][] {
  const out: [number, string][] = []
  const lines = text.split(/\r?\n/)
  const re = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g
  for (const line of lines) {
    re.lastIndex = 0
    const match = re.exec(line)
    if (!match) continue
    const min = parseInt(match[1], 10)
    const sec = parseInt(match[2], 10)
    const ms = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0
    const time = (min * 60 + sec) * 1000 + ms
    const content = line.slice(re.lastIndex).trim()
    if (content) out.push([time, content])
  }
  return out
}

/** 按 lrcUrl 拉取并解析歌词，失败返回空数组 */
export async function fetchLyric(lrcUrl: string): Promise<[number, string][]> {
  try {
    const res = await fetch(lrcUrl)
    if (!res.ok) return []
    const text = await res.text()
    return parseLrc(text)
  } catch {
    return []
  }
}
