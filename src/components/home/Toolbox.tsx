import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronLeft, Search, RefreshCw } from 'lucide-react'
import { playClickSound } from '@/utils/sounds'

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
  { id: 'bilibilihot', name: 'B站热榜', icon: '📺', color: 'from-sky-500 to-blue-600', category: '热门资讯' },
  { id: 'weather', name: '天气', icon: '🌤️', color: 'from-sky-400 to-cyan-500', category: '热门资讯' },
  { id: 'goldprice', name: '今日金价', icon: '💰', color: 'from-yellow-500 to-amber-500', category: '热门资讯' },
  { id: 'movieboxoffice', name: '实时票房', icon: '🎬', color: 'from-red-500 to-rose-600', category: '热门资讯' },
  { id: 'githubuser', name: 'GitHub用户', icon: '🐙', color: 'from-gray-600 to-gray-800', category: '热门资讯' },
  { id: 'githubrepo', name: 'GitHub仓库', icon: '📦', color: 'from-purple-500 to-violet-600', category: '热门资讯' },
  { id: 'programmer-history', name: '程序员历史', icon: '💻', color: 'from-green-500 to-emerald-600', category: '热门资讯' },
  { id: 'history', name: '历史今天', icon: '📜', color: 'from-amber-600 to-yellow-600', category: '热门资讯' },
  { id: 'horoscope', name: '星座运势', icon: '⭐', color: 'from-purple-500 to-indigo-500', category: '趣味测试' },
  { id: 'guanyin', name: '观音灵签', icon: '🪷', color: 'from-rose-400 to-pink-500', category: '趣味测试' },
  { id: 'bmi', name: 'BMI', icon: '⚖️', color: 'from-green-400 to-emerald-500', category: '趣味测试' },
  { id: 'drivingexam', name: '驾考题库', icon: '🚗', color: 'from-blue-400 to-sky-500', category: '趣味测试' },
  { id: 'randomimage', name: '随机图片', icon: '🖼️', color: 'from-green-400 to-teal-500', category: '图片壁纸' },
  { id: 'genshinimage', name: '原神图片', icon: '⚔️', color: 'from-purple-400 to-indigo-500', category: '图片壁纸' },
  { id: 'wallpaper4k', name: '4K图片', icon: '🏔️', color: 'from-teal-400 to-cyan-500', category: '图片壁纸' },
  { id: 'bingdaily', name: '必应每日', icon: '📷', color: 'from-sky-400 to-blue-500', category: '图片壁纸' },
  { id: 'saying', name: '随机古诗', icon: '📜', color: 'from-amber-400 to-yellow-500', category: '图片壁纸' },
  { id: 'fortune', name: '抽签', icon: '🎰', color: 'from-red-400 to-pink-500', category: '图片壁纸' },
  { id: 'hitokoto', name: '一言', icon: '💬', color: 'from-pink-500 to-rose-500', category: '热门资讯' },
  { id: 'dujitang', name: '毒鸡汤', icon: '🍜', color: 'from-amber-500 to-orange-500', category: '娱乐互动' },
  { id: 'dice', name: '骰子', icon: '🎲', color: 'from-orange-400 to-red-500', category: '娱乐互动' },
  { id: 'coin', name: '硬币', icon: '🪙', color: 'from-yellow-500 to-amber-600', category: '娱乐互动' },
  { id: 'rps', name: '猜拳', icon: '✊', color: 'from-pink-400 to-rose-500', category: '娱乐互动' },
  { id: 'qrcode', name: '二维码', icon: '📱', color: 'from-gray-600 to-gray-800', category: '实用工具' },
  { id: 'password', name: '密码', icon: '🔑', color: 'from-green-500 to-emerald-600', category: '实用工具' },
  { id: 'note', name: '记事本', icon: '📝', color: 'from-amber-400 to-yellow-500', category: '实用工具' },
  { id: 'converter', name: '换算', icon: '🔄', color: 'from-cyan-400 to-blue-500', category: '实用工具' },
  { id: 'base', name: '进制', icon: '🔢', color: 'from-teal-400 to-cyan-500', category: '实用工具' },
  { id: 'calculator', name: '计算器', icon: '🧮', color: 'from-blue-400 to-indigo-500', category: '实用工具' },
  { id: 'calendar', name: '日历', icon: '📅', color: 'from-indigo-400 to-blue-500', category: '实用工具' },
  { id: 'express', name: '快递查询', icon: '📦', color: 'from-orange-400 to-amber-500', category: '实用工具' },
  { id: 'phonelocation', name: '手机归属地', icon: '📱', color: 'from-green-400 to-teal-500', category: '实用工具' },
  { id: 'worldtime', name: '世界时间', icon: '🌍', color: 'from-sky-400 to-blue-500', category: '实用工具' },
  { id: 'clock', name: '时钟', icon: '⏰', color: 'from-purple-400 to-violet-500', category: '实用工具' },
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

function HitokotoTool() {
  const [text, setText] = useState('正在获取一言...'); const [from, setFrom] = useState(''); const [loading, setLoading] = useState(false)
  const load = async () => { setLoading(true); try { const r = await fetch(`${API}/saying/random`); const d = await r.json(); setText(d.content || '获取失败'); setFrom(d.author || d.source || '') } catch { setText('网络错误'); setFrom('') }; setLoading(false) }
  useEffect(() => { load() }, [])
  return (<div className="p-4 h-full flex flex-col"><div className="flex-1 flex items-center justify-center mb-4"><p className="text-sm text-[rgb(var(--text-secondary))] text-center leading-relaxed italic">"{text}"</p></div>{from && <p className="text-xs text-[rgb(var(--text-secondary))] text-center mb-3">—— {from}</p>}<button type="button" onClick={load} disabled={loading} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} />{loading ? '加载中...' : '换一句'}</button></div>)
}

