import { useState, useEffect } from 'react'
import { ARTICLES, ALL_TAGS } from '@/data/articles'

/**
 * SiteStatsWidget 网站统计小部件
 * 「运行」从站点启用日（2026-08-13）起算，并每秒实时刷新。
 */
export function SiteStatsWidget() {
  // 站点启用日：2026-08-13（本地时间 00:00）
  const blogStartDate = new Date('2026-08-13T00:00:00')
  const [now, setNow] = useState(() => new Date())

  // 每秒刷新，使「运行」随时间持续变化
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const diff = now.getTime() - blogStartDate.getTime()
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  // 不足一天时以 时:分:秒 实时滚动；满一天后显示 X天Y时
  const runningValue =
    days > 0 ? `${days}天${hours}时` : `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const stats = [
    { label: '文章', value: ARTICLES.length },
    { label: '标签', value: ALL_TAGS.length },
    { label: '运行', value: runningValue },
  ]

  return (
    <div className="widget-card p-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-md bg-accent" />
        <span className="text-sm font-bold text-[rgb(var(--text-primary))]">站点统计</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-lg font-black text-accent">{stat.value}</div>
            <div className="text-[10px] text-[rgb(var(--text-secondary))]">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SiteStatsWidget
