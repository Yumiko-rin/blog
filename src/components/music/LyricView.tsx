import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * LyricView 流动歌词组件（Apple Music 风格）
 * --------------------------------------------------
 * - 当前行放大 + 渐变色高亮，居中显示
 * - 上下行逐渐变小、变透明（视差效果）
 * - 平滑滚动到当前歌词
 * - 点击歌词行可跳转到对应时间
 * - 上下渐变遮罩营造淡入淡出效果
 */
interface LyricViewProps {
  lyric?: [number, string][]
  currentTime: number
  onSeek?: (time: number) => void
}

export function LyricView({ lyric, currentTime, onSeek }: LyricViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLParagraphElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)

  // currentTime 为秒，歌词时间戳为毫秒
  const tMs = currentTime * 1000

  // 计算当前应高亮的歌词行索引
  useEffect(() => {
    if (!lyric || lyric.length === 0) return
    let idx = 0
    for (let i = 0; i < lyric.length; i++) {
      if (lyric[i][0] <= tMs) idx = i
      else break
    }
    setActiveIdx(idx)
  }, [tMs, lyric])

  // 当前行变化时，平滑滚动使其居中
  useEffect(() => {
    const container = containerRef.current
    const active = activeRef.current
    if (!container || !active) return

    const containerRect = container.getBoundingClientRect()
    const activeRect = active.getBoundingClientRect()
    const scrollTop = container.scrollTop

    // 计算目标位置：让当前行居中
    const targetScrollTop =
      scrollTop +
      (activeRect.top - containerRect.top) -
      (containerRect.height / 2) +
      (activeRect.height / 2)

    container.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth',
    })
  }, [activeIdx])

  // 点击歌词跳转
  const handleLyricClick = useCallback(
    (time: number) => {
      if (onSeek) {
        onSeek(time / 1000) // 转换为秒
      }
    },
    [onSeek]
  )

  // 无歌词空状态
  if (!lyric || lyric.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">🎵</div>
          <p className="text-sm text-white/40">暂无歌词</p>
          <p className="text-xs text-white/30 mt-1">享受音乐本身吧～</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full overflow-y-auto scrollbar-hide"
      style={{
        maskImage:
          'linear-gradient(to bottom, transparent 0%, #000 15%, #000 85%, transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(to bottom, transparent 0%, #000 15%, #000 85%, transparent 100%)',
      }}
    >
      {/* 上下留白，使首尾歌词也能滚动到容器中央 */}
      <div className="flex flex-col gap-1 py-[40%]">
        {lyric.map(([time, text], i) => {
          const isActive = i === activeIdx
          const distance = Math.abs(i - activeIdx)

          // 视差效果：根据距离计算样式
          let opacity = 0.15
          let scale = 0.85
          let fontWeight = 400

          if (distance === 0) {
            opacity = 1
            scale = 1.1
            fontWeight = 700
          } else if (distance === 1) {
            opacity = 0.5
            scale = 0.95
            fontWeight = 500
          } else if (distance === 2) {
            opacity = 0.3
            scale = 0.9
            fontWeight = 400
          }

          return (
            <p
              key={`${time}-${i}`}
              ref={isActive ? activeRef : undefined}
              onClick={() => handleLyricClick(time)}
              className="max-w-lg text-center transition-all duration-500 ease-out cursor-pointer
                select-none px-4"
              style={{
                opacity,
                transform: `scale(${scale})`,
                fontWeight,
                color: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
                textShadow: isActive
                  ? '0 0 20px rgba(99,102,241,0.5), 0 2px 10px rgba(0,0,0,0.3)'
                  : 'none',
              }}
            >
              {text}
            </p>
          )
        })}
      </div>
    </div>
  )
}
