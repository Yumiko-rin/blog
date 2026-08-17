import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Check,
  X,
  Link2,
  Globe,
  Loader2,
  ExternalLink,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { adminApi } from '@/utils/adminApi'
import { useToast } from '@/hooks/useToast'
import { Toast } from '@/components/admin/Toast'
import { FRIENDS } from '@/data/friends'

/** 友链条目（列表 + 申请通用） */
interface FriendRow {
  id: string
  name: string
  url: string
  description: string
  status?: string
  avatar?: string
  tag?: string
}

/** 友链表单 */
interface FriendForm {
  id?: string
  name: string
  url: string
  avatar: string
  description: string
  tag: string
}

const EMPTY_FORM: FriendForm = { name: '', url: '', avatar: '', description: '', tag: '博客' }

export default function FriendManage() {
  const [tab, setTab] = useState<'list' | 'apply'>('list')
  const [friends, setFriends] = useState<FriendRow[]>([])      // 友链列表
  const [applies, setApplies] = useState<FriendRow[]>([])       // 申请
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { toast, showToast } = useToast()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FriendForm>(EMPTY_FORM)
  const [isEditing, setIsEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadList = async () => {
    try {
      const { list } = await adminApi.listFriendList()
      setFriends(list as FriendRow[])
    } catch (e) {
      throw e
    }
  }

  const loadApplies = async () => {
    try {
      const { list } = await adminApi.listFriends()
      setApplies(list as FriendRow[])
    } catch (e) {
      throw e
    }
  }

  /** 加载（按当前 tab），空则自动导入内置友链种子 */
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      if (tab === 'list') {
        await loadList()
        if (friends.length === 0 && !isEditing) {
          try {
            const { added } = await adminApi.importSeed('friends', FRIENDS as any[])
            if (added > 0) await loadList()
          } catch { /* 静默 */ }
        }
      } else {
        await loadApplies()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  /** 同步内置友链到后台存储（幂等） */
  const syncSeed = async () => {
    try {
      const { added, total } = await adminApi.importSeed('friends', FRIENDS as any[])
      showToast(added > 0 ? `已同步 ${added} 条内置友链（共 ${total} 条）` : '内置友链已全部在后台（无需同步）')
      await loadList()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '同步失败')
    }
  }

  /** 打开新增/编辑弹窗 */
  const openForm = (item?: FriendRow) => {
    if (item) {
      setForm({
        id: item.id,
        name: item.name || '',
        url: item.url || '',
        avatar: item.avatar || '',
        description: item.description || '',
        tag: item.tag || '博客',
      })
      setIsEditing(true)
    } else {
      setForm(EMPTY_FORM)
      setIsEditing(false)
    }
    setModalOpen(true)
  }

  /** 提交友链 */
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.url.trim()) {
      showToast('请填写站点名称和地址')
      return
    }
    setSubmitting(true)
    try {
      if (isEditing && form.id) {
        await adminApi.updateFriend(form)
        showToast('友链已更新')
      } else {
        await adminApi.createFriend(form)
        showToast('友链已添加')
      }
      setModalOpen(false)
      await loadList()
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  /** 删除友链 */
  const confirmDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await adminApi.deleteFriend(deleteId)
      showToast('友链已删除')
      setDeleteId(null)
      await loadList()
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除失败')
      setDeleteId(null)
    } finally {
      setDeleting(false)
    }
  }

  /** 更新申请状态 */
  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    setUpdatingId(id)
    try {
      await adminApi.updateFriendStatus(id, status)
      showToast(status === 'approved' ? '已批准友链' : '已拒绝友链')
      setApplies((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)))
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失败')
    } finally {
      setUpdatingId(null)
    }
  }

  const pendingCount = applies.filter((f) => f.status === 'pending').length

  return (
    <div className="space-y-6">
      {/* 顶部标题栏 + Tab 切换 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">友链管理</h1>
          <p className="mt-1 text-sm text-white/40">
            {tab === 'list' ? `共 ${friends.length} 条友链` : `共 ${applies.length} 条申请 · 待审核 ${pendingCount}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-white/5 p-1">
            <button
              onClick={() => setTab('list')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                tab === 'list' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              友链列表
            </button>
            <button
              onClick={() => setTab('apply')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                tab === 'apply' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              申请审核
              {pendingCount > 0 && (
                <span className="ml-1.5 rounded-full bg-yellow-500/20 px-1.5 py-0.5 text-xs text-yellow-300">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
          {tab === 'list' && (
            <>
              <button
                onClick={syncSeed}
                title="把内置静态友链同步到后台存储"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
              >
                <RefreshCw size={16} /> 同步内置
              </button>
              <button
                onClick={() => openForm()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-2.5 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30"
              >
                <Plus size={16} /> 添加友链
              </button>
            </>
          )}
        </div>
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
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 animate-pulse">
              <div className="h-5 w-1/3 rounded bg-white/10" />
              <div className="mt-3 h-3 w-1/2 rounded bg-white/10" />
            </div>
          ))}
        </div>
      )}

      {/* ===== Tab1: 友链列表 ===== */}
      {!loading && tab === 'list' && friends.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
          <Link2 className="h-14 w-14 text-white/20" />
          <p className="mt-4 text-lg font-medium text-white/60">暂无友链</p>
          <p className="mt-1 text-sm text-white/40">点击「添加友链」或「同步内置」导入内置友链</p>
        </div>
      )}

      {!loading && tab === 'list' && friends.length > 0 && (
        <div className="space-y-3">
          {friends.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(idx * 0.02, 0.4) }}
              className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 transition-colors hover:bg-white/[0.07]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-3">
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
                      <p className="mt-1.5 text-xs leading-relaxed text-white/50">{item.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => openForm(item)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/20"
                  >
                    <Pencil size={14} /> 编辑
                  </button>
                  <button
                    onClick={() => setDeleteId(item.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/30"
                  >
                    <Trash2 size={14} /> 删除
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ===== Tab2: 申请审核 ===== */}
      {!loading && tab === 'apply' && applies.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
          <Link2 className="h-14 w-14 text-white/20" />
          <p className="mt-4 text-lg font-medium text-white/60">暂无友链申请</p>
          <p className="mt-1 text-sm text-white/40">访客提交的友链申请将显示在这里</p>
        </div>
      )}

      {!loading && tab === 'apply' && applies.length > 0 && (
        <div className="space-y-3">
          {applies.map((item, idx) => {
            const status = item.status || 'pending'
            const isUpdating = updatingId === item.id
            const statusCfg =
              status === 'approved'
                ? { label: '已批准', cls: 'bg-emerald-500/20 text-emerald-300' }
                : status === 'rejected'
                  ? { label: '已拒绝', cls: 'bg-red-500/20 text-red-300' }
                  : { label: '待审核', cls: 'bg-yellow-500/20 text-yellow-300' }

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
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.cls}`}>
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
                        <p className="mt-1.5 text-xs leading-relaxed text-white/50">{item.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {status !== 'approved' && (
                      <button
                        onClick={() => updateStatus(item.id, 'approved')}
                        disabled={isUpdating}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        批准
                      </button>
                    )}
                    {status !== 'rejected' && (
                      <button
                        onClick={() => updateStatus(item.id, 'rejected')}
                        disabled={isUpdating}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
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

      {/* 新增/编辑友链弹窗 */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-[#12101a] p-6 shadow-2xl"
            style={{ maxHeight: '85vh', overflowY: 'auto' }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{isEditing ? '编辑友链' : '添加友链'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-white/40 hover:text-white/60">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm text-white/60">站点名称 *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="例如：喵音小筑"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-400/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-white/60">标签</label>
                  <input
                    value={form.tag}
                    onChange={(e) => setForm({ ...form, tag: e.target.value })}
                    placeholder="博客"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-400/50"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">站点地址 *</label>
                <input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-400/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">头像链接</label>
                <input
                  value={form.avatar}
                  onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                  placeholder="https://example.com/avatar.png"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-400/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">描述</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="一句话介绍这个站点"
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-400/50"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition-all hover:bg-white/10"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-emerald-500/50 disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  保存
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}

      {/* 删除确认弹窗 */}
      {deleteId && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-[#12101a] p-6 shadow-2xl"
            style={{ maxHeight: '85vh', overflowY: 'auto' }}
          >
            <h3 className="text-lg font-semibold text-white">删除友链</h3>
            <p className="mt-2 text-sm text-white/50">确定要删除这条友链吗？删除后前台将立即不再展示。</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition-all hover:bg-white/10"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex items-center gap-2 rounded-xl bg-red-500/20 px-5 py-2 text-sm font-semibold text-red-300 transition-all hover:bg-red-500/30 disabled:opacity-60"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                删除
              </button>
            </div>
          </motion.div>
        </>
      )}

      {/* Toast 提示 */}
      <Toast message={toast} />
    </div>
  )
}
