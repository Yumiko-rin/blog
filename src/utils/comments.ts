/**
 * 评论数据层（Waline 主源 + 本地兜底/双写）
 * --------------------------------------------------
 * 主数据源：用户自建 Waline 服务（https://waline-nu-puce-12.vercel.app/）
 *   - 前台读取/发表/点赞/删除优先走 Waline API（含登录注册体系）
 *   - 发表成功后再「双写」一份到同源 /local-api/comments（server-data/comments.json），
 *     供后台管理系统「评论管理」页实时查看（数据同步到后台）
 *   - Waline 不可用（网络/服务异常）时自动回退到自建评论系统，保证前台可用
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
  source: 'waline' | 'server' | 'local'
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
// 用户自建 Waline 服务端（2026-08-13 接入）
const WALINE_API = 'https://waline-nu-puce-12.vercel.app'
const TOKEN_KEY = 'blog_comment_token'
const IDENTITY_KEY = 'blog_comment_identity'
const LOCAL_KEY = 'blog_comments_v2'
const AVATAR_TOTAL = 24

/* ----------------------- 用户会话（登录/注册） ----------------------- */
/** 当前登录用户（Waline 账号体系；注册/登录后由 Waline 返回 token） */
export interface UserSession {
  nick: string
  mail: string
  token: string
  /** Waline 登录令牌（Bearer），Waline 未登录时为空 */
  walineToken?: string
  createdAt?: string
}

const SESSION_KEY = 'blog_user_session'
const USERS_KEY = 'blog_registered_users'

/** 当前 Waline 登录令牌（未登录返回空串） */
export function walineToken(): string {
  try {
    const v = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    return typeof v?.walineToken === 'string' ? v.walineToken : ''
  } catch {
    return ''
  }
}

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

/** 保存会话（登录/注册成功后调用） */
export function saveSession(s: UserSession) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
}

/** 注册账号：邮箱唯一，成功后自动登录 */
export function registerUser(nick: string, mail: string): { ok: boolean; error?: string } {
  const n = nick.trim().slice(0, 24)
  const m = mail.trim().toLowerCase()
  if (!n) return { ok: false, error: '请填写昵称' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)) return { ok: false, error: '邮箱格式不正确' }
  try {
    const users: Record<string, string> = JSON.parse(localStorage.getItem(USERS_KEY) || '{}')
    if (users[m]) return { ok: false, error: '该邮箱已注册，请直接登录' }
    users[m] = n
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  } catch { /* ignore */ }
  saveSession({ nick: n, mail: m, token: viewerToken(), createdAt: new Date().toISOString() })
  return { ok: true }
}

/** 登录：邮箱须已注册，昵称自动补全 */
export function loginUser(mail: string): { ok: boolean; error?: string } {
  const m = mail.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)) return { ok: false, error: '邮箱格式不正确' }
  try {
    const users: Record<string, string> = JSON.parse(localStorage.getItem(USERS_KEY) || '{}')
    const nick = users[m]
    if (!nick) return { ok: false, error: '该邮箱尚未注册，请先注册' }
    saveSession({ nick, mail: m, token: viewerToken() })
    return { ok: true }
  } catch {
    return { ok: false, error: '登录失败，请重试' }
  }
}

/** 博主邮箱（与服务端 ADMIN_MAIL 保持一致） */
export const ADMIN_MAIL = 'hiromu@example.com'

/** 当前用户是否为博主身份（昵称或邮箱匹配） */
export function isAdminUser(): boolean {
  const s = getSession()
  return s ? s.mail === ADMIN_MAIL : false
}

/* ----------------------- Waline 认证（邮箱验证码） ----------------------- */

/** 请求邮箱验证码（Waline SMTP 发送） */
export async function requestWalineCode(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch(`${WALINE_API}/user/requestCode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    })
    const d = await r.json().catch(() => ({}))
    if (d && d.errno === 0) return { ok: true }
    return { ok: false, error: typeof d?.errmsg === 'string' ? d.errmsg : '验证码发送失败，请检查邮箱' }
  } catch {
    return { ok: false, error: '无法连接评论服务，请稍后再试' }
  }
}

/** Waline 注册：邮箱 + 昵称 + 验证码；成功后自动登录并保存会话 */
export async function walineRegister(
  nick: string,
  mail: string,
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const n = nick.trim().slice(0, 24)
  const m = mail.trim().toLowerCase()
  if (!n) return { ok: false, error: '请填写昵称' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)) return { ok: false, error: '邮箱格式不正确' }
  if (!code.trim()) return { ok: false, error: '请填写验证码' }
  try {
    const r = await fetch(`${WALINE_API}/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: m, nick: n, code: code.trim() }),
    })
    const d = await r.json().catch(() => ({}))
    if (d && d.errno === 0) {
      // 注册成功 → 自动登录拿 token
      return walineLogin(m, code.trim())
    }
    return { ok: false, error: typeof d?.errmsg === 'string' ? d.errmsg : '注册失败' }
  } catch {
    return { ok: false, error: '无法连接评论服务，请稍后再试' }
  }
}