function WeatherTool() {
  const [tab, setTab] = useState<'realtime' | 'forecast' | 'index'>('realtime')
  const [weather, setWeather] = useState<any>(null)
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)

  const loadWeather = async (cityName: string) => {
    setSearching(true)
    let targetCity = cityName || ''
    let province = ''
    if (!targetCity) {
      try {
        const geoRes = await fetch('https://ip-api.com/json/?lang=zh-CN')
        const geo = await geoRes.json()
        if (geo.city) { targetCity = geo.city; province = geo.regionName || '' }
        else throw new Error('no city')
      } catch {
        try {
          const r = await fetch('https://ipwho.is/')
          const g = await r.json()
          if (g.success && g.city) { targetCity = g.city; province = g.region || '' }
        } catch {}
      }
    }
    if (!targetCity) targetCity = '北京'
    try {
      const res = await fetch(`${API}/misc/weather?city=${encodeURIComponent(targetCity)}&extended=true&forecast=true&hourly=true&indices=true&lang=zh`)
      const data = await res.json()
      setWeather({ ...data, province: province || data.province })
    } catch {}
    setSearching(false); setLoading(false)
  }

  useEffect(() => { loadWeather('') }, [])

  if (loading) return <div className="p-4 flex items-center justify-center h-full"><RefreshCw size={20} className="animate-spin text-accent" /></div>

  const getWeatherIcon = (code: string) => {
    const c = parseInt(code)
    if (c <= 103) return '☀️'; if (c <= 199) return '☁️'; if (c <= 299) return '🌧️'; if (c <= 399) return '❄️'; if (c <= 499) return '🌫️'; return '🌤️'
  }

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-3">
        <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="输入城市名..."
          onKeyDown={e => e.key === 'Enter' && loadWeather(city)}
          className="flex-1 bg-[rgb(var(--bg-secondary))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
        <button type="button" onClick={() => loadWeather(city)} className="px-3 py-2 rounded-xl bg-accent text-white text-sm hover:bg-accent/90 transition-colors">
          {searching ? <RefreshCw size={14} className="animate-spin" /> : '搜索'}
        </button>
      </div>

      {/* 标签切换 */}
      <div className="flex gap-1 mb-3 bg-[rgb(var(--bg-secondary))] rounded-xl p-1">
        {(['realtime', 'forecast', 'index'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t ? 'bg-accent text-white shadow' : 'text-[rgb(var(--text-secondary))]'}`}>
            {t === 'realtime' ? '实时' : t === 'forecast' ? '预报' : '指数'}
          </button>
        ))}
      </div>

      {weather && tab === 'realtime' && (
        <div>
          <div className="text-center mb-4">
            <div className="text-5xl mb-2">{getWeatherIcon(weather.weather_icon || '100')}</div>
            <div className="text-3xl font-bold text-[rgb(var(--text-primary))]">{weather.temperature}°C</div>
            <div className="text-sm text-[rgb(var(--text-secondary))]">{weather.city}, {weather.province}</div>
            <div className="text-sm text-accent mt-1">{weather.weather}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[rgb(var(--bg-secondary))] rounded-xl p-2 text-center"><div className="text-[rgb(var(--text-secondary))]">湿度</div><div className="font-bold text-[rgb(var(--text-primary))]">{weather.humidity || '—'}%</div></div>
            <div className="bg-[rgb(var(--bg-secondary))] rounded-xl p-2 text-center"><div className="text-[rgb(var(--text-secondary))]">风向</div><div className="font-bold text-[rgb(var(--text-primary))]">{weather.wind_direction || '—'}</div></div>
            <div className="bg-[rgb(var(--bg-secondary))] rounded-xl p-2 text-center"><div className="text-[rgb(var(--text-secondary))]">风力</div><div className="font-bold text-[rgb(var(--text-primary))]">{weather.wind_power || '—'}</div></div>
            <div className="bg-[rgb(var(--bg-secondary))] rounded-xl p-2 text-center"><div className="text-[rgb(var(--text-secondary))]">发布时间</div><div className="font-bold text-[rgb(var(--text-primary))]">{weather.report_time || '—'}</div></div>
          </div>
        </div>
      )}

      {tab === 'forecast' && (
        <div className="space-y-2">
          {(weather?.forecast || []).slice(0, 7).map((f: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-[rgb(var(--bg-secondary))]">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getWeatherIcon(f.weather_icon || (f.weather_day?.includes('雨') ? '200' : f.weather_day?.includes('晴') ? '100' : '101'))}</span>
                <div>
                  <div className="text-xs font-medium text-[rgb(var(--text-primary))]">{f.week || ''} {f.date?.slice(5) || ''}</div>
                  <div className="text-[10px] text-[rgb(var(--text-secondary))]">{f.weather_day}{f.weather_night !== f.weather_day ? `/${f.weather_night}` : ''}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono font-bold text-[rgb(var(--text-primary))]">{f.temp_min}~{f.temp_max}°C</div>
                <div className="text-[10px] text-[rgb(var(--text-secondary))]">{f.wind_dir_day || ''} {f.wind_scale_day || ''}</div>
              </div>
            </div>
          ))}
          {(!weather?.forecast || weather.forecast.length === 0) && <div className="text-center py-8 text-sm text-[rgb(var(--text-secondary))]">暂无预报数据</div>}
        </div>
      )}

      {tab === 'index' && (
        <div className="space-y-2">
          {(() => {
            const indices = weather?.life_indices || weather?.indices || weather?.life_index || {}
            const entries = Array.isArray(indices) ? indices : Object.entries(indices).map(([key, val]: [string, any]) => ({ name: key, ...val }))
            if (entries.length === 0) return <div className="text-center py-8 text-sm text-[rgb(var(--text-secondary))]">暂无指数数据</div>
            return entries.map((idx: any, i: number) => {
              const nameMap: Record<string, string> = { clothing: '穿衣', uv: '紫外线', car_wash: '洗车', drying: '晾晒', air_conditioner: '空调', cold_risk: '感冒', exercise: '运动', comfort: '舒适度', travel: '旅游', fishing: '钓鱼', allergy: '过敏', sunscreen: '防晒', mood: '心情', beer: '啤酒', umbrella: '雨伞', traffic: '交通', air_purifier: '空气净化', pollen: '花粉' }
              const iconMap: Record<string, string> = { clothing: '👕', uv: '☀️', car_wash: '🚗', drying: '👔', air_conditioner: '❄️', cold_risk: '🤧', exercise: '🏃', comfort: '😊', travel: '✈️', fishing: '🎣', allergy: '😷', sunscreen: '🧴', mood: '😄', beer: '🍺', umbrella: '☂️', traffic: '🚗', air_purifier: '🌬️', pollen: '🌸' }
              const displayName = idx.name ? (nameMap[idx.name] || idx.name) : (idx.type || idx.category || '')
              const displayLevel = idx.level || idx.value || idx.brief || '—'
              const displayAdvice = idx.advice || idx.desc || ''
              return (
                <div key={i} className="p-2.5 rounded-xl bg-[rgb(var(--bg-secondary))]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[rgb(var(--text-primary))]">{iconMap[idx.name] || '📊'} {displayName}</span>
                    <span className="text-xs font-bold text-accent">{displayLevel}</span>
                  </div>
                  {displayAdvice && <div className="text-[10px] text-[rgb(var(--text-secondary))] mt-1 leading-relaxed">{displayAdvice}</div>}
                </div>
              )
            })
          })()}
        </div>
      )}
    </div>
  )
}

function HotBoardTool() {
  const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true)
  useEffect(() => { fetch(`${API}/misc/hotboard?type=weibo`).then(r => r.json()).then(d => setItems(d.list || [])).catch(() => {}).finally(() => setLoading(false)) }, [])
  if (loading) return <div className="p-4 flex items-center justify-center h-full"><RefreshCw size={20} className="animate-spin text-accent" /></div>
  return (<div className="p-3 space-y-1 overflow-y-auto h-full">{items.length === 0 ? <p className="text-center text-sm text-[rgb(var(--text-secondary))] py-8">暂无数据</p> : items.slice(0, 20).map((item: any, i: number) => (<div key={i} className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-[rgb(var(--bg-secondary))] transition-colors cursor-pointer"><span className={`w-5 text-center text-xs font-bold ${i < 3 ? 'text-red-500' : 'text-[rgb(var(--text-secondary))]'}`}>{item.index || i + 1}</span><span className="text-sm text-[rgb(var(--text-primary))] flex-1 truncate">{item.title}</span>{item.hot_value && <span className="text-[10px] text-red-400 shrink-0">{item.hot_value}</span>}</div>))}</div>)
}

function BilibiliHotTool() {
  const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true)
  useEffect(() => { fetch(`${API}/misc/hotboard?type=bilibili`).then(r => r.json()).then(d => setItems(d.list || [])).catch(() => {}).finally(() => setLoading(false)) }, [])
  if (loading) return <div className="p-4 flex items-center justify-center h-full"><RefreshCw size={20} className="animate-spin text-accent" /></div>
  return (<div className="p-3 space-y-1 overflow-y-auto h-full">{items.length === 0 ? <p className="text-center text-sm text-[rgb(var(--text-secondary))] py-8">暂无数据</p> : items.slice(0, 20).map((item: any, i: number) => (<div key={i} className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-[rgb(var(--bg-secondary))] transition-colors cursor-pointer"><span className={`w-5 text-center text-xs font-bold ${i < 3 ? 'text-sky-500' : 'text-[rgb(var(--text-secondary))]'}`}>{item.index || i + 1}</span><span className="text-sm text-[rgb(var(--text-primary))] flex-1 truncate">{item.title}</span>{item.hot_value && <span className="text-[10px] text-sky-400 shrink-0">{item.hot_value}</span>}</div>))}</div>)
}

function GitHubUserTool() {
  const [username, setUsername] = useState(''); const [user, setUser] = useState<any>(null); const [loading, setLoading] = useState(false)
  const search = async () => { if (!username.trim()) return; setLoading(true); try { const r = await fetch(`https://api.github.com/users/${username.trim()}`); if (r.ok) { setUser(await r.json()) } else { setUser(null) } } catch { setUser(null) }; setLoading(false) }
  return (<div className="p-4"><div className="flex gap-2 mb-4"><input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="搜索用户..." onKeyDown={e => e.key === 'Enter' && search()} className="flex-1 bg-[rgb(var(--bg-secondary))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" /><button type="button" onClick={search} className="px-3 py-2 rounded-xl bg-accent text-white text-sm hover:bg-accent/90 transition-colors">{loading ? <RefreshCw size={14} className="animate-spin" /> : '搜索'}</button></div>{user && <div className="text-center"><img src={user.avatar_url} alt={user.login} className="w-20 h-20 rounded-full mx-auto mb-3 ring-2 ring-accent/30" /><div className="font-bold text-[rgb(var(--text-primary))] text-lg">{user.name || user.login}</div><div className="text-xs text-[rgb(var(--text-secondary))] mt-1">@{user.login}</div>{user.bio && <div className="text-xs text-[rgb(var(--text-secondary))] mt-2 px-2">{user.bio}</div>}<div className="grid grid-cols-3 gap-2 mt-4 text-xs"><div className="bg-[rgb(var(--bg-secondary))] rounded-xl p-2 text-center"><div className="font-bold text-accent">{user.public_repos}</div><div className="text-[rgb(var(--text-secondary))]">仓库</div></div><div className="bg-[rgb(var(--bg-secondary))] rounded-xl p-2 text-center"><div className="font-bold text-accent">{user.followers}</div><div className="text-[rgb(var(--text-secondary))]">粉丝</div></div><div className="bg-[rgb(var(--bg-secondary))] rounded-xl p-2 text-center"><div className="font-bold text-accent">{user.following}</div><div className="text-[rgb(var(--text-secondary))]">关注</div></div></div>{user.location && <div className="text-xs text-[rgb(var(--text-secondary))] mt-3">📍 {user.location}</div>}{user.company && <div className="text-xs text-[rgb(var(--text-secondary))] mt-1">🏢 {user.company}</div>}{user.blog && <div className="text-xs text-accent mt-1 truncate">🔗 {user.blog}</div>}</div>}{!user && !loading && username && <p className="text-center text-sm text-[rgb(var(--text-secondary))]">未找到用户</p>}</div>)
}

function GitHubRepoTool() {
  const [query, setQuery] = useState(''); const [repos, setRepos] = useState<any[]>([]); const [loading, setLoading] = useState(false)
  const search = async () => { if (!query.trim()) return; setLoading(true); try { const r = await fetch(`https://api.github.com/search/repositories?q=${query.trim()}&sort=stars&per_page=5`); const d = await r.json(); setRepos(d.items || []) } catch { setRepos([]) }; setLoading(false) }
  return (<div className="p-4"><div className="flex gap-2 mb-4"><input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索仓库..." onKeyDown={e => e.key === 'Enter' && search()} className="flex-1 bg-[rgb(var(--bg-secondary))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" /><button type="button" onClick={search} className="px-3 py-2 rounded-xl bg-accent text-white text-sm hover:bg-accent/90 transition-colors">{loading ? <RefreshCw size={14} className="animate-spin" /> : '搜索'}</button></div><div className="space-y-2 overflow-y-auto max-h-[300px]">{repos.map((repo: any) => (<div key={repo.id} className="p-3 rounded-xl bg-[rgb(var(--bg-secondary))]"><div className="font-bold text-sm text-accent">{repo.full_name}</div><div className="text-xs text-[rgb(var(--text-secondary))] mt-1 line-clamp-2">{repo.description || '暂无描述'}</div><div className="flex gap-3 mt-2 text-[10px] text-[rgb(var(--text-secondary))]"><span>⭐ {repo.stargazers_count}</span><span>🍴 {repo.forks_count}</span><span>{repo.language || 'N/A'}</span></div></div>))}</div></div>)
}

function HistoryTodayTool() {
  const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [currentDate] = useState(new Date())
  const month = currentDate.getMonth() + 1; const day = currentDate.getDate()
  const loadData = async () => {
    setLoading(true)
    try {
      const r = await fetch('https://v2.xxapi.cn/api/history')
      const d = await r.json()
      const list = (d.data || []).map((s: string) => {
        const match = s.match(/^(\d+)年(\d+)月(\d+)日\s*(.*)$/)
        return match ? { year: match[1], title: match[4], description: '' } : { year: '', title: s, description: '' }
      })
      setItems(list)
    } catch {
      try {
        const r2 = await fetch(`${API}/history/programmer/today`)
        const d2 = await r2.json()
        setItems(d2.events || [])
      } catch { setItems([]) }
    }
    setLoading(false)
  }
  useEffect(() => { loadData() }, [])
  if (loading) return <div className="p-4 flex items-center justify-center h-full"><RefreshCw size={20} className="animate-spin text-accent" /></div>
  return (<div className="p-3 space-y-2 overflow-y-auto h-full"><div className="flex items-center justify-between mb-2 px-1"><div className="text-xs font-bold text-accent">📅 {month}月{day}日 历史上的今天</div><button type="button" onClick={loadData} className="text-[10px] text-[rgb(var(--text-secondary))] hover:text-accent transition-colors">刷新</button></div>{items.length === 0 ? <p className="text-center text-sm text-[rgb(var(--text-secondary))] py-8">暂无数据</p> : items.slice(0, 20).map((item: any, i: number) => (<div key={i} className="p-3 rounded-xl bg-[rgb(var(--bg-secondary))]"><div className="text-xs text-accent font-bold mb-1">{item.year ? `${item.year}年` : ''}</div><div className="text-sm text-[rgb(var(--text-primary))] font-medium">{item.title}</div>{item.description && <div className="text-xs text-[rgb(var(--text-secondary))] mt-1 line-clamp-2">{item.description}</div>}</div>))}</div>)
}

function ProgrammerHistoryTool() {
  const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [currentDate] = useState(new Date())
  const month = currentDate.getMonth() + 1; const day = currentDate.getDate()
  useEffect(() => { fetch(`${API}/history/programmer/today`).then(r => r.json()).then(d => setItems(d.events || [])).catch(() => {}).finally(() => setLoading(false)) }, [])
  if (loading) return <div className="p-4 flex items-center justify-center h-full"><RefreshCw size={20} className="animate-spin text-accent" /></div>
  return (<div className="p-3 space-y-2 overflow-y-auto h-full"><div className="text-xs font-bold text-accent mb-2 px-1">💻 {month}月{day}日 程序员历史</div>{items.length === 0 ? <p className="text-center text-sm text-[rgb(var(--text-secondary))] py-8">暂无数据</p> : items.slice(0, 15).map((item: any, i: number) => (<div key={i} className="p-3 rounded-xl bg-[rgb(var(--bg-secondary))]"><div className="text-xs text-accent font-bold mb-1">{item.year}年</div><div className="text-sm text-[rgb(var(--text-primary))] font-medium">{item.title}</div>{item.category && <span className="text-[10px] text-[rgb(var(--text-secondary))] mt-1 inline-block px-2 py-0.5 bg-accent/10 rounded-full">{item.category}</span>}</div>))}</div>)
}

function DailyWordTool() {
  const [data, setData] = useState<any>(null); const [loading, setLoading] = useState(true)
  useEffect(() => { fetch(`${API}/daily/word`).then(r => r.json()).then(d => setData(d)).catch(() => {}).finally(() => setLoading(false)) }, [])
  if (loading) return <div className="p-4 flex items-center justify-center h-full"><RefreshCw size={20} className="animate-spin text-accent" /></div>
  const words = data?.words || []
  return (<div className="p-3 space-y-2 overflow-y-auto h-full"><div className="text-xs text-[rgb(var(--text-secondary))] mb-2">{data?.date || '今日'}</div>{words.map((w: any, i: number) => (<div key={i} className="p-3 rounded-xl bg-[rgb(var(--bg-secondary))]"><div className="font-bold text-accent">{w.word}</div><div className="text-xs text-[rgb(var(--text-secondary))] mt-1">{w.translation}</div>{w.phonetic && <div className="text-xs text-[rgb(var(--text-secondary))] mt-1">{w.phonetic}</div>}</div>))}</div>)
}

function HoroscopeTool() {
  const [fortune, setFortune] = useState<any>(null); const [loading, setLoading] = useState(false)
  const signs = ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座']
  const fortunes: Record<string, string[]> = { '白羊座': ['今天适合大胆行动', '爱情运势上升', '工作上有突破'], '金牛座': ['财运不错', '适合理财投资', '感情稳定'], '双子座': ['社交运旺盛', '创意灵感多', '注意休息'], '巨蟹座': ['家庭运好', '适合居家活动', '情绪稳定'], '狮子座': ['领导力强', '适合展示才华', '注意谦虚'], '处女座': ['细节决定成败', '适合整理归纳', '健康注意'], '天秤座': ['人际关系和谐', '适合合作', '决策需果断'], '天蝎座': ['直觉敏锐', '适合深度思考', '信任自己'], '射手座': ['冒险运好', '适合旅行探索', '保持乐观'], '摩羯座': ['事业运强', '适合制定计划', '坚持努力'], '水瓶座': ['创意无限', '适合头脑风暴', '保持独特'], '双鱼座': ['灵感丰富', '适合艺术创作', '相信直觉'] }
  const load = (s: string) => { setLoading(true); setTimeout(() => { setFortune({ title: s, all: fortunes[s]?.[0] || '运势平稳', love: fortunes[s]?.[1] || '感情顺利', work: fortunes[s]?.[2] || '工作顺利', money: '财运一般', color: '蓝色', number: Math.floor(Math.random() * 10) + 1 }); setLoading(false) }, 500) }
  return (<div className="p-4">{!fortune && !loading ? (<div className="grid grid-cols-3 gap-2">{signs.map(s => (<button key={s} type="button" onClick={() => load(s)} className="py-2 rounded-xl bg-[rgb(var(--bg-secondary))] text-xs font-medium text-[rgb(var(--text-primary))] hover:bg-accent/10 transition-colors">{s}</button>))}</div>) : loading ? (<div className="flex items-center justify-center py-8"><RefreshCw size={20} className="animate-spin text-accent" /></div>) : (<div><div className="text-center mb-3"><div className="text-lg font-bold text-accent">{fortune?.title}</div><div className="text-xs text-[rgb(var(--text-secondary))] mt-1">今日运势</div></div><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-[rgb(var(--text-secondary))]">综合</span><span className="text-accent">{fortune?.all}</span></div><div className="flex justify-between"><span className="text-[rgb(var(--text-secondary))]">爱情</span><span className="text-accent">{fortune?.love}</span></div><div className="flex justify-between"><span className="text-[rgb(var(--text-secondary))]">工作</span><span className="text-accent">{fortune?.work}</span></div><div className="flex justify-between"><span className="text-[rgb(var(--text-secondary))]">财运</span><span className="text-accent">{fortune?.money}</span></div><div className="flex justify-between"><span className="text-[rgb(var(--text-secondary))]">幸运色</span><span className="text-accent">{fortune?.color}</span></div><div className="flex justify-between"><span className="text-[rgb(var(--text-secondary))]">幸运数字</span><span className="text-accent">{fortune?.number}</span></div></div><button type="button" onClick={() => setFortune(null)} className="w-full mt-4 py-2 rounded-xl bg-accent/10 text-accent text-sm hover:bg-accent/20 transition-colors">换个星座</button></div>)}</div>)
}

function BMITool() {
  const [height, setHeight] = useState(''); const [weight, setWeight] = useState(''); const [result, setResult] = useState<{ bmi: number; level: string; color: string } | null>(null)
  const calculate = () => { const h = parseFloat(height) / 100, w = parseFloat(weight); if (h > 0 && w > 0) { const bmi = w / (h * h); let level = '', color = ''; if (bmi < 18.5) { level = '偏瘦'; color = 'text-blue-500' } else if (bmi < 24) { level = '正常'; color = 'text-green-500' } else if (bmi < 28) { level = '偏胖'; color = 'text-amber-500' } else { level = '肥胖'; color = 'text-red-500' }; setResult({ bmi: Math.round(bmi * 10) / 10, level, color }) } }
  return (<div className="p-4"><div className="space-y-3 mb-4"><div><label className="text-xs text-[rgb(var(--text-secondary))] mb-1 block">身高 (cm)</label><input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="170" className="w-full bg-[rgb(var(--bg-secondary))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" /></div><div><label className="text-xs text-[rgb(var(--text-secondary))] mb-1 block">体重 (kg)</label><input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="65" className="w-full bg-[rgb(var(--bg-secondary))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" /></div></div><button type="button" onClick={calculate} className="w-full py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors mb-4">计算 BMI</button>{result && <div className="text-center p-4 rounded-xl bg-[rgb(var(--bg-secondary))]"><div className="text-3xl font-bold text-[rgb(var(--text-primary))]">{result.bmi}</div><div className={`text-sm font-bold mt-1 ${result.color}`}>{result.level}</div></div>}</div>)
}

function GoldPriceTool() {
  const [price, setPrice] = useState<any>(null); const [loading, setLoading] = useState(true)
  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch('https://v2.xxapi.cn/api/goldprice')
      const d = await r.json()
      if (d && d.code === 200 && d.data) {
        const bars = (d.data.bank_gold_bar_price || []).map((b: any) => ({ name: b.bank, price: b.price, change: '' }))
        const recycle = (d.data.gold_recycle_price || []).map((b: any) => ({ name: b.gold_type, price: b.recycle_price, change: '' }))
        const updated = (d.data.gold_recycle_price && d.data.gold_recycle_price[0] && d.data.gold_recycle_price[0].updated_date) || new Date().toLocaleDateString('zh-CN')
        setPrice({ items: [...bars, ...recycle], update_time: updated })
      } else {
        setPrice({ items: [], error: true })
      }
    } catch {
      setPrice({ items: [], error: true })
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])
  if (loading) return <div className="p-4 flex items-center justify-center h-full"><RefreshCw size={20} className="animate-spin text-accent" /></div>
  return (<div className="p-4"><div className="flex items-center justify-between mb-4"><div className="text-xs text-[rgb(var(--text-secondary))]">今日金价（元/克）</div><button type="button" onClick={load} className="text-[10px] text-accent hover:underline">刷新</button></div>{price?.error || !price?.items?.length ? <div className="text-center text-sm text-[rgb(var(--text-secondary))] py-8">暂无法获取金价数据</div> : <div className="space-y-2">{price.items.map((item: any, i: number) => (<div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[rgb(var(--bg-secondary))]"><span className="text-sm font-medium text-[rgb(var(--text-primary))]">{item.name}</span><div className="text-right"><span className="text-sm font-bold text-accent">¥{item.price}/克</span>{item.change && <span className={`text-xs ml-2 ${String(item.change).startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>{item.change}</span>}</div></div>))}</div>}{price?.update_time && <div className="text-[10px] text-center text-[rgb(var(--text-secondary))] mt-3">更新: {price.update_time}</div>}</div>)
}

function MovieBoxOfficeTool() {
  const [movies, setMovies] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [summary, setSummary] = useState<any>(null)
  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/misc/movie-box-office`)
      const d = await r.json()
      setMovies((d.list || []).slice(0, 15))
      setSummary(d.market || null)
    } catch { setMovies([]) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])
  if (loading) return <div className="p-4 flex items-center justify-center h-full"><RefreshCw size={20} className="animate-spin text-accent" /></div>
  return (<div className="p-3 space-y-1 overflow-y-auto h-full"><div className="flex items-center justify-between mb-2 px-1"><div className="text-xs font-bold text-accent">今日票房</div><button type="button" onClick={load} className="text-[10px] text-[rgb(var(--text-secondary))] hover:text-accent transition-colors">刷新</button></div>{summary && <div className="flex justify-around mb-3 text-center"><div><div className="text-sm font-bold text-accent">{summary.box_office || '—'}</div><div className="text-[10px] text-[rgb(var(--text-secondary))]">总票房</div></div><div><div className="text-sm font-bold text-accent">{summary.view_count || '—'}</div><div className="text-[10px] text-[rgb(var(--text-secondary))]">总人次</div></div></div>}{movies.length === 0 ? <p className="text-center text-sm text-[rgb(var(--text-secondary))] py-8">暂无数据</p> : movies.map((item: any, i: number) => (<div key={i} className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-[rgb(var(--bg-secondary))] transition-colors"><span className={`w-5 text-center text-xs font-bold ${i < 3 ? 'text-red-500' : 'text-[rgb(var(--text-secondary))]'}`}>{item.rank}</span><div className="flex-1 min-w-0"><div className="text-sm text-[rgb(var(--text-primary))] font-medium truncate">{item.movie_name}</div><div className="text-[10px] text-[rgb(var(--text-secondary))]">{item.release_info}</div></div><div className="text-right shrink-0"><div className="text-xs font-bold text-accent">{item.box_office}</div><div className="text-[10px] text-[rgb(var(--text-secondary))]">{item.sum_box_office}</div></div></div>))}</div>)
}

function RandomImageTool() {
  const [img, setImg] = useState('')
  const load = () => setImg(pickLocalImage(img))
  useEffect(() => { load() }, [])
  return <div className="p-4"><div className="rounded-xl overflow-hidden mb-3 bg-[rgb(var(--bg-secondary))] min-h-[12rem] flex items-center justify-center">{img ? <img src={img} alt="随机图片" className="w-full h-48 object-cover" /> : null}</div><button type="button" onClick={load} className="w-full py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">换一张</button></div>
}

function BingDailyTool() {
  const [img, setImg] = useState(''); const [loading, setLoading] = useState(true)
  useEffect(() => {
    // API 返回图片，不是 JSON，所以直接用 URL
    setImg(`${API}/image/bing-daily`)
    setLoading(false)
  }, [])
  if (loading) return <div className="p-4 flex items-center justify-center h-full"><RefreshCw size={20} className="animate-spin text-accent" /></div>
  return <div className="p-4"><div className="rounded-xl overflow-hidden bg-[rgb(var(--bg-secondary))]">{img ? <img src={img} alt="必应每日" className="w-full h-48 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} /> : <div className="h-48 flex items-center justify-center text-sm text-[rgb(var(--text-secondary))]">加载失败</div>}</div></div>
}

function SayingTool() {
  const [saying, setSaying] = useState<any>(null); const [loading, setLoading] = useState(true)
  const load = () => { setLoading(true); fetch(`${API}/saying/random`).then(r => r.json()).then(d => setSaying(d)).catch(() => {}).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])
  if (loading) return <div className="p-4 flex items-center justify-center h-full"><RefreshCw size={20} className="animate-spin text-accent" /></div>
  return <div className="p-4 flex flex-col h-full"><div className="flex-1 flex items-center justify-center mb-4"><p className="text-sm text-[rgb(var(--text-secondary))] text-center leading-relaxed italic">"{saying?.content || '获取失败'}"</p></div>{saying?.author && <p className="text-xs text-[rgb(var(--text-secondary))] text-center mb-3">—— {saying.author}</p>}<button type="button" onClick={load} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-sm font-medium hover:opacity-90 transition-opacity">换一首</button></div>
}

function FortuneTool() {
  const fortunes = ['大吉', '中吉', '小吉', '吉', '末吉', '凶', '大凶']
  const [result, setResult] = useState<string | null>(null); const [shaking, setShaking] = useState(false); const [rotation, setRotation] = useState(0)
  const draw = () => { setShaking(true); const newRotation = rotation + 720 + Math.random() * 360; setRotation(newRotation); setTimeout(() => { setResult(fortunes[Math.floor(Math.random() * fortunes.length)]); setShaking(false) }, 1000) }
  return <div className="p-4 flex flex-col items-center"><div className="relative mb-6"><div className="text-8xl transition-transform duration-1000 ease-out" style={{ transform: `rotate(${rotation}deg)` }}>🎰</div></div>{result && !shaking && <div className={`text-2xl font-bold mb-4 ${result.includes('凶') ? 'text-red-500' : 'text-accent'}`}>{result}</div>}<button type="button" onClick={draw} disabled={shaking} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-400 to-pink-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">{shaking ? '摇签中...' : '抽签'}</button></div>
}

function DujitangTool() {
  const [text, setText] = useState(''); const [loading, setLoading] = useState(false); const [loaded, setLoaded] = useState(false)
  const load = async () => { setLoading(true); setLoaded(true); try { const r = await fetch('https://v2.xxapi.cn/api/dog'); const d = await r.json(); setText(d.data || '获取失败') } catch { setText('网络错误') }; setLoading(false) }
  return <div className="p-4 flex flex-col h-full"><div className="flex-1 flex items-center justify-center">{!loaded ? <p className="text-sm text-[rgb(var(--text-secondary))] text-center leading-relaxed">点击下方按钮，<br />来一碗毒鸡汤</p> : <p className="text-sm text-[rgb(var(--text-secondary))] text-center leading-relaxed italic">"{text}"</p>}</div><button type="button" onClick={load} disabled={loading} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium hover:opacity-90 transition-opacity mt-3 flex items-center justify-center gap-2" title="来一碗"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} />{loading ? '加载中...' : '来一碗毒鸡汤'}</button></div>
}

function DiceTool() {
  const [result, setResult] = useState<number | null>(null); const [rolling, setRolling] = useState(false)
  const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']
  const roll = () => { setRolling(true); setTimeout(() => { setResult(Math.floor(Math.random() * 6)); setRolling(false) }, 500) }
  return <div className="p-4 flex flex-col items-center"><div className={`text-7xl mb-4 transition-transform ${rolling ? 'animate-spin' : ''}`}>{result !== null ? faces[result] : '🎲'}</div>{result !== null && <div className="text-2xl font-bold text-accent mb-4">{result + 1}</div>}<button type="button" onClick={roll} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-400 to-red-500 text-white text-sm font-medium hover:opacity-90 transition-opacity">掷骰子</button></div>
}

function CoinTool() {
  const [result, setResult] = useState<string | null>(null); const [flipping, setFlipping] = useState(false)
  const flip = () => { setFlipping(true); setTimeout(() => { setResult(Math.random() > 0.5 ? '正面 👑' : '反面 🍀'); setFlipping(false) }, 600) }
  return <div className="p-4 flex flex-col items-center"><div className={`text-7xl mb-4 transition-transform ${flipping ? 'animate-spin' : ''}`}>🪙</div>{result && <div className="text-xl font-bold text-accent mb-4">{result}</div>}<button type="button" onClick={flip} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-sm font-medium hover:opacity-90 transition-opacity">抛硬币</button></div>
}

function RPSTool() {
  const [player, setPlayer] = useState<string | null>(null); const [computer, setComputer] = useState<string | null>(null); const [result, setResult] = useState('')
  const choices = ['✊', '✋', '✌️']
  const play = (idx: number) => { const cIdx = Math.floor(Math.random() * 3); setPlayer(choices[idx]); setComputer(choices[cIdx]); if (idx === cIdx) setResult('平局！'); else if ((idx === 0 && cIdx === 2) || (idx === 1 && cIdx === 0) || (idx === 2 && cIdx === 1)) setResult('你赢了！🎉'); else setResult('你输了！😅') }
  return <div className="p-4 flex flex-col items-center"><div className="flex gap-6 text-5xl mb-4"><span>{player || '❓'}</span><span className="text-2xl self-center text-[rgb(var(--text-secondary))]">VS</span><span>{computer || '❓'}</span></div>{result && <div className="text-lg font-bold text-accent mb-4">{result}</div>}<div className="flex gap-3 w-full">{choices.map((c, i) => <button key={i} type="button" onClick={() => play(i)} className="flex-1 py-4 rounded-2xl bg-[rgb(var(--bg-secondary))] text-3xl hover:bg-accent/10 active:scale-95 transition-all">{c}</button>)}</div></div>
}

// ========== 计算器（带历史记录）==========
function CalculatorTool() {
  const [display, setDisplay] = useState('0'); const [expr, setExpr] = useState(''); const [history, setHistory] = useState<string[]>([])
  const handleNum = (n: string) => setDisplay(d => d === '0' ? n : d + n)
  const handleOp = (op: string) => { setExpr(display + op); setDisplay('0') }
  const safeCalc = (expression: string): number => {
    const tokens = expression.match(/(\d+\.?\d*|[+\-*\/])/g) || []
    if (tokens.length === 0) return 0; const first = tokens[0]; if (first === undefined) return 0
    let result = parseFloat(first) || 0
    for (let i = 1; i < tokens.length; i += 2) { const op = tokens[i]; const numStr = tokens[i + 1]; if (op === undefined || numStr === undefined) break; const num = parseFloat(numStr) || 0; if (op === '+') result += num; else if (op === '-') result -= num; else if (op === '*') result *= num; else if (op === '/' && num !== 0) result /= num }
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

// ========== 二维码（4种模式）==========
function QRCodeTool() {
  const [mode, setMode] = useState<'text' | 'url' | 'wifi' | 'vcard'>('text')
  const [text, setText] = useState(''); const [wifiSsid, setWifiSsid] = useState(''); const [wifiPass, setWifiPass] = useState('')
  const getContent = () => { switch (mode) { case 'wifi': return `WIFI:T:WPA;S:${wifiSsid};P:${wifiPass};;`; case 'vcard': return `BEGIN:VCARD\nVERSION:3.0\nFN:${text}\nEND:VCARD`; default: return text } }
  const content = getContent()
  return (<div className="p-4">
    <div className="flex gap-1 mb-3 bg-[rgb(var(--bg-secondary))] rounded-xl p-1">{(['text', 'url', 'wifi', 'vcard'] as const).map(m => <button key={m} type="button" onClick={() => setMode(m)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${mode === m ? 'bg-accent text-white shadow' : 'text-[rgb(var(--text-secondary))]'}`}>{m === 'text' ? '文本' : m === 'url' ? '网址' : m === 'wifi' ? 'WiFi' : '名片'}</button>)}</div>
    {mode === 'wifi' ? (<div className="space-y-2 mb-3"><input type="text" value={wifiSsid} onChange={e => setWifiSsid(e.target.value)} placeholder="WiFi名称" className="w-full bg-[rgb(var(--bg-secondary))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" /><input type="text" value={wifiPass} onChange={e => setWifiPass(e.target.value)} placeholder="密码" className="w-full bg-[rgb(var(--bg-secondary))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>) : (<input type="text" value={text} onChange={e => setText(e.target.value)} placeholder={mode === 'url' ? '输入网址' : mode === 'vcard' ? '输入姓名' : '输入文本'} className="w-full bg-[rgb(var(--bg-secondary))] rounded-xl p-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-accent/30" />)}
    <div className="flex items-center justify-center bg-white rounded-xl p-4">{content ? <img src={`${API}/image/qrcode?text=${encodeURIComponent(content)}&size=180`} alt="QR Code" className="max-w-full" onError={(e) => { (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(content)}` }} /> : <div className="text-sm text-[rgb(var(--text-secondary))]">请输入内容</div>}</div>
  </div>)
}

// ========== 时钟（3标签页：模拟/秒表/倒计时）==========
function ClockTool() {
  const [tab, setTab] = useState<'analog' | 'stopwatch' | 'countdown'>('analog')
  const [time, setTime] = useState(new Date())
  const [swRunning, setSwRunning] = useState(false); const [swTime, setSwTime] = useState(0); const [swLaps, setSwLaps] = useState<number[]>([])
  const [cdTime, setCdTime] = useState(300); const [cdRunning, setCdRunning] = useState(false); const [cdRemaining, setCdRemaining] = useState(300)
  const swRef = useRef<ReturnType<typeof setInterval> | null>(null); const cdRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t) }, [])

  // 秒表
  useEffect(() => { if (swRunning) { swRef.current = setInterval(() => setSwTime(t => t + 10), 10) } else if (swRef.current) { clearInterval(swRef.current) }; return () => { if (swRef.current) clearInterval(swRef.current) } }, [swRunning])

  // 倒计时
  useEffect(() => { if (cdRunning && cdRemaining > 0) { cdRef.current = setInterval(() => { setCdRemaining(r => { if (r <= 1) { setCdRunning(false); return 0 } return r - 1 }) }, 1000) } else if (cdRef.current) { clearInterval(cdRef.current) }; return () => { if (cdRef.current) clearInterval(cdRef.current) } }, [cdRunning, cdRemaining])

  const formatMs = (ms: number) => { const m = Math.floor(ms / 60000); const s = Math.floor((ms % 60000) / 1000); const cs = Math.floor((ms % 1000) / 10); return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}` }
  const formatSec = (s: number) => { const m = Math.floor(s / 60); const sec = s % 60; return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}` }

  const s = time.getSeconds(), m = time.getMinutes(), h = time.getHours() % 12

  return (<div className="p-4 flex flex-col items-center">
    <div className="flex gap-1 mb-4 bg-[rgb(var(--bg-secondary))] rounded-xl p-1 w-full">{(['analog', 'stopwatch', 'countdown'] as const).map(t => <button key={t} type="button" onClick={() => setTab(t)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t ? 'bg-accent text-white shadow' : 'text-[rgb(var(--text-secondary))]'}`}>{t === 'analog' ? '时钟' : t === 'stopwatch' ? '秒表' : '倒计时'}</button>)}</div>

    {tab === 'analog' && (<>
      <div className="relative w-36 h-36 rounded-full border-4 border-accent/30 mb-4">
        <div className="absolute inset-2 rounded-full bg-[rgb(var(--bg-secondary))]" />
        {[...Array(12)].map((_, i) => <div key={i} className="absolute w-1 h-2 bg-accent/50 rounded-full" style={{ top: '50%', left: '50%', transformOrigin: '50% 0', transform: `rotate(${i * 30}deg) translateY(-64px) translateX(-50%)` }} />)}
        <div className="absolute top-1/2 left-1/2 w-1 h-14 bg-accent rounded-full" style={{ transform: `translate(-50%, -100%) rotate(${h * 30 + m * 0.5}deg)`, transformOrigin: 'bottom center' }} />
        <div className="absolute top-1/2 left-1/2 w-0.5 h-16 bg-[rgb(var(--text-primary))] rounded-full" style={{ transform: `translate(-50%, -100%) rotate(${m * 6}deg)`, transformOrigin: 'bottom center' }} />
        <div className="absolute top-1/2 left-1/2 w-0.5 h-16 bg-red-400 rounded-full" style={{ transform: `translate(-50%, -100%) rotate(${s * 6}deg)`, transformOrigin: 'bottom center' }} />
        <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-accent rounded-full -translate-x-1/2 -translate-y-1/2" />
      </div>
      <div className="text-xl font-mono font-bold text-[rgb(var(--text-primary))]">{time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
    </>)}

    {tab === 'stopwatch' && (<>
      <div className="text-4xl font-mono font-bold text-accent mb-6">{formatMs(swTime)}</div>
      <div className="flex gap-3 w-full mb-4">
        <button type="button" onClick={() => { setSwRunning(!swRunning); if (!swRunning && swTime === 0) setSwTime(0) }} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${swRunning ? 'bg-red-500 text-white' : 'bg-accent text-white'}`}>{swRunning ? '停止' : swTime > 0 ? '继续' : '开始'}</button>
        <button type="button" onClick={() => { if (swTime > 0) setSwLaps(l => [swTime, ...l]); setSwRunning(false); setSwTime(0); setSwLaps([]) }} className="flex-1 py-2.5 rounded-xl bg-[rgb(var(--bg-secondary))] text-sm font-medium text-[rgb(var(--text-primary))]">重置</button>
      </div>
      {swLaps.length > 0 && <div className="w-full max-h-32 overflow-y-auto space-y-1">{swLaps.map((lap, i) => <div key={i} className="flex justify-between text-xs py-1 px-2 rounded bg-[rgb(var(--bg-secondary))]"><span className="text-[rgb(var(--text-secondary))]">第 {swLaps.length - i} 圈</span><span className="font-mono text-accent">{formatMs(lap)}</span></div>)}</div>}
    </>)}

    {tab === 'countdown' && (<>
      <div className="text-4xl font-mono font-bold text-accent mb-4">{formatSec(cdRemaining)}</div>
      {!cdRunning && cdRemaining === cdTime && (<div className="flex gap-2 mb-4 w-full">{[60, 180, 300, 600].map(s => <button key={s} type="button" onClick={() => { setCdTime(s); setCdRemaining(s) }} className="flex-1 py-1.5 rounded-lg text-[10px] font-medium bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))] hover:bg-accent/10">{s / 60}分钟</button>)}</div>)}
      <div className="flex gap-3 w-full">
        <button type="button" onClick={() => { if (cdRemaining > 0) setCdRunning(!cdRunning) }} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${cdRunning ? 'bg-red-500 text-white' : 'bg-accent text-white'}`}>{cdRunning ? '暂停' : cdRemaining < cdTime ? '继续' : '开始'}</button>
        <button type="button" onClick={() => { setCdRunning(false); setCdRemaining(cdTime) }} className="flex-1 py-2.5 rounded-xl bg-[rgb(var(--bg-secondary))] text-sm font-medium text-[rgb(var(--text-primary))]">重置</button>
      </div>
    </>)}
  </div>)
}

// ========== 日历 ==========
function CalendarTool() {
  const [currentDate] = useState(new Date())
  const year = currentDate.getFullYear(), month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const isToday = (day: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
  const days = []; for (let i = 0; i < firstDay; i++) days.push(null); for (let i = 1; i <= daysInMonth; i++) days.push(i)
  return (<div className="p-4"><div className="text-center mb-3"><div className="text-lg font-bold text-[rgb(var(--text-primary))]">{year}年{month + 1}月</div></div><div className="grid grid-cols-7 gap-1 mb-2">{['日','一','二','三','四','五','六'].map(d => <div key={d} className="text-center text-[10px] text-[rgb(var(--text-secondary))] py-1">{d}</div>)}</div><div className="grid grid-cols-7 gap-1">{days.map((day, i) => <div key={i} className={`text-center py-1.5 rounded-lg text-xs ${day === null ? '' : isToday(day) ? 'bg-accent text-white font-bold' : 'text-[rgb(var(--text-primary))]'}`}>{day || ''}</div>)}</div></div>)
}

// ========== 单位换算 ==========
function ConverterTool() {
  const [value, setValue] = useState(''); const [fromUnit, setFromUnit] = useState('km'); const [toUnit, setToUnit] = useState('mile')
  const unitLabels: Record<string, string> = { km: '千米', mile: '英里', m: '米', kg: '千克', lb: '磅', g: '克', celsius: '°C', fahrenheit: '°F', kelvin: 'K' }
  const unitGroups = [['km', 'mile', 'm'], ['kg', 'lb', 'g'], ['celsius', 'fahrenheit', 'kelvin']]
  const rates: Record<string, Record<string, number>> = { km: { mile: 0.621371, m: 1000 }, mile: { km: 1.60934, m: 1609.34 }, m: { km: 0.001, mile: 0.000621371 }, kg: { lb: 2.20462, g: 1000 }, lb: { kg: 0.453592, g: 453.592 }, g: { kg: 0.001, lb: 0.00220462 } }
  const tempConvert = (val: number, from: string, to: string): number => { if (from === to) return val; if (from === 'celsius' && to === 'fahrenheit') return val * 9 / 5 + 32; if (from === 'celsius' && to === 'kelvin') return val + 273.15; if (from === 'fahrenheit' && to === 'celsius') return (val - 32) * 5 / 9; if (from === 'fahrenheit' && to === 'kelvin') return (val - 32) * 5 / 9 + 273.15; if (from === 'kelvin' && to === 'celsius') return val - 273.15; if (from === 'kelvin' && to === 'fahrenheit') return (val - 273.15) * 9 / 5 + 32; return val }
  const convert = () => { const num = parseFloat(value); if (isNaN(num)) return '—'; if (fromUnit in rates && toUnit in rates[fromUnit]) return (num * rates[fromUnit][toUnit]).toFixed(4); if (['celsius', 'fahrenheit', 'kelvin'].includes(fromUnit)) return tempConvert(num, fromUnit, toUnit).toFixed(2); return '—' }
  const getBtnClass = (u: string) => `flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${fromUnit === u ? 'bg-accent text-white' : 'bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))]'}`
  return (<div className="p-4"><div className="mb-3">{unitGroups.map(group => group.includes(fromUnit) && <div key="g" className="flex gap-1 mb-2">{group.map(u => <button key={u} type="button" onClick={() => { setFromUnit(u); setToUnit(group.find(x => x !== u) || group[0]) }} className={getBtnClass(u)}>{unitLabels[u]}</button>)}</div>)}</div><input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="输入数值" className="w-full bg-[rgb(var(--bg-secondary))] rounded-xl px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-accent/30" /><div className="text-center text-xs text-[rgb(var(--text-secondary))] mb-2">{unitLabels[fromUnit]} → {unitLabels[toUnit]}</div><div className="text-center p-3 rounded-xl bg-[rgb(var(--bg-secondary))]"><div className="text-xl font-bold text-accent">{convert()}</div><div className="text-xs text-[rgb(var(--text-secondary))]">{unitLabels[toUnit]}</div></div></div>)
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

// ========== 记事本 ==========
function NoteTool() {
  const [text, setText] = useState(() => localStorage.getItem('toolbox-note') || '')
  useEffect(() => { localStorage.setItem('toolbox-note', text) }, [text])
  return <div className="p-4 h-full flex flex-col"><textarea value={text} onChange={e => setText(e.target.value)} placeholder="在这里写点什么..." className="flex-1 bg-[rgb(var(--bg-secondary))] rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/30" /></div>
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

// ========== 观音灵签 ==========
function GuanyinSignTool() {
  const [result, setResult] = useState<{ num: number; title: string; poem: string; meaning: string } | null>(null)
  const [drawing, setDrawing] = useState(false)
  const signs = [
    { num: 1, title: '上上签', poem: '开天辟地作良缘，吉日良时万事全', meaning: '诸事遂心，鸿运当头' },
    { num: 2, title: '上签', poem: '鸡犬相闻幸有邻，桃花树下笑迎人', meaning: '贵人相助，喜气盈门' },
    { num: 3, title: '上签', poem: '天地变通万物全，自荣自养自安然', meaning: '万事如意，前途光明' },
    { num: 4, title: '中签', poem: '渐渐变化渐渐安，劝君把定心莫偏', meaning: '循序渐进，不可急躁' },
    { num: 5, title: '中签', poem: '用心用心不用心，几多枉费作知音', meaning: '顺其自然，不可强求' },
    { num: 6, title: '中签', poem: '风云际会在江中，似有疑心又未通', meaning: '时机未到，耐心等待' },
    { num: 7, title: '下签', poem: '云开月出照天下，水绕山环抱小村', meaning: '先苦后甜，终见光明' },
    { num: 8, title: '下签', poem: '孤舟夜泊事多惊，浪涌风高不可行', meaning: '暂时困境，需谨慎行事' },
    { num: 9, title: '上上签', poem: '望渠消息向长安，常把菱花仔细看', meaning: '蓦然回首，心想事成' },
    { num: 10, title: '上签', poem: '绿柳苍苍正当时，任君此去作乾坤', meaning: '大好时机，勇往直前' },
    { num: 11, title: '中签', poem: '忽然变化不须疑，自荣自养自为之', meaning: '变中求稳，自立自强' },
    { num: 12, title: '下签', poem: '东边日出又遮云，急水滩头一只船', meaning: '波折较多，需守本分' },
  ]
  const draw = () => { setDrawing(true); setTimeout(() => { const sign = signs[Math.floor(Math.random() * signs.length)]; setResult(sign); setDrawing(false) }, 800) }
  const colorMap: Record<string, string> = { '上上签': 'text-amber-500', '上签': 'text-green-500', '中签': 'text-blue-500', '下签': 'text-red-500' }
  return (<div className="p-4 flex flex-col items-center"><div className={`text-6xl mb-4 transition-transform duration-700 ${drawing ? 'animate-bounce' : ''}`}>🪷</div>{result && !drawing && <div className="w-full text-center mb-4"><div className={`text-lg font-bold mb-1 ${colorMap[result.title]}`}>第{result.num}签 · {result.title}</div><div className="text-sm text-[rgb(var(--text-primary))] leading-relaxed my-3 italic">"{result.poem}"</div><div className="text-xs text-[rgb(var(--text-secondary))] mt-2">解签：{result.meaning}</div></div>}<button type="button" onClick={draw} disabled={drawing} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-400 to-pink-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">{drawing ? '摇签中...' : '求签'}</button></div>)
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
  const [img, setImg] = useState('')
  const load = () => setImg(pickLocalImage(img))
  useEffect(() => { load() }, [])
  return <div className="p-4"><div className="rounded-xl overflow-hidden mb-3 bg-[rgb(var(--bg-secondary))] min-h-[12rem] flex items-center justify-center">{img ? <img src={img} alt="原神图片" className="w-full h-48 object-cover" /> : null}</div><button type="button" onClick={load} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-400 to-indigo-500 text-white text-sm font-medium hover:opacity-90 transition-opacity">换一张</button></div>
}

// ========== 4K 4K图片 ==========
function Wallpaper4KTool() {
  const [img, setImg] = useState('')
  const load = () => setImg(pickLocalImage(img))
  useEffect(() => { load() }, [])
  return <div className="p-4"><div className="rounded-xl overflow-hidden mb-3 bg-[rgb(var(--bg-secondary))] min-h-[12rem] flex items-center justify-center">{img ? <img src={img} alt="4K壁纸" className="w-full h-48 object-cover" /> : null}</div><button type="button" onClick={load} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity">换一张</button></div>
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
  const [phone, setPhone] = useState(''); const [result, setResult] = useState<any>(null); const [loading, setLoading] = useState(false)
  const query = async () => {
    if (!phone.trim() || phone.trim().length < 7) return
    setLoading(true); setResult(null)
    try {
      const r = await fetch(`${API}/misc/phoneinfo?phone=${phone.trim()}`)
      const d = await r.json()
      setResult(d)
    } catch {
      setResult({ province: '查询失败', city: '', operator: '' })
    }
    setLoading(false)
  }
  return (<div className="p-4"><div className="flex gap-2 mb-4"><input type="text" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} onKeyDown={e => e.key === 'Enter' && query()} placeholder="输入手机号码..." className="flex-1 bg-[rgb(var(--bg-secondary))] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" /><button type="button" onClick={query} className="px-3 py-2 rounded-xl bg-accent text-white text-sm hover:bg-accent/90 transition-colors">{loading ? <RefreshCw size={14} className="animate-spin" /> : '查询'}</button></div>{result && <div className="space-y-2"><div className="text-center p-4 rounded-xl bg-[rgb(var(--bg-secondary))]"><div className="text-2xl font-bold text-accent">{phone}</div><div className="text-sm text-[rgb(var(--text-secondary))] mt-1">{result.province || result.provinceName}{result.city || result.cityName ? ' ' + (result.city || result.cityName) : ''}</div></div><div className="grid grid-cols-2 gap-2 text-xs"><div className="bg-[rgb(var(--bg-secondary))] rounded-xl p-2 text-center"><div className="text-[rgb(var(--text-secondary))]">运营商</div><div className="font-bold text-[rgb(var(--text-primary))]">{result.operator || result.isp || result.sp || '—'}</div></div><div className="bg-[rgb(var(--bg-secondary))] rounded-xl p-2 text-center"><div className="text-[rgb(var(--text-secondary))]">邮编</div><div className="font-bold text-[rgb(var(--text-primary))]">{result.zipcode || result.zip || '—'}</div></div></div></div>}</div>)
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
      case 'hitokoto': return <HitokotoTool />
      case 'weather': return <WeatherTool />
      case 'hotboard': return <HotBoardTool />
      case 'bilibilihot': return <BilibiliHotTool />
      case 'githubuser': return <GitHubUserTool />
      case 'githubrepo': return <GitHubRepoTool />
      case 'history': return <HistoryTodayTool />
      case 'programmer-history': return <ProgrammerHistoryTool />
      case 'horoscope': return <HoroscopeTool />
      case 'bmi': return <BMITool />
      case 'dailyword': return <DailyWordTool />
      case 'goldprice': return <GoldPriceTool />
      case 'movieboxoffice': return <MovieBoxOfficeTool />
      case 'calendar': return <CalendarTool />
      case 'converter': return <ConverterTool />
      case 'base': return <BaseTool />
      case 'clock': return <ClockTool />
      case 'worldtime': return <WorldTimeTool />
      case 'qrcode': return <QRCodeTool />
      case 'password': return <PasswordTool />
      case 'note': return <NoteTool />
      case 'calculator': return <CalculatorTool />
      case 'dice': return <DiceTool />
      case 'coin': return <CoinTool />
      case 'rps': return <RPSTool />
      case 'dujitang': return <DujitangTool />
      case 'randomimage': return <RandomImageTool />
      case 'bingdaily': return <BingDailyTool />
      case 'saying': return <SayingTool />
      case 'fortune': return <FortuneTool />
      case 'smartsearch': return <SmartSearchTool />
      case 'guanyin': return <GuanyinSignTool />
      case 'drivingexam': return <DrivingExamTool />
      case 'genshinimage': return <GenshinImageTool />
      case 'wallpaper4k': return <Wallpaper4KTool />
      case 'express': return <ExpressTrackingTool />
      case 'phonelocation': return <PhoneLocationTool />
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
            <div className="w-[320px] h-[520px] rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl shadow-black/20 border border-slate-200/50 dark:border-slate-700/50 overflow-hidden flex flex-col">
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
