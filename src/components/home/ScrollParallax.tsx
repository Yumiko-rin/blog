import { useEffect, useRef } from 'react'

/**
 * ScrollParallax 滚动视差效果
 * 为首页 Banner 背景图添加滚动视差，营造深度感
 * 滚动时背景图以 0.5 倍速度移动，产生层次感
 */
export function ScrollParallax() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let rafId = 0
    let ticking = false

    const update = () => {
      const el = ref.current
      if (!el) return
      const scrollY = window.scrollY
      const offset = scrollY * 0.4
      el.style.transform = `translateY(${offset}px)`
      // 滚动超过一屏后逐渐淡出
      const opacity = Math.max(0, 1 - scrollY / window.innerHeight)
      el.style.opacity = String(opacity)
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        rafId = requestAnimationFrame(update)
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    update()

    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div
      ref={ref}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, willChange: 'transform, opacity' }}
    />
  )
}

export default ScrollParallax
