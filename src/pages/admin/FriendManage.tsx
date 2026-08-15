import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Link2, Globe, Loader2, ExternalLink } from 'lucide-react'
import { adminApi } from '@/utils/adminApi'
import { useToast } from '@/hooks/useToast'
import { Toast } from '@/components/admin/Toast'

/** 后台友链条目 */
interface FriendItem {
  id: string
  name: string
  url: string
  description: string
  status: string
  avatar?: string
  tag?: string
}

type FriendStatus = 'pending' | 'approved' | 'rejected'

/** 状态显示配置 */
const STATUS_MAP: Record<FriendStatus, { label: string; cls: string }> = {
  pending: { label: '待审核', cls: 'bg-yellow-500/20 text-yellow-300' },
  approved: { label: '已批准', cls: 'bg-emerald-500/20 text-emerald-300' },
  rejected: { label: '已拒绝', cls: 'bg-red-500/20 text-red-300' },
}

export default function FriendManage() {
  const [friends, setFriends] = useState<FriendItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { toast, showToast } = useToast()
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  /** 加载友链列表 */
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { list } = await adminApi.listFriends()
      setFriends(list as FriendItem[])
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /** 更新友链状态 */
  const updateStatus = async (id: string, status: FriendStatus) => {
    setUpdatingId(id)
    try {
      await adminApi.updateFriendStatus(id, status)
      showToast(status === 'approved' ? '已批准友链' : '已拒绝友链')
      // 本地更新状态
      setFriends((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status } : f))
      )
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失败')
    } finally {
      setUpdatingId(null)
    }
  }

  /** 统计各状态数量 */
  const pendingCount = friends.filter((f) => f.status === 'pending').length
  const approvedCount = friends.filter((f) => f.status === 'approved').length

  return (
    <div className="space-y-6">
      {/* 顶部标题栏 */}
      <div>
        <h1 className="text-2xl font-bold text-white">友链管理</h1>
        <p className="mt-1 text-sm text-white/40">
          共 {friends.length} 条申请 · 待审核 {pendingCount} · 已批准 {approvedCount}
        </p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* 加载骨架屏 */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 animate-pulse"
            >
              <div className="h-5 w-1/3 rounded bg-white/10" />
              <div className="mt-3 h-3 w-1/2 rounded bg-white/10" />
            </div>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {!loading && friends.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
          <Link2 className="h-14 w-14 text-white/20" />
          <p className="mt-4 text-lg font-medium text-white/60">暂无友链申请</p>
          <p className="mt-1 text-sm text-white/40">访客提交的友链申请将显示在这里</p>
        </div>
      )}

      {/* 友链列表 */}
      {!loading && friends.length > 0 && (
        <div className="space-y-3">
          {friends.map((item, idx) => {
            const status = (item.status as FriendStatus) || 'pending'
            const statusCfg = STATUS_MAP[status] || STATUS_MAP.pending
            const isUpdating = updatingId === item.id

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.03 }}
                className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 transition-colors hover:bg-white/[0.07]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {/* 头像 */}
                    {item.avatar ? (
                      <img
                        src={item.avatar}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                        <Globe className="h-5 w-5 text-white/40" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">{item.name}</h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.cls}`}
                        >
                          {statusCfg.label}
                        </span>
                        {item.tag && (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">
                            {item.tag}
                          </span>
                        )}
                      </div>

                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-white/40 transition-colors hover:text-white/70"
                        >
                          <Link2 size={12} />
                          <span className="truncate max-w-[260px]">{item.url}</span>
                          <ExternalLink size={10} />
                        </a>
                      )}

                      {item.description && (
                        <p className="mt-1.5 text-xs leading-relaxed text-white/50">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex shrink-0 items-center gap-2">
                    {status !== 'approved' && (
                      <button
                        onClick={() => updateStatus(item.id, 'approved')}
                        disabled={isUpdating}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        批准
                      </button>
                    )}
                    {status !== 'rejected' && (
                      <button
                        onClick={() => updateStatus(item.id, 'rejected')}
                        disabled={isUpdating}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <X size={14} />
                        )}
                        拒绝
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Toast 提示 */}
      <Toast message={toast} />
    </div>
  )
}
