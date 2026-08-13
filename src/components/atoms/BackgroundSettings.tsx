import { useState, useRef, useEffect, useCallback } from 'react'
import { Settings, ChevronLeft, ChevronRight, Sparkles, Shuffle } from 'lucide-react'
import { IconButton } from '@/components/atoms/IconButton'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { BG_IMAGES } from '@/data/backgrounds'

// ========== 鼠标效果 ==========
type MouseEffect = 'none' | 'click' | 'trail' | 'seasonal' | 'stars'

function createClickParticle(x: number, y: number) {
  const colors = ['#ff6b9d', '#c44dff', '#6b9dff', '#4dffc3', '#ffd700', '#ff4d6d']
  for (let i = 0; i < 8; i++) {
    const particle = document.createElement('div')
    const angle = (Math.PI * 2 * i) / 8
    const velocity = 40 + Math.random() * 30
    const color = colors[Math.floor(Math.random() * colors.length)]
    const size = 4 + Math.random() * 4
    Object.assign(particle.style, {
      position: 'fixed', left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size}px`,
      borderRadius: '50%', background: color, pointerEvents: 'none', zIndex: '99999',
      boxShadow: `0 0 6px ${color}`, transition: 'all 0.6s ease-out', opacity: '1',
    })
    document.body.appendChild(particle)
    requestAnimationFrame(() => {
      particle.style.transform = `translate(${Math.cos(angle) * velocity}px, ${Math.sin(angle) * velocity}px) scale(0)`
      particle.style.opacity = '0'
    })
    setTimeout(() => particle.remove(), 700)
  }
}

function createTrailDot(x: number, y: number) {
  const dot = document.createElement('div')
  const hue = (Date.now() / 10) % 360
  Object.assign(dot.style, {
    position: 'fixed', left: `${x - 3}px`, top: `${y - 3}px`, width: '6px', height: '6px',
    borderRadius: '50%', background: `hsl(${hue}, 80%, 65%)`, pointerEvents: 'none', zIndex: '99999',
    boxShadow: `0 0 8px hsl(${hue}, 80%, 65%)`, transition: 'all 0.8s ease-out', opacity: '1',
  })
  document.body.appendChild(dot)
  requestAnimationFrame(() => { dot.style.transform = 'scale(0)'; dot.style.opacity = '0' })
  setTimeout(() => dot.remove(), 900)
}

function createSeasonalEffect(x: number, y: number) {
  const petals = ['🌸', '🍃', '❄️', '🌺']
  for (let i = 0; i < 3; i++) {
    const petal = document.createElement('div')
    const emoji = petals[Math.floor(Math.random() * petals.length)]
    const offsetX = (Math.random() - 0.5) * 80
    Object.assign(petal.style, {
      position: 'fixed', left: `${x + offsetX}px`, top: `${y - 20}px`, fontSize: '16px',
      pointerEvents: 'none', zIndex: '99999', transition: 'all 1.5s ease-out', opacity: '1',
    })
    petal.textContent = emoji
    document.body.appendChild(petal)
    requestAnimationFrame(() => {
      petal.style.transform = `translate(${offsetX}px, ${100 + Math.random() * 60}px) rotate(${Math.random() * 360}deg)`
      petal.style.opacity = '0'
    })
    setTimeout(() => petal.remove(), 1600)
  }
}

function createStarBurst(x: number, y: number) {
  for (let i = 0; i < 6; i++) {
    const star = document.createElement('div')
    const angle = (Math.PI * 2 * i) / 6
    const dist = 30 + Math.random() * 40
    const size = 10 + Math.random() * 8
    Object.assign(star.style, {
      position: 'fixed', left: `${x}px`, top: `${y}px`, fontSize: `${size}px`,
      pointerEvents: 'none', zIndex: '99999', transition: 'all 0.5s ease-out', opacity: '1',
    })
    star.textContent = '✦'
    star.style.color = ['#ffd700', '#ff6b9d', '#c44dff', '#6b9dff'][Math.floor(Math.random() * 4)]
    document.body.appendChild(star)
    requestAnimationFrame(() => {
      star.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) scale(0)`
      star.style.opacity = '0'
    })
    setTimeout(() => star.remove(), 600)
  }
}

