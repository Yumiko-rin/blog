import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

/**
 * IconButton 按钮
 */
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  active?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_MAP = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, active = false, size = 'md', className = '', onClick, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className={`inline-flex items-center justify-center rounded-full transition-all duration-200
          hover:scale-110 active:scale-95 disabled:opacity-40 disabled:hover:scale-100
          ${SIZE_MAP[size]}
          ${active
            ? 'text-accent bg-accent/10'
            : 'text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] hover:bg-black/5 dark:hover:bg-white/10'
          }
          ${className}`}
        {...rest}
      >
        {children}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'
