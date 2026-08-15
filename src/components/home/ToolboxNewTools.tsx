import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { RefreshCw, Copy, Check, Play, Pause, RotateCcw, Volume2 } from 'lucide-react'

const API = '/uapis'

// ========== 图片预加载 hook ==========
function useImageLoader(initialSrc?: string) {
  const [src, setSrc] = useState(initialSrc || '')
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback((newSrc: string) => {
    setLoaded(false); setError(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setError(true), 8000)
    const preloader = new Image()
    preloader.onload = () => { setSrc(newSrc); setLoaded(true); setError(false); if (timerRef.current) clearTimeout(timerRef.current) }
    preloader.onerror = () => { setError(true); if (timerRef.current) clearTimeout(timerRef.current) }
    preloader.src = newSrc
  }, [])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])
  return { src, loaded, error, load }
}

const LOCAL_ANIME = [
  '/avatars/dmoe_01.jpg', '/avatars/dmoe_02.jpg', '/avatars/dmoe_03.jpg', '/avatars/dmoe_04.jpg',
  '/avatars/dmoe_05.jpg', '/avatars/dmoe_06.jpg', '/avatars/dmoe_07.jpg', '/avatars/dmoe_08.jpg',
]
const pickLocal = (exclude?: string) => {
  let next = exclude || ''
  let guard = 0
  while (next === (exclude || '') && guard < 10) { next = LOCAL_ANIME[Math.floor(Math.random() * LOCAL_ANIME.length)]; guard++ }
  return next
}

// ========== 1. 每日黄历宜忌 ==========
export function AlmanacTool() {
  const [data, setData] = useState<any>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(false)
  const load = async () => {
    setLoading(true); setError(false)
    try {
      const r = await fetch(`${API}/dl/huangli`)
      const d = await r.json()
      if (d.code === 200 || d.code === 0 || d.date) setData(d); else throw new Error()
    } catch { setError(true) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])
  if (loading) return <div className="p-4 flex items-center justify-center h-full"><RefreshCw size={20} className="animate-spin text-accent" /></div>
  if (error || !data) return <div className="p-4 flex flex-col items-center justify-center h-full gap-3"><span className="text-3xl">📅</span><p className="text-sm text-[rgb(var(--text-secondary))]">获取失败</p><button type="button" onClick={load} className="px-4 py-2 rounded-xl bg-accent text-white text-sm">重试</button></div>
  const yi = data.yi || data.do || ''; const ji = data.ji || data.dont || ''
  const yiArr = typeof yi === 'string' ? yi.split(/[，,、\s]+/) : Array.isArray(yi) ? yi : []
  const jiArr = typeof ji === 'string' ? ji.split(/[，,、\s]+/) : Array.isArray(ji) ? ji : []
  return <div className="p-4 space-y-3 overflow-y-auto h-full">
    <div className="text-center"><p className="text-sm text-[rgb(var(--text-secondary))]">{data.date || data.gregorian || new Date().toLocaleDateString('zh-CN')}</p>{data.lunar && <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">{data.lunar}</p>}</div>
    <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-3"><p className="text-xs font-bold text-green-600 dark:text-green-400 mb-2">✅ 宜</p><div className="flex flex-wrap gap-1.5">{yiArr.length ? yiArr.map((s: string, i: number) => <span key={i} className="px-2 py-0.5 rounded-md bg-green-100 dark:bg-green-800/30 text-xs text-green-700 dark:text-green-300">{s}</span>) : <span className="text-xs text-[rgb(var(--text-secondary))]">无</span>}</div></div>
    <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-3"><p className="text-xs font-bold text-red-600 dark:text-red-400 mb-2">🚫 忌</p><div className="flex flex-wrap gap-1.5">{jiArr.length ? jiArr.map((s: string, i: number) => <span key={i} className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-800/30 text-xs text-red-700 dark:text-red-300">{s}</span>) : <span className="text-xs text-[rgb(var(--text-secondary))]">无</span>}</div></div>
    {data.zodiac && <p className="text-xs text-[rgb(var(--text-secondary))] text-center">生肖：{data.zodiac}</p>}
    <button type="button" onClick={load} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium hover:opacity-90">刷新</button>
  </div>
}

// ========== 2. 随机猫猫图 ==========
export function CatImageTool() {
  const { src, loaded, error, load } = useImageLoader()
  const reload = () => { fetch('https://api.thecatapi.com/v1/images/search').then(r => r.json()).then(d => { if (d[0]?.url) load(d[0].url) }).catch(() => {}) }
  useEffect(() => { reload() }, [])
  return <div className="p-4"><div className="rounded-xl overflow-hidden mb-3 bg-[rgb(var(--bg-secondary))] h-48 flex items-center justify-center">{error ? <span className="text-sm text-[rgb(var(--text-secondary))]">加载失败</span> : !loaded ? <RefreshCw size={20} className="animate-spin text-accent" /> : <img src={src} alt="猫猫" loading="lazy" decoding="async" className="w-full h-48 object-cover" style={{ opacity: loaded ? 1 : 0 }} />}</div><button type="button" onClick={reload} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 text-white text-sm font-medium hover:opacity-90">喵一个🐱</button></div>
}

// ========== 3. 随机狗狗图 ==========
export function DogImageTool() {
  const { src, loaded, error, load } = useImageLoader()
  const reload = () => { fetch('https://api.thedogapi.com/v1/images/search').then(r => r.json()).then(d => { if (d[0]?.url) load(d[0].url) }).catch(() => {}) }
  useEffect(() => { reload() }, [])
  return <div className="p-4"><div className="rounded-xl overflow-hidden mb-3 bg-[rgb(var(--bg-secondary))] h-48 flex items-center justify-center">{error ? <span className="text-sm text-[rgb(var(--text-secondary))]">加载失败</span> : !loaded ? <RefreshCw size={20} className="animate-spin text-accent" /> : <img src={src} alt="狗狗" loading="lazy" decoding="async" className="w-full h-48 object-cover" style={{ opacity: loaded ? 1 : 0 }} />}</div><button type="button" onClick={reload} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-sm font-medium hover:opacity-90">汪一个🐶</button></div>
}

// ========== 4. 动漫随机图 ==========
export function AnimeImageTool() {
  const { src, loaded, error, load } = useImageLoader()
  const [current, setCurrent] = useState('')
  const reload = () => { const next = pickLocal(current); setCurrent(next); load(next) }
  useEffect(() => { reload() }, [])
  return <div className="p-4"><div className="rounded-xl overflow-hidden mb-3 bg-[rgb(var(--bg-secondary))] h-48 flex items-center justify-center">{error ? <span className="text-sm text-[rgb(var(--text-secondary))]">加载失败</span> : !loaded ? <RefreshCw size={20} className="animate-spin text-accent" /> : <img src={src} alt="动漫" loading="lazy" decoding="async" className="w-full h-48 object-cover" style={{ opacity: loaded ? 1 : 0 }} />}</div><button type="button" onClick={reload} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-400 to-purple-500 text-white text-sm font-medium hover:opacity-90">换一张🎨</button></div>
}

