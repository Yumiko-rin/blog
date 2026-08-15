import { useEffect, useRef, useState } from 'react'

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return

    let raf = 0
    let mx = 0, my = 0
    let rx = 0, ry = 0

    const onMove = (e: MouseEvent) => {
      mx = e.clientX
      my = e.clientY
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mx}px, ${my}px)`
      }
      setHidden(false)
    }

    const onDown = () => ringRef.current?.classList.add('cursor-ring-active')
    const onUp = () => ringRef.current?.classList.remove('cursor-ring-active')
    const onLeave = () => setHidden(true)
    const onEnter = () => setHidden(false)

    const tick = () => {
      rx += (mx - rx) * 0.15
      ry += (my - ry) * 0.15
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${rx}px, ${ry}px)`
      }
      raf = requestAnimationFrame(tick)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('mouseenter', onEnter)
    raf = requestAnimationFrame(tick)

    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('mouseenter', onEnter)
      cancelAnimationFrame(raf)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) return null

  return (
    <>
      <style>{`
        .cursor-dot {
          position: fixed; top: 0; left: 0; width: 8px; height: 8px;
          margin: -4px 0 0 -4px; border-radius: 50%; pointer-events: none;
          background: rgb(var(--accent)); z-index: 99999;
          transition: opacity 0.2s; mix-blend-mode: difference;
        }
        .cursor-ring {
          position: fixed; top: 0; left: 0; width: 32px; height: 32px;
          margin: -16px 0 0 -16px; border-radius: 50%; pointer-events: none;
          border: 1.5px solid rgb(var(--accent) / 0.4); z-index: 99998;
          transition: opacity 0.2s, width 0.15s, height 0.15s, margin 0.15s, border-color 0.15s;
        }
        .cursor-ring-active {
          width: 48px; height: 48px; margin: -24px 0 0 -24px;
          border-color: rgb(var(--accent) / 0.7);
        }
      `}</style>
      <div ref={dotRef} className="cursor-dot" style={{ opacity: hidden ? 0 : 1 }} />
      <div ref={ringRef} className="cursor-ring" style={{ opacity: hidden ? 0 : 1 }} />
    </>
  )
}

export default CustomCursor
