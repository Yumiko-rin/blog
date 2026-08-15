import { useState, useEffect, useRef, useCallback } from 'react'
import { useThemeStore } from '@/store/useThemeStore'
import { BG_IMAGES } from '@/data/backgrounds'

/**
 * 二次元动漫背景幻灯片（萝莉 / 猫娘风格）
 * 与设置面板（BackgroundSettings）共用 @/data/backgrounds 的同一份图片，
 * 保证「设置里选的图」就是「实际显示的背景」。
 *
 * 防黑屏方案（<img> 双层淡入）：
 * - 底层（bottomIndex）始终显示当前壁纸，切换期间保持不变
 * - 入场层（incomingIndex）使用 <img> 元素，从 opacity 0 淡入到 1
 * - 使用 img.decode() 确保图片完全解码后再开始淡入
 * - 通过 ref 强制样式刷新（void offsetHeight），确保浏览器先绘制 opacity:0 一帧
 * - 淡入完成后，将底层更新为新图，移除入场层
 * - 旧图在任何时刻都可见，彻底消除黑屏
 */

interface Firefly {
  id: number
  left: string
  top: string
  size: number
  delay: string
}

function generateFireflies(count: number): Firefly[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: 2 + Math.random() * 2,
    delay: `${Math.random() * 5}s`,
  }))
}