/** Waline 登录：邮箱 + 验证码；成功后保存会话（含 Waline token） */
export async function walineLogin(
  mail: string,
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const m = mail.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)) return { ok: false, error: '邮箱格式不正确' }
  if (!code.trim()) return { ok: false, error: '请填写验证码' }
  try {
    const r = await fetch(`${WALINE_API}/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: m, code: code.trim() }),
    })
    const d = await r.json().catch(() => ({}))
    if (d && d.errno === 0 && d.data) {
      const info = d.data || {}
      const nick = String(info.nick || info.mail || m).split('@')[0]
      saveSession({ nick, mail: m, token: viewerToken(), walineToken: String(info.token || '') })
      return { ok: true }
    }
    return { ok: false, error: typeof d?.errmsg === 'string' ? d.errmsg : '登录失败，请检查验证码' }
  } catch {
    return { ok: false, error: '无法连接评论服务，请稍后再试' }
  }
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
  const n = (hash(seed) % AVATAR_TOTAL) + 1
  return `/avatars/dmoe_${String(n).padStart(2, '0')}.jpg`
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
    mine: r.ownerToken === token, admin: false,
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

/* ================= Waline 集成（已存在的评论区） =================
 * 站点服务器上已有 Waline 服务（http://47.104.189.4:8360，版本 1.41.3）：
 *   - 读取：优先 Waline（主数据源，含登录用户身份）；Waline 异常时回退本地后端
 *   - 写入：先写 Waline（主），成功后再双写本地后端（供后台管理系统实时查看）
 *   - 登录/注册：评论区「登录/注册」按钮跳转本站 /login 页，对接 Waline 邮箱验证码接口
 */
// 用户自建 Waline 服务端（2026-08-13 用户指定接入）
export const WALINE_SERVER = 'https://waline-nu-puce-12.vercel.app'
// Waline 允许的站点地址（SECURE_DOMAINS 白名单校验用，动态取当前站点 origin）
export function walineSite(): string {
  try {
    return window.location.origin
  } catch {
    return 'http://localhost:4173'
  }
}

interface WalineComment {
  objectId?: number
  nick?: string
  link?: string
  content?: string
  orig?: string
  insertedAt?: string
  like?: number
  status?: string
  avatar?: string
  pid?: number | null
  at?: string
  mail?: string
  likes?: number
  liked?: boolean
  isAdmin?: boolean
  children?: WalineComment[]
}

/* ======================= Waline 主数据源 ======================= */

/** Waline 评论 → 本地 CommentNode（children 递归） */
function walineToNode(w: WalineComment, path: string): CommentNode {
  const created = w.insertedAt ? new Date(w.insertedAt) : new Date()
  const node: CommentNode = {
    id: String(w.objectId),
    path,
    nick: w.nick || '匿名',
    link: w.link || '',
    content: w.orig || w.content || '',
    avatar: w.avatar || avatarFor(w.nick || '匿名'),
    parentId: w.pid ? String(w.pid) : '',
    replyTo: w.at || '',
    createdAt: Number.isNaN(created.getTime()) ? new Date().toISOString() : created.toISOString(),
    likes: w.likes ?? w.like ?? 0,
    liked: !!w.liked,
    mine: false,
    admin: !!w.isAdmin,
  }
  if (Array.isArray(w.children) && w.children.length) {
    node.children = w.children.map((c) => walineToNode(c, path))
  }
  return node
}

/** 从 Waline 读取评论（分页/排序），失败返回 null */
async function walineList(
  path: string,
  page: number,
  pageSize: number,
  sort: SortKey,
): Promise<CommentPage | null> {
  try {
    const qs = new URLSearchParams({
      path,
      page: String(page),
      pageSize: String(pageSize),
      sortBy: sort === 'hot' ? 'like_desc' : 'insertedAt_desc',
    })
    const t = walineToken()
    const r = await fetch(`${WALINE_SERVER}/comment?${qs}`, {
      cache: 'no-store',
      headers: t ? { Authorization: `Bearer ${t}` } : {},
    })
    if (!r.ok) throw new Error(String(r.status))
    const d = await r.json()
    if (!d || d.errno !== 0) throw new Error('waline errno')
    const data = d.data || {}
    const list: WalineComment[] = Array.isArray(data.comments) ? data.comments : []
    const roots: CommentNode[] = []
    const byId = new Map<number, CommentNode>()
    list.forEach((w) => {
      if (!w.objectId) return
      byId.set(w.objectId, walineToNode(w, path))
    })
    byId.forEach((c) => {
      const pid = Number(c.parentId)
      if (c.parentId && byId.has(pid)) {
        const p = byId.get(pid)!
        p.children = p.children || []
        p.children.push(c)
      } else {
        roots.push(c)
      }
    })
    // 楼层号：根评论按时间正序编号（当前页内近似）
    const floors = new Map<string, number>()
    ;[...roots].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
      .forEach((c, i) => floors.set(c.id, i + 1))
    return {
      total: data.count ?? roots.length,
      roots: roots.length,
      page: data.page ?? page,
      pageSize: data.pageSize ?? pageSize,
      totalPages: data.totalPages ?? 1,
      sort,
      comments: roots.map((c) => ({ ...c, floor: floors.get(c.id) || 0 })),
      source: 'waline',
    }
  } catch {
    return null
  }
}

/** 写评论到 Waline（主数据源），成功返回 {ok:true}，业务错误返回具体信息 */
async function walineCreate(input: CommentInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const t = walineToken()
    const r = await fetch(`${WALINE_SERVER}/comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
      body: JSON.stringify({
        comment: input.content,
        path: input.path,
        nick: input.nick,
        mail: input.mail || '',
        link: input.link || '',
        ua: navigator.userAgent || '',
        url: `${walineSite()}${input.path}`,
        pid: input.parentId ? Number(input.parentId) : undefined,
      }),
    })
    const d = await r.json().catch(() => ({}))
    if (d && d.errno === 0) return { ok: true }
    const msg = typeof d?.errmsg === 'string' ? d.errmsg : ''
    if (msg) return { ok: false, error: msg }
    throw new Error('waline fail')
  } catch {
    return { ok: false, error: 'waline unavailable' }
  }
}

