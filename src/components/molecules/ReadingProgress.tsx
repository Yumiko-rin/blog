import { useState, useEffect } from 'react'
import { ChevronUp } from 'lucide-react'

/**
 * 阅读进度条 + 回到顶部
 * 对齐 boke.hiromu.top / Kirameku 的 ReadingProgress：
 * - 顶部渐变进度条随滚动填充
 * - 滚动超过一屏后出现「回到顶部」悬浮按钮
 */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0)
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
      setProgress(Math.min(pct, 100))
      setShowTop(scrollTop > 300)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <>
      {/* 阅读进度条 */}
      <div className="fixed top-0 left-0 w-full h-1 z-50">
        <div
          className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 回到顶部 */}
      {showTop && (
        <button
          type="button"
          onClick={toTop}
          aria-label="回到顶部"
          className="fixed right-4 bottom-24 z-[10002] md:right-6 md:bottom-28 w-10 h-10 md:w-12 md:h-12 rounded-full
            bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50
            shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 transition-all"
        >
          <ChevronUp className="w-5 h-5 text-[rgb(var(--text-secondary))]" />
        </button>
      )}
    </>
  )
}

export default ReadingProgress