// ========== 5. 抽象艺术图 ==========
export function AbstractArtTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const w = canvas.width, h = canvas.height
    const palettes = [['#FF6B6B','#4ECDC4','#FFE66D','#A8E6CF','#C7CEEA'],['#0F2027','#203A43','#2C5364','#00d2ff'],['#f857a6','#ff5858','#fff200','#48dbfb'],['#1a2a6c','#b21f1f','#fdbb2d','#3a1c71']]
    const pal = palettes[Math.floor(Math.random() * palettes.length)]
    ctx.fillStyle = pal[0]; ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 15; i++) {
      ctx.fillStyle = pal[Math.floor(Math.random() * pal.length)]
      ctx.globalAlpha = 0.3 + Math.random() * 0.5
      const x = Math.random() * w, y = Math.random() * h, r = 30 + Math.random() * 80
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
    }
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = pal[Math.floor(Math.random() * pal.length)]; ctx.lineWidth = 1 + Math.random() * 4; ctx.globalAlpha = 0.6
      ctx.beginPath(); ctx.moveTo(Math.random() * w, Math.random() * h)
      for (let j = 0; j < 3; j++) ctx.lineTo(Math.random() * w, Math.random() * h)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }, [])
  useEffect(() => { draw() }, [])
  return <div className="p-4"><canvas ref={canvasRef} width={280} height={192} className="rounded-xl w-full mb-3" /><button type="button" onClick={draw} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:opacity-90">生成新作🎨</button></div>
}

// ========== 6. 像素风图片 ==========
export function PixelArtTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const gridSize = 16, cellSize = canvas.width / gridSize
    const palettes = [['#1a1c2c','#5d275d','#b13e53','#ef7d57','#ffcd75','#a7f070','#38b764','#41a6f6'],['#0d0221','#26456e','#2b5f8a','#3066a0','#5f9bcc','#8fd3ff'],['#000000','#333333','#666666','#999999','#cccccc','#ffffff']]
    const pal = palettes[Math.floor(Math.random() * palettes.length)]
    const seed = Math.random()
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const dist = Math.sqrt((x - gridSize / 2) ** 2 + (y - gridSize / 2) ** 2) / (gridSize / 2)
        const noise = Math.sin(x * 0.5 + seed * 10) * Math.cos(y * 0.5 + seed * 10)
        if (dist + noise * 0.3 > 0.5 + Math.random() * 0.4) {
          ctx.fillStyle = pal[Math.floor(Math.random() * pal.length)]
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
        }
      }
    }
  }, [])
  useEffect(() => { draw() }, [])
  return <div className="p-4"><canvas ref={canvasRef} width={256} height={256} className="rounded-xl w-full mb-3" style={{ imageRendering: 'pixelated' }} /><button type="button" onClick={draw} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-teal-600 text-white text-sm font-medium hover:opacity-90">生成像素画👾</button></div>
}

