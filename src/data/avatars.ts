/**
 * 二次元头像系统
 * --------------------------------------------------
 * 头像源：https://www.dmoe.cc 随机二次元图片接口（真实动漫插画，非 AI 生成）。
 * 已预先下载 24 张到本地 public/avatars/dmoe_01~24.jpg，
 * 每次进入站点从池中「随机」取一张，保证头像不一样，且不依赖外网运行时。
 */

const AVATAR_FILES = Array.from(
  { length: 24 },
  (_, i) => `/avatars/dmoe_${String(i + 1).padStart(2, '0')}.jpg`
)

/** Fisher-Yates 洗牌，保证随机结果均匀 */
function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * 获取随机头像（异步版本，保持与原 API 兼容）
 * 每次调用都从本地池中随机抽取一张真实二次元头像
 */
export async function getRandomAvatarAsync(): Promise<string> {
  const pool = shuffleArray(AVATAR_FILES)
  return pool[0]
}

/**
 * 获取随机头像（同步版本）
 */
export function getRandomAvatar(): string {
  const pool = shuffleArray(AVATAR_FILES)
  return pool[0]
}

/* ================= 当前头像（跨页面一致） ================= */
/**
 * 首页 ProfileCard 与「我的」页面共用同一张头像：
 * 首次进入随机抽取并存入 localStorage，后续页面读取同一值，
 * 保证「我的模块」头像与首页头像一致；每次刷新浏览器会重新随机。
 */
const CURRENT_KEY = 'blog_current_avatar'

export function getCurrentAvatar(): string {
  try {
    const saved = localStorage.getItem(CURRENT_KEY)
    if (saved && AVATAR_FILES.includes(saved)) return saved
  } catch { /* ignore */ }
  const picked = getRandomAvatar()
  try {
    localStorage.setItem(CURRENT_KEY, picked)
  } catch { /* ignore */ }
  return picked
}

/** 兜底头像（本地真实二次元图片） */
export const FALLBACK_AVATAR = '/avatars/dmoe_01.jpg'

/** 头像池导出，供需要全列表的组件使用 */
export const AVATAR_POOL = [...AVATAR_FILES]
