import { CommentSection } from '@/components/molecules/CommentSection'

/**
 * 留言板页面
 * 由原「朋友圈」改造而来：移除原有的说说流与发布框，
 * 仅保留一个评论区（与 denia.sigrika.cc 的评论区风格一致）。
 */
export default function Moments() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl text-[rgb(var(--text-primary))]">留言板</h1>
        <p className="mt-2 text-[rgb(var(--text-secondary))]">欢迎在这里留下你的足迹～</p>
      </header>

      <CommentSection path="/guestbook" />
    </div>
  )
}
