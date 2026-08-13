import { useState, type FormEvent } from 'react'
import { Send, User } from 'lucide-react'
import { GlassCard } from './GlassCard'

/**
 * CommentForm 评论表单（受控组件）
 * --------------------------------------------------
 * - 经典评论框布局：左侧头像 + 文本框在上，昵称 + 字数 + 发送按钮在下
 * - 表单验证（必填）
 * - 提交后清空内容
 * - 毛玻璃风格
 */
interface CommentFormProps {
  onSubmit: (name: string, content: string) => void
}

export function CommentForm({ onSubmit }: CommentFormProps) {
  const [name, setName] = useState('')
  const [content, setContent] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedContent = content.trim()
    if (!trimmedName || !trimmedContent) return

    onSubmit(trimmedName, trimmedContent)
    setContent('')
  }

  const canSubmit = name.trim().length > 0 && content.trim().length > 0

  return (
    <GlassCard className="p-4 sm:p-5">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* 头像 + 文本框 */}
        <div className="flex gap-3">
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent ring-1 ring-[rgb(var(--text-secondary))]/15 sm:flex">
            <User size={18} />
          </div>
          <textarea
            placeholder="写下你的评论～"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            maxLength={500}
            required
            className="glass min-h-[72px] flex-1 resize-none rounded-2xl px-4 py-3 text-sm leading-relaxed outline-none transition-colors focus:ring-2 focus:ring-accent/50 placeholder:text-[rgb(var(--text-secondary))]/50"
          />
        </div>

        {/* 昵称 + 字数 + 发送 */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="昵称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            required
            className="glass w-28 rounded-xl px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-accent/50 placeholder:text-[rgb(var(--text-secondary))]/50 sm:w-32"
          />
          <span className="text-xs text-[rgb(var(--text-secondary))]">
            {content.length}/500
          </span>
          <button
            type="submit"
            disabled={!canSubmit}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-accent/80 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-accent/80"
          >
            <Send size={14} />
            发表评论
          </button>
        </div>
      </form>
    </GlassCard>
  )
}
