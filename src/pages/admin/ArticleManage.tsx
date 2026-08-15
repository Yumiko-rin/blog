import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, X, FileText, Loader2, Tag, Calendar, Upload, Info, ChevronDown, Eye, Edit3 } from 'lucide-react'
import { adminApi } from '@/utils/adminApi'
import { useToast } from '@/hooks/useToast'
import { Toast } from '@/components/admin/Toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { CodeBlock } from '@/components/home/CodeBlockEnhance'

/** 后台文章条目 */
interface ArticleItem {
  id: string
  slug?: string
  title: string
  category: string
  excerpt: string
  content: string
  date: string
  cover?: string
  tags?: string[] | string
  isPinned?: boolean
}

/** 文章表单数据 */
interface ArticleForm {
  id?: string
  title: string
  slug: string
  category: string
  excerpt: string
  content: string
  cover: string
  tags: string
  date: string
  isPinned: boolean
}

const EMPTY_FORM: ArticleForm = {
  title: '',
  slug: '',
  category: '',
  excerpt: '',
  content: '',
  cover: '',
  tags: '',
  date: new Date().toISOString().slice(0, 10),
  isPinned: false,
}

export default function ArticleManage() {
  const [articles, setArticles] = useState<ArticleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<ArticleForm>(EMPTY_FORM)
  const [isEditing, setIsEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const { toast, showToast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [previewTab, setPreviewTab] = useState<'edit' | 'preview'>('edit')
  const fileInputRef = useRef<HTMLInputElement>(null)

  /** 加载文章列表 */
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { list } = await adminApi.listArticles()
      setArticles(list as ArticleItem[])
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  /** 打开新建弹窗 */
  const openCreate = () => {
    setForm(EMPTY_FORM)
    setIsEditing(false)
    setModalOpen(true)
  }

  /** 打开编辑弹窗 */
  const openEdit = (item: ArticleItem) => {
    setForm({
      id: item.id,
      title: item.title || '',
      slug: item.slug || item.id || '',
      category: item.category || '',
      excerpt: item.excerpt || '',
      content: item.content || '',
      cover: item.cover || '',
      tags: Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || ''),
      date: item.date || new Date().toISOString().slice(0, 10),
      isPinned: item.isPinned || false,
    })
    setIsEditing(true)
    setModalOpen(true)
  }

  /** 提交表单（新建/编辑） */
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      showToast('请填写标题')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        slug: form.slug.trim() || undefined,
        cover: form.cover.trim(),
        tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
        date: form.date || new Date().toISOString().slice(0, 10),
        isPinned: form.isPinned,
      }
      if (isEditing && form.id) {
        await adminApi.updateArticle(payload)
        showToast('文章已更新')
      } else {
        await adminApi.createArticle(payload)
        showToast('文章已创建')
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
      await adminApi.deleteArticle(deleteId)
      showToast('文章已删除')
      setDeleteId(null)
      void load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除失败')
      setDeleteId(null)
    }
  }

  /** 上传 Markdown 文件 */
  const handleUploadArticle = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await adminApi.uploadArticleMarkdown(file)
      showToast('文章上传成功')
      void load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : '上传失败')
    } finally {
      setUploading(false)
      // 重置 input，允许再次选择同一文件
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* 隐藏的文件选择器 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md"
        className="hidden"
        onChange={handleUploadArticle}
      />

      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">文章管理</h1>
          <p className="mt-1 text-sm text-white/40">
            共 {articles.length} 篇文章
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            <Plus size={16} /> 新建文章
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? '上传中...' : '上传 Markdown'}
          </button>
        </div>
      </div>

      {/* Markdown frontmatter 格式提示 */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <button
          onClick={() => setShowHint(!showHint)}
          className="flex w-full items-center gap-2 px-4 py-3 text-sm text-white/60 transition-colors hover:text-white/80"
        >
          <Info size={14} />
          <span>Markdown frontmatter 格式说明</span>
          <ChevronDown
            size={14}
            className={`ml-auto transition-transform ${showHint ? 'rotate-180' : ''}`}
          />
        </button>
        <AnimatePresence>
          {showHint && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <pre className="mx-4 mb-4 overflow-x-auto rounded-xl bg-black/30 p-4 text-xs leading-relaxed text-white/70">
{`---
title: 文章标题
date: 2026-08-14
category: 技术
tags: [React, TypeScript]
cover: https://example.com/cover.jpg
excerpt: 文章摘要
---

正文内容...`}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
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
              <div className="h-5 w-2/3 rounded bg-white/10" />
              <div className="mt-3 h-4 w-1/3 rounded bg-white/10" />
            </div>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {!loading && articles.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
          <FileText className="h-14 w-14 text-white/20" />
          <p className="mt-4 text-lg font-medium text-white/60">暂无文章</p>
          <p className="mt-1 text-sm text-white/40">点击右上角「新建文章」开始创作</p>
        </div>
      )}

      {/* 文章列表 */}
      {!loading && articles.length > 0 && (
        <div className="space-y-3">
          {articles.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.03 }}
              className="group flex items-center justify-between gap-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 transition-colors hover:bg-white/[0.07]"
            >
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-semibold text-white">
                  {item.title}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-white/40">
                  {item.category && (
                    <span className="inline-flex items-center gap-1">
                      <Tag size={12} /> {item.category}
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
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">
                  {isEditing ? '编辑文章' : '新建文章'}
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
                    标题 <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="请输入文章标题"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/60">
                    分类
                  </label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="如：技术、随笔、未分类"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-white/30"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-white/60">
                      URL 别名（留空自动生成）
                    </label>
                    <input
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      placeholder="如：my-first-post"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-white/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-white/60">
                      发布日期
                    </label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-white/30"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPinned}
                    onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                    className="accent-blue-500 h-4 w-4"
                  />
                  置顶文章
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-white/60">
                      封面图片 URL
                    </label>
                    <input
                      value={form.cover}
                      onChange={(e) => setForm({ ...form, cover: e.target.value })}
                      placeholder="https://example.com/cover.jpg"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-white/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-white/60">
                      标签（逗号分隔）
                    </label>
                    <input
                      value={form.tags}
                      onChange={(e) => setForm({ ...form, tags: e.target.value })}
                      placeholder="React, TypeScript, 前端"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-white/30"
                    />
                  </div>
                </div>

                {form.cover && (
                  <div className="overflow-hidden rounded-xl border border-white/10">
                    <img
                      src={form.cover}
                      alt="封面预览"
                      loading="lazy"
                      decoding="async"
                      className="h-32 w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/60">
                    摘要
                  </label>
                  <textarea
                    value={form.excerpt}
                    onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                    rows={2}
                    placeholder="一句话概括文章内容"
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/60">
                    内容（Markdown）
                  </label>
                  {/* 编辑器/预览切换标签 */}
                  <div className="mb-2 flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-0.5 w-fit">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('edit')}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        previewTab === 'edit'
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      <Edit3 size={13} /> 编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('preview')}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        previewTab === 'preview'
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      <Eye size={13} /> 预览
                    </button>
                  </div>
                  {previewTab === 'edit' ? (
                    <textarea
                      value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                      rows={10}
                      placeholder="支持 Markdown 语法..."
                      className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-mono text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-white/30"
                    />
                  ) : (
                    <div className="min-h-[260px] rounded-xl border border-white/10 bg-white/5 px-5 py-4 leading-relaxed text-white/80 max-w-none overflow-auto" style={{ fontSize: '1rem', lineHeight: 1.85, letterSpacing: '0.01em' }}>
                      {form.content ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                          components={{
                            h1: ({ children }) => (
                              <h1 className="font-extrabold text-white mt-8 mb-3 pb-2 border-b border-white/10" style={{ fontSize: '1.75rem', lineHeight: 1.3 }}>
                                {children}
                              </h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="font-bold text-white mt-7 mb-3" style={{ fontSize: '1.4rem', lineHeight: 1.35, paddingLeft: '0.6em', borderLeft: '4px solid rgba(180,130,220,0.6)' }}>
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="font-bold text-white mt-6 mb-2" style={{ fontSize: '1.15rem', lineHeight: 1.4 }}>
                                {children}
                              </h3>
                            ),
                            p: ({ children }) => (
                              <p className="text-white/80 leading-relaxed" style={{ margin: '1.1em 0' }}>{children}</p>
                            ),
                            a: ({ href, children }) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent no-underline"
                                style={{ borderBottom: '1px dashed rgba(180,130,220,0.4)' }}
                              >
                                {children}
                              </a>
                            ),
                            ul: ({ children }) => (
                              <ul className="pl-6 list-disc text-white/80" style={{ margin: '1em 0' }}>{children}</ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="pl-6 list-decimal text-white/80" style={{ margin: '1em 0' }}>{children}</ol>
                            ),
                            li: ({ children }) => (
                              <li style={{ margin: '0.4em 0' }}>{children}</li>
                            ),
                            blockquote: ({ children }) => (
                              <blockquote
                                className="italic rounded-r-lg text-white/70"
                                style={{
                                  margin: '1.2em 0',
                                  padding: '0.6em 1.2em',
                                  borderLeft: '4px solid rgba(180,130,220,0.6)',
                                  background: 'rgba(255,255,255,0.03)',
                                }}
                              >
                                {children}
                              </blockquote>
                            ),
                            code: ({ className, children }) => {
                              const isInline = !className
                              if (isInline) {
                                return (
                                  <code className="rounded font-mono text-accent" style={{ fontSize: '0.85em', padding: '0.15em 0.4em', background: 'rgba(180,130,220,0.1)' }}>
                                    {children}
                                  </code>
                                )
                              }
                              return <code className={className}>{children}</code>
                            },
                            pre: ({ children }) => (
                              <CodeBlock className={''}>{children}</CodeBlock>
                            ),
                            img: ({ src, alt }) => (
                              <img
                                src={src}
                                alt={alt || ''}
                                loading="lazy"
                                decoding="async"
                                className="rounded-lg max-w-full"
                                style={{ margin: '1.2em auto', display: 'block', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                            ),
                            table: ({ children }) => (
                              <div className="overflow-x-auto" style={{ margin: '1.2em 0' }}>
                                <table className="w-full text-sm text-white/80" style={{ borderCollapse: 'collapse', fontSize: '0.9rem' }}>{children}</table>
                              </div>
                            ),
                            thead: ({ children }) => (
                              <thead style={{ background: 'rgba(255,255,255,0.05)' }}>{children}</thead>
                            ),
                            th: ({ children }) => (
                              <th className="text-left font-bold text-white" style={{ padding: '0.6em 1em', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td style={{ padding: '0.6em 1em', border: '1px solid rgba(255,255,255,0.06)' }}>{children}</td>
                            ),
                            hr: () => (
                              <hr style={{ border: 'none', height: '1px', margin: '2em 0', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent)' }} />
                            ),
                            strong: ({ children }) => (
                              <strong className="font-bold text-white">{children}</strong>
                            ),
                            em: ({ children }) => (
                              <em className="italic">{children}</em>
                            ),
                            del: ({ children }) => (
                              <del className="text-white/50">{children}</del>
                            ),
                          }}
                        >
                          {form.content}
                        </ReactMarkdown>
                      ) : (
                        <div className="flex items-center justify-center h-48 text-white/20">
                          <span className="text-sm">暂无内容，切换到「编辑」标签开始写作</span>
                        </div>
                      )}
                    </div>
                  )}
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
                    {isEditing ? '保存修改' : '创建文章'}
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
                    删除后无法恢复，确定要删除这篇文章吗？
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
      <Toast message={toast} />
    </div>
  )
}
