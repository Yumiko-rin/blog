import { useEffect, useRef, useState } from 'react'
import { useMusicStore } from '@/store/useMusicStore'

interface AudioVisualizerProps {
  height?: number
  barCount?: number
  className?: string
}

export function AudioVisualizer({ height = 40, barCount = 32, className = '' }: AudioVisualizerProps) {
  const isPlaying = useMusicStore((s) => s.isPlaying)
  const [bars, setBars] = useState<number[]>(() => Array(barCount).fill(0.1))
  const rafRef = useRef(0)

  useEffect(() => {
    if (!isPlaying) {
      setBars(Array(barCount).fill(0.08))
      cancelAnimationFrame(rafRef.current)
      return
    }

    const tick = () => {
      setBars((prev) => {
        const next = new Array(barCount)
        for (let i = 0; i < barCount; i++) {
          const center = barCount / 2
          const dist = Math.abs(i - center) / center
          const base = (1 - dist * 0.6) * (0.3 + Math.random() * 0.7)
          const smooth = prev[i] * 0.6 + base * 0.4
          next[i] = Math.max(0.05, Math.min(1, smooth))
        }
        return next
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying, barCount])

  return (
    <div
      className={`flex items-end justify-center gap-0.5 ${className}`}
      style={{ height }}
    >
      {bars.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-full transition-[height] duration-75"
          style={{
            height: `${v * 100}%`,
            background: `linear-gradient(to top, rgb(var(--accent) / 0.3), rgb(var(--accent)))`,
            minHeight: 2,
          }}
        />
      ))}
    </div>
  )
}

export default AudioVisualizer
