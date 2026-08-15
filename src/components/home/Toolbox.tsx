import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronLeft, Search, RefreshCw, X, Copy, Check, Building2 } from 'lucide-react'
import { playClickSound } from '@/utils/sounds'
import {
  AlmanacTool, CatImageTool, DogImageTool, AnimeImageTool, AbstractArtTool, PixelArtTool,
  AvatarGeneratorTool, CurrencyConverterTool, PomodoroTimerTool, CountdownDayTool,
  MbtiTestTool, ReactionTestTool, TypingTestTool, PitchTestTool, DailyFortuneFullTool, TarotTool,
  PickupLineTool, EmojiDictTool, AirQualityTool, ExpressTimeTool, OilPriceTool,
} from './ToolboxNewTools'

// 同源代理前缀：开发/预览服务器会把 /uapis 转发到 https://uapis.cn/api/v1
// （uapis.cn 不返回 CORS 头，浏览器直接请求会被拦截，必须走同源代理）
const API = '/uapis'

// 本地图片池：照片类工具改用本地资源，避免 picsum 等外链在国内加载慢/被墙
const LOCAL_IMAGES = [
  '/bg/1.webp', '/bg/20.webp', '/bg/36.webp', '/bg/39.webp', '/bg/41.webp', '/bg/42.webp',
  '/bg/w_blue_01.png', '/bg/w_cyan_01.png', '/bg/w_mixed_01.png', '/bg/w_pink_01.png', '/bg/w_pink_02.png',
  '/avatars/dmoe_01.jpg', '/avatars/dmoe_02.jpg', '/avatars/dmoe_03.jpg', '/avatars/dmoe_04.jpg',
  '/avatars/dmoe_05.jpg', '/avatars/dmoe_06.jpg', '/avatars/dmoe_07.jpg', '/avatars/dmoe_08.jpg',
]
const pickLocalImage = (exclude?: string) => {
  if (LOCAL_IMAGES.length === 0) return ''
  let next = exclude || ''
  let guard = 0
  while (next === (exclude || '') && guard < 10) { next = LOCAL_IMAGES[Math.floor(Math.random() * LOCAL_IMAGES.length)]; guard++ }
  return next
}

