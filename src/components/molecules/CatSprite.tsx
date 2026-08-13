import { useState } from 'react'

/**
 * CatSprite 像素猫互动组件
 * --------------------------------------------------
 * - 像素风猫咪精灵图动画
 * - 点击/悬停切换状态（idle/petted/thinking）
 * - 固定右下角，桌面端显示
 * - 参考站的互动猫咪功能
 */
export function CatSprite() {
  const [state, setState] = useState<'idle' | 'petted' | 'thinking'>('idle')
  const [showBubble, setShowBubble] = useState(false)

  const handleClick = () => {
    setState('petted')
    setShowBubble(true)
    setTimeout(() => {
      setState('idle')
      setShowBubble(false)
    }, 2000)
  }

  const handleMouseEnter = () => {
    if (state === 'idle') {
      setState('thinking')
    }
  }

  const handleMouseLeave = () => {
    if (state === 'thinking') {
      setState('idle')
    }
  }

  const bubbleTexts = ['喵～', 'nya~', '咕噜咕噜', '主人好～', '想要小鱼干']
  const [bubbleText, setBubbleText] = useState(bubbleTexts[0])

  const handleClickWithBubble = () => {
    setBubbleText(bubbleTexts[Math.floor(Math.random() * bubbleTexts.length)])
    handleClick()
  }

  return (
    <div className="hidden md:flex fixed bottom-20 right-20 z-[50] flex-col items-center group">
      {/* 对话气泡 */}
      {showBubble && (
        <div className="mb-3 px-4 py-2 rounded-2xl bg-white/90 dark:bg-slate-800/90
          backdrop-blur-sm border border-white/40 dark:border-white/10
          shadow-lg text-sm font-bold text-slate-700 dark:text-slate-200
          animate-fade-in relative">
          {bubbleText}
          {/* 气泡箭头 */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3
            bg-white/90 dark:bg-slate-800/90 rotate-45 border-r border-b
            border-white/40 dark:border-white/10" />
        </div>
      )}

      {/* 猫咪精灵图 */}
      <div
        className="relative w-[100px] h-[100px] cursor-pointer
          hover:scale-110 active:scale-95 transition-transform duration-300"
        onClick={handleClickWithBubble}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title="摸摸猫猫～"
      >
        {/* CSS 精灵图动画 */}
        <style>{`
          .cat-sprite {
            width: 100%;
            height: 100%;
            background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="80" font-size="80">🐱</text></svg>');
            background-size: contain;
            background-repeat: no-repeat;
            image-rendering: pixelated;
          }
          .cat-idle { animation: catIdle 1.2s infinite; }
          .cat-petted { animation: catPetted 0.8s infinite; }
          .cat-thinking { animation: catIdle 0.6s infinite; }
          @keyframes catIdle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }
          @keyframes catPetted {
            0%, 100% { transform: scale(1) rotate(0deg); }
            25% { transform: scale(1.1) rotate(-5deg); }
            75% { transform: scale(1.1) rotate(5deg); }
          }
        `}</style>
        <div className={`cat-sprite drop-shadow-2xl cat-${state}`} />

        {/* 爱心粒子（被抚摸时） */}
        {state === 'petted' && (
          <>
            <span className="absolute -top-2 left-1/4 text-lg animate-float-slow" style={{ animationDelay: '0s' }}>❤️</span>
            <span className="absolute -top-1 right-1/4 text-sm animate-float-slow" style={{ animationDelay: '0.3s' }}>💕</span>
          </>
        )}
      </div>
    </div>
  )
}
