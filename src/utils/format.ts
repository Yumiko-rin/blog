/**
 * 格式化工具函数
 */

/** 秒数转 mm:ss */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** 毫秒时间戳转 mm:ss（用于歌词） */
export function formatMs(ms: number): string {
  return formatTime(ms / 1000)
}

/** 日期格式化 YYYY-MM-DD → YYYY年MM月DD日 */
export function formatDate(date: string): string {
  const [y, m, d] = date.split('-')
  if (!y || !m || !d) return date
  return `${y}年${m}月${d}日`
}

/** 数字千分位 */
export function formatNumber(n: number): string {
  return n.toLocaleString('zh-CN')
}
