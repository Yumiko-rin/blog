import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { ThemeToggle } from '@/components/atoms/ThemeToggle'
import { BackgroundSettings } from '@/components/atoms/BackgroundSettings'
import { GeneralSettings } from '@/components/atoms/GeneralSettings'
import { IconButton } from '@/components/atoms/IconButton'
import { playClickSound } from '@/utils/sounds'

const NAV_LINKS = [
  { path: '/', label: '首页' },
  { path: '/archive', label: '文章' },
  { path: '/shuoshuo', label: '说说' },
  { path: '/moments', label: '留言板' },
  { path: '/gallery', label: '画廊' },
  { path: '/music', label: '音乐' },
  { path: '/my', label: '我的' },
]

/**
 * Header 苹果液态玻璃导航栏
 */
export function Header() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mobileOpen) return
    const onClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setMobileOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [mobileOpen])

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const handleNavClick = () => playClickSound()

  return (
    <>
      {/* 桌面端导航栏 - 实色风格（非毛玻璃） */}
      <header
        className="hidden md:block w-full fixed top-0 left-0 right-0 z-50 transition-all duration-500
          bg-[rgb(var(--bg-primary))] border-b border-black/10 dark:border-white/10 shadow-sm"
      >
        <div className="w-[90%] max-w-6xl mx-auto h-16 flex items-center justify-between px-4 sm:px-[30px]">
          <Link
            to="/"
            onClick={handleNavClick}
            className="text-xl font-black tracking-tight transition-all duration-300 hover:scale-105"
          >
            <span className="rainbow-name">喵音の小筑</span>
          </Link>

          <nav className="flex gap-8 text-sm font-semibold">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.path)
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={handleNavClick}
                  aria-current={active ? 'page' : undefined}
                  className={`relative py-1 transition-all duration-200 ${
                    active
                      ? 'text-accent font-bold'
                      : 'text-[rgb(var(--text-primary))] hover:text-accent font-medium'
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-accent rounded-full animate-pulse" />
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-2 relative">
            <BackgroundSettings />
            <GeneralSettings />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* 移动端触发按钮 - 实色风格 */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => {
            playClickSound()
            setMobileOpen((p) => !p)
          }}
          className="fixed top-1/2 right-0 -translate-y-1/2 w-12 h-28
            bg-[rgb(var(--bg-primary))] rounded-l-full
            shadow-lg shadow-black/10
            z-[60] flex items-center justify-center
            transition-all duration-500 border-y border-l border-black/10 dark:border-white/10
            active:scale-95"
          aria-label={mobileOpen ? '关闭菜单' : '打开菜单'}
        >
          <div className="flex flex-col gap-1.5 items-center justify-center mr-2">
            <span className="w-1.5 h-1.5 bg-accent rounded-full" />
            <span className="w-1.5 h-1.5 bg-accent rounded-full" />
            <span className="w-1.5 h-1.5 bg-accent rounded-full" />
          </div>
        </button>
      </div>

      {/* 移动端抽屉 - 实色风格 */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-[55] bg-black/30 md:hidden animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div
            ref={drawerRef}
            className="fixed top-0 right-0 bottom-0 z-[58] w-72
              bg-[rgb(var(--bg-primary))]
              shadow-2xl md:hidden border-l border-black/10 dark:border-white/10"
          >
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <span className="font-bold text-[rgb(var(--text-primary))]">导航</span>
              <IconButton onClick={() => setMobileOpen(false)} size="sm">
                <X size={20} />
              </IconButton>
            </div>
            <nav className="flex flex-col gap-1 p-4">
              {NAV_LINKS.map((link) => {
                const active = isActive(link.path)
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => {
                      playClickSound()
                      setMobileOpen(false)
                    }}
                    aria-current={active ? 'page' : undefined}
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                      active
                        ? 'bg-accent/10 text-accent'
                        : 'text-[rgb(var(--text-primary))] hover:bg-white/30 dark:hover:bg-white/5'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>
            <div className="border-t border-white/10 mt-2 pt-3 px-4">
              <div className="flex items-center gap-2">
                <BackgroundSettings />
                <GeneralSettings />
                <div className="ml-auto">
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
