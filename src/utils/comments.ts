/**
 * 评论数据层（自建 local-api 主源 + localStorage 兜底）
 * --------------------------------------------------
 * 原 Waline (vercel.app) 国内不可达，已移除 Waline 依赖。
 * 评论存储走同源 /local-api/comments（server-data/comments.json），
 * local-api 不可用时降级 localStorage，保证前台始终可用。
 * 无需登录/验证码，填昵称即可评论；viewerToken 标识身份用于点赞/删除。
 */

export interface CommentNode {
  id: string
  path: string
  nick: string
  link: string
  content: string
  avatar: string
  parentId: string
  replyTo: string
  createdAt: string
  likes: number
  liked: boolean
  mine: boolean
  admin: boolean
  floor?: number
  children?: CommentNode[]
}

export interface CommentPage {
  total: number
  roots: number
  page: number
  pageSize: number
  totalPages: number
  sort: SortKey
  comments: CommentNode[]
  source: 'server' | 'local'
}

export interface CommentInput {
  path: string
  nick: string
  mail?: string
  link?: string
  content: string
  parentId?: string
}

export interface Identity {
  nick: string
  mail: string
  link: string
}

export type SortKey = 'new' | 'hot'

const API = '/local-api/comments'
const TOKEN_KEY = 'blog_comment_token'
const IDENTITY_KEY = 'blog_comment_identity'
const LOCAL_KEY = 'blog_comments_v2'

/* 头像池：混合多种风格，增加多样性 */
const AVATAR_POOL: string[] = [
  ...Array.from({ length: 24 }, (_, i) => `/avatars/dmoe_${String(i + 1).padStart(2, '0')}.jpg`),
  ...Array.from({ length: 8 }, (_, i) => `/avatars/avatar_${String(i + 1).padStart(2, '0')}.png`),
  '/avatars/real_15.jpg',
  '/avatars/friend_ringo.png',
  '/avatars/friend_yukina.png',
]
const AVATAR_TOTAL = AVATAR_POOL.length

/* ----------------------- 用户会话（本地身份） ----------------------- */
export interface UserSession {
  nick: string
  mail: string
  token: string
  createdAt?: string
}

const SESSION_KEY = 'blog_user_session'

/** 读取当前登录会话 */
export function getSession(): UserSession | null {
  try {
    const v = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    if (v && typeof v.mail === 'string' && v.mail) return v
  } catch { /* ignore */ }
  return null
}

export function isLoggedIn(): boolean {
  return getSession() !== null
}

/** 保存会话 */
export function saveSession(s: UserSession) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
}

/** 快速设置身份（无需验证码）：填昵称+邮箱即可，邮箱匹配博主则为博主身份 */
export function quickLogin(nick: string, mail: string): { ok: boolean; error?: string } {
  const n = nick.trim().slice(0, 24)
  const m = mail.trim().toLowerCase()
  if (!n) return { ok: false, error: '请填写昵称' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)) return { ok: false, error: '邮箱格式不正确' }
  saveSession({ nick: n, mail: m, token: viewerToken(), createdAt: new Date().toISOString() })
  return { ok: true }
}

/** 博主邮箱（与服务端 ADMIN_MAIL 保持一致） */
export const ADMIN_MAIL = 'jaychou8421@gmail.com'
/** 博主昵称 */
export const ADMIN_NICK = 'jay'

/** 当前用户是否为博主身份（邮箱匹配即为博主，昵称仅辅助） */
export function isAdminUser(): boolean {
  const s = getSession()
  if (s) return s.mail.toLowerCase() === ADMIN_MAIL.toLowerCase()
  const id = readIdentity()
  if (id.mail) return id.mail.toLowerCase() === ADMIN_MAIL.toLowerCase()
  return false
}

/* --------------------------- 身份 / 令牌 --------------------------- */

