import { useState, useMemo } from 'react'

interface FestivalAvatarProps {
  size?: number
  src?: string
  className?: string
}

const PARTICLE_COLORS = ['#a855f7', '#ec4899', '#f59e0b', '#06b6d4', '#10b981', '#3b82f6']

export function FestivalAvatar({ size = 80, src, className = '' }: FestivalAvatarProps) {
  const [error, setError] = useState(false)
  const [hovered, setHovered] = useState(false)

  const avatar = src && !error
    ? src
    : 'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%23a855f7"/><stop offset="0.5" stop-color="%23ec4899"/><stop offset="1" stop-color="%23f59e0b"/></linearGradient></defs><rect width="64" height="64" rx="32" fill="url(%23g)"/><text x="32" y="42" font-size="30" text-anchor="middle" fill="white" font-weight="bold">喵</text></svg>`
    )

  const particles = useMemo(() => {
    const items = []
    const count = 6
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2
      items.push({
        x: 50 + Math.cos(angle) * 54,
        y: 50 + Math.sin(angle) * 54,
        delay: (i / count) * 2,
        size: 3 + (i % 3),
        color: PARTICLE_COLORS[i % 6],
      })
    }
    return items
  }, [])

  const orbitRadius = size * 0.54

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size, animation: 'avatarFloat 3s ease-in-out infinite' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 外层光晕脉冲 */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: -8,
          background: 'radial-gradient(circle, rgba(168,85,247,0.2) 0%, rgba(236,72,153,0.12) 50%, transparent 70%)',
          animation: 'avatarPulse 2.5s ease-in-out infinite',
        }}
      />

      {/* 外环：渐变旋转 */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'conic-gradient(from 0deg, #a855f7, #ec4899, #f59e0b, #10b981, #06b6d4, #3b82f6, #a855f7)',
          animation: `avatarSpin ${hovered ? '2s' : '6s'} linear infinite`,
          filter: 'blur(2px)',
          opacity: 0.7,
        }}
      />

      {/* 中环：虚线反向旋转 */}
      <div
        className="absolute inset-[2px] rounded-full pointer-events-none"
        style={{
          border: '1.5px dashed rgba(255,255,255,0.35)',
          animation: `avatarSpinRev ${hovered ? '4s' : '10s'} linear infinite`,
        }}
      />

      {/* 内圈背景遮罩 */}
      <div className="absolute inset-[4px] rounded-full bg-[rgb(var(--bg-primary))]" />

      {/* 头像图片 */}
      <img
        src={avatar}
        alt="avatar"
        loading="lazy"
        decoding="async"
        className="absolute rounded-full object-cover"
        style={{
          inset: 5,
          width: size - 10,
          height: size - 10,
          transition: 'transform 0.3s ease',
          transform: hovered ? 'scale(1.05)' : 'scale(1)',
        }}
        onError={() => setError(true)}
      />

      {/* 环绕粒子（轨道旋转容器 + 粒子淡入淡出） */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ animation: `avatarSpin ${hovered ? '4s' : '8s'} linear infinite` }}
      >
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: '50%',
              top: '50%',
              width: p.size,
              height: p.size,
              background: p.color,
              boxShadow: `0 0 6px ${p.color}`,
              transform: `translate(-50%, -50%) rotate(${(i / 6) * 360}deg) translateY(-${orbitRadius}px)`,
              animation: `particleFade 2s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* 顶部装饰星 */}
      <div
        className="absolute left-1/2 -top-1 -translate-x-1/2 text-[10px] pointer-events-none"
        style={{ animation: 'starTwinkle 1.5s ease-in-out infinite' }}
      >
        ✦
      </div>

      <style>{`
        @keyframes avatarSpin { to { transform: rotate(360deg) } }
        @keyframes avatarSpinRev { to { transform: rotate(-360deg) } }
        @keyframes avatarFloat {
          0%, 100% { transform: translateY(0) }
          50% { transform: translateY(-3px) }
        }
        @keyframes avatarPulse {
          0%, 100% { opacity: 0.4; transform: scale(1) }
          50% { opacity: 0.8; transform: scale(1.08) }
        }
        @keyframes particleFade {
          0%, 100% { opacity: 0.3 }
          50% { opacity: 1 }
        }
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.3; transform: translateX(-50%) scale(0.8) }
          50% { opacity: 1; transform: translateX(-50%) scale(1.2) }
        }
      `}</style>
    </div>
  )
}

export default FestivalAvatar
