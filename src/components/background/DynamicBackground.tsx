import { useState, useEffect } from 'react'
import { useThemeStore } from '@/store/useThemeStore'
import { BG_IMAGES } from '@/data/backgrounds'

/**
 * 二次元动漫背景幻灯片（萝莉 / 猫娘风格）
 * 与设置面板（BackgroundSettings）共用 @/data/backgrounds 的同一份图片，
 * 保证「设置里选的图」就是「实际显示的背景」。
 *
 * 衔接优化（防白屏 / 去毛玻璃）：
 * - 最底层铺一层深色 base，避免切换瞬间暴露出 body 的浅色底而出现"白闪/白遮挡"
 * - 移除 backdrop-filter 模糊层，避免"白色毛玻璃"观感
 * - 提前预加载所有图片，首屏与切换都不会因未加载而露白
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

  const [bgIndex, setBgIndex] = useState(0)
  const [autoRotate, setAutoRotate] = useState(true)
  const [fireflies] = useState(() => generateFireflies(12))

  // 监听设置面板的手动切换
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (typeof detail?.index === 'number') setBgIndex(detail.index)
    }
    window.addEventListener('bg-change', handler)
    return () => window.removeEventListener('bg-change', handler)
  }, [])

  // 监听自动轮播开关
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (typeof detail?.enabled === 'boolean') setAutoRotate(detail.enabled)
    }
    window.addEventListener('bg-autorotate', handler)
    return () => window.removeEventListener('bg-autorotate', handler)
  }, [])

  // 背景索引变化时，通知设置面板同步高亮（含自动轮播）
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('bg-index-sync', { detail: { index: bgIndex } }))
  }, [bgIndex])

  // 幻灯片自动切换（可由设置关闭）
  useEffect(() => {
    if (!autoRotate) return
    const timer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % BG_IMAGES.length)
    }, 8000)
    return () => clearInterval(timer)
  }, [autoRotate])

  // 预加载所有背景图，避免首屏/切换时因未加载而露白
  useEffect(() => {
    BG_IMAGES.forEach((bg) => {
      const img = new Image()
      img.src = bg.url
    })
  }, [])

  // 从 CSS 变量读取遮罩设置（兜底与 index.css 默认值保持一致）
  const getOverlayColor = () => {
    const dark = getComputedStyle(document.documentElement).getPropertyValue('--bg-overlay-dark').trim()
    const light = getComputedStyle(document.documentElement).getPropertyValue('--bg-overlay-light').trim()
    return isDark ? (dark || 'rgba(10,10,15,0.5)') : (light || 'rgba(22,18,30,0.42)')
  }

  const [overlayColor, setOverlayColor] = useState(getOverlayColor)

  // 监听 CSS 变量变化
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
      {/* 深色基底：防止切换/加载时露出浅色底造成白闪 */}
      <div
        className="absolute inset-0 z-[-11]"
        style={{ background: '#0b0b12' }}
      />

      {/* 幻灯片背景 - 只渲染当前和下一张做交叉淡入淡出 */}
      <div className="absolute inset-0 z-[-10]">
        {BG_IMAGES.map((bg, i) => (
          <div
            key={bg.url}
            className="absolute inset-0 transition-opacity duration-[2000ms] ease-in-out"
            style={{
              backgroundImage: `url(${bg.url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: i === bgIndex ? 1 : 0,
            }}
          />
        ))}
      </div>

      {/* 暗色遮罩（深色调，不泛白） */}
      <div
        className="absolute inset-0 z-[-9] transition-all duration-1000"
        style={{ background: overlayColor }}
      />

      {/* 渐变叠加 */}
      <div
        className="absolute inset-0 z-[-7] mix-blend-overlay"
        style={{
          background: 'linear-gradient(-45deg, rgba(100,100,180,0.12), rgba(150,80,180,0.08), rgba(80,120,200,0.1))',
          backgroundSize: '400% 400%',
          animation: 'gradientMove 25s ease infinite',
        }}
      />

      {/* 萤火虫 */}
      <div className="hidden md:block absolute inset-0 z-[-6] overflow-hidden">
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
