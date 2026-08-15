import { useState, useRef, useEffect } from 'react'
import {
  SlidersHorizontal, Volume2, VolumeX, Type, Zap, ZapOff,
  Cat, MousePointer, ArrowUpToLine, Maximize2, AlignCenter,
  X, Wrench, Music, MonitorSmartphone, Sparkles,
} from 'lucide-react'
import { IconButton } from '@/components/atoms/IconButton'
import { useLocalStorage } from '@/hooks/useLocalStorage'

interface GeneralSettings {
  soundEnabled: boolean
  fontSize: number
  reducedMotion: boolean
  live2dEnabled: boolean
  customCursorEnabled: boolean
  backToTopEnabled: boolean
  wideLayout: boolean
  toolboxEnabled: boolean
  musicPlayerEnabled: boolean
  followSystemTheme: boolean
  parallaxEnabled: boolean
}

const DEFAULT_SETTINGS: GeneralSettings = {
  soundEnabled: true,
  fontSize: 16,
  reducedMotion: false,
  live2dEnabled: true,
  customCursorEnabled: true,
  backToTopEnabled: true,
  wideLayout: false,
  toolboxEnabled: true,
  musicPlayerEnabled: true,
  followSystemTheme: false,
  parallaxEnabled: true,
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={onChange}
      className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${checked ? 'bg-accent' : 'bg-[rgb(var(--bg-secondary))]'}`}>
      <span className={`absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
    </button>
  )
}

function SettingRow({ icon, label, checked, onChange }: {
  icon: React.ReactNode; label: string; checked: boolean; onChange: () => void
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={checked ? 'text-accent' : 'text-[rgb(var(--text-secondary))]'}>{icon}</span>
        <span className="text-xs font-bold text-[rgb(var(--text-secondary))]">{label}</span>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold text-[rgb(var(--text-secondary))] opacity-50 uppercase tracking-wider mb-2 mt-4 first:mt-0">
      {children}
    </div>
  )
}

