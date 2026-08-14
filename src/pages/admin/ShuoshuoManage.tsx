import { useState, useEffect, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, X, MessageCircle, Loader2, Smile, Calendar } from 'lucide-react'
import { adminApi } from '@/utils/adminApi'

/** 后台说说条目 */
interface ShuoshuoItem {
  id: string
  content: string
  mood?: string
  date: string
  images?: string[]
}

/** 说说表单数据 */
interface ShuoshuoForm {
  id?: string
  content: string
  mood: string
}

const EMPTY_FORM: ShuoshuoForm = {
  content: '',
  mood: '',
}

export default function ShuoshuoManage() {
  const [list, setList] = useState<ShuoshuoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<ShuoshuoForm>(EMPTY_FORM)
  const [isEditing, setIsEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  /** 加载说说列表 */
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { list: data } = await adminApi.listShuoshuo()
      setList(data as ShuoshuoItem[])
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  /** 显示提示（自动消失） */
  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  /** 打开新建弹窗 */
  const openCreate = () => {
    setForm(EMPTY_FORM)
    setIsEditing(false)
    setModalOpen(true)
  }

  /** 打开编辑弹窗 */
  const openEdit = (item: ShuoshuoItem) => {
    setForm({
      id: item.id,
      content: item.content || '',
      mood: item.mood || '',
    })
    setIsEditing(true)
    setModalOpen(true)
  }

  /** 提交表单 */
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.content.trim()) {
      showToast('请填写说说内容')
      return
    }
    setSubmitting(true)
    try {
      if (isEditing && form.id) {
        await adminApi.updateShuoshuo(form)
        showToast('说说已更新')
      } else {
        await adminApi.createShuoshuo(form)
        showToast('说说已发布')
      }
      setModalOpen(false)
      void load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  /** 确认删除 */
  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await adminApi.deleteShuoshuo(deleteId)
      showToast('说说已删除')
      setDeleteId(null)
      void load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除失败')
      setDeleteId(null)
    }
  }

  /** 截断预览 */
  const preview = (text: string, max = 80) => {
    const flat = text.replace(/\n/g, ' ')
    return flat.length > max ? flat.slice(0, max) + '...' : flat
  }

  return (
    <div className="space-y-6">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">说说管理</h1>
          <p className="mt-1 text-sm text-white/40">共 {list.length} 条说说</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          <Plus size={16} /> 发布说说
        </button>
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
              <div className="h-4 w-3/4 rounded bg-white/10" />
              <div className="mt-3 h-3 w-1/4 rounded bg-white/10" />
            </div>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {!loading && list.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
          <MessageCircle className="h-14 w-14 text-white/20" />
          <p className="mt-4 text-lg font-medium text-white/60">暂无说说</p>
          <p className="mt-1 text-sm text-white/40">点击右上角「发布说说」记录此刻心情</p>
        </div>
      )}

      {/* 说说列表 */}
      {!loading && list.length > 0 && (
        <div className="space-y-3">
          {list.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.03 }}
              className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 transition-colors hover:bg-white/[0.07]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed text-white/80">
                    {preview(item.content)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-white/40">
                    {item.mood && (
                      <span className="inline-flex items-center gap-1">
                        <Smile size={12} /> {item.mood}
                      </span>
                    )}
                    {item.date && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} /> {item.date}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => openEdit(item)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/20"
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

      {/* 新建/编辑弹窗 */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">
                  {isEditing ? '编辑说说' : '发布说说'}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/60">
                    内容 <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    rows={6}
                    placeholder="此刻在想什么..."
                    className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/60">
                    心情 / 标签
                  </label>
                  <input
                    value={form.mood}
                    onChange={(e) => setForm({ ...form, mood: e.target.value })}
                    placeholder="如：开心📷、碎碎念、日常"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-white/30"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting && <Loader2 size={14} className="animate-spin" />}
                    {isEditing ? '保存修改' : '发布'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    删除后无法恢复，确定要删除这条说说吗？
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
                  className="rounded-xl bg-red-500/30 px-4 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/40"
                >
                  确认删除
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast 提示 */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 px-5 py-2.5 text-sm text-white"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
