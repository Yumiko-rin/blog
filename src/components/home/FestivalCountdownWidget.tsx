import { useMemo } from 'react'
import { CalendarClock, PartyPopper } from 'lucide-react'
import { useDailyTick } from '@/hooks/useDailyTick'

/**
 * 节日倒计时小部件
 * --------------------------------------------------
 * - 阳历固定节日按 (月,日) 动态推算当年/次年，永远正确
 * - 农历节日使用已核对的公历日期表（2026–2027；表用尽后自动只显示阳历节日）
 * - 依赖 useDailyTick：页面长时间不关也会在跨零点后自动把天数减 1
 */

interface Festival { name: string; date: Date; lunar?: boolean }

// 农历节日（已核对公历日期）
const LUNAR: [string, string][] = [
  ['春节', '2026-02-17'], ['元宵', '2026-03-03'], ['清明', '2026-04-05'],
  ['端午', '2026-06-19'], ['七夕', '2026-08-19'], ['中元', '2026-08-27'],
  ['中秋', '2026-09-25'], ['重阳', '2026-10-18'], ['冬至', '2026-12-22'],
  ['腊八', '2027-01-15'], ['小年', '2027-01-31'], ['除夕', '2027-02-05'],
  ['春节', '2027-02-06'], ['元宵', '2027-02-20'], ['清明', '2027-04-05'],
  ['端午', '2027-06-09'], ['七夕', '2027-08-08'], ['中秋', '2027-09-15'],
  ['重阳', '2027-10-08'], ['冬至', '2027-12-22'],
]

// 阳历固定节日（月,日）
const SOLAR: [string, number, number][] = [
  ['元旦', 1, 1], ['情人节', 2, 14], ['妇女节', 3, 8],
  ['劳动节', 5, 1], ['儿童节', 6, 1], ['教师节', 9, 10],
  ['国庆节', 10, 1], ['万圣节', 10, 31], ['圣诞节', 12, 25],
]

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function daysBetween(from: Date, to: Date) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000)
}

function fmt(d: Date) {
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function FestivalCountdownWidget() {
  const day = useDailyTick() // 跨日自动重算

  const { next, upcoming, left } = useMemo(() => {
    const now = new Date()
    const today = startOfDay(now).getTime()
    const y = now.getFullYear()

    const all: Festival[] = []
    for (const [name, m, d] of SOLAR) {
      for (const year of [y, y + 1]) all.push({ name, date: new Date(year, m - 1, d) })
    }
    for (const [name, ds] of LUNAR) {
      all.push({ name, date: new Date(`${ds}T00:00:00`), lunar: true })
    }

    const future = all
      .filter((f) => f.date.getTime() >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    const nxt = future[0] ?? null
    return {
      next: nxt,
      upcoming: future.slice(1, 4),
      left: nxt ? daysBetween(now, nxt.date) : 0,
    }
    // day 变化时重新计算
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day])

  if (!next) return null

  const isToday = left === 0

  return (
    <div className="widget-card p-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-md bg-accent" />
        <span className="text-sm font-bold text-[rgb(var(--text-primary))]">节日倒计时</span>
      </div>

      <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-3 text-center">
        {isToday ? (
          <>
            <div className="flex items-center justify-center gap-1 text-xs text-[rgb(var(--text-secondary))]">
              <PartyPopper size={12} className="text-accent" />今天就是
            </div>
            <div className="my-1 text-2xl font-black text-accent">
              {next.name}{next.lunar ? '（农历）' : ''}
            </div>
          </>
        ) : (
          <>
            <div className="text-xs text-[rgb(var(--text-secondary))]">
              距离 {next.name}{next.lunar ? '（农历）' : ''}还有
            </div>
            <div className="my-1">
              <span className="text-3xl font-black text-accent tabular-nums">{left}</span>
              <span className="text-sm text-[rgb(var(--text-secondary))] ml-1">天</span>
            </div>
          </>
        )}
        <div className="text-xs text-[rgb(var(--text-secondary))]">
          {fmt(next.date)} · {WEEK[next.date.getDay()]}
        </div>
      </div>

      {upcoming.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {upcoming.map((f) => (
            <li key={`${f.name}-${f.date.toISOString()}`} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-[rgb(var(--text-primary))]">
                <CalendarClock size={12} className="text-accent" />
                {f.name}
              </span>
              <span className="text-[rgb(var(--text-secondary))] tabular-nums">
                {fmt(f.date)} · {daysBetween(new Date(), f.date)}天
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default FestivalCountdownWidget
