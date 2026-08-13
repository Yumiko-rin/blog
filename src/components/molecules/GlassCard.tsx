import type { ReactNode } from 'react'

/**
 * GlassCard 苹果液态玻璃卡片
 * --------------------------------------------------
 * 全站统一的液态玻璃效果容器
 */
interface GlassCardProps {
  children: ReactNode
  className?: string
  strong?: boolean
  onClick?: () => void
}

export function GlassCard({ children, className = '', strong = false, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={`${strong ? 'glass-strong' : 'card'} rounded-3xl
        ${onClick ? 'cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-xl' : ''}
        ${className}`}
    >
      {children}
    </div>
  )
}
