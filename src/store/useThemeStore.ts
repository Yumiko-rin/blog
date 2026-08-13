import { create } from 'zustand'
import type { ThemeMode } from '@/types'
import { storage, STORAGE_KEYS } from '@/utils/storage'

/**
 * 主题状态 Store（亮/暗）
 * 实际的 DOM class 切换由 useTheme Hook 执行
 */
interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggle: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: storage.get<ThemeMode>(STORAGE_KEYS.theme, 'light'),
  setMode: (mode) => {
    storage.set(STORAGE_KEYS.theme, mode)
    set({ mode })
  },
  toggle: () => {
    const next = get().mode === 'light' ? 'dark' : 'light'
    get().setMode(next)
  },
}))