// ========== 7. 头像生成器 ==========
export function AvatarGeneratorTool() {
  const [style, setStyle] = useState('adventurer'); const [seed, setSeed] = useState('')
  const styles = ['adventurer','avataaars','big-smile','bottts','fun-emoji','micah','personas','thumbs']
  const avatarUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed || 'random' + Date.now())}`
  const [imgLoaded, setImgLoaded] = useState(false)
  const regenerate = () => { setSeed(Math.random().toString(36).slice(2)); setImgLoaded(false) }
  useEffect(() => { setImgLoaded(false) }, [style])
  const [copied, setCopied] = useState(false)
  return <div className="p-4 space-y-3">
    <div className="rounded-xl overflow-hidden bg-[rgb(var(--bg-secondary))] h-36 flex items-center justify-center">
      {!imgLoaded && <RefreshCw size={20} className="animate-spin text-accent" />}
      <img src={avatarUrl} alt="头像" loading="lazy" decoding="async" className="w-32 h-32" style={{ opacity: imgLoaded ? 1 : 0 }} onLoad={() => setImgLoaded(true)} />
    </div>
    <div className="flex flex-wrap gap-1.5">{styles.map(s => <button key={s} type="button" onClick={() => setStyle(s)} className={`px-2 py-1 rounded-lg text-xs ${style === s ? 'bg-accent text-white' : 'bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))]'}`}>{s}</button>)}</div>
    <div className="flex gap-2">
      <input value={seed} onChange={e => setSeed(e.target.value)} placeholder="输入种子" className="flex-1 px-3 py-2 rounded-xl bg-[rgb(var(--bg-secondary))] text-sm focus:outline-none text-[rgb(var(--text-primary))]" />
      <button type="button" onClick={regenerate} className="px-3 py-2 rounded-xl bg-accent text-white text-sm">🎲</button>
    </div>
    <button type="button" onClick={() => { navigator.clipboard?.writeText(avatarUrl); setCopied(true); setTimeout(() => setCopied(false), 1500) }} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2">{copied ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制链接</>}</button>
  </div>
}

// ========== 8. 货币汇率换算 ==========
export function CurrencyConverterTool() {
  const [rates, setRates] = useState<Record<string, number>>({}); const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('USD'); const [to, setTo] = useState('CNY'); const [amount, setAmount] = useState('1')
  const currencies = ['USD','CNY','EUR','JPY','KRW','GBP','HKD','TWD','AUD','CAD','SGD','RUB']
  useEffect(() => { fetch('https://open.er-api.com/v6/latest/USD').then(r => r.json()).then(d => { setRates(d.rates || {}); setLoading(false) }).catch(() => setLoading(false)) }, [])
  const result = useMemo(() => {
    if (!rates[from] || !rates[to]) return '0'
    return ((parseFloat(amount) || 0) * rates[to] / rates[from]).toFixed(2)
  }, [rates, from, to, amount])
  if (loading) return <div className="p-4 flex items-center justify-center h-full"><RefreshCw size={20} className="animate-spin text-accent" /></div>
  return <div className="p-4 space-y-3">
    <div><label className="text-xs text-[rgb(var(--text-secondary))] mb-1 block">金额</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-[rgb(var(--bg-secondary))] text-sm focus:outline-none text-[rgb(var(--text-primary))]" /></div>
    <div className="flex gap-2">
      <div className="flex-1"><label className="text-xs text-[rgb(var(--text-secondary))] mb-1 block">从</label><select value={from} onChange={e => setFrom(e.target.value)} className="w-full px-2 py-2 rounded-xl bg-[rgb(var(--bg-secondary))] text-sm text-[rgb(var(--text-primary))]">{currencies.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
      <div className="flex-1"><label className="text-xs text-[rgb(var(--text-secondary))] mb-1 block">到</label><select value={to} onChange={e => setTo(e.target.value)} className="w-full px-2 py-2 rounded-xl bg-[rgb(var(--bg-secondary))] text-sm text-[rgb(var(--text-primary))]">{currencies.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
    </div>
    <div className="rounded-xl bg-accent/10 p-3 text-center"><p className="text-xs text-[rgb(var(--text-secondary))] mb-1">结果</p><p className="text-xl font-bold text-accent">{result} {to}</p></div>
  </div>
}

// ========== 9. 正则表达式测试 ==========
export function RegexTesterTool() {
  const [pattern, setPattern] = useState(''); const [flags, setFlags] = useState('g'); const [text, setText] = useState('Hello World 123\n你好世界 456')
  const [matches, setMatches] = useState<string[]>([]); const [error, setError] = useState('')
  useEffect(() => {
    if (!pattern) { setMatches([]); setError(''); return }
    try { const re = new RegExp(pattern, flags); const m = text.match(re); setMatches(m ? Array.from(m) : []); setError('') } catch (e: any) { setError(e.message); setMatches([]) }
  }, [pattern, flags, text])
  return <div className="p-4 space-y-3">
    <div className="flex gap-2">
      <span className="text-sm text-[rgb(var(--text-secondary))] py-2">/</span>
      <input value={pattern} onChange={e => setPattern(e.target.value)} placeholder="正则表达式" className="flex-1 px-3 py-2 rounded-xl bg-[rgb(var(--bg-secondary))] text-sm font-mono focus:outline-none text-[rgb(var(--text-primary))]" />
      <span className="text-sm text-[rgb(var(--text-secondary))] py-2">/</span>
      <input value={flags} onChange={e => setFlags(e.target.value)} placeholder="flags" className="w-16 px-2 py-2 rounded-xl bg-[rgb(var(--bg-secondary))] text-sm font-mono text-[rgb(var(--text-primary))]" />
    </div>
    {error && <p className="text-xs text-red-500">{error}</p>}
    <textarea value={text} onChange={e => setText(e.target.value)} rows={4} className="w-full px-3 py-2 rounded-xl bg-[rgb(var(--bg-secondary))] text-sm font-mono focus:outline-none text-[rgb(var(--text-primary))] resize-none" />
    <div><p className="text-xs text-[rgb(var(--text-secondary))] mb-1">匹配结果 ({matches.length})</p><div className="rounded-xl bg-[rgb(var(--bg-secondary))] p-2 max-h-32 overflow-y-auto space-y-1">{matches.length ? matches.map((m, i) => <div key={i} className="text-xs font-mono text-green-600 dark:text-green-400">{m}</div>) : <p className="text-xs text-[rgb(var(--text-secondary))]">无匹配</p>}</div></div>
  </div>
}

// ========== 10. 番茄钟计时器 ==========
export function PomodoroTimerTool() {
  const [mode, setMode] = useState<'work' | 'break'>('work'); const [timeLeft, setTimeLeft] = useState(25 * 60); const [running, setRunning] = useState(false); const [cycles, setCycles] = useState(0)
  const workMin = 25, breakMin = 5
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (mode === 'work') { setCycles(c => c + 1); setMode('break'); return breakMin * 60 }
          else { setMode('work'); return workMin * 60 }
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [running, mode])
  const mins = Math.floor(timeLeft / 60), secs = timeLeft % 60
  const reset = () => { setRunning(false); setMode('work'); setTimeLeft(workMin * 60) }
  const progress = ((mode === 'work' ? workMin * 60 - timeLeft : breakMin * 60 - timeLeft) / (mode === 'work' ? workMin * 60 : breakMin * 60)) * 100
  return <div className="p-4 flex flex-col items-center gap-4">
    <div className="flex gap-2"><button type="button" onClick={() => { setMode('work'); setTimeLeft(workMin * 60); setRunning(false) }} className={`px-3 py-1 rounded-lg text-xs ${mode === 'work' ? 'bg-red-500 text-white' : 'bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))]'}`}>工作 25min</button><button type="button" onClick={() => { setMode('break'); setTimeLeft(breakMin * 60); setRunning(false) }} className={`px-3 py-1 rounded-lg text-xs ${mode === 'break' ? 'bg-green-500 text-white' : 'bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))]'}`}>休息 5min</button></div>
    <div className="relative w-36 h-36"><svg className="w-full h-full -rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" className="text-[rgb(var(--bg-secondary))]" /><circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${progress * 2.827} 282.7`} className={mode === 'work' ? 'text-red-500' : 'text-green-500'} /></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-bold text-[rgb(var(--text-primary))]">{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span><span className="text-xs text-[rgb(var(--text-secondary))]">{mode === 'work' ? '🍅 专注中' : '☕ 休息中'}</span></div></div>
    <div className="flex gap-2"><button type="button" onClick={() => setRunning(!running)} className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:opacity-90 flex items-center gap-2">{running ? <><Pause size={14} /> 暂停</> : <><Play size={14} /> 开始</>}</button><button type="button" onClick={reset} className="px-4 py-2.5 rounded-xl bg-[rgb(var(--bg-secondary))] text-sm text-[rgb(var(--text-secondary))]"><RotateCcw size={14} /></button></div>
    <p className="text-xs text-[rgb(var(--text-secondary))]">已完成 {cycles} 个番茄 🍅</p>
  </div>
}

// ========== 11. 倒数日 ==========
export function CountdownDayTool() {
  const [events, setEvents] = useState<{name: string; date: string; id: string}[]>(() => { try { return JSON.parse(localStorage.getItem('countdown-events') || '[]') } catch { return [] } })
  const [name, setName] = useState(''); const [date, setDate] = useState('')
  const save = (list: any[]) => { setEvents(list); localStorage.setItem('countdown-events', JSON.stringify(list)) }
  const add = () => { if (!name || !date) return; save([...events, { name, date, id: Date.now().toString() }]); setName(''); setDate('') }
  const remove = (id: string) => save(events.filter(e => e.id !== id))
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return <div className="p-4 space-y-3">
    <div className="flex gap-2"><input value={name} onChange={e => setName(e.target.value)} placeholder="事件名" className="flex-1 px-3 py-2 rounded-xl bg-[rgb(var(--bg-secondary))] text-sm focus:outline-none text-[rgb(var(--text-primary))]" /><input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-2 py-2 rounded-xl bg-[rgb(var(--bg-secondary))] text-sm text-[rgb(var(--text-primary))]" /><button type="button" onClick={add} className="px-3 py-2 rounded-xl bg-accent text-white text-sm">+</button></div>
    <div className="space-y-2 max-h-64 overflow-y-auto">{events.map(e => { const d = new Date(e.date); d.setHours(0, 0, 0, 0); const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000); const past = diff < 0; return <div key={e.id} className="flex items-center justify-between rounded-xl bg-[rgb(var(--bg-secondary))] p-3"><div><p className="text-sm text-[rgb(var(--text-primary))]">{e.name}</p><p className="text-xs text-[rgb(var(--text-secondary))]">{e.date}</p></div><div className="text-right"><p className={`text-lg font-bold ${past ? 'text-red-500' : 'text-accent'}`}>{past ? Math.abs(diff) : diff}</p><p className="text-[10px] text-[rgb(var(--text-secondary))]">{past ? '天前' : '天后'}</p></div><button type="button" onClick={() => remove(e.id)} className="text-xs text-red-400 ml-2">✕</button></div> })}</div>
    {events.length === 0 && <p className="text-center text-sm text-[rgb(var(--text-secondary))] py-4">暂无倒数日，添加一个吧</p>}
  </div>
}

