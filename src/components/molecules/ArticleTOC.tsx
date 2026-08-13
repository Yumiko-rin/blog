import { useEffect, useState } from 'react'
import { GlassCard } from './GlassCard'

/**
 * TOC 标题项
 */
interface TOCHeading {
  level: number
  text: string
  slug: string
}

/**
 * ArticleTOC 文章目录悬浮导航
 * --------------------------------------------------
 * - 根据 Markdown 提取的标题生成目录树
 * - 高亮当前可视区域对应的标题
 * - 点击平滑滚动到对应位置
 * - 固定在侧边（sticky），md 及以上显示
 */
interface ArticleTOCProps {
  headings: TOCHeading[]
}

export function ArticleTOC({ headings }: ArticleTOCProps) {
  const [activeSlug, setActiveSlug] = useState('')

  // Intersection Observer 监听标题进入视口
  useEffect(() => {
    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSlug(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    )

    // 延迟挂载，等待 DOM 渲染完成
    const timer = setTimeout(() => {
      headings.forEach(({ slug }) => {
        const el = document.getElementById(slug)
        if (el) observer.observe(el)
      })
    }, 100)

    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [headings])

  /** 点击滚动到标题 */
  const scrollTo = (slug: string) => {
    const el = document.getElementById(slug)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (headings.length === 0) return null

  return (
    <GlassCard className="p-4">
      <h3 className="mb-3 text-sm font-bold">目录</h3>
      <nav className="flex flex-col gap-1">
        {headings.map(({ level, text, slug }) => (
          <button
            key={slug}
            type="button"
            onClick={() => scrollTo(slug)}
            className={`truncate text-left text-xs transition-colors ${
              level === 1 ? 'pl-0' : level === 2 ? 'pl-3' : 'pl-6'
            } ${
              activeSlug === slug
                ? 'font-medium text-accent'
                : 'text-[rgb(var(--text-secondary))] hover:text-accent'
            }`}
          >
            {text}
          </button>
        ))}
      </nav>
    </GlassCard>
  )
}
