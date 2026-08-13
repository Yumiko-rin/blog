import type { Article } from '@/types'

/**
 * 文章浏览 / 点赞指标（首页卡片与详情页共享同一数据源）
 * --------------------------------------------------
 * 2026-08-13 重置后，浏览数与点赞数由「基础值 + 本地累计」组成：
 *   - 浏览量：article.views（静态基础）+ localStorage 本地浏览计数（进入详情页 +1）
 *   - 点赞数：article.likes（静态基础）+ 本地是否已点赞（liked_posts）
 * 首页 PostCard 与详情页 ArticleDetail 都调用本工具，保证两处数字始终一致。
 */

const VIEWS_KEY = 'blog_article_views_v2'
const LIKED_KEY = 'liked_posts'

/** 读取本地浏览计数（按文章 id） */
export function getLocalViews(id: string): number {
  try {
    const map = JSON.parse(localStorage.getItem(VIEWS_KEY) || '{}')
    return typeof map[id] === 'number' ? map[id] : 0
  } catch {
    return 0
  }
}

/** 详情页进入时计一次浏览，返回累计值 */
export function bumpArticleViews(id: string): number {
  try {
    const map = JSON.parse(localStorage.getItem(VIEWS_KEY) || '{}')
    map[id] = (map[id] || 0) + 1
    localStorage.setItem(VIEWS_KEY, JSON.stringify(map))
    return map[id]
  } catch {
    return 1
  }
}

/** 当前用户是否已点赞该文章 */
export function isArticleLiked(id: string): boolean {
  try {
    const raw = localStorage.getItem(LIKED_KEY)
    return raw ? new Set<string>(JSON.parse(raw)).has(id) : false
  } catch {
    return false
  }
}

/** 文章显示浏览量（与详情页一致） */
export function getArticleViews(article: Article): number {
  return article.views + getLocalViews(article.id)
}

/** 文章显示点赞数（与详情页一致） */
export function getArticleLikes(article: Article): number {
  return article.likes + (isArticleLiked(article.id) ? 1 : 0)
}
