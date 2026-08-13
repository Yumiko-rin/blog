/**
 * 全局类型定义
 * 统一管理音乐、文章、评论、友链等核心数据结构
 */

/* ============ 音乐相关 ============ */
/** 单首歌曲 */
export interface Song {
  id: string | number
  name: string         // 歌曲名
  artist: string       // 歌手
  album?: string       // 专辑
  cover: string        // 封面 URL
  src: string          // 音频地址
  duration?: number    // 时长（秒），可选
  /** 歌词数组：[时间戳(ms), 歌词文本] */
  lyric?: [number, string][]
  /** 网易云歌曲 ID（用于刷新播放地址 / 歌词） */
  neteaseId?: number
  /** 歌词源地址（LRC） */
  lrcUrl?: string
}

/** 歌单（网易云风格） */
export interface Playlist {
  id: string | number
  name: string         // 歌单名
  cover: string        // 歌单封面
  description?: string // 歌单描述
  songs: Song[]
}

/** 播放模式 */
export type PlayMode = 'list' | 'single' | 'random'

/* ============ 博客文章相关 ============ */
/** 文章（字段对齐 boke.hiromu.top / Kirameku） */
export interface Article {
  /** 使用 slug 作为 id，保证 /article/:id 与源站 /posts/:slug 对齐 */
  id: string
  slug: string          // 源站 slug
  title: string
  excerpt: string       // 摘要（源站 description）
  content: string       // Markdown 正文
  cover?: string        // 封面图
  category: string      // 分类
  tags: string[]
  date: string          // 发布日期 YYYY-MM-DD（由 published_at 裁剪）
  views: number         // 浏览量
  likes: number         // 点赞数
  readingTime: number   // 阅读时长（分钟）
  isPinned: boolean     // 是否置顶
  wordCount?: number    // 字数
}

/* ============ 评论相关 ============ */
/** 访客评论 */
export interface Comment {
  id: string
  articleId: string
  name: string          // 昵称
  avatar?: string       // 头像（可选，用默认）
  content: string
  date: string          // 评论时间
}

/* ============ 友链相关 ============ */
/** 友链站点 */
export interface Friend {
  id: string
  name: string          // 站点名称
  url: string           // 站点地址
  avatar: string        // 站点头像
  description: string   // 站点描述
  tag?: string          // 分类标签（如「博客」）
}

/* ============ 弹幕相关 ============ */
/** 单条弹幕 */
export interface DanmakuItem {
  id: number
  text: string
  /** 轨道索引（0 = 顶部） */
  track: number
  /** 颜色 */
  color?: string
  /** 速度倍率 */
  speed: number
}

/* ============ 主题相关 ============ */
export type ThemeMode = 'light' | 'dark'
