import { useEffect, useState } from 'react'

export function LoadingAnimation() {
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const duration = 1200

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setProgress(Math.round(t * 100))
      if (t < 1) raf = requestAnimationFrame(tick)
      else setTimeout(() => setDone(true), 300)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  if (done) return null

  return (
    <div
      className="fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-[#0b0b12] transition-opacity duration-300"
      style={{ opacity: progress >= 100 ? 0 : 1 }}
    >
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-accent/20" />
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin"
          style={{ animationDuration: '0.8s' }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">🎵</div>
      </div>
      <div className="w-40 h-1 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-accent transition-all duration-100 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-3 text-xs text-white/40 tabular-nums">{progress}%</div>
    </div>
  )
}

export default LoadingAnimation