// ========== 12. MBTI人格测试 ==========
const MBTI_QUESTIONS = [
  { q: '在聚会中，你通常：', a: ['主动跟陌生人聊天', '等别人来找你聊天'], dim: 'E/I' },
  { q: '你更喜欢：', a: ['具体、实际的信息', '抽象、想象的概念'], dim: 'S/N' },
  { q: '做决定时，你更看重：', a: ['逻辑和公平', '和谐与感受'], dim: 'T/F' },
  { q: '你倾向于：', a: ['提前制定计划', '保持灵活性'], dim: 'J/P' },
  { q: '独处时，你：', a: ['很快感到无聊', '享受宁静'], dim: 'E/I' },
  { q: '你认为更重要的是：', a: ['经验与事实', '灵感与可能'], dim: 'S/N' },
  { q: '你被评价为：', a: ['客观理性', '善解人意'], dim: 'T/F' },
  { q: '面对截止日期，你：', a: ['提前完成', '最后冲刺'], dim: 'J/P' },
]
const MBTI_TYPES: Record<string, { name: string; desc: string }> = {
  INTJ: { name: '建筑师', desc: '富有想象力的战略家，一切皆在计划之中' }, INTP: { name: '逻辑学家', desc: '具有创造力的发明家，对知识有不可遏制的渴望' },
  ENTJ: { name: '指挥官', desc: '大胆、富有想象力且意志强大的领导者' }, ENTP: { name: '辩论家', desc: '聪明好奇的思考者，不会拒绝智力挑战' },
  INFJ: { name: '提倡者', desc: '安静而神秘，同时鼓舞人心且不知疲倦的理想主义者' }, INFP: { name: '调停者', desc: '诗意、善良的利他主义者，渴望帮助事业' },
  ENFJ: { name: '主人公', desc: '富有魅力、鼓舞人心的领导者，能让听众入迷' }, ENFP: { name: '竞选者', desc: '热情、有创造力、爱社交的自由灵魂' },
  ISTJ: { name: '物流师', desc: '实际且注重事实的人，可靠性不容怀疑' }, ISFJ: { name: '守卫者', desc: '非常专注而温暖的守护者，时刻准备保护爱人们' },
  ESTJ: { name: '总经理', desc: '出色的管理者，在管理事物和人方面无与伦比' }, ESFJ: { name: '执政官', desc: '极有同情心、爱交往、受欢迎的人们' },
  ISTP: { name: '鉴赏家', desc: '大胆而实际的实验家，擅长各种工具' }, ISFP: { name: '探险家', desc: '灵活而迷人的艺术家，时刻准备探索新事物' },
  ESTP: { name: '企业家', desc: '聪明、精力充沛的人，真正享受生活在边缘' }, ESFP: { name: '表演者', desc: '自发、精力充沛而热情的表演者' },
}
export function MbtiTestTool() {
  const [step, setStep] = useState(0); const [answers, setAnswers] = useState<string[]>([]); const [result, setResult] = useState<string | null>(null)
  const answer = (idx: number) => {
    const newAnswers = [...answers, idx.toString()]; setAnswers(newAnswers)
    if (step + 1 < MBTI_QUESTIONS.length) setStep(step + 1)
    else {
      let type = ''; type += newAnswers[0] === '0' ? 'E' : 'I'; type += newAnswers[4] === '0' ? 'E' : 'I'; type += newAnswers[1] === '0' ? 'S' : 'N'; type += newAnswers[5] === '0' ? 'S' : 'N'; type += newAnswers[2] === '0' ? 'T' : 'F'; type += newAnswers[6] === '0' ? 'T' : 'F'; type += newAnswers[3] === '0' ? 'J' : 'P'; type += newAnswers[7] === '0' ? 'J' : 'P'
      const e = type.match(/E/g)?.length || 0, i = type.match(/I/g)?.length || 0; const s = type.match(/S/g)?.length || 0, n = type.match(/N/g)?.length || 0; const t = type.match(/T/g)?.length || 0, f = type.match(/F/g)?.length || 0; const j = type.match(/J/g)?.length || 0, p = type.match(/P/g)?.length || 0
      const final = (e > i ? 'E' : 'I') + (s > n ? 'S' : 'N') + (t > f ? 'T' : 'F') + (j > p ? 'J' : 'P'); setResult(final)
    }
  }
  const reset = () => { setStep(0); setAnswers([]); setResult(null) }
  if (result) { const info = MBTI_TYPES[result] || { name: '未知', desc: '' }; return <div className="p-4 flex flex-col items-center gap-4"><div className="text-5xl">{result}</div><div className="text-lg font-bold text-accent">{info.name}</div><p className="text-sm text-[rgb(var(--text-secondary))] text-center leading-relaxed">{info.desc}</p><button type="button" onClick={reset} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-medium">重新测试</button></div> }
  const q = MBTI_QUESTIONS[step]
  return <div className="p-4 flex flex-col h-full">
    <div className="mb-3"><div className="flex justify-between text-xs text-[rgb(var(--text-secondary))] mb-1"><span>第 {step + 1} / {MBTI_QUESTIONS.length} 题</span><span>{Math.round((step / MBTI_QUESTIONS.length) * 100)}%</span></div><div className="h-1.5 rounded-full bg-[rgb(var(--bg-secondary))]"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(step / MBTI_QUESTIONS.length) * 100}%` }} /></div></div>
    <div className="flex-1 flex flex-col justify-center"><p className="text-sm font-medium text-[rgb(var(--text-primary))] mb-4 text-center">{q.q}</p><div className="space-y-2">{q.a.map((opt, i) => <button key={i} type="button" onClick={() => answer(i)} className="w-full py-3 rounded-xl bg-[rgb(var(--bg-secondary))] text-sm text-[rgb(var(--text-primary))] hover:bg-accent/10 hover:text-accent transition-colors text-left px-4">{opt}</button>)}</div></div>
  </div>
}

// ========== 13. 反应力测试 ==========
export function ReactionTestTool() {
  const [state, setState] = useState<'idle' | 'waiting' | 'ready' | 'result' | 'tooSoon'>('idle'); const [reactionTime, setReactionTime] = useState(0); const [bestTime, setBestTime] = useState(() => parseInt(localStorage.getItem('reaction-best') || '0')); const startTimeRef = useRef(0); const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = () => { setState('waiting'); const delay = 1500 + Math.random() * 3000; timeoutRef.current = setTimeout(() => { setState('ready'); startTimeRef.current = Date.now() }, delay) }
  const click = () => {
    if (state === 'waiting') { if (timeoutRef.current) clearTimeout(timeoutRef.current); setState('tooSoon') }
    else if (state === 'ready') { const time = Date.now() - startTimeRef.current; setReactionTime(time); setState('result'); if (!bestTime || time < bestTime) { setBestTime(time); localStorage.setItem('reaction-best', String(time)) } }
    else if (state === 'idle' || state === 'result' || state === 'tooSoon') start()
  }
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }, [])
  const bg = state === 'waiting' ? 'bg-red-500' : state === 'ready' ? 'bg-green-500' : state === 'tooSoon' ? 'bg-orange-500' : 'bg-accent'
  const text = state === 'idle' ? '点击开始' : state === 'waiting' ? '等待变绿...' : state === 'ready' ? '点击！' : state === 'tooSoon' ? '太早了！点击重试' : `${reactionTime}ms`
  return <div className="p-4 flex flex-col items-center gap-4">
    <button type="button" onClick={click} className={`w-full h-48 rounded-2xl ${bg} text-white text-xl font-bold flex items-center justify-center transition-colors`}>{text}</button>
    <div className="flex gap-4 text-sm"><div className="text-center"><p className="text-xs text-[rgb(var(--text-secondary))]">本次</p><p className="font-bold text-accent">{reactionTime || '--'}ms</p></div><div className="text-center"><p className="text-xs text-[rgb(var(--text-secondary))]">最佳</p><p className="font-bold text-green-500">{bestTime || '--'}ms</p></div></div>
  </div>
}

// ========== 14. 打字速度测试 ==========
const TYPING_TEXTS = ['The quick brown fox jumps over the lazy dog.', 'To be or not to be, that is the question.', 'Life is what happens when you are busy making other plans.', 'The only way to do great work is to love what you do.', 'In the middle of difficulty lies opportunity.']
export function TypingTestTool() {
  const [text, setText] = useState(() => TYPING_TEXTS[Math.floor(Math.random() * TYPING_TEXTS.length)]); const [input, setInput] = useState(''); const [startTime, setStartTime] = useState(0); const [done, setDone] = useState(false)
  const handleChange = (val: string) => { if (!startTime && val) setStartTime(Date.now()); setInput(val); if (val === text) { setDone(true) } }
  const wpm = startTime ? Math.round((input.length / 5) / ((Date.now() - startTime) / 60000)) : 0
  const accuracy = input ? Math.round((input.split('').filter((c, i) => c === text[i]).length / input.length) * 100) : 100
  const reset = () => { setText(TYPING_TEXTS[Math.floor(Math.random() * TYPING_TEXTS.length)]); setInput(''); setStartTime(0); setDone(false) }
  return <div className="p-4 space-y-3">
    <div className="rounded-xl bg-[rgb(var(--bg-secondary))] p-3 text-sm leading-relaxed font-mono">{text.split('').map((c, i) => { const isCorrect = i < input.length && input[i] === c; const isWrong = i < input.length && input[i] !== c; const isCurrent = i === input.length; return <span key={i} className={isCorrect ? 'text-green-600 dark:text-green-400' : isWrong ? 'text-red-500 bg-red-100 dark:bg-red-900/30' : isCurrent ? 'text-accent underline' : 'text-[rgb(var(--text-secondary))]'}>{c}</span> })}</div>
    <textarea value={input} onChange={e => !done && handleChange(e.target.value)} placeholder="开始打字..." rows={3} className="w-full px-3 py-2 rounded-xl bg-[rgb(var(--bg-secondary))] text-sm font-mono focus:outline-none text-[rgb(var(--text-primary))] resize-none" disabled={done} />
    <div className="flex justify-around text-center"><div><p className="text-xs text-[rgb(var(--text-secondary))]">速度</p><p className="text-lg font-bold text-accent">{done || startTime ? wpm : 0} WPM</p></div><div><p className="text-xs text-[rgb(var(--text-secondary))]">准确率</p><p className="text-lg font-bold text-green-500">{accuracy}%</p></div></div>
    {done && <p className="text-center text-sm text-green-500">🎉 完成！</p>}
    <button type="button" onClick={reset} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90">换一段</button>
  </div>
}

// ========== 15. 绝对音感测试 ==========
export function PitchTestTool() {
  const [state, setState] = useState<'idle' | 'playing' | 'answered' | 'result'>('idle'); const [targetNote, setTargetNote] = useState(''); const [selectedNote, setSelectedNote] = useState(''); const [score, setScore] = useState({ correct: 0, total: 0 }); const audioCtxRef = useRef<AudioContext | null>(null)
  const NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B']; const NOTE_FREQS: Record<string, number> = { C: 261.63, D: 293.66, E: 329.63, F: 349.23, G: 392.0, A: 440.0, B: 493.88 }
  const play = () => {
    const note = NOTES[Math.floor(Math.random() * NOTES.length)]; setTargetNote(note); setState('playing')
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    const ctx = audioCtxRef.current; const osc = ctx.createOscillator(); const gain = ctx.createGain()
    osc.frequency.value = NOTE_FREQS[note]; osc.type = 'sine'; gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5)
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 1.5)
    setTimeout(() => setState('answered'), 1600)
  }
  const answer = (note: string) => { setSelectedNote(note); setState('result'); const correct = note === targetNote; setScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 })) }
  return <div className="p-4 flex flex-col items-center gap-4">
    {state === 'idle' && <p className="text-sm text-[rgb(var(--text-secondary))] text-center">听音辨音，测试你的绝对音感</p>}
    {state === 'playing' && <div className="text-5xl animate-pulse">🎵</div>}
    {(state === 'answered' || state === 'result') && <div className="grid grid-cols-4 gap-2">{NOTES.map(n => <button key={n} type="button" disabled={state === 'result'} onClick={() => answer(n)} className={`w-16 h-16 rounded-xl text-lg font-bold ${state === 'result' && n === targetNote ? 'bg-green-500 text-white' : state === 'result' && n === selectedNote && n !== targetNote ? 'bg-red-500 text-white' : 'bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-primary))]'}`}>{n}</button>)}</div>}
    {state === 'result' && <p className={`text-sm ${selectedNote === targetNote ? 'text-green-500' : 'text-red-500'}`}>{selectedNote === targetNote ? '✅ 正确！' : `❌ 答案是 ${targetNote}`}</p>}
    {state !== 'answered' && <button type="button" onClick={play} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2"><Volume2 size={14} />{state === 'idle' ? '开始测试' : '下一题'}</button>}
    <div className="text-sm text-[rgb(var(--text-secondary))]">得分：{score.correct}/{score.total}</div>
  </div>
}

// ========== 16. 每日运势（完整版） ==========
export function DailyFortuneFullTool() {
  const [result, setResult] = useState<any>(null); const [rolling, setRolling] = useState(false)
  const FORTUNES = ['大吉', '中吉', '小吉', '吉', '末吉', '凶']
  const LUCKY = { colors: ['红色', '蓝色', '绿色', '黄色', '紫色', '白色', '粉色', '橙色'], numbers: [1, 3, 7, 8, 9, 13, 16, 21, 28, 33, 66, 88], directions: ['东', '南', '西', '北', '东南', '东北', '西南', '西北'] }
  const ITEMS = ['贵人相助', '逢考必过', '财运亨通', '桃花朵开', '工作顺利', '身体健康', '出行平安', '灵感迸发', '旧友重逢', '意外之财']
  const roll = () => {
    setRolling(true); setResult(null)
    setTimeout(() => {
      setResult({
        fortune: FORTUNES[Math.floor(Math.random() * FORTUNES.length)],
        color: LUCKY.colors[Math.floor(Math.random() * LUCKY.colors.length)],
        number: LUCKY.numbers[Math.floor(Math.random() * LUCKY.numbers.length)],
        direction: LUCKY.directions[Math.floor(Math.random() * LUCKY.directions.length)],
        item: ITEMS[Math.floor(Math.random() * ITEMS.length)],
      }); setRolling(false)
    }, 1200)
  }
  return <div className="p-4 flex flex-col items-center gap-4">
    {!result && !rolling && <div className="text-5xl my-4">🔮</div>}
    {rolling && <div className="text-5xl animate-spin my-4">🔮</div>}
    {result && <div className="w-full space-y-2">
      <div className="text-center mb-3"><span className={`text-3xl font-bold ${result.fortune.includes('凶') ? 'text-red-500' : 'text-accent'}`}>{result.fortune}</span></div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-[rgb(var(--bg-secondary))] p-3 text-center"><p className="text-xs text-[rgb(var(--text-secondary))]">幸运色</p><p className="text-sm font-bold text-[rgb(var(--text-primary))]">{result.color}</p></div>
        <div className="rounded-xl bg-[rgb(var(--bg-secondary))] p-3 text-center"><p className="text-xs text-[rgb(var(--text-secondary))]">幸运数</p><p className="text-sm font-bold text-[rgb(var(--text-primary))]">{result.number}</p></div>
        <div className="rounded-xl bg-[rgb(var(--bg-secondary))] p-3 text-center"><p className="text-xs text-[rgb(var(--text-secondary))]">幸运方位</p><p className="text-sm font-bold text-[rgb(var(--text-primary))]">{result.direction}</p></div>
        <div className="rounded-xl bg-[rgb(var(--bg-secondary))] p-3 text-center"><p className="text-xs text-[rgb(var(--text-secondary))]">今日宜</p><p className="text-sm font-bold text-[rgb(var(--text-primary))]">{result.item}</p></div>
      </div>
    </div>}
    <button type="button" onClick={roll} disabled={rolling} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">{rolling ? '占卜中...' : '🔮 今日运势'}</button>
  </div>
}

// ========== 17. 塔罗牌占卜 ==========
const TAROT_CARDS = [
  { name: '愚者', emoji: '🃏', meaning: '新的开始、冒险、自由' }, { name: '魔术师', emoji: '🎩', meaning: '创造力、意志力、掌控力' },
  { name: '女祭司', emoji: '🌙', meaning: '直觉、神秘、智慧' }, { name: '皇后', emoji: '👑', meaning: '丰饶、母性、创造' },
  { name: '皇帝', emoji: '⚔️', meaning: '权力、秩序、领导力' }, { name: '恋人', emoji: '💕', meaning: '爱情、选择、和谐' },
  { name: '战车', emoji: '🏁', meaning: '意志、胜利、前进' }, { name: '力量', emoji: '🦁', meaning: '勇气、耐心、内在力量' },
  { name: '隐士', emoji: '🏮', meaning: '内省、孤独、指引' }, { name: '命运之轮', emoji: '🎡', meaning: '转折、机遇、命运' },
  { name: '正义', emoji: '⚖️', meaning: '公平、真相、因果' }, { name: '倒吊人', emoji: '🙃', meaning: '牺牲、顿悟、等待' },
  { name: '星星', emoji: '⭐', meaning: '希望、灵感、宁静' }, { name: '太阳', emoji: '☀️', meaning: '快乐、成功、活力' },
  { name: '审判', emoji: '📯', meaning: '重生、觉醒、救赎' }, { name: '世界', emoji: '🌍', meaning: '完成、圆满、成就' },
]
export function TarotTool() {
  const [drawn, setDrawn] = useState<typeof TAROT_CARDS[0] | null>(null); const [flipping, setFlipping] = useState(false)
  const draw = () => { setFlipping(true); setDrawn(null); setTimeout(() => { setDrawn(TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)]); setFlipping(false) }, 800) }
  return <div className="p-4 flex flex-col items-center gap-4">
    <div className="w-40 h-56 rounded-2xl flex items-center justify-center" style={{ perspective: '1000px' }}>
      {flipping ? <div className="text-5xl animate-spin">🔄</div> : drawn ? <div className="w-full h-full rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-800 flex flex-col items-center justify-center gap-3 shadow-xl"><div className="text-5xl">{drawn.emoji}</div><p className="text-white font-bold text-lg">{drawn.name}</p><p className="text-white/70 text-xs text-center px-4">{drawn.meaning}</p></div> : <div className="w-full h-full rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center border-2 border-purple-500/30"><span className="text-4xl opacity-50">🔮</span></div>}
    </div>
    <button type="button" onClick={draw} disabled={flipping} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-700 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">{flipping ? '抽牌中...' : drawn ? '再抽一张' : '抽一张塔罗牌'}</button>
  </div>
}

// ========== 18. 土味情话 ==========
const PICKUP_LINES = ['你知道你和星星的区别吗？星星在天上，你在我心里。', '我最近有点怕你，因为我怕老婆。', '你是什么血型？你是我的理想型。', '你知道我最大的缺点是什么吗？是缺点你。', '你今天特别讨厌——讨人喜欢，百看不厌。', '我对你的爱就像拖拉机上山——轰轰烈烈。', '你知道我最喜欢什么神吗？你的眼神。', '莫文蔚的阴天，孙燕姿的雨天，周杰伦的晴天，都不如你和我聊天。', '你知道你和月亮的区别吗？月亮照亮黑夜，你照亮我的心。', '你猜我的心在哪边？左边？不，在你那边。', '我有一个超能力——超喜欢你。', '你的脸上有点东西——有点漂亮。', '不要抱怨，抱我。', '你闻到什么味道了吗？没有啊，怎么你一出来空气都是甜的。', '铁树可以开花，但我只想为你心动。']
export function PickupLineTool() {
  const [line, setLine] = useState(''); const [loading, setLoading] = useState(false)
  const load = async () => { setLoading(true); try { const r = await fetch(`${API}/saying/love`); const d = await r.json(); setLine(d.content || PICKUP_LINES[Math.floor(Math.random() * PICKUP_LINES.length)]) } catch { setLine(PICKUP_LINES[Math.floor(Math.random() * PICKUP_LINES.length)]) }; setLoading(false) }
  useEffect(() => { load() }, [])
  return <div className="p-4 flex flex-col h-full"><div className="flex-1 flex items-center justify-center mb-4"><p className="text-sm text-[rgb(var(--text-secondary))] text-center leading-relaxed italic">"{line}"</p></div><button type="button" onClick={load} disabled={loading} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} />{loading ? '加载中...' : '再来一句💕'}</button></div>
}

// ========== 19. Emoji字典 ==========
const EMOJI_DATA = [
  { emoji: '😀', name: '笑脸', desc: '表示开心、快乐' }, { emoji: '😂', name: '笑哭', desc: '笑到流泪' }, { emoji: '🥰', name: '爱心脸', desc: '充满爱意' }, { emoji: '😎', name: '酷脸', desc: '自信、酷' }, { emoji: '🤔', name: '思考', desc: '思考、疑惑' }, { emoji: '😴', name: '睡觉', desc: '困倦、无聊' }, { emoji: '🥺', name: '恳求', desc: '请求、可爱' }, { emoji: '😭', name: '大哭', desc: '悲伤、感动' }, { emoji: '😡', name: '愤怒', desc: '生气、愤怒' }, { emoji: '🤡', name: '小丑', desc: '滑稽、自嘲' }, { emoji: '💀', name: '骷髅', desc: '无语、完了' }, { emoji: '🫶', name: '爱心手', desc: '比心、喜爱' }, { emoji: '👍', name: '点赞', desc: '赞同、好' }, { emoji: '👎', name: '踩', desc: '反对、不好' }, { emoji: '👏', name: '鼓掌', desc: '称赞、欣赏' }, { emoji: '🙏', name: '祈祷', desc: '感谢、请求' }, { emoji: '🔥', name: '火焰', desc: '热门、厉害' }, { emoji: '✨', name: '闪亮', desc: '点缀、美好' }, { emoji: '💯', name: '满分', desc: '完美、百分百' }, { emoji: '🎉', name: '派对', desc: '庆祝、祝贺' },
]
export function EmojiDictTool() {
  const [search, setSearch] = useState(''); const [copied, setCopied] = useState('')
  const filtered = EMOJI_DATA.filter(e => e.name.includes(search) || e.desc.includes(search))
  return <div className="p-4 space-y-3">
    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索Emoji..." className="w-full px-3 py-2 rounded-xl bg-[rgb(var(--bg-secondary))] text-sm focus:outline-none text-[rgb(var(--text-primary))]" />
    <div className="space-y-1 max-h-72 overflow-y-auto">{filtered.map((e, i) => <button key={i} type="button" onClick={() => { navigator.clipboard?.writeText(e.emoji); setCopied(e.emoji); setTimeout(() => setCopied(''), 1500) }} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[rgb(var(--bg-secondary))] transition-colors text-left"><span className="text-2xl">{e.emoji}</span><div className="flex-1"><p className="text-sm text-[rgb(var(--text-primary))]">{e.name}</p><p className="text-xs text-[rgb(var(--text-secondary))]">{e.desc}</p></div>{copied === e.emoji && <Check size={14} className="text-green-500" />}</button>)}</div>
    {filtered.length === 0 && <p className="text-center text-sm text-[rgb(var(--text-secondary))] py-4">未找到匹配的Emoji</p>}
  </div>
}

// ========== 20. 空气质量 ==========
export function AirQualityTool() {
  const [data, setData] = useState<any>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(false)
  const load = async (lat?: number, lng?: number) => {
    setLoading(true); setError(false)
    try {
      let url: string
      if (lat !== undefined && lng !== undefined) {
        url = `https://api.waqi.info/feed/geo:${lat};${lng}/?token=demo`
      } else {
        url = 'https://api.waqi.info/feed/here/?token=demo'
      }
      const r = await fetch(url); const d = await r.json()
      if (d.status === 'ok') setData(d.data); else throw new Error()
    } catch { setError(true) }; setLoading(false)
  }
  const requestLocation = () => {
    if (!navigator.geolocation) { load(); return }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => load(pos.coords.latitude, pos.coords.longitude),
      () => { load() },
      { timeout: 8000 }
    )
  }
  useEffect(() => { requestLocation() }, [])
  const aqiLevel = (aqi: number) => aqi <= 50 ? { label: '优', color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' } : aqi <= 100 ? { label: '良', color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' } : aqi <= 150 ? { label: '轻度污染', color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' } : aqi <= 200 ? { label: '中度污染', color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' } : { label: '重度污染', color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' }
  if (loading) return <div className="p-4 flex items-center justify-center h-full"><RefreshCw size={20} className="animate-spin text-accent" /></div>
  if (error || !data) return <div className="p-4 flex flex-col items-center justify-center h-full gap-3"><span className="text-3xl">🌬️</span><p className="text-sm text-[rgb(var(--text-secondary))]">获取失败</p><div className="flex gap-2"><button type="button" onClick={() => requestLocation()} className="px-4 py-2 rounded-xl bg-accent text-white text-sm">定位重试</button><button type="button" onClick={() => load()} className="px-4 py-2 rounded-xl bg-[rgb(var(--bg-secondary))] text-sm">直接获取</button></div></div>
  const level = aqiLevel(data.aqi)
  return <div className="p-4 space-y-3">
    <div className={`rounded-xl ${level.bg} p-4 text-center`}><p className="text-xs text-[rgb(var(--text-secondary))] mb-1">{data.city?.name || '当前位置'}</p><p className={`text-4xl font-bold ${level.color}`}>{data.aqi}</p><p className={`text-sm font-medium ${level.color}`}>{level.label}</p></div>
    <div className="grid grid-cols-2 gap-2">{data.iaqi && Object.entries(data.iaqi).slice(0, 4).map(([key, val]: any) => <div key={key} className="rounded-xl bg-[rgb(var(--bg-secondary))] p-2 text-center"><p className="text-xs text-[rgb(var(--text-secondary))] uppercase">{key}</p><p className="text-sm font-bold text-[rgb(var(--text-primary))]">{val.v}</p></div>)}</div>
    <p className="text-xs text-[rgb(var(--text-secondary))] text-center">更新时间：{new Date(data.time?.iso || Date.now()).toLocaleString('zh-CN')}</p>
    <button type="button" onClick={() => requestLocation()} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-sm font-medium hover:opacity-90">刷新定位</button>
  </div>
}

