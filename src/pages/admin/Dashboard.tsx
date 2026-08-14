import { useEffect, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import {
  FileText,
  MessageCircle,
  MessageSquare,
  Eye,
  TrendingUp,
  Users,
  AlertCircle,
  Loader2,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react'
import { adminApi } from '@/utils/adminApi'

interface DashboardData {
  articles: number
  shuoshuo: number
  comments: number
  totalViews: number
  todayViews: number
  uv: number
}

interface StatCard {
  key: keyof DashboardData
  label: string
  icon: LucideIcon
  gradient: string
}

const statCards: StatCard[] = [
  { key: 'articles', label: '文章数', icon: FileText, gradient: 'from-blue-500 to-cyan-500' },
  { key: 'shuoshuo', label: '说说数', icon: MessageCircle, gradient: 'from-violet-500 to-purple-500' },
  { key: 'comments', label: '评论数', icon: MessageSquare, gradient: 'from-pink-500 to-rose-500' },
  { key: 'totalViews', label: '总浏览量', icon: Eye, gradient: 'from-amber-500 to-orange-500' },
]

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

/**
 * Dashboard 概览面板
 * --------------------------------------------------
 * 调用 adminApi.dashboard() 获取统计数据并展示
 */
export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const d = await adminApi.dashboard()
      setData(d)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  /* 加载状态 */
  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-white/50">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          <p>加载中...</p>
        </div>
      </div>
    )
  }

  /* 错误状态 */
  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <p className="text-red-300">{error}</p>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition-all hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
            重新加载
          </button>
        </div>
      </div>
    )
  }

  /* 正常展示 */
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          const value = data ? data[card.key] : 0
          return (
            <motion.div
              key={card.key}
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/50">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-white">
                    {value.toLocaleString()}
                  </p>
                </div>
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* 今日数据 */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-white/50">今日浏览量</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {(data?.todayViews ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-white/50">独立访客数</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {(data?.uv ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 欢迎横幅 */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-white/10 bg-gradient-to-r from-violet-500/10 to-purple-500/10 p-6 backdrop-blur-xl"
      >
        <h3 className="text-lg font-semibold text-white">欢迎回来，管理员</h3>
        <p className="mt-1 text-sm text-white/50">
          这里是喵音小筑后台管理系统，你可以在这里管理文章、说说、评论和友链。
        </p>
      </motion.div>
    </motion.div>
  )
}
