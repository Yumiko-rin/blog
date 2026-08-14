import { useState } from 'react'

interface FestivalAvatarProps {
  size?: number
  src?: string
  className?: string
}

export function FestivalAvatar({ size = 64, src, className = '' }: FestivalAvatarProps) {
  const [error, setError] = useState(false)
  const avatar = src && !error
    ? src
    : 'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%23a855f7"/><stop offset="1" stop-color="%23ec4899"/></linearGradient></defs><rect width="64" height="64" rx="32" fill="url(%23g)"/><text x="32" y="40" font-size="28" text-anchor="middle" fill="white">喵</text></svg>`
    )

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* 旋转光环 */}
      <div
        className="absolute inset-0 rounded-full opacity-60"
        style={{
          background: 'conic-gradient(from 0deg, #a855f7, #ec4899, #f59e0b, #10b981, #06b6d4, #3b82f6, #a855f7)',
          animation: 'avatarSpin 4s linear infinite',
          filter: 'blur(4px)',
        }}
      />
      {/* 内圈遮罩 */}
      <div className="absolute inset-[3px] rounded-full bg-[rgb(var(--bg-primary))]" />
      {/* 头像 */}
      <img
        src={avatar}
        alt="avatar"
        className="absolute inset-[4px] rounded-full object-cover"
        style={{ width: size - 8, height: size - 8 }}
        onError={() => setError(true)}
      />
      <style>{`
        @keyframes avatarSpin {
          to { transform: rotate(360deg) }
        }
      `}</style>
    </div>
  )
}

export default FestivalAvatar
