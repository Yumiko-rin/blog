import { useEffect } from 'react'
import { useThemeStore } from '@/store/useThemeStore'

/**
 * 主题 Hook
 * 职责：监听 store.mode，切换 <html> 的 dark class，实现真实主题切换
 * UI 组件只需读取 useThemeStore，无需关心 DOM 操作
 */
export function useTheme() {
  const mode = useThemeStore((s) => s.mode)
  const toggle = useThemeStore((s) => s.toggle)
  const setMode = useThemeStore((s) => s.setMode)

  useEffect(() => {
    const root = document.documentElement
    if (mode === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    // 同步配色方案，适配系统 UI
    root.style.colorScheme = mode
  }, [mode])

  return { mode, toggle, setMode }
}