export function GeneralSettings() {
  const [isOpen, setIsOpen] = useState(false)
  const [settings, setSettings] = useLocalStorage<GeneralSettings>('general-settings', DEFAULT_SETTINGS)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

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

  useEffect(() => {
    try { localStorage.setItem('sound-enabled', String(settings.soundEnabled)) } catch {}
  }, [settings.soundEnabled])

  useEffect(() => {
    document.documentElement.style.fontSize = `${settings.fontSize}px`
  }, [settings.fontSize])

  useEffect(() => {
    const root = document.documentElement
    if (settings.reducedMotion) {
      root.style.setProperty('--motion-scale', '1')
      root.style.setProperty('--motion-duration', '0s')
    } else {
      root.style.removeProperty('--motion-scale')
      root.style.removeProperty('--motion-duration')
    }
  }, [settings.reducedMotion])

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-live2d', String(settings.live2dEnabled))
    root.setAttribute('data-cursor', String(settings.customCursorEnabled))
    root.setAttribute('data-backtotop', String(settings.backToTopEnabled))
    root.setAttribute('data-wide', String(settings.wideLayout))
    root.setAttribute('data-toolbox', String(settings.toolboxEnabled))
    root.setAttribute('data-musicplayer', String(settings.musicPlayerEnabled))
    root.setAttribute('data-parallax', String(settings.parallaxEnabled))
  }, [settings.live2dEnabled, settings.customCursorEnabled, settings.backToTopEnabled, settings.wideLayout, settings.toolboxEnabled, settings.musicPlayerEnabled, settings.parallaxEnabled])

  useEffect(() => {
    if (!settings.followSystemTheme) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (e: MediaQueryListEvent | MediaQueryList) => {
      const isDark = 'matches' in e ? e.matches : false
      const root = document.documentElement
      if (isDark) {
        root.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      } else {
        root.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      }
    }
    apply(mq)
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings.followSystemTheme])

  useEffect(() => {
    const styleId = 'general-settings-css'
    let style = document.getElementById(styleId)
    if (!style) {
      style = document.createElement('style')
      style.id = styleId
      document.head.appendChild(style)
    }
    style.textContent = `
      html[data-live2d="false"] #waifu { display: none !important; }
      html[data-cursor="false"] .cursor-dot,
      html[data-cursor="false"] .cursor-ring { display: none !important; }
      html[data-cursor="false"] * { cursor: auto !important; }
      html[data-backtotop="false"] button[aria-label="返回顶部"] { display: none !important; }
      html[data-wide="true"] .max-w-6xl { max-width: 90rem !important; }
      html[data-wide="true"] .max-w-5xl { max-width: 90rem !important; }
      html[data-wide="true"] .max-w-4xl { max-width: 90rem !important; }
      html[data-toolbox="false"] button.fixed.bottom-6.left-6 { display: none !important; }
      html[data-musicplayer="false"] div.fixed.bottom-4 { display: none !important; }
      html[data-parallax="false"] [class*="parallax"] { display: none !important; }
    `
  }, [])

  const update = (key: keyof GeneralSettings) => () => setSettings(s => ({ ...s, [key]: !s[key] }))

  return (
    <div className="relative">
      <IconButton
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="通用设置"
        title="通用设置"
        className={isOpen ? 'bg-accent/10' : ''}
      >
        <SlidersHorizontal size={18} />
      </IconButton>

      {isOpen && (
        <div
          ref={panelRef}
          className="absolute top-full right-0 mt-2 w-72 glass-strong rounded-2xl shadow-2xl shadow-black/10
            p-4 z-50 animate-fade-in max-h-[80vh] overflow-y-auto scrollbar-hide"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-accent" />
              <span className="text-sm font-bold text-[rgb(var(--text-primary))]">通用设置</span>
            </div>
            <button type="button" onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))] transition-colors">
              <X size={14} />
            </button>
          </div>

          {/* ===== 通用 ===== */}
          <SectionLabel>通用</SectionLabel>

          <SettingRow
            icon={settings.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            label="音效"
            checked={settings.soundEnabled}
            onChange={update('soundEnabled')}
          />

          <SettingRow
            icon={settings.followSystemTheme ? <MonitorSmartphone size={16} /> : <MonitorSmartphone size={16} />}
            label="跟随系统主题"
            checked={settings.followSystemTheme}
            onChange={update('followSystemTheme')}
          />

          <SettingRow
            icon={settings.reducedMotion ? <ZapOff size={16} /> : <Zap size={16} />}
            label="减少动画"
            checked={settings.reducedMotion}
            onChange={update('reducedMotion')}
          />

          <SettingRow
            icon={settings.wideLayout ? <Maximize2 size={16} /> : <AlignCenter size={16} />}
            label="宽屏布局"
            checked={settings.wideLayout}
            onChange={update('wideLayout')}
          />

          <SettingRow
            icon={<Sparkles size={16} />}
            label="视差滚动效果"
            checked={settings.parallaxEnabled}
            onChange={update('parallaxEnabled')}
          />

          {/* 字体大小 */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Type size={16} className="text-accent" />
                <span className="text-xs font-bold text-[rgb(var(--text-secondary))]">字体大小</span>
              </div>
              <span className="text-xs font-mono text-accent">{settings.fontSize}px</span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button"
                onClick={() => setSettings(s => ({ ...s, fontSize: Math.max(12, s.fontSize - 1) }))}
                className="w-8 h-8 rounded-lg bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))] hover:bg-accent/10 transition-colors text-sm font-bold">A-</button>
              <input type="range" min="12" max="22" value={settings.fontSize}
                onChange={e => setSettings(s => ({ ...s, fontSize: Number(e.target.value) }))}
                className="flex-1 accent-accent h-1.5 rounded-full appearance-none bg-[rgb(var(--bg-secondary))]
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-md" />
              <button type="button"
                onClick={() => setSettings(s => ({ ...s, fontSize: Math.min(22, s.fontSize + 1) }))}
                className="w-8 h-8 rounded-lg bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))] hover:bg-accent/10 transition-colors text-sm font-bold">A+</button>
            </div>
          </div>

          {/* ===== 界面元素 ===== */}
          <SectionLabel>界面元素</SectionLabel>

          <SettingRow
            icon={<Cat size={16} />}
            label="看板娘"
            checked={settings.live2dEnabled}
            onChange={update('live2dEnabled')}
          />

          <SettingRow
            icon={<Music size={16} />}
            label="音乐播放器"
            checked={settings.musicPlayerEnabled}
            onChange={update('musicPlayerEnabled')}
          />

          <SettingRow
            icon={<Wrench size={16} />}
            label="工具箱"
            checked={settings.toolboxEnabled}
            onChange={update('toolboxEnabled')}
          />

          <SettingRow
            icon={<MousePointer size={16} />}
            label="自定义光标"
            checked={settings.customCursorEnabled}
            onChange={update('customCursorEnabled')}
          />

          <SettingRow
            icon={<ArrowUpToLine size={16} />}
            label="返回顶部按钮"
            checked={settings.backToTopEnabled}
            onChange={update('backToTopEnabled')}
          />

          {/* 重置按钮 */}
          <button type="button"
            onClick={() => setSettings(DEFAULT_SETTINGS)}
            className="w-full mt-4 py-2 rounded-xl bg-[rgb(var(--bg-secondary))] text-xs font-medium text-[rgb(var(--text-secondary))] hover:bg-accent/10 transition-colors">
            恢复默认设置
          </button>

          {/* 关于 */}
          <div className="mt-3 pt-3 border-t border-[rgb(var(--border))] text-center">
            <p className="text-[10px] text-[rgb(var(--text-secondary))] opacity-60">喵音小筑 · v1.0</p>
            <p className="text-[10px] text-[rgb(var(--text-secondary))] opacity-40 mt-0.5">React + TypeScript + TailwindCSS</p>
          </div>
        </div>
      )}
    </>
  )
}

export default GeneralSettings
