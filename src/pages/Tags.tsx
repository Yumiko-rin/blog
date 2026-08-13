import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getArticlesByTag, ALL_TAGS } from '@/data/articles'
import { GlassCard } from '@/components/molecules/GlassCard'
import { getArticleViews } from '@/utils/articleMetrics'

/**
 * Tags 标签分类页
 */
export default function Tags() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTag = searchParams.get('tag')

  const articlesByTag = useMemo(() => getArticlesByTag(), [])

  const displayedArticles = useMemo(() => {
    if (!activeTag) return []
    return articlesByTag[activeTag] ?? []
  }, [activeTag, articlesByTag])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl text-gray-800 dark:text-gray-200">标签分类</h1>
        <p className="mt-2 text-gray-500">通过标签找到你感兴趣的内容～</p>
      </header>

      {/* 标签云 */}
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {ALL_TAGS.map((tag) => {
          const isActive = tag === activeTag
          const count = articlesByTag[tag]?.length ?? 0
          return (
            <button key={tag} type="button"
              onClick={() => isActive ? setSearchParams({}) : setSearchParams({ tag })}
              className={`card inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-500/15 text-indigo-500 ring-2 ring-indigo-500'
                  : 'hover:bg-indigo-500/10 text-gray-700 dark:text-gray-300'
              }`}>
              #{tag}
              <span className="text-xs text-gray-400">({count})</span>
            </button>
          )
        })}
      </div>

      {/* 筛选结果 */}
      {activeTag ? (
        <div>
          <h2 className="mb-4 text-lg font-bold">标签「{activeTag}」下的文章</h2>
          {displayedArticles.length > 0 ? (
            <div className="flex flex-col gap-4">
              {displayedArticles.map((article) => (
                <Link key={article.id} to={`/article/${article.id}`}>
                  <GlassCard className="group p-4 hover:shadow-lg hover:shadow-indigo-500/10 transition-all">
                    <h3 className="font-bold group-hover:text-indigo-500 transition-colors">{article.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-500">{article.excerpt}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                      <span>{article.date}</span>
                      <span>{getArticleViews(article)} 阅读</span>
                    </div>
                  </GlassCard>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">该标签下暂无文章</div>
          )}
        </div>
      ) : (
        <div className="py-12 text-center text-gray-500">← 点击上方标签查看文章</div>
      )}
    </div>
  )
}