// 图片预加载 hook：先创建 Image 对象预加载，加载完成后才设置 src，避免闪烁
function useImageLoader(initialSrc?: string) {
  const [src, setSrc] = useState(initialSrc || '')
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback((newSrc: string) => {
    setLoaded(false)
    setError(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setError(true), 8000)
    const preloader = new Image()
    preloader.onload = () => {
      setSrc(newSrc)
      setLoaded(true)
      setError(false)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    preloader.onerror = () => {
      setError(true)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    preloader.src = newSrc
  }, [])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return { src, loaded, error, load }
}

// ========== 类型定义 ==========
interface ToolApp {
  id: string
  name: string
  icon: string
  color: string
  category: string
}

const DEFAULT_APPS: ToolApp[] = [
  { id: 'smartsearch', name: '智能搜索', icon: '🔍', color: 'from-blue-500 to-cyan-500', category: '热门资讯' },
  { id: 'hotboard', name: '全网热榜', icon: '🔥', color: 'from-amber-500 to-orange-500', category: '热门资讯' },
  { id: 'goldprice', name: '今日金价', icon: '💰', color: 'from-yellow-500 to-amber-500', category: '热门资讯' },
  { id: 'githubuser', name: 'GitHub用户', icon: '🐙', color: 'from-gray-600 to-gray-800', category: '热门资讯' },
  { id: 'githubrepo', name: 'GitHub仓库', icon: '📦', color: 'from-purple-500 to-violet-600', category: '热门资讯' },
  { id: 'history', name: '历史今天', icon: '📜', color: 'from-amber-600 to-yellow-600', category: '热门资讯' },
  { id: 'bmi', name: 'BMI', icon: '⚖️', color: 'from-green-400 to-emerald-500', category: '趣味测试' },
  { id: 'drivingexam', name: '驾考题库', icon: '🚗', color: 'from-blue-400 to-sky-500', category: '趣味测试' },
  { id: 'randomimage', name: '随机图片', icon: '🖼️', color: 'from-green-400 to-teal-500', category: '图片壁纸' },
  { id: 'genshinimage', name: '原神图片', icon: '⚔️', color: 'from-purple-400 to-indigo-500', category: '图片壁纸' },
  { id: 'wallpaper4k', name: '4K图片', icon: '🏔️', color: 'from-teal-400 to-cyan-500', category: '图片壁纸' },
  { id: 'bingdaily', name: '必应每日', icon: '📷', color: 'from-sky-400 to-blue-500', category: '图片壁纸' },
  { id: 'saying', name: '随机古诗', icon: '📜', color: 'from-amber-400 to-yellow-500', category: '图片壁纸' },
  { id: 'password', name: '密码', icon: '🔑', color: 'from-green-500 to-emerald-600', category: '实用工具' },
  { id: 'converter', name: '换算', icon: '🔄', color: 'from-cyan-400 to-blue-500', category: '实用工具' },
  { id: 'base', name: '进制', icon: '🔢', color: 'from-teal-400 to-cyan-500', category: '实用工具' },
  { id: 'calculator', name: '计算器', icon: '🧮', color: 'from-blue-400 to-indigo-500', category: '实用工具' },
  { id: 'express', name: '快递查询', icon: '📦', color: 'from-orange-400 to-amber-500', category: '实用工具' },
  { id: 'phonelocation', name: '手机归属地', icon: '📱', color: 'from-green-400 to-teal-500', category: '实用工具' },
  { id: 'worldtime', name: '世界时间', icon: '🌍', color: 'from-sky-400 to-blue-500', category: '实用工具' },
  { id: 'ipquery', name: 'IP查询', icon: '🌐', color: 'from-indigo-500 to-blue-600', category: '实用工具' },
  { id: 'uuid', name: 'UUID生成', icon: '🆔', color: 'from-violet-500 to-purple-600', category: '实用工具' },
  // 新增工具
  { id: 'almanac', name: '每日黄历', icon: '📅', color: 'from-red-500 to-rose-600', category: '资讯热搜' },
  { id: 'catimage', name: '随机猫猫', icon: '🐱', color: 'from-orange-400 to-amber-500', category: '图片壁纸' },
  { id: 'dogimage', name: '随机狗狗', icon: '🐶', color: 'from-yellow-500 to-amber-600', category: '图片壁纸' },
  { id: 'animeimage', name: '动漫图片', icon: '🌸', color: 'from-pink-400 to-purple-500', category: '图片壁纸' },
  { id: 'abstractart', name: '抽象艺术', icon: '🎨', color: 'from-indigo-500 to-purple-600', category: '图片壁纸' },
  { id: 'pixelart', name: '像素风', icon: '👾', color: 'from-green-500 to-teal-600', category: '图片壁纸' },
  { id: 'avatargen', name: '头像生成', icon: '🧑', color: 'from-violet-500 to-purple-600', category: '图片壁纸' },
  { id: 'currency', name: '汇率换算', icon: '💱', color: 'from-emerald-500 to-green-600', category: '实用工具' },
  { id: 'pomodoro', name: '番茄钟', icon: '🍅', color: 'from-red-500 to-orange-600', category: '实用工具' },
  { id: 'countdown', name: '倒数日', icon: '⏰', color: 'from-rose-500 to-pink-600', category: '实用工具' },
  { id: 'mbti', name: 'MBTI测试', icon: '🧠', color: 'from-violet-500 to-indigo-600', category: '趣味测试' },
  { id: 'reaction', name: '反应力测试', icon: '⚡', color: 'from-amber-400 to-orange-500', category: '趣味测试' },
  { id: 'typing', name: '打字测试', icon: '⌨️', color: 'from-blue-500 to-cyan-600', category: '趣味测试' },
  { id: 'pitch', name: '音感测试', icon: '🎵', color: 'from-indigo-500 to-purple-600', category: '趣味测试' },
  { id: 'fortune', name: '每日运势', icon: '🔮', color: 'from-purple-500 to-pink-600', category: '娱乐互动' },
  { id: 'tarot', name: '塔罗牌', icon: '🃏', color: 'from-purple-600 to-indigo-700', category: '娱乐互动' },
  { id: 'pickup', name: '土味情话', icon: '💕', color: 'from-pink-500 to-rose-500', category: '娱乐互动' },
  { id: 'emojidict', name: 'Emoji字典', icon: '😀', color: 'from-yellow-400 to-amber-500', category: '编程开发' },
  { id: 'airquality', name: '空气质量', icon: '🌬️', color: 'from-teal-500 to-cyan-600', category: '生活服务' },
  { id: 'expresstime', name: '快递时效', icon: '📦', color: 'from-orange-400 to-amber-500', category: '生活服务' },
  { id: 'oilprice', name: '油价查询', icon: '⛽', color: 'from-amber-500 to-yellow-600', category: '生活服务' },
]

// ========== 可排序应用项 ==========
function SortableAppItem({ app, onClick }: { app: ToolApp; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: app.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto' as const,
    opacity: isDragging ? 0.8 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className="flex flex-col items-center gap-1.5 py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer select-none"
      onClick={onClick}>
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${app.color} flex items-center justify-center text-xl shadow-md`}>
        {app.icon}
      </div>
      <span className="text-[11px] text-[rgb(var(--text-secondary))] leading-tight text-center">{app.name}</span>
    </div>
  )
}

// ========== 工具组件 ==========

function HotBoardTool() {
  const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true)
  useEffect(() => { const ac = new AbortController(); fetch(`${API}/misc/hotboard?type=weibo`, { signal: ac.signal }).then(r => r.json()).then(d => setItems(d.list || [])).catch(() => {}).finally(() => { if (!ac.signal.aborted) setLoading(false) }); return () => ac.abort() }, [])
  if (loading) return <div className="p-4 flex items-center justify-center h-full"><RefreshCw size={20} className="animate-spin text-accent" /></div>
  return (<div className="p-3 space-y-1 overflow-y-auto h-full">{items.length === 0 ? <p className="text-center text-sm text-[rgb(var(--text-secondary))] py-8">暂无数据</p> : items.slice(0, 20).map((item: any, i: number) => (<div key={i} className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-[rgb(var(--bg-secondary))] transition-colors cursor-pointer"><span className={`w-5 text-center text-xs font-bold ${i < 3 ? 'text-red-500' : 'text-[rgb(var(--text-secondary))]'}`}>{item.index || i + 1}</span><span className="text-sm text-[rgb(var(--text-primary))] flex-1 truncate">{item.title}</span>{item.hot_value && <span className="text-[10px] text-red-400 shrink-0">{item.hot_value}</span>}</div>))}</div>)
}

// GitHub 语言色标
const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Java: '#b07219',
  'C++': '#f34b7d', C: '#555555', 'C#': '#178600', Go: '#00ADD8', Rust: '#dea584',
  Ruby: '#701516', PHP: '#4F5D95', Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB',
  HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051', Vue: '#41b883', Lua: '#000080',
  Scala: '#c22d40', R: '#198CE7', Perl: '#0298c3', Haskell: '#5e5086', Elixir: '#6e4a7e',
  Clojure: '#db5855', OCaml: '#3be133', Zig: '#ec915c', Nim: '#ffc200', Julia: '#a270ba',
}
const formatCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`

// GitHub 用户搜索缓存（5 分钟 TTL，避免重复请求触发限流）
const ghUserCache = new Map<string, { user: any; repos: any[]; ts: number }>()
const GH_CACHE_TTL = 5 * 60 * 1000

// 空状态推荐用户
const POPULAR_GH_USERS = [
  { login: 'torvalds', desc: 'Linux 之父' },
  { login: 'gaearon', desc: 'React 核心团队' },
  { login: 'yyx990803', desc: 'Vue / Vite 作者' },
  { login: 'sindresorhus', desc: '超 1000+ 开源项目' },
  { login: 'tj', desc: 'Express / Koa 作者' },
]

function GitHubUserTool() {
  const [username, setUsername] = useState('')
  const [user, setUser] = useState<any>(null)
  const [topRepos, setTopRepos] = useState<any[]>([])
  const [langStats, setLangStats] = useState<{ lang: string; pct: number; color: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('github-user-history') || '[]') } catch { return [] }
  })
  const abortRef = useRef<AbortController | null>(null)

  const saveHistory = (name: string) => {
    const updated = [name, ...history.filter(h => h !== name)].slice(0, 6)
    setHistory(updated)
    localStorage.setItem('github-user-history', JSON.stringify(updated))
  }

  /** 从仓库列表聚合语言分布（按仓库 size 加权） */
  const computeLangStats = (repos: any[]) => {
    const langBytes: Record<string, number> = {}
    repos.forEach(r => {
      if (r.language) langBytes[r.language] = (langBytes[r.language] || 0) + (r.size || 1)
    })
    const total = Object.values(langBytes).reduce((a, b) => a + b, 0)
    if (!total) { setLangStats([]); return }
    setLangStats(
      Object.entries(langBytes)
        .map(([lang, bytes]) => ({ lang, pct: Math.round((bytes / total) * 100), color: LANG_COLORS[lang] || '#ccc' }))
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 5),
    )
  }

  const search = async (name?: string) => {
    const q = (name ?? username).trim()
    if (!q) return
    if (name) setUsername(name)

    // 取消上一个请求，防止竞态
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    setLoading(true); setError(null); setUser(null); setTopRepos([]); setLangStats([]); setCopied(false)

    // 命中缓存直接返回
    const cached = ghUserCache.get(q.toLowerCase())
    if (cached && Date.now() - cached.ts < GH_CACHE_TTL) {
      setUser(cached.user); setTopRepos(cached.repos.slice(0, 5)); computeLangStats(cached.repos)
      setLoading(false); saveHistory(cached.user.login); return
    }

    try {
      const r = await fetch(`https://api.github.com/users/${q}`, { signal: ac.signal })
      if (r.ok) {
        const data = await r.json()
        setUser(data); saveHistory(data.login)
        setLoadingRepos(true)
        try {
          const rr = await fetch(`https://api.github.com/users/${data.login}/repos?sort=stars&per_page=30`, { signal: ac.signal })
          if (rr.ok) {
            const allRepos = (await rr.json()).filter((repo: any) => !repo.fork)
            setTopRepos(allRepos.slice(0, 5)); computeLangStats(allRepos)
            ghUserCache.set(q.toLowerCase(), { user: data, repos: allRepos, ts: Date.now() })
          }
        } catch {}
        setLoadingRepos(false)
      } else if (r.status === 404) {
        setError('未找到该用户，请检查用户名')
      } else if (r.status === 403) {
        setError('API 频率超限（未登录 60次/小时），请稍后再试')
      } else {
        setError('查询失败，请稍后重试')
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError('网络错误，请检查网络连接')
    }
    setLoading(false)
  }

  const copyProfileUrl = () => {
    if (!user?.html_url) return
    navigator.clipboard.writeText(user.html_url).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  /** 将 ISO 时间字符串转为中文相对时间，例如 "5年前"、"3个月前"、"12分钟前" */
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const diffMs = Date.now() - date.getTime()
    if (diffMs < 0) return '未来'
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffDays < 1) {
      const diffHours = Math.floor(diffMs / 3600000)
      if (diffHours < 1) {
        const diffMins = Math.floor(diffMs / 60000)
        return diffMins < 1 ? '刚刚' : `${diffMins}分钟前`
      }
      return `${diffHours}小时前`
    }
    if (diffDays < 30) return `${diffDays}天前`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`
    const years = Math.floor(diffDays / 365)
    const months = Math.floor((diffDays % 365) / 30)
    return months > 0 ? `${years}年${months}个月前` : `${years}年前`
  }

  return (
    <div className="p-4">
      {/* 搜索栏（带清除按钮） */}
      <div className="flex gap-2 mb-2">
        <div className="flex-1 relative">
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="搜索 GitHub 用户名..." onKeyDown={e => e.key === 'Enter' && search()} className="w-full bg-[rgb(var(--bg-secondary))] rounded-xl px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
          {username && (
            <button type="button" onClick={() => { setUsername(''); setUser(null); setError(null); setTopRepos([]); setLangStats([]) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-[rgb(var(--text-secondary))] hover:text-accent transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
        <button type="button" onClick={() => search()} className="px-3 py-2 rounded-xl bg-accent text-white text-sm hover:bg-accent/90 transition-colors flex items-center gap-1">{loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}搜索</button>
      </div>

      {/* 搜索历史 */}
      {history.length > 0 && !user && !loading && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="text-[10px] text-[rgb(var(--text-secondary))]">最近：</span>
          {history.map(h => (
            <button key={h} type="button" onClick={() => search(h)} className="px-2.5 py-1 rounded-lg bg-[rgb(var(--bg-secondary))] text-[11px] text-[rgb(var(--text-secondary))] hover:bg-accent/10 hover:text-accent transition-colors">{h}</button>
          ))}
        </div>
      )}

      {/* 加载骨架 */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-[rgb(var(--bg-secondary))]" />
            <div className="h-5 w-32 rounded bg-[rgb(var(--bg-secondary))] mt-3" />
            <div className="h-3 w-20 rounded bg-[rgb(var(--bg-secondary))] mt-2" />
          </div>
          <div className="grid grid-cols-4 gap-2">{[0, 1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl bg-[rgb(var(--bg-secondary))]" />)}</div>
        </div>
      )}

      {/* 错误提示 */}
      {error && !loading && (
        <div className="text-center py-6">
          <div className="text-3xl mb-2">😕</div>
          <p className="text-sm text-[rgb(var(--text-secondary))] mb-3">{error}</p>
          <button type="button" onClick={() => search()} className="px-4 py-2 rounded-xl bg-accent/10 text-accent text-xs hover:bg-accent/20 transition-colors">重试</button>
        </div>
      )}

      {/* 空状态 + 推荐用户 */}
      {!loading && !error && !user && (
        <div className="text-center py-6">
          <div className="text-3xl mb-2">🐙</div>
          <p className="text-sm text-[rgb(var(--text-secondary))]">输入 GitHub 用户名开始搜索</p>
          <div className="mt-4 space-y-1.5 max-w-[240px] mx-auto">
            <p className="text-[10px] text-[rgb(var(--text-secondary))]">试试这些大佬：</p>
            {POPULAR_GH_USERS.map(u => (
              <button key={u.login} type="button" onClick={() => search(u.login)} className="w-full flex items-center gap-2 p-2 rounded-xl bg-[rgb(var(--bg-secondary))] hover:bg-accent/5 transition-colors text-left">
                <span className="text-[11px] font-bold text-accent shrink-0">{u.login}</span>
                <span className="text-[10px] text-[rgb(var(--text-secondary))] truncate">{u.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 用户资料 */}
      {user && !loading && (
        <div className="text-center">
          <img src={user.avatar_url} alt={user.login} className="w-20 h-20 rounded-full mx-auto mb-3 ring-2 ring-accent/30" loading="lazy" />
          <div className="font-bold text-[rgb(var(--text-primary))] text-lg flex items-center justify-center gap-2 flex-wrap">
            {user.name || user.login}
            {user.type === 'Organization' ? (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-purple-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-purple-400"><Building2 size={10} /> 组织</span>
            ) : (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-blue-400">👤 个人</span>
            )}
            {user.hireable && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">💚 可雇用</span>
            )}
          </div>
          <div className="text-xs text-[rgb(var(--text-secondary))] mt-1">@{user.login}</div>
          {user.bio && <div className="text-xs text-[rgb(var(--text-secondary))] mt-2 px-2 leading-relaxed">{user.bio}</div>}

          {/* 统计数据（4 列：仓库 / Gist / 粉丝 / 关注） */}
          <div className="grid grid-cols-4 gap-2 mt-4 text-xs">
            <div className="bg-[rgb(var(--bg-secondary))] rounded-xl p-2 text-center"><div className="font-bold text-accent">{formatCount(user.public_repos)}</div><div className="text-[rgb(var(--text-secondary))] text-[10px]">仓库</div></div>
            <div className="bg-[rgb(var(--bg-secondary))] rounded-xl p-2 text-center"><div className="font-bold text-accent">{formatCount(user.public_gists)}</div><div className="text-[rgb(var(--text-secondary))] text-[10px]">Gist</div></div>
            <div className="bg-[rgb(var(--bg-secondary))] rounded-xl p-2 text-center"><div className="font-bold text-accent">{formatCount(user.followers)}</div><div className="text-[rgb(var(--text-secondary))] text-[10px]">粉丝</div></div>
            <div className="bg-[rgb(var(--bg-secondary))] rounded-xl p-2 text-center"><div className="font-bold text-accent">{formatCount(user.following)}</div><div className="text-[rgb(var(--text-secondary))] text-[10px]">关注</div></div>
          </div>

          {/* 粉丝/关注比 */}
          {user.followers > 0 && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500">
                粉丝比 {user.following > 0 ? `${(user.followers / user.following).toFixed(1)}x` : '∞'}
              </span>
            </div>
          )}

          {/* 附加信息 */}
          <div className="text-xs text-[rgb(var(--text-secondary))] mt-3 space-y-1.5 text-left px-2">
            {user.location && <div>📍 {user.location}</div>}
            {user.company && <div>🏢 {user.company}</div>}
            {(user.blog || user.twitter_username) && (
              <div className="flex flex-wrap gap-1.5">
                {user.blog && (
                  <a href={user.blog.startsWith('http') ? user.blog : `https://${user.blog}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 max-w-full rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] text-blue-400 transition-colors hover:bg-blue-500/25">
                    <span className="shrink-0">🔗</span>
                    <span className="truncate">{user.blog.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                  </a>
                )}
                {user.twitter_username && (
                  <a href={`https://twitter.com/${user.twitter_username}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] text-sky-400 transition-colors hover:bg-sky-500/25">
                    <span>🐦</span>@{user.twitter_username}
                  </a>
                )}
              </div>
            )}
            {user.created_at && <div>📅 加入于 {new Date(user.created_at).toLocaleDateString('zh-CN')}（{formatRelativeTime(user.created_at)}）</div>}
            {user.updated_at && <div>🕐 最近活跃 {formatRelativeTime(user.updated_at)}</div>}
          </div>

          {/* 语言分布图 */}
          {langStats.length > 0 && (
            <div className="mt-4 text-left px-1">
              <div className="text-xs font-bold text-[rgb(var(--text-secondary))] mb-2">📊 语言分布</div>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-[rgb(var(--bg-secondary))]">
                {langStats.map(s => <div key={s.lang} style={{ width: `${s.pct}%`, background: s.color }} title={`${s.lang} ${s.pct}%`} />)}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {langStats.map(s => (
                  <span key={s.lang} className="flex items-center gap-1 text-[10px] text-[rgb(var(--text-secondary))]">
                    <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.lang} {s.pct}%
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 热门仓库（增强卡片） */}
          {topRepos.length > 0 && (
            <div className="mt-4 text-left">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold text-[rgb(var(--text-secondary))]">🏆 热门仓库</span>
                <a href={`https://github.com/${user.login}?tab=repositories`} target="_blank" rel="noreferrer" className="text-[10px] text-accent hover:underline">查看全部 →</a>
              </div>
              <div className="space-y-1.5">
                {topRepos.map((repo: any) => (
                  <a key={repo.id} href={repo.html_url} target="_blank" rel="noreferrer" className="block p-2.5 rounded-xl bg-[rgb(var(--bg-secondary))] hover:bg-accent/5 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-accent truncate">{repo.name}</span>
                      <span className="text-[10px] text-[rgb(var(--text-secondary))] shrink-0 ml-2">⭐ {formatCount(repo.stargazers_count)}</span>
                    </div>
                    {repo.description && <div className="text-[10px] text-[rgb(var(--text-secondary))] mt-0.5 line-clamp-2">{repo.description}</div>}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {repo.language && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: LANG_COLORS[repo.language] || '#ccc' }} /><span className="text-[10px] text-[rgb(var(--text-secondary))]">{repo.language}</span></span>}
                      <span className="text-[10px] text-[rgb(var(--text-secondary))]">🍴 {formatCount(repo.forks_count)}</span>
                      <span className="text-[10px] text-[rgb(var(--text-secondary))]">🔄 {new Date(repo.updated_at).toLocaleDateString('zh-CN')}</span>
                      {repo.archived && <span className="text-[10px] text-amber-500">📦 已归档</span>}
                    </div>
                    {repo.topics && repo.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {repo.topics.slice(0, 3).map((t: string) => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-md bg-accent/10 text-accent">{t}</span>)}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
          {loadingRepos && (
            <div className="mt-4 text-left">
              <div className="text-xs font-bold text-[rgb(var(--text-secondary))] mb-2 px-1">🏆 热门仓库</div>
              <div className="space-y-1.5 animate-pulse">{[0, 1, 2].map(i => <div key={i} className="h-12 rounded-xl bg-[rgb(var(--bg-secondary))]" />)}</div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <a href={user.html_url} target="_blank" rel="noreferrer" className="inline-block px-4 py-2 rounded-xl bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors">查看 GitHub 主页 →</a>
            <button type="button" onClick={copyProfileUrl} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))] text-xs hover:bg-accent/10 hover:text-accent transition-colors">
              {copied ? <><Check size={12} /> 已复制</> : <><Copy size={12} /> 复制链接</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function GitHubRepoTool() {
  const [query, setQuery] = useState('')
  const [repos, setRepos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState<'stars' | 'forks' | 'updated'>('stars')
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [history, setHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('github-repo-history') || '[]') } catch { return [] }
  })
  const abortRef = useRef<AbortController | null>(null)

  const saveHistory = (q: string) => {
    const updated = [q, ...history.filter(h => h !== q)].slice(0, 6)
    setHistory(updated)
    localStorage.setItem('github-repo-history', JSON.stringify(updated))
  }

  const search = async (q?: string) => {
    const term = (q ?? query).trim()
    if (!term) return
    if (q) setQuery(q)

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    setLoading(true); setSearched(true); setError(null)
    try {
      const r = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(term)}&sort=${sortBy}&per_page=8`, { signal: ac.signal })
      if (r.status === 403) { setError('API 频率超限，请稍后再试'); setRepos([]); setLoading(false); return }
      const d = await r.json()
      setRepos(d.items || [])
      setTotalCount(d.total_count || 0)
      if (d.items?.length > 0) saveHistory(term)
    } catch (e: any) {
      if (e?.name !== 'AbortError') { setError('网络错误，请检查连接'); setRepos([]) }
    }
    setLoading(false)
  }

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-2">
        <div className="flex-1 relative">
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索仓库..." onKeyDown={e => e.key === 'Enter' && search()} className="w-full bg-[rgb(var(--bg-secondary))] rounded-xl px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
          {query && (
            <button type="button" onClick={() => { setQuery(''); setRepos([]); setSearched(false); setError(null) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-[rgb(var(--text-secondary))] hover:text-accent transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
        <button type="button" onClick={() => search()} className="px-3 py-2 rounded-xl bg-accent text-white text-sm hover:bg-accent/90 transition-colors flex items-center gap-1">{loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}搜索</button>
      </div>
      <div className="flex gap-1 mb-2">
        {(['stars', 'forks', 'updated'] as const).map(s => (
          <button key={s} type="button" onClick={() => { setSortBy(s); if (searched) search() }} className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors ${sortBy === s ? 'bg-accent text-white' : 'bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))]'}`}>{s === 'stars' ? '⭐ 最多星' : s === 'forks' ? '🍴 最多Fork' : '🕐 最近更新'}</button>
        ))}
      </div>
      {history.length > 0 && !searched && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <span className="text-[10px] text-[rgb(var(--text-secondary))]">最近：</span>
          {history.map(h => <button key={h} type="button" onClick={() => search(h)} className="px-2.5 py-1 rounded-lg bg-[rgb(var(--bg-secondary))] text-[11px] text-[rgb(var(--text-secondary))] hover:bg-accent/10 hover:text-accent transition-colors">{h}</button>)}
        </div>
      )}
      {/* 结果计数 */}
      {!loading && searched && !error && repos.length > 0 && (
        <div className="text-[10px] text-[rgb(var(--text-secondary))] mb-2 px-1">共找到 {formatCount(totalCount)} 个仓库，显示前 {repos.length} 个</div>
      )}
      <div className="space-y-2 overflow-y-auto max-h-[320px]">
        {loading && [0, 1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-[rgb(var(--bg-secondary))] animate-pulse" />)}
        {error && !loading && (
          <div className="text-center py-6"><div className="text-3xl mb-2">😕</div><p className="text-sm text-[rgb(var(--text-secondary))] mb-3">{error}</p><button type="button" onClick={() => search()} className="px-4 py-2 rounded-xl bg-accent/10 text-accent text-xs hover:bg-accent/20 transition-colors">重试</button></div>
        )}
        {!loading && !error && repos.map((repo: any) => (
          <a key={repo.id} href={repo.html_url} target="_blank" rel="noreferrer" className="block p-3 rounded-xl bg-[rgb(var(--bg-secondary))] hover:bg-accent/5 transition-colors">
            <div className="flex items-center gap-1">
              <span className="font-bold text-sm text-accent truncate">{repo.full_name}</span>
              {repo.archived && <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-500">已归档</span>}
            </div>
            <div className="text-xs text-[rgb(var(--text-secondary))] mt-1 line-clamp-2">{repo.description || '暂无描述'}</div>
            <div className="flex gap-3 mt-2 text-[10px] text-[rgb(var(--text-secondary))] items-center flex-wrap">
              {repo.language && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: LANG_COLORS[repo.language] || '#ccc' }} />{repo.language}</span>}
              <span>⭐ {formatCount(repo.stargazers_count)}</span>
              <span>🍴 {formatCount(repo.forks_count)}</span>
              {repo.license && <span>📜 {repo.license.spdx_id}</span>}
              <span>🔄 {new Date(repo.updated_at).toLocaleDateString('zh-CN')}</span>
            </div>
            {repo.topics && repo.topics.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {repo.topics.slice(0, 4).map((t: string) => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-md bg-accent/10 text-accent">{t}</span>)}
              </div>
            )}
          </a>
        ))}
        {!loading && !error && searched && repos.length === 0 && (
          <div className="text-center py-8"><div className="text-3xl mb-2">📦</div><p className="text-sm text-[rgb(var(--text-secondary))]">未找到相关仓库</p></div>
        )}
        {!loading && !error && !searched && (
          <div className="text-center py-8"><div className="text-3xl mb-2">📦</div><p className="text-sm text-[rgb(var(--text-secondary))]">输入关键词搜索 GitHub 仓库</p></div>
        )}
      </div>
    </div>
  )
}

function HistoryTodayTool() {
  const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [currentDate] = useState(new Date())
  const month = currentDate.getMonth() + 1; const day = currentDate.getDate()
  const loadData = async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const r = await fetch('https://v2.xxapi.cn/api/history', signal ? { signal } : undefined)
      const d = await r.json()
      if (signal?.aborted) return
      const list = (d.data || []).map((s: string) => {
        const match = s.match(/^(\d+)年(\d+)月(\d+)日\s*(.*)$/)
        return match ? { year: match[1], title: match[4], description: '' } : { year: '', title: s, description: '' }
      })
      setItems(list)
    } catch {
      if (signal?.aborted) return
      try {
        const r2 = await fetch(`${API}/history/programmer/today`, signal ? { signal } : undefined)
        const d2 = await r2.json()
        if (signal?.aborted) return
        setItems(d2.events || [])
      } catch { setItems([]) }
    }
    if (!signal?.aborted) setLoading(false)
  }
  useEffect(() => { const ac = new AbortController(); void loadData(ac.signal); return () => ac.abort() }, [])
  if (loading) return <div className="p-4 flex items-center justify-center h-full"><RefreshCw size={20} className="animate-spin text-accent" /></div>
  return (<div className="p-3 space-y-2 overflow-y-auto h-full"><div className="flex items-center justify-between mb-2 px-1"><div className="text-xs font-bold text-accent">📅 {month}月{day}日 历史上的今天</div><button type="button" onClick={() => loadData()} className="text-[10px] text-[rgb(var(--text-secondary))] hover:text-accent transition-colors">刷新</button></div>{items.length === 0 ? <p className="text-center text-sm text-[rgb(var(--text-secondary))] py-8">暂无数据</p> : items.slice(0, 20).map((item: any, i: number) => (<div key={i} className="p-3 rounded-xl bg-[rgb(var(--bg-secondary))]"><div className="text-xs text-accent font-bold mb-1">{item.year ? `${item.year}年` : ''}</div><div className="text-sm text-[rgb(var(--text-primary))] font-medium">{item.title}</div>{item.description && <div className="text-xs text-[rgb(var(--text-secondary))] mt-1 line-clamp-2">{item.description}</div>}</div>))}</div>)
}

function DailyWordTool() {
  const [data, setData] = useState<any>(null); const [loading, setLoading] = useState(true)
  useEffect(() => { const ac = new AbortController(); fetch(`${API}/daily/word`, { signal: ac.signal }).then(r => r.json()).then(d => setData(d)).catch(() => {}).finally(() => { if (!ac.signal.aborted) setLoading(false) }); return () => ac.abort() }, [])
  if (loading) return <div className="p-4 flex items-center justify-center h-full"><RefreshCw size={20} className="animate-spin text-accent" /></div>
  const words = data?.words || []
  return (<div className="p-3 space-y-2 overflow-y-auto h-full"><div className="text-xs text-[rgb(var(--text-secondary))] mb-2">{data?.date || '今日'}</div>{words.map((w: any, i: number) => (<div key={i} className="p-3 rounded-xl bg-[rgb(var(--bg-secondary))]"><div className="font-bold text-accent">{w.word}</div><div className="text-xs text-[rgb(var(--text-secondary))] mt-1">{w.translation}</div>{w.phonetic && <div className="text-xs text-[rgb(var(--text-secondary))] mt-1">{w.phonetic}</div>}</div>))}</div>)
}

function BMITool() {
  const [height, setHeight] = useState(''); const [weight, setWeight] = useState(''); const [result, setResult] = useState<{ bmi: number; level: string; color: string } | null>(null)
  const calculate = () => { const h = parseFloat(height) / 100, w = parseFloat(weight); if (h > 0 && w > 0) { const bmi = w / (h * h); let level = '', color = ''; if (bmi < 18.5) { level = '偏瘦'; color = 'text-blue-500' } else if (bmi < 24) { level = '正常'; color = 'text-green-500' } else if (bmi < 28) { level = '偏胖'; color = 'text-amber-500' } else { level = '肥胖'; color = 'text-red-500' }; setResult({ bmi: Math.round(bmi * 10) / 10, level, color }) } }
  return (<div className="p-4"><div className="space-y-3 mb-4"><div><label className="text-xs text-[rgb(var(--text-secondary))] mb-1 block">身高 (cm)</label><input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="170" className="w-full bg-[rgb(var(--bg-secondary))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" /></div><div><label className="text-xs text-[rgb(var(--text-secondary))] mb-1 block">体重 (kg)</label><input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="65" className="w-full bg-[rgb(var(--bg-secondary))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" /></div></div><button type="button" onClick={calculate} className="w-full py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors mb-4">计算 BMI</button>{result && <div className="text-center p-4 rounded-xl bg-[rgb(var(--bg-secondary))]"><div className="text-3xl font-bold text-[rgb(var(--text-primary))]">{result.bmi}</div><div className={`text-sm font-bold mt-1 ${result.color}`}>{result.level}</div></div>}</div>)
}

function GoldPriceTool() {
  const [price, setPrice] = useState<any>(null); const [loading, setLoading] = useState(true)
  const load = async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const r = await fetch('https://v2.xxapi.cn/api/goldprice', signal ? { signal } : undefined)
      const d = await r.json()
      if (signal?.aborted) return
      if (d && d.code === 200 && d.data) {
        const bars = (d.data.bank_gold_bar_price || []).map((b: any) => ({ name: b.bank, price: b.price, change: '' }))
        const recycle = (d.data.gold_recycle_price || []).map((b: any) => ({ name: b.gold_type, price: b.recycle_price, change: '' }))
        const updated = (d.data.gold_recycle_price && d.data.gold_recycle_price[0] && d.data.gold_recycle_price[0].updated_date) || new Date().toLocaleDateString('zh-CN')
        setPrice({ items: [...bars, ...recycle], update_time: updated })
      } else {
        setPrice({ items: [], error: true })
      }
    } catch {
      if (!signal?.aborted) setPrice({ items: [], error: true })
    }
    if (!signal?.aborted) setLoading(false)
  }
  useEffect(() => { const ac = new AbortController(); void load(ac.signal); return () => ac.abort() }, [])
  if (loading) return <div className="p-4 flex items-center justify-center h-full"><RefreshCw size={20} className="animate-spin text-accent" /></div>
  return (<div className="p-4"><div className="flex items-center justify-between mb-4"><div className="text-xs text-[rgb(var(--text-secondary))]">今日金价（元/克）</div><button type="button" onClick={() => load()} className="text-[10px] text-accent hover:underline">刷新</button></div>{price?.error || !price?.items?.length ? <div className="text-center text-sm text-[rgb(var(--text-secondary))] py-8">暂无法获取金价数据</div> : <div className="space-y-2">{price.items.map((item: any, i: number) => (<div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[rgb(var(--bg-secondary))]"><span className="text-sm font-medium text-[rgb(var(--text-primary))]">{item.name}</span><div className="text-right"><span className="text-sm font-bold text-accent">¥{item.price}/克</span>{item.change && <span className={`text-xs ml-2 ${String(item.change).startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>{item.change}</span>}</div></div>))}</div>}{price?.update_time && <div className="text-[10px] text-center text-[rgb(var(--text-secondary))] mt-3">更新: {price.update_time}</div>}</div>)
}

function RandomImageTool() {
  const { src, loaded, error, load } = useImageLoader()
  const [current, setCurrent] = useState('')
  const reload = () => { const next = pickLocalImage(current); setCurrent(next); load(next) }
  useEffect(() => { reload() }, [])
  return <div className="p-4">
    <div className="rounded-xl overflow-hidden mb-3 bg-[rgb(var(--bg-secondary))] h-48 flex items-center justify-center relative">
      {error ? <span className="text-sm text-[rgb(var(--text-secondary))]">加载失败</span>
        : !loaded ? <RefreshCw size={20} className="animate-spin text-accent" />
        : <img src={src} alt="随机图片" loading="lazy" decoding="async" className="w-full h-48 object-cover transition-opacity duration-300" style={{ opacity: loaded ? 1 : 0 }} />}
    </div>
    <button type="button" onClick={reload} className="w-full py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">换一张</button>
  </div>
}

function BingDailyTool() {
  const { src, loaded, error, load } = useImageLoader()
  useEffect(() => { load(`${API}/image/bing-daily`) }, [])
  return <div className="p-4">
    <div className="rounded-xl overflow-hidden bg-[rgb(var(--bg-secondary))] h-48 flex items-center justify-center relative">
      {error ? <span className="text-sm text-[rgb(var(--text-secondary))]">加载失败</span>
        : !loaded ? <RefreshCw size={20} className="animate-spin text-accent" />
        : <img src={src} alt="必应每日" loading="lazy" decoding="async" className="w-full h-48 object-cover transition-opacity duration-300" style={{ opacity: loaded ? 1 : 0 }} />}
    </div>
  </div>
}

function SayingTool() {
  const [saying, setSaying] = useState<any>(null); const [loading, setLoading] = useState(true)
  const load = (signal?: AbortSignal) => { setLoading(true); fetch(`${API}/saying/random`, signal ? { signal } : undefined).then(r => r.json()).then(d => { if (!signal?.aborted) setSaying(d) }).catch(() => {}).finally(() => { if (!signal?.aborted) setLoading(false) }) }
  useEffect(() => { const ac = new AbortController(); load(ac.signal); return () => ac.abort() }, [])
  if (loading) return <div className="p-4 flex items-center justify-center h-full"><RefreshCw size={20} className="animate-spin text-accent" /></div>
  return <div className="p-4 flex flex-col h-full"><div className="flex-1 flex items-center justify-center mb-4"><p className="text-sm text-[rgb(var(--text-secondary))] text-center leading-relaxed italic">"{saying?.content || '获取失败'}"</p></div>{saying?.author && <p className="text-xs text-[rgb(var(--text-secondary))] text-center mb-3">—— {saying.author}</p>}<button type="button" onClick={() => load()} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-sm font-medium hover:opacity-90 transition-opacity">换一首</button></div>
}

// ========== 计算器（带历史记录）==========
function CalculatorTool() {
  const [display, setDisplay] = useState('0'); const [expr, setExpr] = useState(''); const [history, setHistory] = useState<string[]>([])
  const handleNum = (n: string) => setDisplay(d => d === '0' ? n : d + n)
  const handleOp = (op: string) => { setExpr(display + op); setDisplay('0') }
  const safeCalc = (expression: string): number => {
    const tokens = expression.match(/(\d+\.?\d*|[+\-*\/])/g) || []
    if (tokens.length === 0) return 0
    let nums: number[] = [parseFloat(tokens[0] ?? '0') || 0]
    let ops: string[] = []
    for (let i = 1; i < tokens.length; i += 2) { ops.push(tokens[i] ?? '+'); nums.push(parseFloat(tokens[i + 1] ?? '0') || 0) }
    // First pass: * and /
    const nums2: number[] = [nums[0]]
    const ops2: string[] = []
    for (let i = 0; i < ops.length; i++) {
      if (ops[i] === '*') nums2[nums2.length - 1] *= nums[i + 1]
      else if (ops[i] === '/') nums2[nums2.length - 1] = nums[i + 1] !== 0 ? nums2[nums2.length - 1] / nums[i + 1] : 0
      else { ops2.push(ops[i]); nums2.push(nums[i + 1]) }
    }
    // Second pass: + and -
    let result = nums2[0] ?? 0
    for (let i = 0; i < ops2.length; i++) {
      if (ops2[i] === '+') result += nums2[i + 1] ?? 0
      else if (ops2[i] === '-') result -= nums2[i + 1] ?? 0
    }
    return result
  }
  const handleEqual = () => { try { const result = safeCalc(expr + display); setHistory(h => [expr + display + '=' + result, ...h].slice(0, 20)); setDisplay(String(result)) } catch { setDisplay('Error') }; setExpr('') }
  const btns = ['C', '%', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '=', '+/-']
  const ops = ['/', '*', '-', '+', '=', 'C']
  return (<div className="p-4 flex flex-col h-full">
    {/* 历史记录 */}
    <div className="mb-3 max-h-20 overflow-y-auto rounded-xl bg-[rgb(var(--bg-secondary))] p-2 text-xs text-[rgb(var(--text-secondary))] space-y-1">
      {history.length === 0 ? <div className="text-center py-1">暂无历史</div> : history.map((h, i) => <div key={i} className="text-right font-mono">{h}</div>)}
    </div>
    <div className="bg-[rgb(var(--bg-secondary))] rounded-xl p-3 text-right text-xl font-mono mb-3 truncate">{expr}{display}</div>
    <div className="grid grid-cols-4 gap-1.5">
      {btns.map(btn => {
        const isOp = ops.includes(btn)
        const btnClass = isOp ? 'bg-accent/20 text-accent hover:bg-accent/30' : 'bg-[rgb(var(--bg-secondary))] hover:bg-accent/10 text-[rgb(var(--text-primary))]'
        return (
          <button key={btn} type="button" onClick={() => {
            if (btn === 'C') { setDisplay('0'); setExpr('') }
            else if (btn === '=') handleEqual()
            else if (btn === '+/-') setDisplay(d => d.startsWith('-') ? d.slice(1) : '-' + d)
            else if (isOp && btn !== 'C' && btn !== '=') handleOp(btn)
            else if (btn === '%') setDisplay(d => String(Number(d) / 100))
            else handleNum(btn)
          }} className={`py-2.5 rounded-xl text-sm font-bold transition-colors ${btnClass}`}>{btn}</button>
        )
      })}
    </div>
  </div>)
}

// ========== 密码生成（批量+强度）==========
function PasswordTool() {
  const [length, setLength] = useState(16); const [passwords, setPasswords] = useState<string[]>([]); const [count, setCount] = useState(1)
  const generate = () => { const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'; const newPwds = Array.from({ length: count }, () => { let pwd = ''; for (let i = 0; i < length; i++) pwd += chars[Math.floor(Math.random() * chars.length)]; return pwd }); setPasswords(newPwds) }
  useEffect(() => { generate() }, [length, count])
  const getStrength = (pwd: string) => { let s = 0; if (pwd.length >= 8) s++; if (pwd.length >= 12) s++; if (/[A-Z]/.test(pwd)) s++; if (/[0-9]/.test(pwd)) s++; if (/[^A-Za-z0-9]/.test(pwd)) s++; return s }
  const strengthLabels = ['', '弱', '较弱', '中等', '较强', '强']
  const strengthColors = ['', 'text-red-500', 'text-orange-500', 'text-yellow-500', 'text-green-500', 'text-emerald-500']
  return (<div className="p-4">
    <div className="mb-3"><label className="text-xs text-[rgb(var(--text-secondary))]">长度: {length}</label><input type="range" min="6" max="32" value={length} onChange={e => setLength(Number(e.target.value))} className="w-full accent-accent" /></div>
    <div className="mb-3"><label className="text-xs text-[rgb(var(--text-secondary))]">数量: {count}</label><div className="flex gap-2 mt-1">{[1, 3, 5, 10].map(n => <button key={n} type="button" onClick={() => setCount(n)} className={`flex-1 py-1 rounded-lg text-xs font-medium transition-colors ${count === n ? 'bg-accent text-white' : 'bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))]'}`}>{n}</button>)}</div></div>
    <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">{passwords.map((pwd, i) => { const s = getStrength(pwd); return (<div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-[rgb(var(--bg-secondary))]"><span className="flex-1 text-xs font-mono break-all text-[rgb(var(--text-primary))]">{pwd}</span><span className={`text-[10px] font-bold ${strengthColors[s]}`}>{strengthLabels[s]}</span><button type="button" onClick={() => navigator.clipboard.writeText(pwd)} className="text-[10px] text-accent hover:underline">复制</button></div>) })}</div>
    <button type="button" onClick={generate} className="w-full py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">重新生成</button>
  </div>)
}

// ========== 单位换算 ==========
function ConverterTool() {
  const [value, setValue] = useState(''); const [groupIdx, setGroupIdx] = useState(0); const [fromUnit, setFromUnit] = useState('km'); const [toUnit, setToUnit] = useState('mile')
  const unitLabels: Record<string, string> = { km: '千米', mile: '英里', m: '米', kg: '千克', lb: '磅', g: '克', celsius: '°C', fahrenheit: '°F', kelvin: 'K' }
  const unitGroups = [['km', 'mile', 'm'], ['kg', 'lb', 'g'], ['celsius', 'fahrenheit', 'kelvin']]
  const groupLabels = ['长度', '重量', '温度']
  const rates: Record<string, Record<string, number>> = { km: { mile: 0.621371, m: 1000 }, mile: { km: 1.60934, m: 1609.34 }, m: { km: 0.001, mile: 0.000621371 }, kg: { lb: 2.20462, g: 1000 }, lb: { kg: 0.453592, g: 453.592 }, g: { kg: 0.001, lb: 0.00220462 } }
  const tempConvert = (val: number, from: string, to: string): number => { if (from === to) return val; if (from === 'celsius' && to === 'fahrenheit') return val * 9 / 5 + 32; if (from === 'celsius' && to === 'kelvin') return val + 273.15; if (from === 'fahrenheit' && to === 'celsius') return (val - 32) * 5 / 9; if (from === 'fahrenheit' && to === 'kelvin') return (val - 32) * 5 / 9 + 273.15; if (from === 'kelvin' && to === 'celsius') return val - 273.15; if (from === 'kelvin' && to === 'fahrenheit') return (val - 273.15) * 9 / 5 + 32; return val }
  const switchGroup = (idx: number) => { setGroupIdx(idx); setFromUnit(unitGroups[idx][0]); setToUnit(unitGroups[idx][1]) }
  const convert = () => { const num = parseFloat(value); if (isNaN(num)) return '—'; if (fromUnit in rates && toUnit in rates[fromUnit]) return (num * rates[fromUnit][toUnit]).toFixed(4); if (['celsius', 'fahrenheit', 'kelvin'].includes(fromUnit)) return tempConvert(num, fromUnit, toUnit).toFixed(2); return '—' }
  const getBtnClass = (u: string) => `flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${fromUnit === u ? 'bg-accent text-white' : 'bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))]'}`
  return (<div className="p-4"><div className="flex gap-1 mb-3">{groupLabels.map((label, i) => <button key={i} type="button" onClick={() => switchGroup(i)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${groupIdx === i ? 'bg-accent text-white' : 'bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))]'}`}>{label}</button>)}</div><div className="flex gap-1 mb-3 flex-wrap">{unitGroups[groupIdx].map(u => <button key={u} type="button" onClick={() => { setFromUnit(u); setToUnit(unitGroups[groupIdx].find(x => x !== u) || unitGroups[groupIdx][0]) }} className={getBtnClass(u)}>{unitLabels[u]}</button>)}</div><input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="输入数值" className="w-full bg-[rgb(var(--bg-secondary))] rounded-xl px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-accent/30" /><div className="text-center text-xs text-[rgb(var(--text-secondary))] mb-2">{unitLabels[fromUnit]} → {unitLabels[toUnit]}</div><div className="text-center p-3 rounded-xl bg-[rgb(var(--bg-secondary))]"><div className="text-xl font-bold text-accent">{convert()}</div><div className="text-xs text-[rgb(var(--text-secondary))]">{unitLabels[toUnit]}</div></div></div>)
}

// ========== 进制转换 ==========
function BaseTool() {
  const [input, setInput] = useState(''); const [fromBase, setFromBase] = useState(10)
  const bases = [2, 8, 10, 16]; const baseLabels: Record<number, string> = { 2: '二进制', 8: '八进制', 10: '十进制', 16: '十六进制' }
  const convert = () => { try { const num = parseInt(input, fromBase); if (isNaN(num)) return {}; const r: Record<number, string> = {}; bases.forEach(b => { r[b] = num.toString(b).toUpperCase() }); return r } catch { return {} } }
  const results = convert()
  const getBaseBtnClass = (b: number) => `flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${fromBase === b ? 'bg-accent text-white' : 'bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))]'}`
  return (<div className="p-4"><div className="flex gap-1 mb-3">{bases.map(b => <button key={b} type="button" onClick={() => setFromBase(b)} className={getBaseBtnClass(b)}>{baseLabels[b]}</button>)}</div><input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder={`输入${baseLabels[fromBase]}数`} className="w-full bg-[rgb(var(--bg-secondary))] rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-accent/30 font-mono" /><div className="space-y-2">{bases.map(b => <div key={b} className="flex items-center gap-2 p-2 rounded-xl bg-[rgb(var(--bg-secondary))]"><span className="text-[10px] text-[rgb(var(--text-secondary))] w-12">{baseLabels[b]}</span><span className="text-sm font-mono text-accent flex-1 truncate">{results[b] || '—'}</span></div>)}</div></div>)
}

// ========== 世界时间 ==========
function WorldTimeTool() {
  const [times, setTimes] = useState<Record<string, string>>({})
  const zones = [{ name: '北京', tz: 'Asia/Shanghai' }, { name: '东京', tz: 'Asia/Tokyo' }, { name: '纽约', tz: 'America/New_York' }, { name: '伦敦', tz: 'Europe/London' }, { name: '巴黎', tz: 'Europe/Paris' }, { name: '悉尼', tz: 'Australia/Sydney' }]
  useEffect(() => { const update = () => { const t: Record<string, string> = {}; zones.forEach(z => { t[z.name] = new Date().toLocaleTimeString('zh-CN', { timeZone: z.tz, hour: '2-digit', minute: '2-digit', second: '2-digit' }) }); setTimes(t) }; update(); const i = setInterval(update, 1000); return () => clearInterval(i) }, [])
  return <div className="p-3 space-y-2 overflow-y-auto h-full">{zones.map(z => <div key={z.name} className="flex justify-between items-center py-2.5 px-3 rounded-xl bg-[rgb(var(--bg-secondary))]"><span className="text-sm text-[rgb(var(--text-primary))]">{z.name}</span><span className="text-sm font-mono font-bold text-accent">{times[z.name] || '--:--:--'}</span></div>)}</div>
}

// ========== 智能搜索 ==========
function SmartSearchTool() {
  const [query, setQuery] = useState('')
  const engines = [
    { name: '百度', icon: '🔍', url: 'https://www.baidu.com/s?wd=', color: 'from-blue-500 to-blue-600' },
    { name: 'Google', icon: '🌐', url: 'https://www.google.com/search?q=', color: 'from-red-500 to-amber-500' },
    { name: 'Bing', icon: '🅱️', url: 'https://www.bing.com/search?q=', color: 'from-teal-500 to-cyan-600' },
    { name: '知乎', icon: '💡', url: 'https://www.zhihu.com/search?q=', color: 'from-blue-400 to-indigo-500' },
    { name: 'B站', icon: '📺', url: 'https://search.bilibili.com/all?keyword=', color: 'from-pink-400 to-rose-500' },
    { name: 'GitHub', icon: '🐙', url: 'https://github.com/search?q=', color: 'from-gray-600 to-gray-800' },
    { name: '豆瓣', icon: '🎬', url: 'https://www.douban.com/search?q=', color: 'from-green-500 to-emerald-600' },
    { name: '微博', icon: '📢', url: 'https://s.weibo.com/weibo?q=', color: 'from-red-400 to-orange-500' },
  ]
  const search = (url: string) => { if (query.trim()) window.open(url + encodeURIComponent(query.trim()), '_blank') }
  return (<div className="p-4"><div className="relative mb-4"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-secondary))]" /><input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search(engines[0].url)} placeholder="搜索任何内容..." className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[rgb(var(--bg-secondary))] text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" /></div><div className="grid grid-cols-2 gap-2">{engines.map(e => <button key={e.name} type="button" onClick={() => search(e.url)} className={`flex items-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r ${e.color} text-white text-xs font-medium hover:opacity-90 active:scale-95 transition-all`}><span className="text-base">{e.icon}</span><span>{e.name}</span></button>)}</div></div>)
}

// ========== 驾考题库 ==========
function DrivingExamTool() {
  const [questions] = useState(() => {
    const list = [
      { q: '驾驶机动车在道路上违反道路交通安全法的行为，属于什么行为？', options: ['违章行为', '违法行为', '过失行为', '违规行为'], answer: 1 },
      { q: '机动车驾驶证有效期分为？', options: ['1年、3年、5年', '3年、6年、10年', '6年、10年、长期', '5年、10年、长期'], answer: 2 },
      { q: '道路最左侧白色虚线区域是？', options: ['多乘员车道', '公交专用道', '快速通道', '机动车道'], answer: 0 },
      { q: '在没有中心线的道路上遇后车发出超车信号时，应当？', options: ['保持原状态行驶', '加速行驶', '迅速停车让行', '降速靠右让行'], answer: 3 },
      { q: '夜间驾驶机动车在没有路灯照明的道路上跟车行驶时，应当使用？', options: ['远光灯', '近光灯', '危险报警闪光灯', '示廓灯'], answer: 1 },
      { q: '机动车在高速公路上行驶，车速超过100公里/小时时，应当与同车道前车保持多少距离？', options: ['50米以上', '80米以上', '100米以上', '150米以上'], answer: 2 },
      { q: '雨天对安全行车的主要影响是？', options: ['电器设备易受潮', '路面湿滑，视线受阻', '发动机易熄火', '行驶阻力增大'], answer: 1 },
      { q: '雾天对安全行车的主要影响是？', options: ['发动机易熄火', '易发生侧滑', '行驶阻力增大', '能见度低，视线不清'], answer: 3 },
      { q: '行车中遇儿童时，应当怎么做？', options: ['加速绕行', '减速慢行，必要时停车避让', '鸣喇叭通过', '正常行驶'], answer: 1 },
      { q: '在同向3车道高速公路上行车，车速高于90公里/小时时，应在哪条车道行驶？', options: ['最左侧车道', '中间车道', '最右侧车道', '任意车道'], answer: 0 },
    ]
    return list
  })
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const choose = (idx: number) => { if (selected !== null) return; setSelected(idx); if (idx === questions[current].answer) setScore(s => s + 1) }
  const next = () => { if (current < questions.length - 1) { setCurrent(c => c + 1); setSelected(null) } else { setFinished(true) } }
  if (finished) return (<div className="p-4 flex flex-col items-center"><div className="text-5xl mb-3">{score >= 8 ? '🎉' : score >= 6 ? '😊' : '😓'}</div><div className="text-2xl font-bold text-accent mb-2">{score} / {questions.length}</div><div className="text-sm text-[rgb(var(--text-secondary))] mb-4">{score >= 8 ? '优秀！' : score >= 6 ? '及格' : '需要加油'}</div><button type="button" onClick={() => { setCurrent(0); setSelected(null); setScore(0); setFinished(false) }} className="w-full py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">重新开始</button></div>)
  return (<div className="p-4 h-full flex flex-col"><div className="text-xs text-[rgb(var(--text-secondary))] mb-2">第 {current + 1} / {questions.length} 题 · 得分: {score}</div><div className="text-sm font-medium text-[rgb(var(--text-primary))] mb-3 leading-relaxed">{questions[current].q}</div><div className="space-y-2 flex-1">{questions[current].options.map((opt, i) => { const isCorrect = i === questions[current].answer; const isSel = selected === i; let cls = 'bg-[rgb(var(--bg-secondary))]'; if (selected !== null) { if (isCorrect) cls = 'bg-green-500/20 border border-green-500/50'; else if (isSel) cls = 'bg-red-500/20 border border-red-500/50' }; return <button key={i} type="button" onClick={() => choose(i)} className={`w-full text-left p-3 rounded-xl text-sm transition-all ${cls}`}>{String.fromCharCode(65 + i)}. {opt}</button> })}</div>{selected !== null && <button type="button" onClick={next} className="w-full mt-3 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">{current < questions.length - 1 ? '下一题' : '查看结果'}</button>}</div>)
}

// ========== 原神图片 ==========
function GenshinImageTool() {
  const { src, loaded, error, load } = useImageLoader()
  const [current, setCurrent] = useState('')
  const reload = () => { const next = pickLocalImage(current); setCurrent(next); load(next) }
  useEffect(() => { reload() }, [])
  return <div className="p-4">
    <div className="rounded-xl overflow-hidden mb-3 bg-[rgb(var(--bg-secondary))] h-48 flex items-center justify-center relative">
      {error ? <span className="text-sm text-[rgb(var(--text-secondary))]">加载失败</span>
        : !loaded ? <RefreshCw size={20} className="animate-spin text-accent" />
        : <img src={src} alt="原神图片" loading="lazy" decoding="async" className="w-full h-48 object-cover transition-opacity duration-300" style={{ opacity: loaded ? 1 : 0 }} />}
    </div>
    <button type="button" onClick={reload} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-400 to-indigo-500 text-white text-sm font-medium hover:opacity-90 transition-opacity">换一张</button>
  </div>
}

// ========== 4K 4K图片 ==========
function Wallpaper4KTool() {
  const { src, loaded, error, load } = useImageLoader()
  const [current, setCurrent] = useState('')
  const reload = () => { const next = pickLocalImage(current); setCurrent(next); load(next) }
  useEffect(() => { reload() }, [])
  return <div className="p-4">
    <div className="rounded-xl overflow-hidden mb-3 bg-[rgb(var(--bg-secondary))] h-48 flex items-center justify-center relative">
      {error ? <span className="text-sm text-[rgb(var(--text-secondary))]">加载失败</span>
        : !loaded ? <RefreshCw size={20} className="animate-spin text-accent" />
        : <img src={src} alt="4K壁纸" loading="lazy" decoding="async" className="w-full h-48 object-cover transition-opacity duration-300" style={{ opacity: loaded ? 1 : 0 }} />}
    </div>
    <button type="button" onClick={reload} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity">换一张</button>
  </div>
}

// ========== 快递查询 ==========
function ExpressTrackingTool() {
  const [trackingNo, setTrackingNo] = useState(''); const [result, setResult] = useState<any>(null); const [loading, setLoading] = useState(false)
  const couriers = [
    { name: '顺丰', code: 'shunfeng', icon: '🚚' },
    { name: '中通', code: 'zhongtong', icon: '📦' },
    { name: '圆通', code: 'yuantong', icon: '🟡' },
    { name: '韵达', code: 'yunda', icon: '🔵' },
    { name: '申通', code: 'shentong', icon: '🔴' },
    { name: '百世', code: 'huitongkuaidi', icon: '🟢' },
    { name: '京东', code: 'jd', icon: '🔴' },
    { name: 'EMS', code: 'ems', icon: '✉️' },
  ]
  const [courier, setCourier] = useState('shunfeng')
  const track = async () => {
    if (!trackingNo.trim()) return
    setLoading(true); setResult(null)
    const no = trackingNo.trim()
    try {
      const r = await fetch(`/kuaidi?type=${courier}&postid=${encodeURIComponent(no)}`)
      const ct = r.headers.get('content-type') || ''
      if (!ct.includes('json')) throw new Error('not json')
      const d = await r.json()
      if (d && Array.isArray(d.data) && d.data.length > 0) {
        setResult({ list: d.data.map((it: any) => ({ datetime: it.time, remark: it.context })) })
      } else {
        throw new Error('empty')
      }
    } catch {
      // 免费快递查询接口（快递100等）多需密钥/易被风控拦截，失败时引导到官网查询
      setResult({ message: '免费快递查询接口暂不可用，可前往快递100官网查询该单号', official: `https://www.kuaidi100.com/result/postid/${encodeURIComponent(no)}` })
    }
    setLoading(false)
  }
  return (<div className="p-4"><div className="flex gap-2 mb-3"><input type="text" value={trackingNo} onChange={e => setTrackingNo(e.target.value)} onKeyDown={e => e.key === 'Enter' && track()} placeholder="输入快递单号..." className="flex-1 bg-[rgb(var(--bg-secondary))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" /><button type="button" onClick={track} className="px-3 py-2 rounded-xl bg-accent text-white text-sm hover:bg-accent/90 transition-colors">{loading ? <RefreshCw size={14} className="animate-spin" /> : '查询'}</button></div><div className="grid grid-cols-4 gap-1.5 mb-3">{couriers.map(c => <button key={c.code} type="button" onClick={() => setCourier(c.code)} className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${courier === c.code ? 'bg-accent text-white' : 'bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))]'}`}><span className="text-base">{c.icon}</span>{c.name}</button>)}</div>{result && <div className="max-h-48 overflow-y-auto space-y-2">{result.message ? <div className="text-center py-3"><div className="text-sm text-red-500 mb-3">{result.message}</div>{result.official && <a href={result.official} target="_blank" rel="noreferrer" className="inline-block px-3 py-2 rounded-xl bg-accent text-white text-sm hover:bg-accent/90 transition-colors">前往快递100官网查询</a>}</div> : (result.list || []).map((item: any, i: number) => <div key={i} className="p-2 rounded-xl bg-[rgb(var(--bg-secondary))]"><div className="text-xs font-medium text-accent">{item.datetime || item.time}</div><div className="text-xs text-[rgb(var(--text-secondary))] mt-0.5">{item.remark || item.status}</div></div>)}</div>}</div>)
}

// ========== 手机归属地 ==========
function PhoneLocationTool() {
  const [phone, setPhone] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<{ num: string; label: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem('phone-history') || '[]') } catch { return [] }
  })

  const validatePhone = (num: string) => /^1[3-9]\d{9}$/.test(num)
  const maskPhone = (num: string) => num.slice(0, 3) + '****' + num.slice(7)

  const saveHistory = (num: string, label: string) => {
    const entry = { num, label }
    const updated = [entry, ...history.filter(h => h.num !== num)].slice(0, 6)
    setHistory(updated)
    localStorage.setItem('phone-history', JSON.stringify(updated))
  }

  const query = async (num?: string) => {
    const phoneNum = (num ?? phone).trim()
    if (!phoneNum) { setError('请输入手机号码'); return }
    if (!validatePhone(phoneNum)) { setError('请输入正确的 11 位手机号码'); return }
    setLoading(true); setError(null); setResult(null); setCopied(false)
    try {
      const r = await fetch(`${API}/misc/phoneinfo?phone=${phoneNum}`)
      if (!r.ok) throw new Error('API error')
      const d = await r.json()
      if (!d || (!d.province && !d.city && !d.sp)) { setError('未查询到归属地信息') }
      else {
        setResult(d)
        const label = [d.province || d.provinceName, d.city || d.cityName].filter(Boolean).join(' · ')
        saveHistory(phoneNum, label)
      }
    } catch { setError('查询失败，请稍后重试') }
    setLoading(false)
  }

  const copyPhone = () => {
    navigator.clipboard?.writeText(phone).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})
  }

  const getOperatorStyle = (op?: string) => {
    if (!op) return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
    if (op.includes('移动')) return 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300'
    if (op.includes('联通')) return 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
    if (op.includes('电信')) return 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300'
    return 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300'
  }

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-2">
        <input type="tel" value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 11)); setError(null) }} onKeyDown={e => e.key === 'Enter' && query()} placeholder="输入 11 位手机号码..." className={`flex-1 bg-[rgb(var(--bg-secondary))] rounded-xl px-3 py-2 text-sm tracking-wider focus:outline-none focus:ring-2 ${error ? 'ring-2 ring-red-400/40' : 'focus:ring-accent/30'}`} />
        <button type="button" onClick={() => query()} className="px-3 py-2 rounded-xl bg-accent text-white text-sm hover:bg-accent/90 transition-colors flex items-center gap-1">{loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}查询</button>
      </div>
      {history.length > 0 && !result && !loading && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {history.map(h => (
            <button key={h.num} type="button" onClick={() => { setPhone(h.num); query(h.num) }} className="px-2.5 py-1 rounded-lg bg-[rgb(var(--bg-secondary))] text-[11px] text-[rgb(var(--text-secondary))] hover:bg-accent/10 hover:text-accent transition-colors">
              {maskPhone(h.num)} <span className="opacity-60">{h.label}</span>
            </button>
          ))}
        </div>
      )}
      {error && <div className="text-center py-2 mb-2"><p className="text-xs text-red-400">{error}</p></div>}
      {loading && (
        <div className="space-y-2 animate-pulse">
          <div className="h-20 rounded-xl bg-[rgb(var(--bg-secondary))]" />
          <div className="grid grid-cols-2 gap-2">{[0, 1].map(i => <div key={i} className="h-14 rounded-xl bg-[rgb(var(--bg-secondary))]" />)}</div>
        </div>
      )}
      {!loading && !result && !error && (
        <div className="text-center py-8">
          <div className="text-3xl mb-2">📱</div>
          <p className="text-sm text-[rgb(var(--text-secondary))]">输入手机号码查询归属地</p>
          <p className="text-[10px] text-[rgb(var(--text-secondary))] mt-1">支持移动、联通、电信号码</p>
        </div>
      )}
      {result && !loading && (
        <div className="space-y-2">
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 relative">
            <button type="button" onClick={copyPhone} className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-[rgb(var(--bg-secondary))]/50 hover:bg-[rgb(var(--bg-secondary))] transition-colors text-[10px] text-[rgb(var(--text-secondary))]" title="复制号码">{copied ? '✓ 已复制' : '复制'}</button>
            <div className="text-2xl font-bold text-accent tracking-wider">{phone}</div>
            <div className="text-sm text-[rgb(var(--text-primary))] mt-1">{result.province || result.provinceName}{result.city || result.cityName ? ' · ' + (result.city || result.cityName) : ''}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[rgb(var(--bg-secondary))] rounded-xl p-2.5 text-center">
              <div className="text-[rgb(var(--text-secondary))] mb-1">运营商</div>
              <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${getOperatorStyle(result.operator || result.isp || result.sp)}`}>{result.operator || result.isp || result.sp || '—'}</span>
            </div>
            <div className="bg-[rgb(var(--bg-secondary))] rounded-xl p-2.5 text-center">
              <div className="text-[rgb(var(--text-secondary))] mb-0.5">邮编</div>
              <div className="font-bold text-[rgb(var(--text-primary))]">{result.zipcode || result.zip || '—'}</div>
            </div>
          </div>
          {(result.areacode || result.cityCode) && (
            <div className="bg-[rgb(var(--bg-secondary))] rounded-xl p-2.5 text-xs flex justify-between">
              <span className="text-[rgb(var(--text-secondary))]">区号</span>
              <span className="font-bold text-[rgb(var(--text-primary))]">{result.areacode || result.cityCode || '—'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ========== IP 查询 ==========
function IPQueryTool() {
  const [ip, setIp] = useState('')
  const [data, setData] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const lookup = async (target?: string, signal?: AbortSignal) => {
    setLoading(true); setError(''); setData(null)
    try {
      const query = target || ip.trim()
      const url = query ? `https://ipwho.is/${encodeURIComponent(query)}` : 'https://ipwho.is/'
      const res = await fetch(url, signal ? { signal } : undefined)
      const json = await res.json()
      if (signal?.aborted) return
      if (!json.success) throw new Error(json.message || '查询失败')
      setData(json)
    } catch (e: any) { if (!signal?.aborted) setError(e.message || '查询失败') }
    finally { if (!signal?.aborted) setLoading(false) }
  }

  useEffect(() => { const ac = new AbortController(); void lookup(undefined, ac.signal); return () => ac.abort() }, [])

  const fields = data ? [
    { label: 'IP 地址', value: data.ip },
    { label: '国家/地区', value: `${data.country || ''} ${data.flag || ''} ${data.region || ''}`.trim() },
    { label: '城市', value: data.city || '—' },
    { label: '运营商', value: data.connection?.isp || data.connection?.org || '—' },
    { label: '时区', value: data.timezone?.id || '—' },
    { label: 'UTC 偏移', value: data.timezone?.utc || '—' },
    { label: '经纬度', value: data.latitude && data.longitude ? `${data.latitude}, ${data.longitude}` : '—' },
  ] : []

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && lookup()}
          placeholder="输入 IP 地址（留空查本机）"
          className="flex-1 rounded-lg border border-black/10 dark:border-white/10 bg-white/50 dark:bg-white/5 px-3 py-2 text-sm text-[rgb(var(--text-primary))] outline-none focus:border-accent"
        />
        <button onClick={() => lookup()} disabled={loading} className="rounded-lg bg-accent text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {loading ? '查询中' : '查询'}
        </button>
      </div>
      {loading && <div className="flex justify-center py-8"><RefreshCw size={20} className="animate-spin text-accent" /></div>}
      {error && <div className="text-sm text-red-500 text-center py-4">{error}</div>}
      {data && !loading && (
        <div className="space-y-2">
          {fields.map((f, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-white/40 dark:bg-white/5 px-3 py-2">
              <span className="text-xs text-[rgb(var(--text-secondary))]">{f.label}</span>
              <span className="text-sm font-medium text-[rgb(var(--text-primary))]">{f.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ========== UUID 生成 ==========
function UuidTool() {
  const [uuids, setUuids] = useState<string[]>([])
  const [upper, setUpper] = useState(false)

  const gen = (count: number) => {
    const arr: string[] = []
    for (let i = 0; i < count; i++) {
      if (crypto.randomUUID) { arr.push(crypto.randomUUID()) }
      else {
        const b = new Uint8Array(16); crypto.getRandomValues(b)
        b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80
        const h = Array.from(b, (x) => x.toString(16).padStart(2, '0'))
        arr.push(`${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`)
      }
    }
    setUuids(upper ? arr.map((u) => u.toUpperCase()) : arr)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => gen(1)} className="flex-1 rounded-lg bg-violet-500 text-white py-2 text-sm font-medium hover:opacity-90">生成 1 个</button>
        <button onClick={() => gen(5)} className="flex-1 rounded-lg bg-purple-500 text-white py-2 text-sm font-medium hover:opacity-90">生成 5 个</button>
        <button onClick={() => gen(10)} className="flex-1 rounded-lg bg-indigo-500 text-white py-2 text-sm font-medium hover:opacity-90">生成 10 个</button>
      </div>
      <label className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]">
        <input type="checkbox" checked={upper} onChange={(e) => { setUpper(e.target.checked); setUuids(uuids.map((u) => e.target.checked ? u.toUpperCase() : u.toLowerCase())) }} className="accent-violet-500" />
        大写
      </label>
      {uuids.length > 0 && (
        <div className="space-y-1.5 max-h-60 overflow-auto">
          {uuids.map((u, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-white/40 dark:bg-white/5 px-3 py-2">
              <code className="flex-1 text-xs font-mono text-[rgb(var(--text-primary))] truncate">{u}</code>
              <button onClick={() => navigator.clipboard.writeText(u)} className="text-xs rounded bg-black/5 dark:bg-white/10 px-2 py-0.5 hover:opacity-80 shrink-0">复制</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ========== 主组件 ==========
export function Toolbox() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeApp, setActiveApp] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [apps, setApps] = useState<ToolApp[]>(() => {
    try { const saved = localStorage.getItem('toolbox-apps-order'); if (saved) { const parsed: ToolApp[] = JSON.parse(saved); const savedIds = new Set(parsed.map(a => a.id)); const newApps = DEFAULT_APPS.filter(a => !savedIds.has(a.id)); const removedIds = new Set(DEFAULT_APPS.map(a => a.id)); const validSaved = parsed.filter(a => removedIds.has(a.id)); return [...validSaved, ...newApps] } return DEFAULT_APPS } catch { return DEFAULT_APPS }
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  const filteredApps = useMemo(() => searchQuery ? apps.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase())) : apps, [apps, searchQuery])
  const categories = useMemo(() => [...new Set(apps.map(a => a.category))], [apps])

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      setApps((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id)
        const newIndex = items.findIndex(i => i.id === over.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        localStorage.setItem('toolbox-apps-order', JSON.stringify(newItems))
        return newItems
      })
    }
  }

  const handleAppClick = useCallback((app: ToolApp) => { playClickSound(); setActiveApp(app.id) }, [])

  const renderToolContent = () => {
    if (!activeApp) return null
    switch (activeApp) {
      case 'hotboard': return <HotBoardTool />
      case 'githubuser': return <GitHubUserTool />
      case 'githubrepo': return <GitHubRepoTool />
      case 'history': return <HistoryTodayTool />
      case 'bmi': return <BMITool />
      case 'dailyword': return <DailyWordTool />
      case 'goldprice': return <GoldPriceTool />
      case 'converter': return <ConverterTool />
      case 'base': return <BaseTool />
      case 'worldtime': return <WorldTimeTool />
      case 'password': return <PasswordTool />
      case 'calculator': return <CalculatorTool />
      case 'randomimage': return <RandomImageTool />
      case 'bingdaily': return <BingDailyTool />
      case 'saying': return <SayingTool />
      case 'smartsearch': return <SmartSearchTool />
      case 'drivingexam': return <DrivingExamTool />
      case 'genshinimage': return <GenshinImageTool />
      case 'wallpaper4k': return <Wallpaper4KTool />
      case 'express': return <ExpressTrackingTool />
      case 'phonelocation': return <PhoneLocationTool />
      case 'ipquery': return <IPQueryTool />
      case 'uuid': return <UuidTool />
      case 'almanac': return <AlmanacTool />
      case 'catimage': return <CatImageTool />
      case 'dogimage': return <DogImageTool />
      case 'animeimage': return <AnimeImageTool />
      case 'abstractart': return <AbstractArtTool />
      case 'pixelart': return <PixelArtTool />
      case 'avatargen': return <AvatarGeneratorTool />
      case 'currency': return <CurrencyConverterTool />
      case 'pomodoro': return <PomodoroTimerTool />
      case 'countdown': return <CountdownDayTool />
      case 'mbti': return <MbtiTestTool />
      case 'reaction': return <ReactionTestTool />
      case 'typing': return <TypingTestTool />
      case 'pitch': return <PitchTestTool />
      case 'fortune': return <DailyFortuneFullTool />
      case 'tarot': return <TarotTool />
      case 'pickup': return <PickupLineTool />
      case 'emojidict': return <EmojiDictTool />
      case 'airquality': return <AirQualityTool />
      case 'expresstime': return <ExpressTimeTool />
      case 'oilprice': return <OilPriceTool />
      default: return <div className="p-4 h-full flex flex-col items-center justify-center"><div className="text-4xl mb-3">🚧</div><p className="text-sm text-[rgb(var(--text-secondary))]">功能开发中...</p></div>
    }
  }

  const activeAppData = apps.find(a => a.id === activeApp)

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-24 left-6 z-50"
          >
            <div role="dialog" aria-modal="true" aria-label="工具箱" className="w-[90vw] max-w-[320px] h-[520px] rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl shadow-black/20 border border-slate-200/50 dark:border-slate-700/50 overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center gap-2">
                  {activeApp ? <button type="button" onClick={() => setActiveApp(null)} className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><ChevronLeft size={12} /></button> : <div className="w-2 h-2 rounded-full bg-green-400" />}
                  <span className="text-sm font-bold text-[rgb(var(--text-primary))]">{activeAppData?.name || '工具箱'}</span>
                </div>
                <span className="text-xs text-[rgb(var(--text-secondary))]">{new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {activeApp ? renderToolContent() : (
                  <div className="p-3">
                    {/* Search */}
                    <div className="relative mb-3"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-secondary))]" /><input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="搜索工具..." className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 text-[rgb(var(--text-primary))]" /></div>

                    {/* Apps */}
                    {searchQuery ? (
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={filteredApps.map(a => a.id)} strategy={rectSortingStrategy}>
                          <div className="grid grid-cols-3 gap-3">{filteredApps.map(app => <SortableAppItem key={app.id} app={app} onClick={() => handleAppClick(app)} />)}</div>
                        </SortableContext>
                      </DndContext>
                    ) : categories.map(cat => (
                      <div key={cat} className="mb-4">
                        <div className="text-xs font-bold text-[rgb(var(--text-secondary))] mb-2 px-1">{cat}</div>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                          <SortableContext items={apps.filter(a => a.category === cat).map(a => a.id)} strategy={rectSortingStrategy}>
                            <div className="grid grid-cols-3 gap-3">{apps.filter(a => a.category === cat).map(app => <SortableAppItem key={app.id} app={app} onClick={() => handleAppClick(app)} />)}</div>
                          </SortableContext>
                        </DndContext>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom indicator */}
              <div className="flex justify-center py-2">
                <div className="w-24 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        type="button"
        onClick={() => { playClickSound(); setIsOpen(!isOpen) }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-2xl bg-white/40 dark:bg-slate-800/60 backdrop-blur-md border border-white/30 dark:border-white/10 shadow-lg shadow-black/10 flex items-center justify-center transition-all duration-300"
        title="工具箱"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-[rgb(var(--text-primary))]">
          <rect x="2" y="2" width="7" height="7" rx="2" fill="currentColor" opacity="0.8" />
          <rect x="11" y="2" width="7" height="7" rx="2" fill="currentColor" opacity="0.6" />
          <rect x="2" y="11" width="7" height="7" rx="2" fill="currentColor" opacity="0.6" />
          <rect x="11" y="11" width="7" height="7" rx="2" fill="currentColor" opacity="0.4" />
        </svg>
      </motion.button>
    </>
  )
}

export default Toolbox
