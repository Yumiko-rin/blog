import { useRef, useCallback } from 'react'

/**
 * Slider 苹果液态玻璃风格滑块
 */
interface SliderProps {
  value: number
  max: number
  onChange: (value: number) => void
  onChangeEnd?: (value: number) => void
  className?: string
  height?: number
}

export function Slider({
  value,
  max,
  onChange,
  onChangeEnd,
  className = '',
  height = 4,
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0

  const calcValue = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track) return 0
      const rect = track.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      return ratio * max
    },
    [max]
  )

  const handlePointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    onChange(calcValue(e.clientX))
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    onChange(calcValue(e.clientX))
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    draggingRef.current = false
    const finalVal = calcValue(e.clientX)
    onChangeEnd?.(finalVal)
  }

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`group relative w-full cursor-pointer flex items-center ${className}`}
      style={{ height: `${height + 16}px` }}
    >
      {/* 轨道 */}
      <div
        className="w-full rounded-full bg-black/8 dark:bg-white/10 transition-all"
        style={{ height: `${height}px` }}
      >
        {/* 已填充部分 */}
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-blue-400 transition-[width] duration-75"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* 拖拽手柄 */}
      <div
        className="absolute w-3.5 h-3.5 rounded-full bg-white shadow-lg shadow-black/15
          border border-black/10
          opacity-0 group-hover:opacity-100 group-active:opacity-100
          transition-all duration-200 scale-75 group-hover:scale-100"
        style={{ left: `calc(${percent}% - 7px)` }}
      />
    </div>
  )
}
