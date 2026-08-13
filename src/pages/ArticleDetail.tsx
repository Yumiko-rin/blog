import { useMemo, useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { ArrowLeft, Calendar, Clock, Eye, Heart, Tag } from 'lucide-react'
import { ARTICLES } from '@/data/articles'
import { GlassCard } from '@/components/molecules/GlassCard'
import { ArticleTOC } from '@/components/molecules/ArticleTOC'
import { ReadingProgress } from '@/components/molecules/ReadingProgress'
import { CommentSection } from '@/components/molecules/CommentSection'
import { formatDate, formatNumber } from '@/utils/format'
import { bumpArticleViews, getLocalViews, isArticleLiked } from '@/utils/articleMetrics'

const LIKED_KEY = 'liked_posts'

function getLikedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(LIKED_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}
/**
 * ArticleDetail 文章详情页
 * --------------------------------------------------
 * - 根据路由参数 :id 查找文章
 * - Markdown 渲染 + 代码高亮
 * - 悬浮文章目录导航（ArticleTOC）
 * - 底部评论区（CommentSection）
 */
export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>()

  const article = useMemo(
    () => ARTICLES.find((a) => a.id === id),
    [id]
  )

  // 点赞状态：与 boke.hiromu.top 一致，使用 localStorage 持久化
  const [liked, setLiked] = useState<boolean>(() => article ? isArticleLiked(article.id) : false)
  // 本地浏览计数（重置后从现在开始累计）
  const [views, setViews] = useState<number>(() => article ? getLocalViews(article.id) : 0)

  useEffect(() => {
    setLiked(article ? isArticleLiked(article.id) : false)
    // 进入详情页计一次浏览
    if (article) setViews(bumpArticleViews(article.id))
  }, [article])

  function toggleLike() {
    if (!article) return
    const set = getLikedSet()
    let next = false
    if (set.has(article.id)) {
      set.delete(article.id)
    } else {
      set.add(article.id)
      next = true
    }
    try {
      localStorage.setItem(LIKED_KEY, JSON.stringify([...set]))
    } catch {
      /* 忽略存储异常 */
    }
    setLiked(next)
  }

  // 点赞数显示：基础值 + 本地是否已点赞
  const displayLikes = article ? article.likes + (liked ? 1 : 0) : 0

  // 提取 Markdown 标题生成目录
  const headings = useMemo(() => {
    if (!article) return []
    const matches = article.content.match(/^#{1,3}\s+.+$/gm) ?? []
    return matches.map((line) => {
      const level = line.match(/^(#{1,3})/)?.[1].length ?? 1
      const text = line.replace(/^#{1,3}\s+/, '')
      const slug = text
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
        .replace(/^-|-$/g, '')
      return { level, text, slug }
    })
  }, [article])

  // 404
  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <p className="text-lg text-[rgb(var(--text-secondary))]">
          文章不存在或已被删除
        </p>
        <Link
          to="/"
          className="mt-4 text-sm font-medium text-accent hover:underline"
        >
          返回首页
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* 阅读进度条 + 回到顶部 */}
      <ReadingProgress />

      {/* 返回按钮 */}
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-[rgb(var(--text-secondary))] hover:text-accent transition-colors"
      >
        <ArrowLeft size={16} />
        返回首页
      </Link>

      <div className="flex gap-6">
        {/* 主内容区 */}
        <article className="min-w-0 flex-1">
          <GlassCard className="p-5 sm:p-8">
            {/* 文章头部 */}
            <header className="mb-6 border-b border-black/5 pb-6 dark:border-white/5">
              <h1 className="text-2xl font-bold sm:text-3xl">{article.title}</h1>

              {/* 元信息：日期 / 阅读时长 / 浏览量 / 点赞 */}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[rgb(var(--text-secondary))]">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  {formatDate(article.date)}
                </div>
                {article.readingTime > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    {article.readingTime} 分钟阅读
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Eye size={14} />
                  {formatNumber(article.views + views)} 次浏览
                </div>
                <button
                  type="button"
                  onClick={toggleLike}
                  className={`flex items-center gap-1 transition-colors ${
                    liked
                      ? 'text-pink-500 hover:text-pink-600'
                      : 'hover:text-pink-500'
                  }`}
                >
                  <Heart size={14} className={liked ? 'fill-pink-500' : ''} />
                  {formatNumber(displayLikes)} 个点赞
                </button>
                <div className="flex items-center gap-1">
                  <Tag size={14} />
                  {article.tags.map((tag) => (
                    <Link
                      key={tag}
                      to={`/tags?tag=${encodeURIComponent(tag)}`}
                      className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent hover:bg-accent/20 transition-colors"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            </header>

            {/* Markdown 正文 */}
            <div className="prose-custom">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  // 自定义渲染：为标题添加 id 以支持目录跳转
                  h1: ({ children, ...props }) => {
                    const text = typeof children === 'string' ? children : ''
                    const slug = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '')
                    return <h1 id={slug} {...props}>{children}</h1>
                  },
                  h2: ({ children, ...props }) => {
                    const text = typeof children === 'string' ? children : ''
                    const slug = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '')
                    return <h2 id={slug} {...props}>{children}</h2>
                  },
                  h3: ({ children, ...props }) => {
                    const text = typeof children === 'string' ? children : ''
                    const slug = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '')
                    return <h3 id={slug} {...props}>{children}</h3>
                  },
                  pre: ({ children, ...props }) => (
                    <pre
                      className="glass rounded-xl p-4 overflow-x-auto"
                      {...props}
                    >
                      {children}
                    </pre>
                  ),
                  code: ({ className, children, ...props }) => {
                    const isInline = !className
                    if (isInline) {
                      return (
                        <code
                          className="rounded bg-accent/10 px-1.5 py-0.5 text-sm text-accent"
                          {...props}
                        >
                          {children}
                        </code>
                      )
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    )
                  },
                }}
              >
                {article.content}
              </ReactMarkdown>
            </div>
          </GlassCard>

          {/* 评论区（自建 /local-api） */}
          <CommentSection path={`/article/${article.id}`} />
        </article>

        {/* 侧边目录（md 及以上显示） */}
        {headings.length > 0 && (
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-24">
              <ArticleTOC headings={headings} />
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