// ========== 21. 日出日落时间 ==========
export function SunriseSunsetTool() {
  const [data, setData] = useState<any>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(false)
  const load = async () => { setLoading(true); setError(false); try { const r = await fetch(`https://api.sunrise-sunset.org/json?lat=39.9&lng=116.4&formatted=0`); const d = await r.json(); if (d.status === 'OK') setData(d.results); else throw new Error() } catch { setError(true) }; setLoading(false) }
  useEffect(() => { load() }, [])
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (loading) return <div className="p-4 flex items-center justify-center h-full"><RefreshCw size={20} className="animate-spin text-accent" /></div>
  if (error || !data) return <div className="p-4 flex flex-col items-center justify-center h-full gap-3"><span className="text-3xl">🌅</span><p className="text-sm text-[rgb(var(--text-secondary))]">获取失败</p><button type="button" onClick={load} className="px-4 py-2 rounded-xl bg-accent text-white text-sm">重试</button></div>
  return <div className="p-4 space-y-3">
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 p-4 text-center"><div className="text-3xl mb-1">🌅</div><p className="text-xs text-[rgb(var(--text-secondary))]">日出</p><p className="text-lg font-bold text-orange-500">{fmt(data.sunrise)}</p></div>
      <div className="rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 p-4 text-center"><div className="text-3xl mb-1">🌇</div><p className="text-xs text-[rgb(var(--text-secondary))]">日落</p><p className="text-lg font-bold text-purple-500">{fmt(data.sunset)}</p></div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl bg-[rgb(var(--bg-secondary))] p-3 text-center"><div className="text-2xl mb-1">☀️</div><p className="text-xs text-[rgb(var(--text-secondary))]">正午</p><p className="text-sm font-bold text-[rgb(var(--text-primary))]">{fmt(data.solar_noon)}</p></div>
      <div className="rounded-xl bg-[rgb(var(--bg-secondary))] p-3 text-center"><div className="text-2xl mb-1">🌓</div><p className="text-xs text-[rgb(var(--text-secondary))]">白昼时长</p><p className="text-sm font-bold text-[rgb(var(--text-primary))]">{data.day_length?.split(':').slice(0, 2).join('小时') + '分'}</p></div>
    </div>
    <p className="text-xs text-[rgb(var(--text-secondary))] text-center">基于北京经纬度计算</p>
  </div>
}

