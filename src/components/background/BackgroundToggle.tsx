import { Sparkles, Image } from 'lucide-react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { IconButton } from '@/components/atoms/IconButton'
import { DynamicBackground } from './DynamicBackground'

/**
 * BackgroundToggle —— 背景管理器（已弃用）
 * 背景现在始终动态，此文件保留供参考
 */
export function BackgroundToggle() {
  const [isDynamic, setIsDynamic] = useLocalStorage<boolean>('blog_bg_dynamic', true)

  const handleToggle = () => {
    setIsDynamic((prev) => !prev)
  }

  return (
    <>
      <DynamicBackground />

      <div className="fixed bottom-6 right-6 z-50">
        <IconButton
          active={isDynamic}
          onClick={handleToggle}
          size="md"
          aria-label={isDynamic ? '切换为静态背景' : '切换为动态背景'}
          title={isDynamic ? '当前：动态背景' : '当前：静态背景'}
          className="glass-strong shadow-lg shadow-black/10"
        >
          {isDynamic ? (
            <Sparkles size={18} />
          ) : (
            <Image size={18} className="opacity-70" />
          )}
        </IconButton>
      </div>
    </>
  )
}

export default BackgroundToggle
