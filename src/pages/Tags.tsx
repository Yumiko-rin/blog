import { useMemo, useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ARTICLES, loadArticles } from '@/data/articles'
import { GlassCard } from '@/components/molecules/GlassCard'
import { getArticleViews } from '@/utils/articleMetrics'

/**
 * Tags 标签分类页
 */
export default function Tags() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTag = searchParams.get('tag')

  const [articles, setArticles] = useState(ARTICLES)

  // 异步加载文章（后台发布的 + 静态内置合并），静态数据作为初始值避免空白闪烁
  useEffect(() => {
    loadArticles().then(setArticles)
  }, [])

  // 从加载后的文章列表中计算标签聚合
  const articlesByTag = useMemo(() => {
    return articles.reduce((acc, article) => {
      article.tags.forEach((tag) => {
        if (!acc[tag]) acc[tag] = []
        acc[tag].push(article)
      })
      return acc
    }, {} as Record<string, typeof articles>)
  }, [articles])

  const allTags = useMemo(
    () => [...new Set(articles.flatMap((a) => a.tags))],
    [articles]
  )

  const displayedArticles = useMemo(() => {
    if (!activeTag) return []
    return articlesByTag[activeTag] ?? []
  }, [activeTag, articlesByTag])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl text-[rgb(var(--text-primary))]">标签分类</h1>
        <p className="mt-2 text-[rgb(var(--text-secondary))]">通过标签找到你感兴趣的内容～</p>
      </header>

      {/* 标签云 */}
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {allTags.map((tag) => {
          const isActive = tag === activeTag
          const count = articlesByTag[tag]?.length ?? 0
          return (
            <button key={tag} type="button"
              onClick={() => isActive ? setSearchParams({}) : setSearchParams({ tag })}
              className={`card inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-accent/15 text-accent ring-2 ring-accent'
                  : 'hover:bg-accent/10 text-[rgb(var(--text-secondary))]'
              }`}>
              #{tag}
              <span className="text-xs text-[rgb(var(--text-tertiary))]">({count})</span>
            </button>
          )
        })}
      </div>

      {/* 筛选结果 */}
      {activeTag ? (
        <div>
          <h2 className="mb-4 text-lg font-bold text-[rgb(var(--text-primary))]">标签「{activeTag}」下的文章</h2>
          {displayedArticles.length > 0 ? (
            <div className="flex flex-col gap-4">
              {displayedArticles.map((article) => (
                <Link key={article.id} to={`/article/${article.id}`}>
                  <GlassCard className="group p-4 hover:shadow-lg hover:shadow-accent/10 transition-all">
                    <h3 className="font-bold group-hover:text-accent transition-colors">{article.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-[rgb(var(--text-secondary))]">{article.excerpt}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-[rgb(var(--text-tertiary))]">
                      <span>{article.date}</span>
                      <span>{getArticleViews(article)} 阅读</span>
                    </div>
                  </GlassCard>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-[rgb(var(--text-secondary))]">该标签下暂无文章</div>
          )}
        </div>
      ) : (
        <div className="py-12 text-center text-[rgb(var(--text-secondary))]">← 点击上方标签查看文章</div>
      )}
    </div>
  )
}
