import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ARTICLES } from '@/data/articles'

/**
 * CategoriesWidget 分类小部件
 */
export function CategoriesWidget() {
  const [collapsed, setCollapsed] = useState(false)

  // 按标签聚合文章
  const tagCounts = ARTICLES.reduce((acc, article) => {
    article.tags.forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1
    })
    return acc
  }, {} as Record<string, number>)

  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])

  return (
    <div className="widget-card">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-md bg-accent" />
          <span className="text-sm font-bold text-[rgb(var(--text-primary))]">分类</span>
        </div>
        {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
      {!collapsed && (
        <div className="px-3 pb-3 space-y-1.5">
          {sortedTags.map(([tag, count]) => (
            <div
              key={tag}
              className="flex items-center justify-between py-1.5 px-2 rounded-lg
                hover:bg-accent/5 transition-colors cursor-pointer group"
            >
              <span className="text-sm text-[rgb(var(--text-secondary))] group-hover:text-accent transition-colors">
                {tag}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/8 text-accent font-bold">
                {count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CategoriesWidget
