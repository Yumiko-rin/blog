import { MessageSquareDashed } from 'lucide-react'
import type { Comment } from '@/types'
import { CommentItem } from './CommentItem'
import { GlassCard } from './GlassCard'

/**
 * CommentList 评论列表（受控组件）
 * --------------------------------------------------
 * - 整列评论承载于一个玻璃容器，条目间用细分隔线区隔
 * - 空状态提示
 * - 纯展示，无内部状态
 */
interface CommentListProps {
  comments: Comment[]
}

export function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-[rgb(var(--text-secondary))]/20 py-10 text-center">
        <MessageSquareDashed size={28} className="mb-2 text-[rgb(var(--text-secondary))]/50" />
        <p className="text-sm text-[rgb(var(--text-secondary))]">
          还没有评论，快来抢沙发吧～
        </p>
      </div>
    )
  }

  return (
    <GlassCard className="px-4 py-1 sm:px-5">
      {comments.map((comment, i) => (
        <CommentItem key={comment.id} comment={comment} index={i} />
      ))}
    </GlassCard>
  )
}
