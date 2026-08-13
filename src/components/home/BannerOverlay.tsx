import { useState, useEffect } from 'react'

const TYPEWRITER_QUOTES = [
  '用代码编织梦想，用音乐治愈灵魂',
  '那些期待犹如黄金，我不敢让它们落在地上',
  '当我决定去做的时候，那些黄金就不会落在地上',
  '我确实会焦虑，也会难过，有时候甚至会怀疑自己',
  '但我不会垮，我会自己站起来，继续往前走',
  '生命不是要等待暴风雨过去，而是要学会在雨中跳舞',
  '每一个不曾起舞的日子，都是对生命的辜负',
  '世界上只有一种英雄主义，就是看清生活的真相之后依然热爱生活',
]

/**
 * BannerOverlay 首页横幅覆盖层
 * 全屏背景图上的标题和打字机效果
 */
export function BannerOverlay() {
  const [displayText, setDisplayText] = useState('')
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentQuote = TYPEWRITER_QUOTES[quoteIndex]

    const timer = setInterval(() => {
      if (!isDeleting) {
        if (displayText.length < currentQuote.length) {
          setDisplayText(currentQuote.slice(0, displayText.length + 1))
        } else {
          setTimeout(() => setIsDeleting(true), 2000)
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText(displayText.slice(0, -1))
        } else {
          setIsDeleting(false)
          setQuoteIndex((prev) => (prev + 1) % TYPEWRITER_QUOTES.length)
        }
      }
    }, isDeleting ? 50 : 100)

    return () => clearInterval(timer)
  }, [displayText, isDeleting, quoteIndex])

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
      <h1 className="text-5xl md:text-7xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] mb-4">
        喵音小筑
      </h1>
      <p className="text-lg md:text-xl text-white/80 font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
        {displayText}
        <span className="animate-pulse text-white/60">|</span>
      </p>
    </div>
  )
}

export default BannerOverlay
