import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Clock, Eye, Heart, Tag } from 'lucide-react'
import { ARTICLES } from '@/data/articles'
import { GlassCard } from '@/components/molecules/GlassCard'
import { formatDate, formatNumber } from '@/utils/format'
import { getArticleViews, getArticleLikes } from '@/utils/articleMetrics'
/**
 * Archive 文章归档页
 */
export default function Archive() {

  const grouped = useMemo(() => {
    const sorted = [...ARTICLES].sort((a, b) => b.date.localeCompare(a.date))
    const groups: Record<string, typeof ARTICLES> = {}
    sorted.forEach((article) => {
      const year = article.date.slice(0, 4)
      if (!groups[year]) groups[year] = []
      groups[year].push(article)
    })
    return groups
  }, [])

  const years = Object.keys(grouped).sort((a, b) => Number(b) - Number(a))

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl text-[rgb(var(--text-primary))]">📝 文章归档</h1>
        <p className="mt-2 text-[rgb(var(--text-secondary))]">共 {ARTICLES.length} 篇文章，记录学习与思考</p>
      </header>

      <div className="relative">
        <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-px bg-accent/20" />

        {years.map((year) => (
          <div key={year} className="mb-8">
            <div className="relative flex items-center gap-3 mb-4">
              <div className="relative z-10 w-8 sm:w-12 h-8 sm:h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <span className="text-sm sm:text-base font-black text-accent">{year}</span>
              </div>
              <span className="text-sm text-[rgb(var(--text-secondary))]/60">{grouped[year].length} 篇文章</span>
            </div>

            <div className="flex flex-col gap-3 ml-4 sm:ml-6">
              {grouped[year].map((article) => (
                <Link key={article.id} to={`/article/${article.id}`}>
                  <GlassCard className="group p-4 transition-all duration-200 hover:shadow-lg hover:shadow-accent/10">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-[rgb(var(--text-primary))] group-hover:text-accent transition-colors truncate">
                          {article.title}
                        </h3>
                        <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]/60 line-clamp-1">{article.excerpt}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[rgb(var(--text-secondary))]/60">
                          <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(article.date)}</span>
                          {article.readingTime > 0 && (
                            <span className="flex items-center gap-1"><Clock size={12} />{article.readingTime} 分钟</span>
                          )}
                          <span className="flex items-center gap-1"><Eye size={12} />{formatNumber(getArticleViews(article))}</span>
                          <span className="flex items-center gap-1"><Heart size={12} />{formatNumber(getArticleLikes(article))}</span>
                          <span className="flex items-center gap-1"><Tag size={12} />{article.tags.join(' / ')}</span>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