/** Waline 点赞切换，失败返回 null */
async function walineLike(id: string): Promise<{ likes?: number; liked?: boolean } | null> {
  try {
    const r = await fetch(`${WALINE_SERVER}/comment/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'like' }),
    })
    const d = await r.json().catch(() => ({}))
    if (d && d.errno === 0 && d.data) {
      return { likes: d.data.likes ?? d.data.like ?? 0, liked: d.data.liked ?? d.data.isLiked }
    }
    return null
  } catch {
    return null
  }
}

/** Waline 删除评论，失败返回 false */
async function walineDelete(id: string): Promise<boolean> {
  try {
    const t = walineToken()
    const r = await fetch(`${WALINE_SERVER}/comment/${id}`, {
      method: 'DELETE',
      headers: t ? { Authorization: `Bearer ${t}` } : {},
    })
    const d = await r.json().catch(() => ({}))
    return !!(d && d.errno === 0)
  } catch {
    return false
  }
}

export async function listComments(
  path: string,
  opts: { page?: number; pageSize?: number; sort?: SortKey } = {},
): Promise<CommentPage> {
  const page = opts.page ?? 1
  const pageSize = opts.pageSize ?? 10
  const sort = opts.sort ?? 'new'

  // 1) 优先 Waline（主数据源）
  const waline = await walineList(path, page, pageSize, sort)
  if (waline) return waline

  // 2) Waline 异常 → 回退同源后端（local-api）
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
    // 3) 本地兜底
    return localList(path, page, pageSize, sort)
  }
}

export async function createComment(input: CommentInput): Promise<{ ok: boolean; error?: string }> {
  const token = viewerToken()
  const nick = input.nick.trim().slice(0, 24)
  const content = input.content.trim().slice(0, 1000)
  if (!nick) return { ok: false, error: '请填写昵称' }
  if (!content) return { ok: false, error: '评论内容不能为空' }

  // 1) 先写 Waline（主数据源，含用户身份）
  const w = await walineCreate(input)
  if (w.ok) {
    // 2) 成功后双写本地后端（后台管理系统「评论管理」实时同步）
    void writeLocalSync(input, token)
    return { ok: true }
  }
  // 3) Waline 不可用 → 写本地兜底（前台仍可用，后台仍同步）
  if (w.error && w.error !== 'waline unavailable') return { ok: false, error: w.error }
  return writeLocalSync(input, token)
}

/** 写一份到本地后端（后台同步副本），失败时降级 localStorage */
async function writeLocalSync(input: CommentInput, token: string): Promise<{ ok: boolean; error?: string }> {
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
  // 1) Waline 点赞
  const w = await walineLike(id)
  if (w) return { ok: true, likes: w.likes, liked: w.liked }
  // 2) 回退本地
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

export async function deleteComment(id: string, mail?: string): Promise<{ ok: boolean; error?: string }> {
  // 1) Waline 删除（需登录令牌）
  if (await walineDelete(id)) return { ok: true }
  // 2) 回退本地后端
  const token = viewerToken()
  try {
    const r = await fetch(`${API}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, token, mail }),
    })
    const d = await r.json().catch(() => ({}))
    if (r.ok && d?.ok) return { ok: true }
    if (r.status >= 400 && r.status < 500 && d?.error) return { ok: false, error: d.error }
    throw new Error('fail')
  } catch {
    const rows = loadLocal()
    const dead = new Set([id])
    let grew = true
    while (grew) {
      grew = false
      for (const r of rows) {
        if (r.parentId && dead.has(r.parentId) && !dead.has(r.id)) { dead.add(r.id); grew = true }
      }
    }
    saveLocal(rows.filter((r) => !dead.has(r.id)))
    return { ok: true }
  }
}