// ========== 22. 快递时效查询 ==========
const EXPRESS_DATA: Record<string, { time: string; desc: string }> = {
  '顺丰速运': { time: '1-2天', desc: '同城次晨达，跨省次日达' }, '京东物流': { time: '1-2天', desc: '自营商品当日/次日达' }, '中通快递': { time: '2-4天', desc: '省内1-2天，跨省2-4天' }, '圆通速递': { time: '2-4天', desc: '省内1-2天，跨省2-4天' }, '韵达快递': { time: '2-4天', desc: '省内1-2天，跨省2-4天' }, '申通快递': { time: '2-4天', desc: '省内1-2天，跨省2-4天' }, '百世快递': { time: '2-5天', desc: '省内2天，跨省3-5天' }, '邮政EMS': { time: '1-3天', desc: '全国覆盖，偏远地区+1天' }, '极兔速递': { time: '2-4天', desc: '省内1-2天，跨省2-4天' }, '德邦快递': { time: '2-4天', desc: '大件首选，省内次日达' },
}
export function ExpressTimeTool() {
  const [selected, setSelected] = useState('顺丰速运')
  return <div className="p-4 space-y-3">
    <div className="flex flex-wrap gap-1.5">{Object.keys(EXPRESS_DATA).map(name => <button key={name} type="button" onClick={() => setSelected(name)} className={`px-2.5 py-1 rounded-lg text-xs ${selected === name ? 'bg-accent text-white' : 'bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))]'}`}>{name}</button>)}</div>
    <div className="rounded-xl bg-[rgb(var(--bg-secondary))] p-4"><div className="flex items-center gap-2 mb-2"><span className="text-2xl">📦</span><span className="text-sm font-bold text-[rgb(var(--text-primary))]">{selected}</span></div><div className="space-y-1"><p className="text-sm"><span className="text-[rgb(var(--text-secondary))]">预计时效：</span><span className="text-accent font-bold">{EXPRESS_DATA[selected].time}</span></p><p className="text-xs text-[rgb(var(--text-secondary))]">{EXPRESS_DATA[selected].desc}</p></div></div>
    <p className="text-xs text-[rgb(var(--text-secondary))] text-center">时效仅供参考，实际以快递公司为准</p>
  </div>
}

