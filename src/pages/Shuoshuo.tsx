import { useMemo, useState, useEffect } from 'react'
import { MessageCircle, Heart } from 'lucide-react'
import { SHUOSHUO, loadShuoshuo, type Shuoshuo } from '@/data/shuoshuo'
import { CommentSection } from '@/components/molecules/CommentSection'

/* ===== 说说点赞（localStorage 持久化） ===== */
const SHUOSHUO_LIKED_KEY = 'liked_shuoshuo'
const SHUOSHUO_LIKE_COUNT_KEY = 'shuoshuo_like_counts'

function getLikedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(SHUOSHUO_LIKED_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function getLikeCounts(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SHUOSHUO_LIKE_COUNT_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveLikeCounts(map: Record<string, number>) {
  try { localStorage.setItem(SHUOSHUO_LIKE_COUNT_KEY, JSON.stringify(map)) } catch { /* ignore */ }
}

function groupByDate(list: Shuoshuo[]): [string, Shuoshuo[]][] {
  const map = new Map<string, Shuoshuo[]>()
  for (const s of list) {
    const d = new Date(s.date.replace(/-/g, '/'))
    const key = `${d.getMonth() + 1}月${d.getDate()}日`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }
  return Array.from(map.entries())
}

function ShuoshuoItem({ item, isLast }: { item: Shuoshuo; isLast?: boolean }) {
  const [open, setOpen] = useState(false)
  const [liked, setLiked] = useState(() => getLikedSet().has(item.id))
  const [likeCount, setLikeCount] = useState(() => getLikeCounts()[item.id] || 0)

  function toggleLike() {
    const set = getLikedSet()
    const counts = getLikeCounts()
    if (set.has(item.id)) {
      set.delete(item.id)
      counts[item.id] = Math.max(0, (counts[item.id] || 0) - 1)
      setLiked(false)
      setLikeCount(counts[item.id])
    } else {
      set.add(item.id)
      counts[item.id] = (counts[item.id] || 0) + 1
      setLiked(true)
      setLikeCount(counts[item.id])
    }
    try { localStorage.setItem(SHUOSHUO_LIKED_KEY, JSON.stringify([...set])) } catch { /* ignore */ }
    saveLikeCounts(counts)
  }

  return (
    <div className="relative pl-7 pb-8 last:pb-0">
      {/* 时间轴圆点 */}
      <span className="absolute left-[6px] top-1.5 w-2.5 h-2.5 rounded-full bg-accent ring-4 ring-accent/15" />
      {/* 连接线 */}
      {!isLast && <span className="absolute left-[11px] top-4 bottom-0 w-px bg-black/10 dark:bg-white/10" />}

      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-slate-800/40 p-4 hover:border-accent/40 transition-colors">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-xs font-medium text-[rgb(var(--text-secondary))]">{item.date}</span>
          {item.mood && <span className="text-sm">{item.mood}</span>}
        </div>
        <p className="text-[15px] leading-relaxed whitespace-pre-line text-[rgb(var(--text-primary))]">
          {item.content}
        </p>
        {item.images && item.images.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {item.images.map((src, i) => (
              <img key={i} src={src} alt="" className="w-full h-24 object-cover rounded-xl" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={toggleLike}
            className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
              liked ? 'text-pink-500' : 'text-[rgb(var(--text-secondary))] hover:text-pink-500'
            }`}
          >
            <Heart size={14} className={liked ? 'fill-pink-500' : ''} />
            {likeCount > 0 ? `${likeCount} 个赞` : '点赞'}
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[rgb(var(--text-secondary))] hover:text-accent transition-colors"
          >
            <MessageCircle size={14} /> {open ? '收起评论' : '评论'}
          </button>
        </div>
        {open && (
          <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/10">
            <CommentSection path={`/shuoshuo/${item.id}`} />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 说说 页面 —— 复制自 https://boke.hiromu.top/moments 的形式
 * 按日期分组的时光轴，每条含时间、心情、正文；可展开评论。
 * 该模块不会出现在首页（首页只展示文章）。
 */
export default function Shuoshuo() {
  const [list, setList] = useState(SHUOSHUO)

  // 异步加载说说（后台发布的 + 静态内置合并），静态数据作为初始值避免空白闪烁
  useEffect(() => {
    loadShuoshuo().then(setList)
  }, [])

  const groups = useMemo(() => groupByDate(list), [list])

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl text-[rgb(var(--text-primary))]">说说</h1>
        <p className="mt-2 text-[rgb(var(--text-secondary))]">记录生活中的小确幸</p>
      </header>

      {groups.length === 0 ? (
        <div className="text-center text-[rgb(var(--text-secondary))] py-16">还没有说说，快来发表第一条吧～</div>
      ) : (
        <div className="relative">
          {groups.map(([dateLabel, items]) => (
            <section key={dateLabel} className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg font-bold text-[rgb(var(--text-primary))]">{dateLabel}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                  {items.length} 条
                </span>
              </div>
              <div className="relative">
                {items.map((item, idx) => (
                  <ShuoshuoItem key={item.id} item={item} isLast={idx === items.length - 1} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
