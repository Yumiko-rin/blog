import { Home } from 'lucide-react'
import { ARTICLES } from '@/data/articles'
import { playClickSound } from '@/utils/sounds'

interface CategoryFilterBarProps {
  activeCategory: string | null
  onCategoryChange: (category: string | null) => void
}

/**
 * CategoryFilterBar 分类筛选栏
 * 水平滚动的分类标签，用于筛选文章
 */
export function CategoryFilterBar({ activeCategory, onCategoryChange }: CategoryFilterBarProps) {
  // 按标签聚合
  const tagCounts = ARTICLES.reduce((acc, article) => {
    article.tags.forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1
    })
    return acc
  }, {} as Record<string, number>)

  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-2 mb-4">
      <button
        type="button"
        onClick={() => {
          playClickSound()
          onCategoryChange(null)
        }}
        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
          transition-all duration-200 ${
          activeCategory === null
            ? 'bg-accent text-white shadow-md shadow-accent/25'
            : 'bg-white/60 dark:bg-white/5 text-[rgb(var(--text-secondary))] hover:bg-accent/10 border border-transparent hover:border-accent/20'
        }`}
      >
        <Home size={14} />
        全部
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
          activeCategory === null ? 'bg-white/20' : 'bg-accent/10'
        }`}>
          {ARTICLES.length}
        </span>
      </button>

      <div className="w-px h-4 bg-[rgb(var(--text-secondary))]/20 shrink-0" />

      {sortedTags.map(([tag, count]) => (
        <button
          key={tag}
          type="button"
          onClick={() => {
            playClickSound()
            onCategoryChange(activeCategory === tag ? null : tag)
          }}
          className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium
            transition-all duration-200 ${
            activeCategory === tag
              ? 'bg-accent text-white shadow-md shadow-accent/25'
              : 'bg-white/60 dark:bg-white/5 text-[rgb(var(--text-secondary))] hover:bg-accent/10 border border-transparent hover:border-accent/20'
          }`}
        >
          {tag}
          <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${
            activeCategory === tag ? 'bg-white/20' : 'bg-accent/10'
          }`}>
            {count}
          </span>
        </button>
      ))}
    </div>
  )
}

export default CategoryFilterBar
