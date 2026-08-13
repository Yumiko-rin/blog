import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

/**
 * ScheduleWidget 日程/日期进度小部件
 * 显示日期进度和节假日倒计时
 */
export function ScheduleWidget() {
  const [collapsed, setCollapsed] = useState(false)
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()]

  // 年度进度
  const yearStart = new Date(year, 0, 1).getTime()
  const yearEnd = new Date(year + 1, 0, 1).getTime()
  const yearProgress = ((now.getTime() - yearStart) / (yearEnd - yearStart)) * 100

  // 月度进度
  const monthStart = new Date(year, month - 1, 1).getTime()
  const monthEnd = new Date(year, month, 1).getTime()
  const monthProgress = ((now.getTime() - monthStart) / (monthEnd - monthStart)) * 100

  // 周进度 (周一=1, 周日=7)
  const dayOfWeekNum = now.getDay() === 0 ? 7 : now.getDay()
  const weekProgress = (dayOfWeekNum / 7) * 100

  // 年剩余天数
  const daysLeftInYear = Math.ceil((yearEnd - now.getTime()) / (1000 * 60 * 60 * 24))

  const items = [
    { label: `${year}年进度`, progress: yearProgress, daysLeft: daysLeftInYear, unit: '天' },
    { label: `${month}月进度`, progress: monthProgress, daysLeft: Math.ceil((monthEnd - now.getTime()) / (1000 * 60 * 60 * 24)), unit: '天' },
    { label: `本周进度`, progress: weekProgress, daysLeft: 7 - dayOfWeekNum, unit: '天' },
  ]

  return (
    <div className="widget-card">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-md bg-accent" />
          <span className="text-sm font-bold text-[rgb(var(--text-primary))]">
            {year}年{month}月{day}日 周{dayOfWeek}
          </span>
        </div>
        {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
      {!collapsed && (
        <div className="px-3 pb-3 space-y-3">
          {items.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[rgb(var(--text-secondary))]">{item.label}</span>
                <span className="text-[rgb(var(--text-secondary))]">
                  剩余 <span className="text-accent font-bold">{item.daysLeft}</span> {item.unit}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-accent/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent/60 transition-all duration-500"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ScheduleWidget
