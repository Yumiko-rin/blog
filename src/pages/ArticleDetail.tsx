import { useMemo, useState, useEffect, isValidElement, type ReactNode } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { ArrowLeft, Calendar, Clock, Eye, Loader2 } from 'lucide-react'
import { ARTICLES, loadArticleBySlug } from '@/data/articles'
import { GlassCard } from '@/components/molecules/GlassCard'
import { ArticleTOC } from '@/components/molecules/ArticleTOC'
import { ReadingProgress } from '@/components/molecules/ReadingProgress'
import { CommentSection } from '@/components/molecules/CommentSection'
import { CodeBlock } from '@/components/home/CodeBlockEnhance'
import { LikeHeartAnimation } from '@/components/home/LikeHeartAnimation'
import { formatDate, formatNumber } from '@/utils/format'
import { bumpArticleViews, getLocalViews } from '@/utils/articleMetrics'

/** 从 React 子节点中递归提取纯文本（用于标题 ID 生成） */
function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (isValidElement(node)) return extractText(node.props.children)
  return ''
}

/** 生成标题 slug */
function slugify(children: ReactNode): string {
  return extractText(children)
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-|-$/g, '')
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

  const [article, setArticle] = useState(() => ARTICLES.find((a) => a.id === id))
  const [loading, setLoading] = useState(() => !ARTICLES.find((a) => a.id === id))

  // 异步加载合并后的文章（后台发布的 + 静态内置），静态数据作为初始值兜底
  useEffect(() => {
    const fallback = ARTICLES.find((a) => a.id === id)
    setArticle(fallback)
    if (!id) { setLoading(false); return }
    setLoading(!fallback)
    let alive = true
    loadArticleBySlug(id).then((a) => {
      if (alive) {
        setArticle(a ?? fallback)
        setLoading(false)
      }
    }).catch(() => {
      if (alive) setLoading(false)
    })
    return () => { alive = false }
  }, [id])

  // 本地浏览计数（重置后从现在开始累计）
  const [views, setViews] = useState<number>(() => article ? getLocalViews(article.id) : 0)

  useEffect(() => {
    // 进入详情页计一次浏览（按 id 触发，避免异步加载导致的重复计数）
    if (article) setViews(bumpArticleViews(article.id))
  }, [article?.id])

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

  // 加载中
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="mt-4 text-sm text-[rgb(var(--text-secondary))]">加载中...</p>
      </div>
    )
  }

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
                <div className="flex items-center gap-1 text-[rgb(var(--text-secondary))]">
                  <LikeHeartAnimation articleId={article.id} baseLikes={article.likes} />
                  <span className="text-sm">个点赞</span>
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
                    const slug = slugify(children)
                    return <h1 id={slug} {...props}>{children}</h1>
                  },
                  h2: ({ children, ...props }) => {
                    const slug = slugify(children)
                    return <h2 id={slug} {...props}>{children}</h2>
                  },
                  h3: ({ children, ...props }) => {
                    const slug = slugify(children)
                    return <h3 id={slug} {...props}>{children}</h3>
                  },
                  pre: ({ children }) => {
                    const child = Array.isArray(children) ? children[0] : children
                    const childProps = (child as React.ReactElement)?.props || {}
                    return (
                      <CodeBlock className={childProps.className}>
                        {childProps.children}
                      </CodeBlock>
                    )
                  },
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
