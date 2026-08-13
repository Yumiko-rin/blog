import { useEffect, useState, useCallback } from 'react'
import { useDanmaku } from '@/hooks/useDanmaku'
import type { DanmakuItem } from '@/types'

/**
 * 弹幕滚动动画关键帧
 */
const DANMAKU_KEYFRAMES = `
@keyframes danmaku-scroll {
  from { transform: translateX(100vw); }
  to   { transform: translateX(-100%); }
}
`

const BASE_SPEED = 100
const TRACK_TOP_START = 10
const TRACK_TOP_END = 75

interface DanmakuItemViewProps {
  item: DanmakuItem
  containerWidth: number
  maxTracks: number
  onEnd: () => void
}

function DanmakuItemView({ item, containerWidth, maxTracks, onEnd }: DanmakuItemViewProps) {
  const duration = Math.max(2, containerWidth / (item.speed * BASE_SPEED))
  const trackRatio = maxTracks > 1 ? item.track / (maxTracks - 1) : 0
  const topPercent = TRACK_TOP_START + trackRatio * (TRACK_TOP_END - TRACK_TOP_START)

  return (
    <div
      className="absolute whitespace-nowrap text-sm font-medium select-none"
      style={{
        top: `${topPercent}%`,
        left: 0,
        color: item.color ?? '#6366f1',
        textShadow: '1px 1px 2px rgba(255,255,255,0.8), -1px -1px 2px rgba(255,255,255,0.8)',
        animation: `danmaku-scroll ${duration}s linear forwards`,
        opacity: 0.7,
      }}
      onAnimationEnd={onEnd}
    >
      {item.text}
    </div>
  )
}

export function DanmakuLayer() {
  const { items, enabled, remove, maxTracks } = useDanmaku()
  const [containerWidth, setContainerWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1920
  )

  const handleResize = useCallback(() => {
    setContainerWidth(window.innerWidth)
  }, [])

  useEffect(() => {
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [handleResize])

  if (!enabled) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden" aria-hidden="true">
      <style>{DANMAKU_KEYFRAMES}</style>
      {items.map((item) => (
        <DanmakuItemView
          key={item.id}
          item={item}
          containerWidth={containerWidth}
          maxTracks={maxTracks}
          onEnd={() => remove(item.id)}
        />
      ))}
    </div>
  )
}

export default DanmakuLayer
