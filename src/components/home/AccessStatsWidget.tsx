import { useState, useEffect, useCallback } from 'react'
import { Eye, Users, TrendingUp, CalendarDays } from 'lucide-react'
import { useDailyTick, dateKey } from '@/hooks/useDailyTick'

/**
 * 访问统计小部件
 * --------------------------------------------------
 * 真实计数，从部署那一刻开始累计（不再有任何虚构基数）：
 *   1) 优先调用同源后端 /local-api/stats/visit —— 服务端按 IP+UA 指纹去重统计 PV/UV，
 *      数据落在 server-data/visit-stats.json，多设备/多访客都能累加。
 *   2) 后端不可用（纯静态托管）时退化为 localStorage 本机计数。
 * 「今日访问」跨零点自动归零（useDailyTick 驱动，无需刷新页面）。
 */

interface StatsView {
  since: string
  total: number
  today: number
  todayUv: number
  uv: number
  recent?: { date: string; pv: number; uv: number }[]
  source: 'server' | 'local'
}

// v3：2026-08-13 应主人要求重置统计，从现在开始累计（旧 v2 数据作废）
const LOCAL_KEY = 'blog_visit_stats_v3'
const SESSION_KEY = 'blog_visit_counted_at'
const COUNT_GAP = 60_000 // 同一会话内 60 秒内不重复计数

interface LocalStats {
  since: string
  total: number
  days: Record<string, number>
}

function readLocal(): LocalStats {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (raw) {
      const v = JSON.parse(raw)
      if (v && typeof v.total === 'number') return { since: v.since, total: v.total, days: v.days || {} }
    }
  } catch { /* ignore */ }
  // 首次访问 → 统计起点就是此刻
  return { since: new Date().toISOString(), total: 0, days: {} }
}

function bumpLocal(count: boolean): StatsView {
  const s = readLocal()
  const k = dateKey()
  if (count) {
    s.total += 1
    s.days[k] = (s.days[k] || 0) + 1
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(s)) } catch { /* ignore */ }
  }
  return {
    since: s.since,
    total: s.total,
    today: s.days[k] || 0,
    todayUv: s.total > 0 ? 1 : 0,
    uv: s.total > 0 ? 1 : 0,
    source: 'local',
  }
}

/** 会话级节流：判断本次是否应该记一次 PV */
function shouldCount(): boolean {
  try {
    const last = Number(sessionStorage.getItem(SESSION_KEY) || 0)
    if (Date.now() - last < COUNT_GAP) return false
    sessionStorage.setItem(SESSION_KEY, String(Date.now()))
    return true
  } catch {
    return true
  }
}

function fmtSince(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function runDays(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 1
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const now = new Date()
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.max(1, Math.round((b - a) / 86400000) + 1)
}

export function AccessStatsWidget() {
  const [stats, setStats] = useState<StatsView | null>(null)
  const day = useDailyTick() // 跨日重新拉取，今日访问归零

  const load = useCallback(async (count: boolean) => {
    try {
      const r = await fetch(`/local-api/stats${count ? '/visit' : ''}`, {
        method: count ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      if (r.ok) {
        const d = await r.json()
        if (typeof d?.total === 'number') {
          setStats({ ...d, source: 'server' })
          return
        }
      }
      throw new Error('bad response')
    } catch {
      setStats(bumpLocal(count)) // 后端不可用 → 本机计数兜底
    }
  }, [])

  useEffect(() => {
    load(shouldCount())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day])

  const items = [
    { icon: Eye, label: '总访问', value: stats ? stats.total.toLocaleString() : '—', color: 'text-sky-500' },
    { icon: TrendingUp, label: '今日访问', value: stats ? String(stats.today) : '—', color: 'text-emerald-500' },
    { icon: Users, label: '访客数', value: stats ? stats.uv.toLocaleString() : '—', color: 'text-violet-500' },
  ]

  // 近 7 日迷你柱状图（仅服务端模式有数据）
  const recent = stats?.recent ?? []
  const peak = Math.max(1, ...recent.map((r) => r.pv))

  return (
    <div className="widget-card p-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-md bg-accent" />
        <span className="text-sm font-bold text-[rgb(var(--text-primary))]">访问统计</span>
        {stats?.source === 'local' && (
          <span className="ml-auto text-[10px] text-[rgb(var(--text-secondary))] opacity-70">本机</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {items.map((it) => (
          <div key={it.label} className="text-center">
            <it.icon size={16} className={`mx-auto mb-1 ${it.color}`} />
            <div className="text-base font-black text-accent tabular-nums">{it.value}</div>
            <div className="text-[10px] text-[rgb(var(--text-secondary))]">{it.label}</div>
          </div>
        ))}
      </div>

      {recent.length > 1 && (
        <div className="mt-3 flex items-end justify-between gap-1 h-8">
          {recent.map((r) => (
            <div key={r.date} className="flex-1 group relative flex items-end justify-center h-full">
              <div
                className="w-full rounded-t bg-accent/30 group-hover:bg-accent/60 transition-colors"
                style={{ height: `${Math.max(8, (r.pv / peak) * 100)}%` }}
                title={`${r.date}：${r.pv} 次访问 / ${r.uv} 位访客`}
              />
            </div>
          ))}
        </div>
      )}

      {stats?.since && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-[rgb(var(--text-secondary))]">
          <CalendarDays size={11} />
          <span>自 {fmtSince(stats.since)} 起统计 · 已运行 {runDays(stats.since)} 天</span>
        </div>
      )}
    </div>
  )
}

export default AccessStatsWidget
