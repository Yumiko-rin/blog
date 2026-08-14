import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Eye, Users, TrendingUp, BarChart3, Loader2 } from 'lucide-react'
import { adminApi } from '@/utils/adminApi'

/** 每日统计数据 */
interface DayStat {
  date: string
  pv: number
  uv: number
}

/** 后台统计返回 */
interface StatsData {
  total: number
  uv: number
  days: DayStat[]
}

export default function StatsView() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  /** 加载统计数据 */
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminApi.getStats()
      setStats(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  /** 取近 30 天数据并计算最大值用于柱状图高度比例 */
  const { recentDays, maxPv, avgPv, totalPv30 } = useMemo(() => {
    if (!stats?.days?.length) {
      return { recentDays: [] as DayStat[], maxPv: 1, avgPv: 0, totalPv30: 0 }
    }
    // 取最近 30 天（如果不足 30 天则取全部）
    const sorted = [...stats.days].sort((a, b) => a.date.localeCompare(b.date))
    const recent = sorted.slice(-30)
    const max = Math.max(...recent.map((d) => d.pv), 1)
    const sum = recent.reduce((acc, d) => acc + d.pv, 0)
    const avg = recent.length > 0 ? Math.round(sum / recent.length) : 0
    return { recentDays: recent, maxPv: max, avgPv: avg, totalPv30: sum }
  }, [stats])

  /** 格式化大数字 */
  const fmtNum = (n: number) => n.toLocaleString('zh-CN')

  /** 格式化日期为 MM-DD */
  const fmtDate = (date: string) => {
    const parts = date.split('-')
    if (parts.length >= 3) return `${parts[1]}-${parts[2]}`
    return date
  }

  /** 日期标签显示间隔（避免太密集） */
  const labelInterval = recentDays.length > 20 ? 5 : recentDays.length > 10 ? 3 : 2

  return (
    <div className="space-y-6">
      {/* 顶部标题栏 */}
      <div>
        <h1 className="text-2xl font-bold text-white">统计详情</h1>
        <p className="mt-1 text-sm text-white/40">站点访问数据概览</p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-white/40" />
        </div>
      )}

      {/* 数据展示 */}
      {!loading && stats && (
        <>
          {/* 顶部大数字卡片 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* 总浏览量 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/40">总浏览量</p>
                  <p className="mt-2 text-4xl font-bold text-white">
                    {fmtNum(stats.total)}
                  </p>
                  <p className="mt-1 text-xs text-white/30">PV · Page Views</p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15">
                  <Eye className="h-7 w-7 text-blue-300" />
                </div>
              </div>
            </motion.div>

            {/* 独立访客 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/40">独立访客</p>
                  <p className="mt-2 text-4xl font-bold text-white">
                    {fmtNum(stats.uv)}
                  </p>
                  <p className="mt-1 text-xs text-white/30">UV · Unique Visitors</p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15">
                  <Users className="h-7 w-7 text-emerald-300" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* 近 30 天趋势概览 */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-white/40">
                <TrendingUp size={14} />
                <span className="text-xs font-medium">近30天总浏览</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{fmtNum(totalPv30)}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-white/40">
                <BarChart3 size={14} />
                <span className="text-xs font-medium">日均浏览量</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{fmtNum(avgPv)}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-white/40">
                <Eye size={14} />
                <span className="text-xs font-medium">峰值浏览量</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{fmtNum(maxPv)}</p>
            </div>
          </div>

          {/* 近 30 天每日浏览量趋势（CSS 柱状图） */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">每日浏览量趋势</h2>
                <p className="mt-0.5 text-xs text-white/40">
                  近 {recentDays.length} 天数据
                </p>
              </div>
            </div>

            {recentDays.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-12 w-12 text-white/20" />
                <p className="mt-3 text-sm text-white/40">暂无趋势数据</p>
              </div>
            ) : (
              <div>
                {/* 柱状图区域 */}
                <div className="relative">
                  {/* Y 轴参考线 -->
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="border-t border-white/5" />
                    ))}
                  </div>

                  {/* 柱子容器 */}
                  <div
                    className="relative flex items-end justify-between gap-1"
                    style={{ height: '220px' }}
                  >
                    {recentDays.map((day, idx) => {
                      const heightPct = maxPv > 0 ? (day.pv / maxPv) * 100 : 0
                      return (
                        <div
                          key={day.date}
                          className="group relative flex flex-1 flex-col items-center justify-end"
                          style={{ height: '100%' }}
                        >
                          {/* 悬浮提示 */}
                          <div className="pointer-events-none absolute -top-12 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-black/80 px-2.5 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                            <span className="text-white/60">{fmtDate(day.date)}</span>
                            <span className="ml-1.5 font-semibold">{day.pv}</span>
                            <span className="ml-1 text-white/40">UV {day.uv}</span>
                          </div>

                          {/* 柱子 */}
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(heightPct, day.pv > 0 ? 3 : 0)}%` }}
                            transition={{ duration: 0.4, delay: idx * 0.015, ease: 'easeOut' }}
                            className="w-full max-w-[14px] rounded-t bg-gradient-to-t from-blue-500/40 to-blue-400/80 transition-colors group-hover:from-blue-400/60 group-hover:to-blue-300"
                            style={{ minHeight: day.pv > 0 ? '2px' : '0' }}
                          />
                        </div>
                      )
                    })}
                  </div>

                  {/* X 轴日期标签 */}
                  <div className="mt-3 flex justify-between gap-1">
                    {recentDays.map((day, idx) => {
                      const showLabel = idx % labelInterval === 0 ||
                        idx === recentDays.length - 1
                      return (
                        <div
                          key={day.date}
                          className="flex-1 text-center"
                          style={{ visibility: showLabel ? 'visible' : 'hidden' }}
                        >
                          <span className="text-[10px] text-white/30">
                            {fmtDate(day.date)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 图例 */}
                <div className="mt-6 flex items-center gap-4 text-xs text-white/40">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-gradient-to-t from-blue-500/40 to-blue-400/80" />
                    每日 PV
                  </span>
                  <span>·</span>
                  <span>鼠标悬浮查看详情</span>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  )
}
