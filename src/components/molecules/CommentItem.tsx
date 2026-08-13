import { User } from 'lucide-react'
import type { Comment } from '@/types'

interface CommentItemProps {
  comment: Comment
  /** 楼层序号（从 0 开始），用于显示 #楼层 */
  index?: number
}

/**
 * 将存储的时间格式化为「相对时间 + 日期」展示
 * - 兼容旧数据：仅 "YYYY-MM-DD" 的日期字符串
 * - 新数据：完整 ISO 时间戳，可显示「刚刚 / x 分钟前 / 今天 / 昨天」
 */
function formatCommentTime(raw: string): string {
  const d = new Date(raw)
  if (isNaN(d.getTime())) return raw

  const isFull = raw.includes('T')
  const now = new Date()
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)

  if (isFull && diffMin >= 0 && diffMin < 1) return '刚刚'
  if (isFull && diffMin >= 1 && diffMin < 60) return `${diffMin} 分钟前`
  const diffHr = Math.floor(diffMin / 60)
  if (isFull && diffHr >= 1 && diffHr < 24) return `${diffHr} 小时前`

  const dateStr = raw.slice(0, 10)
  const today = now.toISOString().slice(0, 10)
  const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10)
  if (dateStr === today) return '今天'
  if (dateStr === yesterday) return '昨天'

  const y = d.getFullYear()
  const mm = `${d.getMonth() + 1}`.padStart(2, '0')
  const dd = `${d.getDate()}`.padStart(2, '0')
  return y === now.getFullYear() ? `${mm}-${dd}` : `${y}-${mm}-${dd}`
}

/**
 * CommentItem 单条评论（受控组件）
 * --------------------------------------------------
 * - 头像（默认占位符）+ 昵称 + 楼层 + 时间 + 内容
 * - 以「行」的形式排列，交由列表统一承载分隔线
 */
export function CommentItem({ comment, index }: CommentItemProps) {
  return (
    <div className="flex gap-3 border-t border-[rgb(var(--text-secondary))]/10 px-1 py-4 first:border-t-0 first:pt-1">
      {/* 头像 */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/15 text-accent ring-1 ring-[rgb(var(--text-secondary))]/15">
        {comment.avatar ? (
          <img
            src={comment.avatar}
            alt={comment.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <User size={18} />
        )}
      </div>

      {/* 昵称 / 时间 / 内容 */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium text-[rgb(var(--text-primary))]">
            {comment.name}
          </span>
          {typeof index === 'number' && (
            <span className="text-xs text-[rgb(var(--text-secondary))]/70">
              #{index + 1}
            </span>
          )}
          <span className="text-xs text-[rgb(var(--text-secondary))]">
            {formatCommentTime(comment.date)}
          </span>
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-[rgb(var(--text-primary))]/90">
          {comment.content}
        </p>
      </div>
    </div>
  )
}
