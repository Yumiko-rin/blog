/**
 * localStorage 安全封装
 * 统一处理 JSON 序列化、异常捕获、SSR 兼容
 */

export const storage = {
  /** 读取并反序列化 */
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return fallback
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  },

  /** 序列化并写入 */
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* 配额超限或隐私模式，静默失败 */
    }
  },

  /** 删除单个键 */
  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch {
      /* noop */
    }
  },
}

/** 持久化键名集中管理，避免拼写错误 */
export const STORAGE_KEYS = {
  theme: 'blog_theme',
  volume: 'blog_volume',
  playMode: 'blog_play_mode',
  currentSongId: 'blog_current_song',
  playHistory: 'blog_play_history',
  comments: 'blog_comments',
  bgSettings: 'blog_bg_settings',
  friendApplications: 'blog_friend_applications',
} as const