export function DynamicBackground() {
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'

  const [bottomIndex, setBottomIndex] = useState(0)
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null)
  const [incomingOpacity, setIncomingOpacity] = useState(0)
  const [autoRotate, setAutoRotate] = useState(true)
  const [fireflies] = useState(() => generateFireflies(12))

  const bottomRef = useRef(0)
  bottomRef.current = bottomIndex
  const incomingRef = useRef<number | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const incomingImgRef = useRef<HTMLImageElement | null>(null)

  /** 预加载并解码目标图片，然后新图淡入覆盖旧图 */
  const switchBg = useCallback((newIndex: number) => {
    if (newIndex === bottomRef.current) return
    if (incomingRef.current === newIndex) return

    // 取消正在进行的过渡：如有入场层未完成，立即将其提升为底层
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (incomingRef.current !== null && incomingRef.current !== undefined) {
      setBottomIndex(incomingRef.current)
      bottomRef.current = incomingRef.current
    }

    incomingRef.current = newIndex
    setIncomingIndex(newIndex)
    setIncomingOpacity(0)

    // 立即通知设置面板同步高亮
    window.dispatchEvent(new CustomEvent('bg-index-sync', { detail: { index: newIndex } }))

    const img = new Image()
    img.src = BG_IMAGES[newIndex].url

    // 使用 decode() 确保图片已解码可绘制；不支持时回退到 onload
    const ready = typeof img.decode === 'function'
      ? img.decode().catch(() => {})
      : new Promise<void>((resolve) => {
          img.onload = () => resolve()
          img.onerror = () => resolve()
        })

    ready.then(() => {
      // 如果已经被更新的 switch 取消，跳过
      if (incomingRef.current !== newIndex) return

      // 双 rAF + 强制样式刷新，确保入场层先以 opacity:0 绘制一帧，再触发淡入
      requestAnimationFrame(() => {
        if (incomingRef.current !== newIndex) return
        // 强制浏览器刷新样式，确保 opacity:0 已被绘制
        if (incomingImgRef.current) {
          void incomingImgRef.current.offsetHeight
        }
        requestAnimationFrame(() => {
          if (incomingRef.current !== newIndex) return
          setIncomingOpacity(1)
        })
      })

      // 淡入完成后，将底层更新为新图并移除入场层
      timeoutRef.current = setTimeout(() => {
        if (incomingRef.current !== newIndex) return
        setBottomIndex(newIndex)
        bottomRef.current = newIndex
        setIncomingIndex(null)
        setIncomingOpacity(0)
        incomingRef.current = null
        timeoutRef.current = null
      }, 2100)
    })
  }, [])

  // 监听设置面板的手动切换
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (typeof detail?.index === 'number') {
        switchBg(detail.index)
      }
    }
    window.addEventListener('bg-change', handler)
    return () => window.removeEventListener('bg-change', handler)
  }, [switchBg])

  // 监听自动轮播开关
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (typeof detail?.enabled === 'boolean') setAutoRotate(detail.enabled)
    }
    window.addEventListener('bg-autorotate', handler)
    return () => window.removeEventListener('bg-autorotate', handler)
  }, [])

  // 底层索引变化时通知设置面板（初始挂载 + 淡入完成后）
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('bg-index-sync', { detail: { index: bottomIndex } }))
  }, [bottomIndex])

  // 幻灯片自动切换（可由设置关闭）
  useEffect(() => {
    if (!autoRotate) return
    const timer = setInterval(() => {
      switchBg((bottomRef.current + 1) % BG_IMAGES.length)
    }, 8000)
    return () => clearInterval(timer)
  }, [autoRotate, switchBg])

  // 预加载下一张背景图（为自动轮播做准备）
  useEffect(() => {
    const next = (bottomIndex + 1) % BG_IMAGES.length
    const img = new Image()
    img.src = BG_IMAGES[next].url
  }, [bottomIndex])

  // 清理超时
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  // 从 CSS 变量读取遮罩设置
  const getOverlayColor = () => {
    const dark = getComputedStyle(document.documentElement).getPropertyValue('--bg-overlay-dark').trim()
    const light = getComputedStyle(document.documentElement).getPropertyValue('--bg-overlay-light').trim()
    return isDark ? (dark || 'rgba(10,10,15,0.5)') : (light || 'rgba(22,18,30,0.42)')
  }

  const [overlayColor, setOverlayColor] = useState(getOverlayColor)

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setOverlayColor(getOverlayColor())
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    })
    return () => observer.disconnect()
  }, [isDark])

  return (
    <div className="fixed inset-0 z-[-2] pointer-events-none overflow-hidden" aria-hidden="true">
      {/* 深色基底：防止加载时露出浅色底 */}
      <div
        className="absolute inset-0 z-0"
        style={{ background: '#0b0b12' }}
      />

      {/* 底层：当前壁纸（切换期间保持旧图不变） */}
      <img
        src={BG_IMAGES[bottomIndex].url}
        alt=""
        draggable={false}
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover z-[1]"
      />

      {/* 入场层：新壁纸从透明淡入到不透明 */}
      {incomingIndex !== null && (
        <img
          ref={incomingImgRef}
          src={BG_IMAGES[incomingIndex].url}
          alt=""
          draggable={false}
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover z-[2]"
          style={{
            opacity: incomingOpacity,
            transition: 'opacity 2000ms ease-in-out',
            willChange: 'opacity',
          }}
        />
      )}

      {/* 暗色遮罩 */}
      <div
        className="absolute inset-0 z-[3] transition-all duration-1000"
        style={{ background: overlayColor }}
      />

      {/* 渐变叠加 */}
      <div
        className="absolute inset-0 z-[4] mix-blend-overlay"
        style={{
          background: 'linear-gradient(-45deg, rgba(100,100,180,0.12), rgba(150,80,180,0.08), rgba(80,120,200,0.1))',
          backgroundSize: '400% 400%',
          animation: 'gradientMove 25s ease infinite',
        }}
      />

      {/* 萤火虫 */}
      <div className="hidden md:block absolute inset-0 z-[5] overflow-hidden">
        {fireflies.map((f) => (
          <div
            key={f.id}
            className="absolute rounded-full"
            style={{
              left: f.left,
              top: f.top,
              width: `${f.size}px`,
              height: `${f.size}px`,
              background: 'rgba(150,220,180,0.4)',
              boxShadow: '0 0 6px 2px rgba(150,220,180,0.25)',
              animation: `fireflyBreathe ${3 + Math.random() * 2}s ease-in-out infinite, float${(f.id % 4) + 1} ${25 + Math.random() * 10}s ease-in-out infinite`,
              animationDelay: f.delay,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default DynamicBackground