/** 访客令牌：用于标记「我的评论」与点赞去重（仅存本地，不含个人信息） */
export function viewerToken(): string {
  try {
    let t = localStorage.getItem(TOKEN_KEY)
    if (!t) {
      t = `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(TOKEN_KEY, t)
    }
    return t
  } catch {
    return 'anonymous'
  }
}

export function readIdentity(): Identity {
  try {
    const v = JSON.parse(localStorage.getItem(IDENTITY_KEY) || 'null')
    if (v && typeof v.nick === 'string') return { nick: v.nick || '', mail: v.mail || '', link: v.link || '' }
  } catch { /* ignore */ }
  return { nick: '', mail: '', link: '' }
}

export function saveIdentity(id: Identity) {
  try { localStorage.setItem(IDENTITY_KEY, JSON.stringify(id)) } catch { /* ignore */ }
}

/* ------------------------------ 工具 ------------------------------ */

function hash(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h
}

/** 与服务端一致的确定性头像映射（同一昵称永远同一张头像） */
export function avatarFor(seed: string): string {
  const n = (hash(seed) % AVATAR_TOTAL)
  return AVATAR_POOL[n]
}

/** 相对时间：刚刚 / x 分钟前 / x 小时前 / x 天前 / 具体日期 */
export function relativeTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`
  const d = new Date(t)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/* ------------------------- localStorage 兜底 ------------------------- */

interface LocalRow extends Omit<CommentNode, 'likes' | 'liked' | 'mine' | 'children' | 'floor'> {
  likedBy: string[]
  ownerToken: string
}

function loadLocal(): LocalRow[] {
  try {
    const v = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function saveLocal(rows: LocalRow[]) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(rows)) } catch { /* ignore */ }
}

function toNode(r: LocalRow, token: string): CommentNode {
  return {
    id: r.id, path: r.path, nick: r.nick, link: r.link, content: r.content,
    avatar: r.avatar, parentId: r.parentId, replyTo: r.replyTo, createdAt: r.createdAt,
    likes: r.likedBy.length, liked: r.likedBy.includes(token),
    mine: r.ownerToken === token, admin: (r as any).admin || false,
  }
}

function localList(path: string, page: number, pageSize: number, sort: SortKey): CommentPage {
  const token = viewerToken()
  const all = loadLocal().filter((r) => r.path === path)
  const roots = all.filter((r) => !r.parentId)
  const byTime = (a: LocalRow, b: LocalRow) => +new Date(b.createdAt) - +new Date(a.createdAt)
  roots.sort(sort === 'hot' ? (a, b) => b.likedBy.length - a.likedBy.length || byTime(a, b) : byTime)

  const floors = new Map<string, number>()
  ;[...roots].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
    .forEach((r, i) => floors.set(r.id, i + 1))

  const slice = roots.slice((page - 1) * pageSize, page * pageSize)
  const comments = slice.map((root) => {
    const children: LocalRow[] = []
    const walk = (pid: string) => {
      all.filter((r) => r.parentId === pid)
        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
        .forEach((r) => { children.push(r); walk(r.id) })
    }
    walk(root.id)
    return {
      ...toNode(root, token),
      floor: floors.get(root.id) || 0,
      children: children.map((c) => toNode(c, token)),
    }
  })

  return {
    total: all.length,
    roots: roots.length,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(roots.length / pageSize)),
    sort,
    comments,
    source: 'local',
  }
}

/* --------------------------------- API --------------------------------- */

export async function listComments(
  path: string,
  opts: { page?: number; pageSize?: number; sort?: SortKey } = {},
): Promise<CommentPage> {
  const page = opts.page ?? 1
  const pageSize = opts.pageSize ?? 10
  const sort = opts.sort ?? 'new'

  // 1) 同源后端（local-api，主数据源）
  const qs = new URLSearchParams({
    path, page: String(page), pageSize: String(pageSize), sort, token: viewerToken(),
  })
  try {
    const r = await fetch(`${API}?${qs}`, { cache: 'no-store' })
    if (!r.ok) throw new Error(String(r.status))
    const d = await r.json()
    if (!Array.isArray(d?.comments)) throw new Error('bad payload')
    return d as CommentPage
  } catch {
    // 2) 本地兜底
    return localList(path, page, pageSize, sort)
  }
}

export async function createComment(input: CommentInput): Promise<{ ok: boolean; error?: string }> {
  const token = viewerToken()
  const nick = input.nick.trim().slice(0, 24)
  const content = input.content.trim().slice(0, 1000)
  if (!nick) return { ok: false, error: '请填写昵称' }
  if (!content) return { ok: false, error: '评论内容不能为空' }

  // 写同源后端
  try {
    const r = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, token }),
    })
    const d = await r.json().catch(() => ({}))
    if (r.ok && d?.ok) return { ok: true }
    if (r.status >= 400 && r.status < 500 && d?.error) return { ok: false, error: d.error }
    throw new Error('server unavailable')
  } catch {
    // 最后兜底：写本机 localStorage
    const rows = loadLocal()
    const parent = input.parentId ? rows.find((r) => r.id === input.parentId) : undefined
    rows.push({
      id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      path: input.path,
      nick: input.nick.trim().slice(0, 24),
      link: (input.link || '').trim(),
      content: input.content.trim().slice(0, 1000),
      avatar: avatarFor(`${input.nick}|${input.mail || ''}`),
      parentId: input.parentId || '',
      replyTo: parent?.nick || '',
      createdAt: new Date().toISOString(),
      likedBy: [],
      ownerToken: token,
      admin: false,
    })
    saveLocal(rows)
    return { ok: true }
  }
}

export async function likeComment(id: string): Promise<{ ok: boolean; likes?: number; liked?: boolean }> {
  const token = viewerToken()
  try {
    const r = await fetch(`${API}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, token }),
    })
    const d = await r.json().catch(() => ({}))
    if (r.ok && d?.ok) return { ok: true, likes: d.likes, liked: d.liked }
    throw new Error('fail')
  } catch {
    const rows = loadLocal()
    const row = rows.find((r) => r.id === id)
    if (!row) return { ok: false }
    const i = row.likedBy.indexOf(token)
    if (i >= 0) row.likedBy.splice(i, 1)
    else row.likedBy.push(token)
    saveLocal(rows)
    return { ok: true, likes: row.likedBy.length, liked: i < 0 }
  }
}

export async function deleteComment(id: string, mail?: string, nick?: string): Promise<{ ok: boolean; error?: string }> {
  const token = viewerToken()
  try {
    const r = await fetch(`${API}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, token, mail, nick }),
    })
    const d = await r.json().catch(() => ({}))
    if (r.ok && d?.ok) return { ok: true }
    return { ok: false, error: d?.error || `删除失败 (${r.status})` }
  } catch {
    return { ok: false, error: '网络错误，请检查连接后重试' }
  }
}
