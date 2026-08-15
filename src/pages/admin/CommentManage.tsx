import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, MessageSquare, Search, User, Clock, Link2 } from 'lucide-react'
import { adminApi } from '@/utils/adminApi'
import { useToast } from '@/hooks/useToast'
import { Toast } from '@/components/admin/Toast'

/** 后台评论条目 */
interface CommentItem {
  id: string
  name: string
  content: string
  path?: string
  url?: string
  date: string
  avatar?: string
}

export default function CommentManage() {
  const [comments, setComments] = useState<CommentItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const { toast, showToast } = useToast()
  const [keyword, setKeyword] = useState('')

  /** 加载评论列表 */
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { list, total: t } = await adminApi.listComments()
      setComments(list as CommentItem[])
      setTotal(t)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /** 确认删除 */
  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await adminApi.deleteComment(deleteId)
      showToast('评论已删除')
      setDeleteId(null)
      void load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除失败')
      setDeleteId(null)
    }
  }

  /** 搜索过滤 */
  const filtered = useMemo(() => {
    if (!keyword.trim()) return comments
    const kw = keyword.toLowerCase().trim()
    return comments.filter(
      (c) =>
        c.name?.toLowerCase().includes(kw) ||
        c.content?.toLowerCase().includes(kw) ||
        (c.path || c.url || '')?.toLowerCase().includes(kw)
    )
  }, [comments, keyword])

  /** 截断预览 */
  const preview = (text: string, max = 120) => {
    const flat = text.replace(/\n/g, ' ')
    return flat.length > max ? flat.slice(0, max) + '...' : flat
  }

  return (
    <div className="space-y-6">
      {/* 顶部标题栏 */}
      <div>
        <h1 className="text-2xl font-bold text-white">评论管理</h1>
        <p className="mt-1 text-sm text-white/40">共 {total} 条评论</p>
      </div>

      {/* 搜索栏 */}
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
          size={18}
        />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索昵称、内容或路径..."
          className="w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-white/30"
        />
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
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 animate-pulse"
            >
              <div className="h-4 w-1/4 rounded bg-white/10" />
              <div className="mt-3 h-3 w-3/4 rounded bg-white/10" />
              <div className="mt-2 h-3 w-1/3 rounded bg-white/10" />
            </div>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {!loading && filtered.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
          <MessageSquare className="h-14 w-14 text-white/20" />
          <p className="mt-4 text-lg font-medium text-white/60">
            {keyword ? '未找到匹配的评论' : '暂无评论'}
          </p>
          <p className="mt-1 text-sm text-white/40">
            {keyword ? '尝试更换关键词' : '访客评论后将显示在这里'}
          </p>
        </div>
      )}

      {/* 评论列表 */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.02 }}
              className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 transition-colors hover:bg-white/[0.07]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {/* 昵称 */}
                  <div className="flex items-center gap-2">
                    {item.avatar && (
                      <img
                        src={item.avatar}
                        alt={item.name}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    )}
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-white">
                      <User size={14} className="text-white/40" />
                      {item.name}
                    </span>
                  </div>

                  {/* 评论内容 */}
                  <p className="mt-2 text-sm leading-relaxed text-white/70">
                    {preview(item.content)}
                  </p>

                  {/* 元信息 */}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-white/40">
                    {(item.path || item.url) && (
                      <span className="inline-flex items-center gap-1 truncate max-w-[200px]">
                        <Link2 size={12} />
                        {item.path || item.url}
                      </span>
                    )}
                    {item.date && (
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} /> {item.date}
                      </span>
                    )}
                  </div>
                </div>

                {/* 删除按钮 */}
                <button
                  onClick={() => setDeleteId(item.id)}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/30"
                >
                  <Trash2 size={14} /> 删除
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 删除确认弹窗 */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setDeleteId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/20">
                  <Trash2 className="h-5 w-5 text-red-300" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">确认删除</h3>
                  <p className="mt-1 text-sm text-white/60">
                    管理员可删除任何评论，删除后无法恢复。确定要删除吗？
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
                >
                  取消
                </button>
                <button
                  onClick={confirmDelete}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/30 px-4 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/40"
                >
                  <Trash2 size={14} /> 确认删除
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast 提示 */}
      <Toast message={toast} />
    </div>
  )
}
