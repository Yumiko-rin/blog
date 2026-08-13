import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { IconButton } from './IconButton'

/**
 * ThemeToggle 原子组件
 * 主题切换按钮，点击在亮/暗间切换
 * 逻辑来自 useTheme Hook，组件本身无业务逻辑
 */
export function ThemeToggle() {
  const { mode, toggle } = useTheme()
  return (
    <IconButton onClick={toggle} aria-label="切换主题" title={mode === 'light' ? '切换暗色' : '切换亮色'}>
      {mode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
    </IconButton>
  )
}
