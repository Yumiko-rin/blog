import { useState } from 'react'
import { GlassCard } from '@/components/molecules/GlassCard'
import { SocialLinks } from '@/components/molecules/SocialLinks'
import { getRandomAvatar, FALLBACK_AVATAR } from '@/data/avatars'

/**
 * About 关于我页面
 * --------------------------------------------------
 * - 个人介绍
 * - 技术栈展示
 * - 联系方式（SocialLinks）
 * - 毛玻璃卡片布局
 */
export default function About() {
  const [avatar] = useState(() => getRandomAvatar())
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* 页面标题 */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">关于我</h1>
      </header>

      <div className="flex flex-col gap-6">
        {/* 个人介绍 */}
        <GlassCard className="p-6 sm:p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            {/* 头像 */}
            <img
              src={avatar}
              alt="Avatar"
              onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_AVATAR }}
              className="h-28 w-28 shrink-0 rounded-full object-cover ring-4 ring-accent/20"
            />

            <div>
              <h2 className="text-xl font-bold">喵音</h2>
              <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">
                前端开发 · 音乐爱好者 · 猫娘控
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[rgb(var(--text-secondary))]">
                喜欢用代码创造美好的事物，用音乐治愈疲惫的心灵。
                这个博客记录了我在前端开发路上的学习与思考，
                也希望能和更多志同道合的朋友交流～
              </p>
            </div>
          </div>
        </GlassCard>

        {/* 技术栈 */}
        <GlassCard className="p-6 sm:p-8">
          <h2 className="mb-4 font-bold">技术栈</h2>
          <div className="flex flex-wrap gap-2">
            {[
              'React', 'TypeScript', 'Vite', 'TailwindCSS',
              'Node.js', 'Zustand', 'Framer Motion',
              'CSS3', 'HTML5', 'Git',
            ].map((tech) => (
              <span
                key={tech}
                className="glass rounded-full px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent/15 hover:text-accent"
              >
                {tech}
              </span>
            ))}
          </div>
        </GlassCard>

        {/* 联系方式 */}
        <GlassCard className="p-6 sm:p-8">
          <h2 className="mb-4 font-bold">联系我</h2>
          <p className="mb-4 text-sm text-[rgb(var(--text-secondary))]">
            通过以下社交媒体找到我，欢迎交流～
          </p>
          <SocialLinks />
        </GlassCard>

        {/* 站点说明 */}
        <GlassCard className="p-6 sm:p-8">
          <h2 className="mb-4 font-bold">关于本站</h2>
          <ul className="space-y-2 text-sm text-[rgb(var(--text-secondary))]">
            <li>• 框架：React 18 + TypeScript + Vite</li>
            <li>• 样式：TailwindCSS + 自定义毛玻璃组件</li>
            <li>• 状态管理：Zustand</li>
            <li>• 路由：React Router v6</li>
            <li>• 特色功能：全局音乐播放器、弹幕系统、动态背景</li>
          </ul>
        </GlassCard>
      </div>
    </div>
  )
}
