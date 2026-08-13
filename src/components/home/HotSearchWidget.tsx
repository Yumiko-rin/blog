import { useState, useEffect, useCallback, useRef } from 'react'
import { Flame, RefreshCw } from 'lucide-react'
import { useDailyTick, useIntervalTick } from '@/hooks/useDailyTick'

/**
 * 今日热搜小部件
 * --------------------------------------------------
 * 数据源：60s API（https://60s.viki.moe，开源、免 key、响应头 Access-Control-Allow-Origin: *）
 * 浏览器可直连，无需代理。支持微博 / 百度 / 知乎 / 抖音 四个榜单切换。
 *
 * 更新策略：
 *   - 首次进入：命中本地缓存立刻渲染，同时后台静默拉新
 *   - 每 30 分钟自动刷新一次；跨自然日强制刷新
 *   - 触发限流（429）或网络异常：保留上一次数据并提示，避免出现空白
 */

interface HotItem {
  title: string
  hot?: string
  url?: string
}

type SourceKey = 'weibo' | 'baidu' | 'zhihu' | 'douyin'

const SOURCES: { key: SourceKey; label: string; path: string }[] = [
  { key: 'weibo', label: '微博', path: '/v2/weibo' },
  { key: 'baidu', label: '百度', path: '/v2/baidu/realtime' },
  { key: 'zhihu', label: '知乎', path: '/v2/zhihu' },
  { key: 'douyin', label: '抖音', path: '/v2/douyin' },
]

const API_BASE = 'https://60s.viki.moe'
const CACHE_KEY = 'blog_hotsearch_cache_v1'
const TAB_KEY = 'blog_hotsearch_tab'
const TTL = 30 * 60 * 1000 // 30 分钟
const LIMIT = 10

/** 数值热度 → 万 / 亿 */
function fmtHot(v: unknown): string {
  if (v == null || v === '') return ''
  if (typeof v === 'string' && /[万亿wW]/.test(v)) return v
  const n = Number(String(v).replace(/,/g, ''))
  if (!Number.isFinite(n) || n <= 0) return typeof v === 'string' ? v : ''
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)} 亿`
  if (n >= 1e4) return `${Math.round(n / 1e4)} 万`
  return String(n)
}

function normalize(raw: any): HotItem[] {
  const arr = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : []
  return arr
    .map((it: any) => ({
      title: String(it?.title || it?.name || it?.word || '').trim(),
      hot: fmtHot(it?.hot_value ?? it?.score ?? it?.hot_value_desc ?? it?.score_desc ?? it?.hot),
      url: it?.link || it?.url || it?.mobil_url || '',
    }))
    .filter((it: HotItem) => it.title)
    .slice(0, LIMIT)
}

/* -------------------------------- 缓存 -------------------------------- */

type CacheShape = Partial<Record<SourceKey, { at: number; items: HotItem[] }>>

function readCache(): CacheShape {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeCache(key: SourceKey, items: HotItem[]) {
  try {
    const all = readCache()
    all[key] = { at: Date.now(), items }
    localStorage.setItem(CACHE_KEY, JSON.stringify(all))
  } catch { /* ignore */ }
}

/* ------------------------------- 组件 ------------------------------- */

export function HotSearchWidget() {
  const [source, setSource] = useState<SourceKey>(() => {
    try {
      const v = localStorage.getItem(TAB_KEY) as SourceKey | null
      return v && SOURCES.some((s) => s.key === v) ? v : 'weibo'
    } catch {
      return 'weibo'
    }
  })
  const [items, setItems] = useState<HotItem[]>([])
  const [updatedAt, setUpdatedAt] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [warn, setWarn] = useState('')

  const day = useDailyTick()
  const halfHour = useIntervalTick(TTL)
  const reqId = useRef(0)

  const load = useCallback(async (key: SourceKey, force: boolean) => {
    const mine = ++reqId.current
    const cache = readCache()[key]
    const fresh = cache && Date.now() - cache.at < TTL

    // 先用缓存点亮界面
    if (cache) {
      setItems(cache.items)
      setUpdatedAt(cache.at)
      setLoading(false)
    } else {
      setItems([])
      setLoading(true)
    }
    if (fresh && !force) {
      setWarn('')
      return
    }

    const conf = SOURCES.find((s) => s.key === key)!
    try {
      const r = await fetch(`${API_BASE}${conf.path}`, { cache: 'no-store' })
      if (!r.ok) throw new Error(r.status === 429 ? '请求过于频繁，稍后自动重试' : `HTTP ${r.status}`)
      const list = normalize(await r.json())
      if (!list.length) throw new Error('数据为空')
      if (mine !== reqId.current) return // 已被更新的请求取代
      setItems(list)
      const now = Date.now()
      setUpdatedAt(now)
      writeCache(key, list)
      setWarn('')
    } catch (e) {
      if (mine !== reqId.current) return
      setWarn(cache ? '暂用缓存数据' : (e as Error).message || '获取失败')
    } finally {
      if (mine === reqId.current) setLoading(false)
    }
  }, [])

  // 切换榜单 / 跨日 / 每 30 分钟 → 重新拉取
  useEffect(() => {
    load(source, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, day, halfHour])

  const pick = (key: SourceKey) => {
    setSource(key)
    try { localStorage.setItem(TAB_KEY, key) } catch { /* ignore */ }
  }

  const rankColor = (i: number) =>
    i === 0 ? 'bg-red-500' : i === 1 ? 'bg-orange-500' : i === 2 ? 'bg-amber-500' : 'bg-slate-400'

  const timeText = updatedAt
    ? new Date(updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className="widget-card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-md bg-accent" />
          <span className="text-sm font-bold text-[rgb(var(--text-primary))]">今日热搜</span>
        </div>
        <button
          type="button"
          onClick={() => load(source, true)}
          className="text-[rgb(var(--text-secondary))] hover:text-accent transition-colors"
          aria-label="刷新热搜"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* 榜单切换 */}
      <div className="mb-2 flex gap-1">
        {SOURCES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => pick(s.key)}
            className={`flex-1 rounded-md px-1.5 py-1 text-[11px] font-medium transition-colors ${
              source === s.key
                ? 'bg-accent text-white'
                : 'bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))] hover:text-accent'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading && !items.length ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 rounded bg-[rgb(var(--bg-secondary))] animate-pulse" />
          ))}
        </div>
      ) : items.length ? (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li key={`${it.title}-${i}`}>
              <a
                href={it.url || '#'}
                target={it.url ? '_blank' : undefined}
                rel="noreferrer"
                className="flex items-center gap-2 group"
                title={it.title}
              >
                <span className={`shrink-0 w-4 h-4 rounded text-[10px] font-bold text-white flex items-center justify-center ${rankColor(i)}`}>
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-xs text-[rgb(var(--text-primary))] group-hover:text-accent transition-colors">
                  {it.title}
                </span>
                {it.hot ? (
                  <span className="shrink-0 text-[10px] text-[rgb(var(--text-secondary))] flex items-center gap-0.5 tabular-nums">
                    <Flame size={10} className="text-orange-400" />{it.hot}
                  </span>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-6 text-center text-xs text-[rgb(var(--text-secondary))]">
          {warn || '暂无数据'}
        </div>
      )}

      {(timeText || warn) && items.length > 0 && (
        <div className="mt-2 text-right text-[10px] text-[rgb(var(--text-secondary))] opacity-70">
          {warn ? `${warn} · ` : ''}{timeText && `${timeText} 更新`}
        </div>
      )}
    </div>
  )
}

export default HotSearchWidget
