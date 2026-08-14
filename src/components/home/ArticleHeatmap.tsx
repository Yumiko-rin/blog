import { useState, useEffect, useMemo } from 'react'
import { ARTICLES, loadArticles } from '@/data/articles'
import { Calendar } from 'lucide-react'

/**
 * ArticleHeatmap 文章发布热力图
 * 类 GitHub 贡献图，展示最近 12 周的文章发布频率
 */

interface Cell {
  date: Date
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

const WEEKS = 12

function getLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count <= 2) return 2
  if (count <= 4) return 3
  return 4
}

const LEVEL_COLORS = [
  'rgba(124, 92, 252, 0.06)',
  'rgba(124, 92, 252, 0.25)',
  'rgba(124, 92, 252, 0.45)',
  'rgba(124, 92, 252, 0.7)',
  'rgba(124, 92, 252, 1)',
]

const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

export function ArticleHeatmap() {
  const [articles, setArticles] = useState(ARTICLES)

  useEffect(() => {
    loadArticles().then(setArticles)
  }, [])

  const { cells, totalPosts, activeDays } = useMemo(() => {
    // 构建日期 -> 文章数映射
    const dateCount = new Map<string, number>()
    articles.forEach(a => {
      const key = a.date.substring(0, 10)
      dateCount.set(key, (dateCount.get(key) || 0) + 1)
    })

    // 生成最近 WEEKS 周的网格
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const cells: Cell[] = []
    const monthLabels: { week: number; label: string }[] = []

    // 从 WEEKS 周前的周日开始
    const start = new Date(today)
    const dayOfWeek = start.getDay()
    start.setDate(start.getDate() - dayOfWeek - (WEEKS - 1) * 7)

    let lastMonth = -1
    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < 7; d++) {
        const date = new Date(start)
        date.setDate(start.getDate() + w * 7 + d)
        if (date > today) {
          cells.push({ date, count: 0, level: 0 })
          continue
        }
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        const count = dateCount.get(key) || 0
        cells.push({ date, count, level: getLevel(count) })
      }
      const month = start.getMonth() + w
      if (month !== lastMonth && w > 0) {
        monthLabels.push({ week: w, label: MONTH_NAMES[start.getMonth() + w] || '' })
        lastMonth = month
      }
    }

    const totalPosts = cells.reduce((sum, c) => sum + c.count, 0)
    const activeDays = cells.filter(c => c.count > 0).length

    return { cells, monthLabels, totalPosts, activeDays }
  }, [articles])

  return (
    <div className="widget-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-accent" />
          <span className="text-sm font-medium text-[rgb(var(--text-primary))]">发布热力图</span>
        </div>
        <span className="text-xs text-[rgb(var(--text-secondary))]">
          {totalPosts} 篇 · {activeDays} 天
        </span>
      </div>

      {/* 热力图网格 */}
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1 min-w-full">
          {/* 星期标签 + 网格 */}
          <div className="flex gap-1">
            {/* 星期标签 */}
            <div className="flex flex-col gap-1 text-[8px] text-[rgb(var(--text-secondary))] justify-around pr-1">
              <span>一</span>
              <span>三</span>
              <span>五</span>
              <span>日</span>
            </div>
            {/* 网格 */}
            <div className="flex gap-1 flex-1">
              {Array.from({ length: WEEKS }, (_, w) => (
                <div key={w} className="flex flex-col gap-1 flex-1">
                  {Array.from({ length: 7 }, (_, d) => {
                    const idx = w * 7 + d
                    const cell = cells[idx]
                    if (!cell) return <div key={d} className="aspect-square rounded-sm" />
                    return (
                      <div
                        key={d}
                        className="aspect-square rounded-sm transition-transform hover:scale-125 cursor-default"
                        style={{ background: LEVEL_COLORS[cell.level] }}
                        title={`${cell.date.getMonth() + 1}月${cell.date.getDate()}日: ${cell.count} 篇文章`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* 图例 */}
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-[9px] text-[rgb(var(--text-secondary))] mr-1">少</span>
            {LEVEL_COLORS.map((color, i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-sm"
                style={{ background: color }}
              />
            ))}
            <span className="text-[9px] text-[rgb(var(--text-secondary))] ml-1">多</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ArticleHeatmap