// ========== 23. 油价查询 ==========
const OIL_PRICES: Record<string, { '89': string; '92': string; '95': string; '98': string; '0': string }> = {
  '北京': { '89': '7.02', '92': '7.51', '95': '7.99', '98': '8.97', '0': '7.17' }, '上海': { '89': '6.95', '92': '7.47', '95': '7.95', '98': '8.83', '0': '7.10' }, '广东': { '89': '6.98', '92': '7.53', '95': '8.15', '98': '9.23', '0': '7.13' }, '江苏': { '89': '6.96', '92': '7.48', '95': '7.95', '98': '8.83', '0': '7.08' }, '浙江': { '89': '6.93', '92': '7.48', '95': '7.95', '98': '8.70', '0': '7.10' }, '四川': { '89': '7.00', '92': '7.52', '95': '8.03', '98': '8.72', '0': '7.16' }, '湖北': { '89': '6.98', '92': '7.53', '95': '8.05', '98': '8.93', '0': '7.12' }, '山东': { '89': '6.98', '92': '7.49', '95': '8.02', '98': '8.74', '0': '7.10' },
}
export function OilPriceTool() {
  const [province, setProvince] = useState('北京')
  const price = OIL_PRICES[province]
  const oilTypes = [{ key: '89', label: '89号汽油' }, { key: '92', label: '92号汽油' }, { key: '95', label: '95号汽油' }, { key: '98', label: '98号汽油' }, { key: '0', label: '0号柴油' }]
  return <div className="p-4 space-y-3">
    <div className="flex flex-wrap gap-1.5">{Object.keys(OIL_PRICES).map(p => <button key={p} type="button" onClick={() => setProvince(p)} className={`px-2.5 py-1 rounded-lg text-xs ${province === p ? 'bg-accent text-white' : 'bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))]'}`}>{p}</button>)}</div>
    <div className="space-y-2">{oilTypes.map(t => <div key={t.key} className="flex items-center justify-between rounded-xl bg-[rgb(var(--bg-secondary))] p-3"><div className="flex items-center gap-2"><span className="text-lg">{t.key === '0' ? '🛢️' : '⛽'}</span><span className="text-sm text-[rgb(var(--text-primary))]">{t.label}</span></div><span className="text-lg font-bold text-accent">{price[t.key as keyof typeof price]}<span className="text-xs text-[rgb(var(--text-secondary))] ml-1">元/升</span></span></div>)}</div>
    <p className="text-xs text-[rgb(var(--text-secondary))] text-center">价格仅供参考，以实际加油站为准</p>
  </div>
}
