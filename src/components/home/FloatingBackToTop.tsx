import { useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'
import { playClickSound } from '@/utils/sounds'

/**
 * FloatingBackToTop 浮动返回顶部按钮
 * 滚动超过 300px 后显示
 */
export function FloatingBackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={() => {
        playClickSound()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }}
      className="fixed bottom-24 right-6 z-50 w-11 h-11 rounded-full
        glass-strong shadow-lg shadow-black/10
        flex items-center justify-center
        hover:scale-110 active:scale-95 transition-all duration-300"
      aria-label="返回顶部"
    >
      <ArrowUp size={18} className="text-accent" />
    </button>
  )
}

export default FloatingBackToTop
