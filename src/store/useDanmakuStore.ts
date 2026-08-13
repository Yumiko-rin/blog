import { create } from 'zustand'
import { storage } from '@/utils/storage'

/**
 * 弹幕状态 Store（开关 + 速度）
 * 弹幕的生成与渲染逻辑交给 useDanmaku Hook
 * 注意：弹幕功能已禁用，此 Store 保留供参考
 */
interface DanmakuState {
  /** 弹幕是否开启 */
  enabled: boolean
  /** 速度倍率 0.5~2 */
  speed: number
  setEnabled: (v: boolean) => void
  toggle: () => void
  setSpeed: (s: number) => void
}

export const useDanmakuStore = create<DanmakuState>((set, get) => ({
  enabled: storage.get<boolean>('blog_danmaku_enabled', false),
  speed: storage.get<number>('blog_danmaku_speed', 1),
  setEnabled: (v) => {
    storage.set('blog_danmaku_enabled', v)
    set({ enabled: v })
  },
  toggle: () => get().setEnabled(!get().enabled),
  setSpeed: (s) => {
    const clamped = Math.max(0.5, Math.min(2, s))
    storage.set('blog_danmaku_speed', clamped)
    set({ speed: clamped })
  },
}))
