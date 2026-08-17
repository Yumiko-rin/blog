/**
 * 说说（Moments）数据源
 * --------------------------------------------------
 * 复制自 https://boke.hiromu.top/moments 的「说说」形式：
 *   - 按日期分组展示（如「8月13日 3 条」）
 *   - 每条含时间戳、心情 emoji（如 开心📷）、正文内容
 *   - 可附图片
 * 说说仅出现在独立的「说说」页面，不会在首页出现（首页只展示文章）。
 */

export interface Shuoshuo {
  /** 唯一 id，用作评论区路径 */
  id: string
  /** 发布时间，格式 YYYY-MM-DD HH:MM:SS */
  date: string
  /** 心情 / 标记 emoji，如 开心📷 */
  mood?: string
  /** 正文（支持换行） */
  content: string
  /** 附图链接（可选） */
  images?: string[]
}

/** 已发表的说说，按时间倒序（最新在前） */
export const SHUOSHUO: Shuoshuo[] = [
  {
    id: '2026-08-13-03',
    date: '2026-08-13 21:30:00',
    mood: '开心📷',
    content:
      '音乐模块终于能完美播放啦，循环 ing 🎧\n今天把网站翻新了好几处：导航栏换成了清爽的实色风格，友链申请也能在「我的申请」里查看了。\n辛苦的一天，晚安～',
  },
  {
    id: '2026-08-13-02',
    date: '2026-08-13 15:40:00',
    content:
      '刚把导航栏从毛玻璃换成了实色风格，看着清爽多了。\n顺便新增了这个「说说」模块，以后碎碎念就发在这里，首页还是只放正经文章～',
  },
  {
    id: '2026-08-13-01',
    date: '2026-08-13 09:12:00',
    mood: '开心📷',
    content: '早上好呀～☀️ 今天天气不错，准备把博客再优化一下，加油！',
  },
]

/**
 * 异步加载说说（后台发布的 + 静态内置的合并）
 * 后台发布的说说排在前面，静态说说作为兜底。
 */
let _cachedShuoshuo: Shuoshuo[] | null = null
let _cacheTime = 0
const CACHE_MS = 5 * 60 * 1000

export async function loadShuoshuo(force = false): Promise<Shuoshuo[]> {
  if (!force && _cachedShuoshuo && Date.now() - _cacheTime < CACHE_MS) {
    return _cachedShuoshuo
  }
  try {
    const res = await fetch('/local-api/shuoshuo')
    if (res.ok) {
      const data = await res.json()
      const kvList: Shuoshuo[] = (data.list || []).map((s: any) => ({
        id: s.id || `s-${Date.now()}`,
        date: s.date || new Date().toISOString().slice(0, 19).replace('T', ' '),
        mood: s.mood || '',
        content: s.content || '',
        images: Array.isArray(s.images) ? s.images : [],
      }))
      // 后台数据即唯一数据源（后台存储已包含内置种子说说），
      // 后台的编辑/删除/新增会实时反映到前台；请求失败才回退静态数据
      _cachedShuoshuo = kvList
      _cacheTime = Date.now()
      return kvList
    }
  } catch { /* ignore, fall back to static */ }
  return SHUOSHUO
}