// ========== 设置面板组件 ==========
interface Settings {
  bgIndex: number
  blur: number
  mouseEffect: MouseEffect
  /** 自动轮播（默认开） */
  autoRotate: boolean
}

const DEFAULT_SETTINGS: Settings = { bgIndex: 0, blur: 4, mouseEffect: 'none', autoRotate: true }

export function BackgroundSettings() {
  const [isOpen, setIsOpen] = useState(false)
  const [settings, setSettings] = useLocalStorage<Settings>('bg-settings', DEFAULT_SETTINGS)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  // 仅用户主动切换背景时才向 DynamicBackground 派发 bg-change，避免自动轮播回写造成循环
  const userPicked = useRef(false)

  const autoRotateOn = settings.autoRotate ?? true

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  // 应用模糊度 + 派发手动背景切换
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--bg-blur', `${settings.blur}px`)
    if (userPicked.current) {
      window.dispatchEvent(new CustomEvent('bg-change', { detail: { index: settings.bgIndex } }))
      userPicked.current = false
    }
  }, [settings.bgIndex, settings.blur])

  // 自动轮播开关 -> 通知 DynamicBackground
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('bg-autorotate', { detail: { enabled: autoRotateOn } }))
  }, [autoRotateOn])

  // 背景实际索引（含自动轮播）-> 同步设置高亮，不触发 bg-change
  useEffect(() => {
    const handler = (e: Event) => {
      const idx = (e as CustomEvent).detail?.index
      if (typeof idx === 'number') setSettings((s) => ({ ...s, bgIndex: idx }))
    }
    window.addEventListener('bg-index-sync', handler)
    return () => window.removeEventListener('bg-index-sync', handler)
  }, [setSettings])

  // 鼠标效果事件监听
  useEffect(() => {
    const effect = settings.mouseEffect
    if (effect === 'none') return

    const handleClick = (e: MouseEvent) => {
      if (effect === 'click') createClickParticle(e.clientX, e.clientY)
      if (effect === 'seasonal') createSeasonalEffect(e.clientX, e.clientY)
      if (effect === 'stars') createStarBurst(e.clientX, e.clientY)
    }

    let trailThrottle = 0
    const handleMove = (e: MouseEvent) => {
      if (effect !== 'trail') return
      const now = Date.now()
      if (now - trailThrottle < 30) return
      trailThrottle = now
      createTrailDot(e.clientX, e.clientY)
    }

    document.addEventListener('click', handleClick)
    document.addEventListener('mousemove', handleMove)
    return () => { document.removeEventListener('click', handleClick); document.removeEventListener('mousemove', handleMove) }
  }, [settings.mouseEffect])

  const pick = useCallback((index: number) => {
    userPicked.current = true
    setSettings((s) => ({ ...s, bgIndex: ((index % BG_IMAGES.length) + BG_IMAGES.length) % BG_IMAGES.length }))
  }, [setSettings])

  const prevBg = useCallback(() => pick(settings.bgIndex - 1), [pick, settings.bgIndex])
  const nextBg = useCallback(() => pick(settings.bgIndex + 1), [pick, settings.bgIndex])
  const randomBg = useCallback(() => {
    const next = Math.floor(Math.random() * BG_IMAGES.length)
    pick(next)
  }, [pick])

  const effectButtons: { id: MouseEffect; label: string; icon: string }[] = [
    { id: 'click', label: '点击特效', icon: '✨' },
    { id: 'trail', label: '鼠标轨迹', icon: '🌈' },
    { id: 'seasonal', label: '季节特效', icon: '🌸' },
    { id: 'stars', label: '星星迸发', icon: '⭐' },
  ]

  const current = BG_IMAGES[settings.bgIndex] ?? BG_IMAGES[0]

  return (
    <>
      <IconButton
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="设置"
        title="设置"
        className={isOpen ? 'bg-accent/10' : ''}
      >
        <Settings size={18} />
      </IconButton>

      {isOpen && (
        <div
          ref={panelRef}
          className="absolute top-full right-0 mt-2 w-72 glass-strong rounded-2xl shadow-2xl shadow-black/10
            p-4 z-50 animate-fade-in max-h-[80vh] overflow-y-auto scrollbar-hide"
        >
          {/* 标题 */}
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-accent" />
            <span className="text-sm font-bold text-[rgb(var(--text-primary))]">设置</span>
          </div>

          {/* ===== 背景图片 ===== */}
          <div className="mb-4">
            <div className="text-xs font-bold text-[rgb(var(--text-secondary))] mb-2">背景图片</div>

            {/* 当前背景预览（高清原图） */}
            <div className="relative rounded-xl overflow-hidden mb-2 h-28 bg-[rgb(var(--bg-secondary))]">
              <img
                src={current.url}
                alt="当前背景"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[10px] text-center py-1">
                背景 {settings.bgIndex + 1} / {BG_IMAGES.length}
              </div>
            </div>

            {/* 上一张 / 随机 / 下一张 */}
            <div className="flex gap-2 mb-2">
              <button type="button" onClick={prevBg}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium
                  bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))] hover:bg-accent/10 transition-colors">
                <ChevronLeft size={12} /> 上一张
              </button>
              <button type="button" onClick={randomBg}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium
                  bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))] hover:bg-accent/10 transition-colors">
                <Shuffle size={12} /> 随机
              </button>
              <button type="button" onClick={nextBg}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium
                  bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))] hover:bg-accent/10 transition-colors">
                下一张 <ChevronRight size={12} />
              </button>
            </div>

            {/* 背景选择网格 */}
            <div className="grid grid-cols-5 gap-1">
              {BG_IMAGES.map((bg, i) => (
                <button key={bg.id} type="button"
                  onClick={() => pick(i)}
                  className={`relative rounded-lg overflow-hidden aspect-square border-2 transition-all
                    ${settings.bgIndex === i ? 'border-accent ring-1 ring-accent/30' : 'border-transparent hover:border-accent/30'}`}
                  title={`切换到${bg.label}`}>
                  <img src={bg.thumb} alt={bg.label} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>

          {/* ===== 自动轮播 ===== */}
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-bold text-[rgb(var(--text-secondary))]">自动轮播</span>
            <button type="button" role="switch" aria-checked={autoRotateOn}
              onClick={() => setSettings((s) => ({ ...s, autoRotate: !autoRotateOn }))}
              className={`relative h-5 w-9 rounded-full transition-colors ${autoRotateOn ? 'bg-accent' : 'bg-[rgb(var(--bg-secondary))]'}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${autoRotateOn ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* ===== 背景模糊度 ===== */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[rgb(var(--text-secondary))]">背景模糊度</span>
              <span className="text-xs font-mono text-accent">{settings.blur} px</span>
            </div>
            <input type="range" min="0" max="20" value={settings.blur}
              onChange={e => setSettings(s => ({ ...s, blur: Number(e.target.value) }))}
              className="w-full accent-accent h-1.5 rounded-full appearance-none bg-[rgb(var(--bg-secondary))]
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-md" />
          </div>

          {/* ===== 鼠标效果 ===== */}
          <div>
            <div className="text-xs font-bold text-[rgb(var(--text-secondary))] mb-2">鼠标效果</div>
            <div className="grid grid-cols-2 gap-1.5">
              {effectButtons.map(btn => (
                <button key={btn.id} type="button"
                  onClick={() => setSettings(s => ({ ...s, mouseEffect: s.mouseEffect === btn.id ? 'none' : btn.id }))}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-medium transition-all
                    ${settings.mouseEffect === btn.id
                      ? 'bg-accent text-white shadow'
                      : 'bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))] hover:bg-accent/10'}`}>
                  <span>{btn.icon}</span>
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default BackgroundSettings
