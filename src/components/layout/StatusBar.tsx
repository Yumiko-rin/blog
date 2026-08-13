import { useState, useEffect } from 'react'
import { ARTICLES } from '@/data/articles'
import { FRIENDS } from '@/data/friends'

/**
 * StatusBar 底部状态栏
 * --------------------------------------------------
 * - 左侧：运行时间计数器（黑底白字，像素风）
 * - 中间：内容统计（说说/项目/照片/杂谈 数量）
 * - 右侧：技术栈徽章
 * - 固定底部，毛玻璃背景
 */
export function StatusBar() {
  const [uptime, setUptime] = useState('00:00:00')

  // 运行时间计数器（从首次访问开始计算）
  useEffect(() => {
    const startTime = localStorage.getItem('blog_start_time')
    if (!startTime) {
      localStorage.setItem('blog_start_time', Date.now().toString())
    }
    const base = Number(startTime || Date.now())

    const tick = () => {
      const diff = Math.floor((Date.now() - base) / 1000)
      const h = String(Math.floor(diff / 3600)).padStart(2, '0')
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0')
      const s = String(diff % 60).padStart(2, '0')
      setUptime(`${h}:${m}:${s}`)
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [])

  // 内容统计
  const articleCount = ARTICLES.length
  const tagCount = new Set(ARTICLES.flatMap((a) => a.tags)).size
  const friendCount = FRIENDS.length

  return (
    <div className="w-full bg-white/40 dark:bg-slate-800/50 backdrop-blur-md
      border border-white/40 dark:border-white/10 shadow-xl overflow-hidden
      flex flex-col md:flex-row items-stretch transition-colors duration-700 h-auto md:h-20">

      {/* 运行时间 */}
      <div className="bg-slate-900 dark:bg-black text-white px-8 py-4 md:py-0
        flex items-center justify-center font-mono text-2xl md:text-3xl font-black
        tracking-widest shadow-inner relative overflow-hidden
        group-hover:text-accent transition-colors">
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
        {uptime}
        <div className="absolute left-0 right-0 top-1/2 h-px bg-black/50" />
      </div>

      {/* 中间信息 */}
      <div className="flex-1 px-6 py-4 md:py-0 flex flex-wrap items-center justify-between gap-4
        text-xs md:text-sm font-bold text-slate-600 dark:text-slate-300">

        {/* 运行状态 */}
        <div className="flex items-center gap-2 min-w-[180px]">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>
            运行：<span className="text-accent dark:text-accent-soft font-black">{uptime}</span>
          </span>
        </div>

        {/* 内容统计 */}
        <div className="flex gap-3 md:gap-5">
          <StatBadge emoji="📝" label="文章" count={articleCount} />
          <StatBadge emoji="🏷️" label="标签" count={tagCount} />
          <StatBadge emoji="🔗" label="友链" count={friendCount} />
        </div>

        {/* 技术栈 */}
        <div className="flex gap-2">
          <TechBadge name="React 18" color="text-sky-500" />
          <TechBadge name="Tailwind" color="text-teal-400" />
          <TechBadge name="Zustand" color="text-amber-400" />
        </div>
      </div>
    </div>
  )
}

/** 统计徽章子组件 */
function StatBadge({ emoji, label, count }: { emoji: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1
      bg-white/50 dark:bg-slate-700/50 rounded-lg
      border border-white/40 dark:border-slate-600">
      <span className="text-sm">{emoji}</span>
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-accent dark:text-accent-soft font-black tabular-nums">{count}</span>
    </div>
  )
}

/** 技术栈徽章子组件 */
function TechBadge({ name, color }: { name: string; color: string }) {
  return (
    <span className="px-2 py-1 bg-white/50 dark:bg-slate-700/50 rounded-md shadow-sm
      flex items-center gap-1 border border-white/40 dark:border-slate-600 text-xs">
      <span className={`w-2 h-2 rounded-full ${color.replace('text-', 'bg-')}`} />
      {name}
    </span>
  )
}
