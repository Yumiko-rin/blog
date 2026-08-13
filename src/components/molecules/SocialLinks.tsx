import { SOCIAL_LINKS } from '@/constants/social'

/**
 * SocialLinks 复合组件
 * 社交媒体图标组，点击新开页面跳转
 * 由常量数据驱动，无内部状态
 */
interface SocialLinksProps {
  className?: string
  iconSize?: number
}

export function SocialLinks({ className = '', iconSize = 20 }: SocialLinksProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {SOCIAL_LINKS.map((link) => {
        const Icon = link.icon
        return (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            title={link.name}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full glass
              transition-all duration-200 hover:scale-110 hover:text-accent"
            style={{ color: link.color }}
          >
            <Icon size={iconSize} />
          </a>
        )
      })}
    </div>
  )
}
