import { useState, useCallback, useRef, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { playClickSound } from '@/utils/sounds'

/**
 * LikeHeartAnimation 点赞爱心动画
 * 点击点赞按钮时触发心形粒子飞溅动画
 * 使用 localStorage 持久化点赞状态
 */

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  scale: number
}

interface LikeHeartAnimationProps {
  articleId: string
  baseLikes: number
}

export function LikeHeartAnimation({ articleId, baseLikes }: LikeHeartAnimationProps) {
  const [liked, setLiked] = useState(false)
  const [particles, setParticles] = useState<Particle[]>([])
  const particleIdRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('liked_posts')
      const set = raw ? new Set<string>(JSON.parse(raw)) : new Set<string>()
      setLiked(set.has(articleId))
    } catch { /* ignore */ }
  }, [articleId])

  const createParticles = useCallback(() => {
    const newParticles: Particle[] = []
    const count = 8 + Math.floor(Math.random() * 4)
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3
      const speed = 60 + Math.random() * 80
      newParticles.push({
        id: particleIdRef.current++,
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        rotation: Math.random() * 360,
        scale: 0.6 + Math.random() * 0.6,
      })
    }
    setParticles(prev => [...prev, ...newParticles])

    // 清理粒子
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)))
    }, 1200)
  }, [])

  const toggleLike = useCallback(() => {
    if (liked) return // 已点赞不再触发

    playClickSound()
    setLiked(true)
    createParticles()

    try {
      const raw = localStorage.getItem('liked_posts')
      const set = raw ? new Set<string>(JSON.parse(raw)) : new Set<string>()
      set.add(articleId)
      localStorage.setItem('liked_posts', JSON.stringify([...set]))
    } catch { /* ignore */ }
  }, [liked, articleId, createParticles])

  const displayLikes = baseLikes + (liked ? 1 : 0)

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={toggleLike}
        className={`flex items-center gap-1 transition-all duration-300 ${
          liked
            ? 'text-pink-500 scale-105'
            : 'hover:text-pink-500 active:scale-90'
        }`}
      >
        <Heart
          size={14}
          className={`transition-all duration-300 ${liked ? 'fill-pink-500' : ''} ${
            liked ? 'like-heart-pop' : ''
          }`}
        />
        <span className="text-sm">{displayLikes}</span>
      </button>

      {/* 粒子动画 */}
      <div className="absolute left-0 top-0 pointer-events-none z-50">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute"
            style={{
              left: `${p.x}px`,
              top: `${p.y}px`,
              animation: `heart-fly 1.2s ease-out forwards`,
              ['--vx' as string]: `${p.vx}px`,
              ['--vy' as string]: `${p.vy}px`,
              ['--rot' as string]: `${p.rotation}deg`,
              ['--scale' as string]: String(p.scale),
            }}
          >
            <Heart size={16} className="fill-pink-500 text-pink-500" />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes heart-fly {
          0% {
            transform: translate(0, 0) rotate(0deg) scale(var(--scale));
            opacity: 1;
          }
          100% {
            transform: translate(var(--vx), var(--vy)) rotate(var(--rot)) scale(0);
            opacity: 0;
          }
        }
        .like-heart-pop {
          animation: heart-pop 0.4s ease-out;
        }
        @keyframes heart-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.5); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

export default LikeHeartAnimation
