'use strict'
/**
 * 本地后端 API（同源，无需第三方服务）
 * ------------------------------------------------------------------
 * 挂载位置：
 *   - 开发：vite.config.ts 的 local-api 插件（configureServer / configurePreviewServer）
 *   - 预览：preview-server.cjs
 *
 * 提供两块能力：
 *   1) 访问统计  /local-api/stats            （真实 PV / UV，JSON 文件持久化，从首次请求开始计）
 *   2) 评论系统  /local-api/comments         （发表 / 列表 / 回复 / 点赞 / 删除）
 *
 * 之所以自建：原评论区依赖 waline-nu-puce-12.vercel.app，
 * vercel.app 在国内网络不可达（curl 超时 HTTP 000），评论区实际完全失效。
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const http = require('http')
const https = require('https')

const PREFIX = '/local-api'
const DATA_DIR = path.resolve(__dirname, '..', 'server-data')
const STATS_FILE = path.join(DATA_DIR, 'visit-stats.json')
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json')
const FRIEND_APPLICATIONS_FILE = path.join(DATA_DIR, 'friend-applications.json')
const FRIENDS_APPROVED_FILE = path.join(DATA_DIR, 'friends-approved.json')

// ---- 后台管理（本地模拟 /admin/*）数据文件 ----
const ADMIN_ARTICLES_FILE = path.join(DATA_DIR, 'admin-articles.json')
const ADMIN_ARTICLES_VERSION_FILE = path.join(DATA_DIR, 'admin-articles-version.json')
const ADMIN_SHUOSHUO_FILE = path.join(DATA_DIR, 'admin-shuoshuo.json')
const GALLERY_FILE = path.join(DATA_DIR, 'admin-gallery.json')
const ADMIN_FRIENDS_FILE = path.join(DATA_DIR, 'admin-friends.json')
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads')
const SEED_DIR = path.resolve(__dirname, 'seed')

// 后台登录密码（与线上 functions/admin 默认一致）与本地签发 token
const ADMIN_PASSWORD = process.env.BLOG_ADMIN_PASSWORD || '123456'
const LOCAL_ADMIN_TOKEN = 'local-admin-token-kirameki-2026'

const ADMIN_TOKEN = process.env.BLOG_ADMIN_TOKEN || 'kirameku-admin'
// 博主邮箱：使用该邮箱登录评论的用户视为博主（可删任意评论、显示博主徽章）
const ADMIN_MAIL = process.env.BLOG_ADMIN_MAIL || 'jaychou8421@gmail.com'
const ADMIN_NICK = 'jay'
// 头像池：混合多种风格，增加多样性
const AVATAR_POOL = [
  ...Array.from({ length: 24 }, (_, i) => `/avatars/dmoe_${String(i + 1).padStart(2, '0')}.jpg`),
  ...Array.from({ length: 8 }, (_, i) => `/avatars/avatar_${String(i + 1).padStart(2, '0')}.png`),
  '/avatars/real_15.jpg',
  '/avatars/friend_ringo.png',
  '/avatars/friend_yukina.png',
]
const AVATAR_TOTAL = AVATAR_POOL.length          // 35 张头像
const MAX_VISITORS = 20000       // 访客指纹上限，防止文件无限增长
const KEEP_DAYS = 120            // 按天统计保留天数
const NICK_MAX = 24
const CONTENT_MAX = 1000
const POST_INTERVAL_MS = 5000    // 同一客户端最短发表间隔

/* ============================ 基础工具 ============================ */

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

/** 原子写入，避免并发写坏文件 */
function writeJson(file, data) {
  ensureDir()
  const tmp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  fs.renameSync(tmp, file)
}

/** 本地日期键：YYYY-MM-DD（按服务器本地时区，跨零点自动切换） */
function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function sha(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex')
}

/** 客户端指纹（IP + UA 哈希，不存明文，兼顾隐私与 UV 去重） */
function clientId(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  const ip = xf || (req.socket && req.socket.remoteAddress) || 'unknown'
  return sha(`${ip}|${req.headers['user-agent'] || ''}`).slice(0, 20)
}

function send(res, code, obj) {
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.end(JSON.stringify(obj))
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (c) => {
      raw += c
      if (raw.length > 1e6) raw = raw.slice(0, 1e6)
    })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        resolve({})
      }
    })
    req.on('error', () => resolve({}))
  })
}

/* ============================ 访问统计 ============================ */

function defaultStats() {
  // since = 首次被访问的时间 → 统计「从现在开始」
  return { since: new Date().toISOString(), total: 0, visitors: [], days: {} }
}

function loadStats() {
  const s = readJson(STATS_FILE, null)
  if (!s || typeof s.total !== 'number') return defaultStats()
  if (!Array.isArray(s.visitors)) s.visitors = []
  if (!s.days || typeof s.days !== 'object') s.days = {}
  if (!s.since) s.since = new Date().toISOString()
  return s
}

function statsView(s) {
  const k = dayKey()
  const today = s.days[k] || { pv: 0, uv: [] }
  const recent = Object.keys(s.days)
    .sort()
    .slice(-7)
    .map((d) => ({
      date: d,
      pv: s.days[d].pv || 0,
      uv: Array.isArray(s.days[d].uv) ? s.days[d].uv.length : 0,
    }))
  return {
    since: s.since,
    total: s.total,
    today: today.pv || 0,
    todayUv: Array.isArray(today.uv) ? today.uv.length : 0,
    uv: s.visitors.length,
    days: Object.keys(s.days).length,
    recent,
    source: 'server',
  }
}

function recordVisit(req) {
  const s = loadStats()
  const id = clientId(req)
  const k = dayKey()

  if (!s.days[k]) s.days[k] = { pv: 0, uv: [] }
  s.total += 1
  s.days[k].pv += 1
  if (!s.days[k].uv.includes(id)) s.days[k].uv.push(id)
  if (!s.visitors.includes(id)) s.visitors.push(id)
  if (s.visitors.length > MAX_VISITORS) s.visitors = s.visitors.slice(-MAX_VISITORS)

  // 清理过期天数
  const keys = Object.keys(s.days).sort()
  if (keys.length > KEEP_DAYS) {
    for (const old of keys.slice(0, keys.length - KEEP_DAYS)) delete s.days[old]
  }

  writeJson(STATS_FILE, s)
  return statsView(s)
}

/* ============================ 评论系统 ============================ */

const lastPostAt = new Map() // clientId -> timestamp（内存级频率限制）

function loadComments() {
  const d = readJson(COMMENTS_FILE, null)
  if (d && Array.isArray(d.comments)) return d
  return { comments: [] }
}

/** 头像：根据昵称+邮箱稳定映射到本地头像池 */
function avatarFor(seed) {
  const n = parseInt(sha(seed).slice(0, 8), 16) % AVATAR_TOTAL
  return AVATAR_POOL[n]
}

function safeLink(v) {
  const s = String(v || '').trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s.slice(0, 200)
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(s)) return `https://${s.slice(0, 200)}`
  return ''
}

/** 对外输出：隐去邮箱 / 指纹 / 归属令牌 */
function publicComment(c, viewer) {
  const likedBy = Array.isArray(c.likedBy) ? c.likedBy : []
  return {
    id: c.id,
    path: c.path,
    nick: c.nick,
    link: c.link || '',
    content: c.content,
    avatar: c.avatar,
    parentId: c.parentId || '',
    replyTo: c.replyTo || '',
    createdAt: c.createdAt,
    likes: likedBy.length,
    liked: viewer ? likedBy.includes(viewer) : false,
    mine: viewer ? c.ownerToken === viewer : false,
    admin: !!c.admin,
  }
}

function listComments(query, viewer) {
  const p = String(query.get('path') || '').trim()
  const page = Math.max(1, parseInt(query.get('page') || '1', 10) || 1)
  const pageSize = Math.min(50, Math.max(1, parseInt(query.get('pageSize') || '10', 10) || 10))
  const sort = query.get('sort') === 'hot' ? 'hot' : 'new'

  const all = loadComments().comments.filter((c) => !p || c.path === p)
  const roots = all.filter((c) => !c.parentId)
  const byTime = (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  const byHot = (a, b) => {
    const la = (a.likedBy || []).length
    const lb = (b.likedBy || []).length
    return lb - la || byTime(a, b)
  }
  roots.sort(sort === 'hot' ? byHot : byTime)

  const start = (page - 1) * pageSize
  const pageRoots = roots.slice(start, start + pageSize)

  // 楼层号：按时间正序编号（最早 = 1 楼），与排序方式无关
  const floorMap = new Map()
  ;[...roots].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).forEach((c, i) => {
    floorMap.set(c.id, i + 1)
  })

  const data = pageRoots.map((root) => {
    // 收集全部后代，扁平化为一层回复流（类似 Twikoo / denia）
    const children = []
    const walk = (parentId) => {
      all
        .filter((c) => c.parentId === parentId)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .forEach((c) => {
          children.push(c)
          walk(c.id)
        })
    }
    walk(root.id)
    return {
      ...publicComment(root, viewer),
      floor: floorMap.get(root.id) || 0,
      children: children.map((c) => publicComment(c, viewer)),
    }
  })

  return {
    total: all.length,
    roots: roots.length,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(roots.length / pageSize)),
    sort,
    comments: data,
    source: 'server',
  }
}

function createComment(body, req) {
  const nick = String(body.nick || '').trim().slice(0, NICK_MAX)
  const content = String(body.content || '').trim().slice(0, CONTENT_MAX)
  const mail = String(body.mail || '').trim().slice(0, 120)
  const link = safeLink(body.link)
  const p = String(body.path || '').trim().slice(0, 200)
  const token = String(body.token || '').trim().slice(0, 64)
  const parentId = String(body.parentId || '').trim().slice(0, 64)

  if (!nick) return { error: '请填写昵称' }
  if (!mail) return { error: '请填写邮箱' }
  if (!content) return { error: '评论内容不能为空' }
  if (!p) return { error: '缺少评论路径' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return { error: '邮箱格式不正确' }

  const cid = clientId(req)
  const now = Date.now()
  const prev = lastPostAt.get(cid) || 0
  if (now - prev < POST_INTERVAL_MS) {
    return { error: `发表太频繁，请 ${Math.ceil((POST_INTERVAL_MS - (now - prev)) / 1000)} 秒后再试` }
  }

  const db = loadComments()

  // 重复内容拦截（同路径 60 秒内同昵称同内容）
  const dup = db.comments.find(
    (c) =>
      c.path === p &&
      c.nick === nick &&
      c.content === content &&
      now - new Date(c.createdAt).getTime() < 60000,
  )
  if (dup) return { error: '重复的评论内容' }

  let replyTo = ''
  if (parentId) {
    const parent = db.comments.find((c) => c.id === parentId)
    if (!parent) return { error: '被回复的评论不存在' }
    replyTo = parent.nick
  }

  const comment = {
    id: `c${now.toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    path: p,
    nick,
    mail,
    link,
    content,
    avatar: avatarFor(`${nick}|${mail}`),
    parentId,
    replyTo,
    createdAt: new Date().toISOString(),
    likedBy: [],
    ownerToken: token,
    admin: token === ADMIN_TOKEN || (mail && mail.toLowerCase() === ADMIN_MAIL.toLowerCase() && nick === ADMIN_NICK),
    cid,
  }

  db.comments.push(comment)
  writeJson(COMMENTS_FILE, db)
  lastPostAt.set(cid, now)

  return { ok: true, comment: publicComment(comment, token) }
}

function toggleLike(body) {
  const id = String(body.id || '')
  const token = String(body.token || '').trim().slice(0, 64)
  if (!id || !token) return { error: '参数不完整' }

  const db = loadComments()
  const c = db.comments.find((x) => x.id === id)
  if (!c) return { error: '评论不存在' }

  if (!Array.isArray(c.likedBy)) c.likedBy = []
  const i = c.likedBy.indexOf(token)
  if (i >= 0) c.likedBy.splice(i, 1)
  else c.likedBy.push(token)

  writeJson(COMMENTS_FILE, db)
  return { ok: true, likes: c.likedBy.length, liked: i < 0 }
}

function removeComment(body) {
  const id = String(body.id || '')
  const token = String(body.token || '').trim().slice(0, 64)
  const mail = String(body.mail || '').trim().slice(0, 120)
  if (!id) return { error: '参数不完整' }

  const db = loadComments()
  const c = db.comments.find((x) => x.id === id)
  if (!c) return { error: '评论不存在' }
  const isAdmin = token === ADMIN_TOKEN || (mail && mail.toLowerCase() === ADMIN_MAIL.toLowerCase())
  if (!isAdmin && c.ownerToken !== token) return { error: '无权删除这条评论' }

  // 连带删除所有后代回复
  const dead = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const x of db.comments) {
      if (x.parentId && dead.has(x.parentId) && !dead.has(x.id)) {
        dead.add(x.id)
        grew = true
      }
    }
  }
  db.comments = db.comments.filter((x) => !dead.has(x.id))
  writeJson(COMMENTS_FILE, db)
  return { ok: true, removed: dead.size }
}

function countComments(query) {
  const paths = String(query.get('paths') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const all = loadComments().comments
  const map = {}
  if (paths.length) {
    for (const p of paths) map[p] = all.filter((c) => c.path === p).length
  } else {
    for (const c of all) map[c.path] = (map[c.path] || 0) + 1
  }
  return { ok: true, counts: map, total: all.length }
}

/* ============================ 友链申请 ============================ */
/**
 * 数据流：前台 Friends 页提交 → friend-applications.json（待审核）
 *        → 后台管理系统审核（通过/拒绝）→ 通过的写入 friends-approved.json
 *        → 前台 Friends 页合并展示已通过友链
 */

const APPLY_FIELDS = ['name', 'url', 'avatar', 'description', 'email', 'message']

function loadFriendApplications() {
  const d = readJson(FRIEND_APPLICATIONS_FILE, null)
  return Array.isArray(d) ? d : []
}

function publicApplication(a, viewer) {
  return {
    id: a.id,
    name: a.name,
    url: a.url,
    avatar: a.avatar || '',
    description: a.description || '',
    email: a.email || '',
    message: a.message || '',
    status: a.status || 'pending',
    createdAt: a.createdAt,
    mine: viewer ? a.ownerToken === viewer : false,
  }
}

/** 提交友链申请（严格校验，保证通过后能正常展示为友链） */
function createFriendApplication(body, req) {
  const name = String(body.name || '').trim().slice(0, 60)
  const url = String(body.url || '').trim().slice(0, 200)
  const avatar = String(body.avatar || '').trim().slice(0, 300)
  const description = String(body.description || '').trim().slice(0, 200)
  const email = String(body.email || '').trim().slice(0, 120)
  const message = String(body.message || '').trim().slice(0, 500)
  const token = String(body.token || '').trim().slice(0, 64)

  // 合法 http(s) 网址（必须带域名，如 https://example.com 或带路径）
  const URL_RE = /^https?:\/\/[\w-]+(\.[\w-]+)+([/?#].*)?$/i
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (name.length < 2 || name.length > 24) return { error: '站点名称需为 2~24 个字符' }
  if (!URL_RE.test(url)) return { error: '站点地址需为合法的 http(s):// 网址' }
  if (!avatar) return { error: '请填写头像链接' }
  if (!URL_RE.test(avatar)) return { error: '头像链接需为合法的 http(s):// 图片地址' }
  if (email && !EMAIL_RE.test(email)) return { error: '邮箱格式不正确' }

  // 同一站点不可重复提交（pending 状态下）
  const all = loadFriendApplications()
  const dup = all.find((a) => a.url === url && (a.status === 'pending' || a.status === 'approved'))
  if (dup) return { error: dup.status === 'approved' ? '该站点已是友链' : '该站点已提交过申请，请等待审核' }

  const app = {
    id: `fa${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name,
    url,
    avatar,
    description,
    email,
    message,
    status: 'pending',
    createdAt: new Date().toISOString(),
    ownerToken: token,
  }
  all.push(app)
  writeJson(FRIEND_APPLICATIONS_FILE, all)
  return { ok: true, application: publicApplication(app, token) }
}

/** 审核（通过/拒绝）：仅管理员 token；通过时同步写入 approved 友链 */
function reviewFriendApplication(body) {
  const id = String(body.id || '')
  const status = String(body.status || '')
  const token = String(body.token || '').trim().slice(0, 64)
  if (!id || !['approved', 'rejected'].includes(status)) return { error: '参数不完整' }
  if (token !== ADMIN_TOKEN) return { error: '无权审核（需要管理员令牌）' }

  const all = loadFriendApplications()
  const app = all.find((a) => a.id === id)
  if (!app) return { error: '申请不存在' }

  app.status = status
  app.reviewedAt = new Date().toISOString()
  writeJson(FRIEND_APPLICATIONS_FILE, all)

  if (status === 'approved') {
    // 追加到已通过友链池（去重）
    const approved = readJson(FRIENDS_APPROVED_FILE, [])
    if (!Array.isArray(approved)) approved = []
    if (!approved.some((f) => f.url === app.url)) {
      approved.unshift({
        id: app.id,
        name: app.name,
        url: app.url,
        avatar: app.avatar,
        description: app.description,
        tag: '友链申请',
      })
      writeJson(FRIENDS_APPROVED_FILE, approved)
    }
    // 同步写入后台友链表（后台可管理全部友链）
    const list = loadFriendsList()
    if (!list.some((f) => f.url === app.url)) {
      list.unshift({
        id: app.id,
        name: app.name,
        url: app.url,
        avatar: app.avatar || '',
        description: app.description || '',
        tag: '友链申请',
      })
      saveFriendsList(list)
    }
  }
  return { ok: true, application: publicApplication(app, token) }
}

/** 删除申请（管理员或本人） */
function removeFriendApplication(body, req) {
  const id = String(body.id || '')
  const token = String(body.token || '').trim().slice(0, 64)
  if (!id) return { error: '参数不完整' }

  const all = loadFriendApplications()
  const app = all.find((a) => a.id === id)
  if (!app) return { error: '申请不存在' }
  if (token !== ADMIN_TOKEN && app.ownerToken !== token) return { error: '无权删除这条申请' }

  writeJson(FRIEND_APPLICATIONS_FILE, all.filter((a) => a.id !== id))

  // 若该申请已通过为友链，同步从 approved 池移除
  const approved = readJson(FRIENDS_APPROVED_FILE, [])
  if (Array.isArray(approved) && approved.some((f) => f.id === id)) {
    writeJson(FRIENDS_APPROVED_FILE, approved.filter((f) => f.id !== id))
  }
  return { ok: true }
}

/* ============================ 音乐流式代理 ============================ */
/**
 * 服务端代理 Meting-API：跟随 302 重定向，将最终音频/图片/歌词字节流回传给浏览器。
 * 解决 <audio> 元素跟随跨域 302 重定向时 ERR_ABORTED 的问题。
 */
const METING_BASE = 'https://meting.naihee.com/api'
// 缓存已解析的 CDN URL（避免每次 Range 请求都走 Meting API 重定向）
const musicUrlCache = new Map()
const MUSIC_URL_TTL = 30 * 60 * 1000 // 30 分钟

function proxyMusic(req, res, url, depth) {
  if (depth > 5) { if (!res.headersSent) send(res, 502, { error: 'too many redirects' }); return }
  const mod = url.startsWith('https') ? https : http
  const opts = { headers: {
    ...(req.headers.range ? { Range: req.headers.range } : {}),
    Referer: 'https://music.163.com/',
    'User-Agent': 'Mozilla/5.0 (compatible; BlogLocal/1.0)',
  } }

  let upstream
  const cleanup = () => { if (upstream) upstream.destroy() }
  res.on('close', cleanup)

  upstream = mod.get(url, opts, (upRes) => {
    // 跟随重定向
    if (upRes.statusCode >= 300 && upRes.statusCode < 400 && upRes.headers.location) {
      upRes.resume()
      // 缓存 Meting API → CDN 的重定向结果
      if (url.startsWith(METING_BASE)) {
        musicUrlCache.set(url, { url: upRes.headers.location, ts: Date.now() })
      }
      proxyMusic(req, res, upRes.headers.location, (depth || 0) + 1)
      return
    }
    // 回传响应头
    res.statusCode = upRes.statusCode || 200
    for (const h of ['content-type', 'content-length', 'accept-ranges', 'content-range', 'cache-control']) {
      if (upRes.headers[h]) res.setHeader(h, upRes.headers[h])
    }
    res.setHeader('Access-Control-Allow-Origin', '*')
    upRes.pipe(res)
    upRes.on('error', () => { if (!res.writableEnded) res.end() })
  })
  upstream.on('error', () => {
    res.removeListener('close', cleanup)
    if (!res.headersSent) send(res, 502, { error: 'music proxy failed' })
    else if (!res.writableEnded) res.end()
  })
  upstream.setTimeout(15000, () => {
    upstream.destroy()
    res.removeListener('close', cleanup)
    if (!res.headersSent) send(res, 504, { error: 'music proxy timeout' })
    else if (!res.writableEnded) res.end()
  })
}

/* ============================ 路由分发 ============================ */

/**
 * @returns {boolean} 是否已接管该请求
 */
function handleLocalApi(req, res) {
  let url
  try {
    url = new URL(req.url, 'http://localhost')
  } catch {
    return false
  }
  // 后台管理 API（本地模拟 /admin/*，与线上 Pages Function 接口一致）
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
    return handleAdminApi(req, res)
  }
  if (url.pathname !== PREFIX && !url.pathname.startsWith(`${PREFIX}/`)) return false

  const route = url.pathname.slice(PREFIX.length) || '/'

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.end()
    return true
  }

  const run = async () => {
    const q = url.searchParams
    const viewer = String(q.get('token') || '').trim().slice(0, 64)

    if (route === '/health') return send(res, 200, { ok: true, time: new Date().toISOString() })

    if (route === '/stats' && req.method === 'GET') return send(res, 200, statsView(loadStats()))
    if (route === '/stats/visit' && req.method === 'POST') return send(res, 200, recordVisit(req))

    if (route === '/comments' && req.method === 'GET') return send(res, 200, listComments(q, viewer))
    if (route === '/comments/count' && req.method === 'GET') return send(res, 200, countComments(q))

    if (route === '/comments' && req.method === 'POST') {
      const r = createComment(await readBody(req), req)
      return send(res, r.error ? 400 : 200, r)
    }
    if (route === '/comments/like' && req.method === 'POST') {
      const r = toggleLike(await readBody(req))
      return send(res, r.error ? 400 : 200, r)
    }
    if (route === '/comments/delete' && req.method === 'POST') {
      const r = removeComment(await readBody(req))
      return send(res, r.error ? 400 : 200, r)
    }

    /* ---- 友链申请 ---- */
    if (route === '/friend-applications' && req.method === 'POST') {
      const r = createFriendApplication(await readBody(req), req)
      return send(res, r.error ? 400 : 200, r)
    }
    if (route === '/friend-applications' && req.method === 'GET') {
      const all = loadFriendApplications().reverse() // 最新在前
      const allFlag = q.get('all') === '1' && viewer === ADMIN_TOKEN
      if (allFlag) {
        return send(res, 200, { ok: true, list: all.map((a) => publicApplication(a, viewer)) })
      }
      // 普通访客：仅返回自己的申请
      const mine = all.filter((a) => a.ownerToken === viewer)
      return send(res, 200, { ok: true, list: mine.map((a) => publicApplication(a, viewer)) })
    }
    if (route === '/friend-applications/approved' && req.method === 'GET') {
      const approved = readJson(FRIENDS_APPROVED_FILE, [])
      return send(res, 200, { ok: true, list: Array.isArray(approved) ? approved : [] })
    }
    if (route === '/friend-applications/status' && req.method === 'POST') {
      const r = reviewFriendApplication(await readBody(req))
      return send(res, r.error ? 400 : 200, r)
    }
    if (route === '/friend-applications/delete' && req.method === 'POST') {
      const r = removeFriendApplication(await readBody(req), req)
      return send(res, r.error ? 400 : 200, r)
    }

    /* ---- 音乐流式代理 ---- */
    if (route === '/music-stream' && req.method === 'GET') {
      const type = q.get('type') || 'url'
      const id = q.get('id')
      if (!id) return send(res, 400, { error: 'missing id' })

      // type=pic: meting.naihee.com 的 type=pic 返回 500，改用 api.injahow.cn
      if (type === 'pic') {
        const picMetingUrl = `https://api.injahow.cn/meting/?server=netease&type=pic&id=${encodeURIComponent(id)}`
        const cached = musicUrlCache.get(picMetingUrl)
        if (cached && Date.now() - cached.ts < MUSIC_URL_TTL) {
          proxyMusic(req, res, cached.url, 0)
        } else {
          proxyMusic(req, res, picMetingUrl, 0)
        }
        return true
      }

      const metingUrl = `${METING_BASE}?server=netease&type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`
      // 优先使用缓存的 CDN URL（跳过 Meting API 重定向，加速 Range 请求）
      const cached = musicUrlCache.get(metingUrl)
      if (cached && Date.now() - cached.ts < MUSIC_URL_TTL) {
        proxyMusic(req, res, cached.url, 0)
      } else {
        proxyMusic(req, res, metingUrl, 0)
      }
      return true
    }

    /* ---- 前台画廊（公开只读：后台发布的相册实时同步到前台） ---- */
    if (route === '/gallery' && req.method === 'GET') {
      return send(res, 200, { list: loadGallery(), source: 'server' })
    }

    /* ---- 前台友链（后台友链表：内置种子 + 申请通过 + 手动新增） ---- */
    if (route === '/friends' && req.method === 'GET') {
      return send(res, 200, { list: loadFriendsList(), source: 'server' })
    }

    /* ---- 本地图片文件（后台文件上传的照片） ---- */
    const imgMatch = route.match(/^\/gallery-image\/(.+)$/)
    if (imgMatch && req.method === 'GET') {
      const id = String(imgMatch[1]).replace(/[^a-zA-Z0-9_-]/g, '')
      const file = path.join(UPLOADS_DIR, `${id}.img`)
      if (!fs.existsSync(file)) return send(res, 404, { error: 'not found' })
      const buf = fs.readFileSync(file)
      const metaFile = path.join(UPLOADS_DIR, `${id}.json`)
      let type = 'image/jpeg'
      try { type = JSON.parse(fs.readFileSync(metaFile, 'utf8')).type || type } catch { /* ignore */ }
      res.statusCode = 200
      res.setHeader('Content-Type', type)
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.end(buf)
      return true
    }

    /* ---- 前台文章/说说（后台存储：内置种子 + 后台发布，实时同步） ---- */
    if (route === '/articles' && req.method === 'GET') {
      return send(res, 200, { list: loadAdminArray(ADMIN_ARTICLES_FILE, 'articles'), source: 'server' })
    }
    if (route === '/shuoshuo' && req.method === 'GET') {
      return send(res, 200, { list: loadAdminArray(ADMIN_SHUOSHUO_FILE, 'shuoshuo'), source: 'server' })
    }

    return send(res, 404, { error: 'not found', route })
  }

  run().catch((e) => send(res, 500, { error: 'server error', message: String(e && e.message) }))
  return true
}

/* ============================ 后台管理（本地模拟 /admin/*） ============================ */
/**
 * 与线上 functions/admin/[[path]].ts 接口保持一致，数据存 JSON 文件：
 *   - admin-articles.json / admin-shuoshuo.json / admin-gallery.json / admin-friends.json
 *   - 评论/统计/友链申请复用 comments.json / visit-stats.json / friend-applications.json
 * 登录：POST /admin/login { password } → { token }（本地固定 token，重启失效可重新登录）
 */

/** 种子文件映射：存储为空时自动导入内置静态内容（文章/说说/友链/画廊） */
const SEED_FILES = {
  articles: { file: ADMIN_ARTICLES_FILE, seed: 'articles.json' },
  shuoshuo: { file: ADMIN_SHUOSHUO_FILE, seed: 'shuoshuo.json' },
  friends: { file: ADMIN_FRIENDS_FILE, seed: 'friends.json' },
  gallery: { file: GALLERY_FILE, seed: 'gallery.json' },
}

/** 懒加载种子：对应存储为空/不存在时，把内置静态数据导入（已有数据则不覆盖） */
function ensureSeed(type) {
  const cfg = SEED_FILES[type]
  if (!cfg) return
  const d = readJson(cfg.file, null)
  if (Array.isArray(d) && d.length > 0) return
  try {
    const seed = JSON.parse(fs.readFileSync(path.join(SEED_DIR, cfg.seed), 'utf8'))
    if (Array.isArray(seed) && seed.length > 0) writeJson(cfg.file, seed)
  } catch (e) {
    /* 种子缺失时忽略 */
  }
}

function loadAdminArray(file, seedType) {
  if (seedType) ensureSeed(seedType)
  const d = readJson(file, null)
  return Array.isArray(d) ? d : []
}

function loadGallery() {
  return loadAdminArray(GALLERY_FILE, 'gallery')
}

function saveGallery(albums) {
  writeJson(GALLERY_FILE, albums)
}

/** 友链表（内置种子 + 申请通过 + 手动新增），后台可完整管理 */
function loadFriendsList() {
  return loadAdminArray(ADMIN_FRIENDS_FILE, 'friends')
}

function saveFriendsList(list) {
  writeJson(ADMIN_FRIENDS_FILE, list)
}

/** 照片 URL 白名单：http(s) 外链或站内相对路径 */
function sanitizePhotoUrl(v) {
  const s = String(v || '').trim().slice(0, 500)
  if (/^https?:\/\/\S+$/i.test(s)) return s
  if (/^\/\S+$/i.test(s)) return s
  return ''
}

function isAdminAuthed(req) {
  const auth = req.headers['authorization'] || ''
  if (auth === `Bearer ${LOCAL_ADMIN_TOKEN}`) return true
  const cookie = req.headers['cookie'] || ''
  return cookie.includes(`admin_token=${LOCAL_ADMIN_TOKEN}`)
}

/** 简易 multipart/form-data 解析（本地文件上传用） */
function parseMultipartBody(req, boundary) {
  return new Promise((resolve) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      try {
        const buf = Buffer.concat(chunks)
        const delim = Buffer.from(`--${boundary}`)
        const fields = {}
        const files = []
        let pos = 0
        while (pos < buf.length) {
          const start = buf.indexOf(delim, pos)
          if (start === -1) break
          let lineEnd = buf.indexOf(Buffer.from('\r\n'), start + delim.length)
          if (lineEnd === -1) lineEnd = buf.indexOf(Buffer.from('\n'), start + delim.length)
          if (lineEnd === -1) break
          const afterLine = buf.slice(start + delim.length, lineEnd).toString('latin1').trim()
          if (afterLine === '--') break
          const headerEnd = buf.indexOf(Buffer.from('\r\n\r\n'), lineEnd)
          if (headerEnd === -1) break
          const headersStr = buf.slice(lineEnd, headerEnd).toString('latin1')
          const nameMatch = headersStr.match(/name="([^"]+)"/)
          const fileMatch = headersStr.match(/filename="([^"]*)"/)
          const bodyStart = headerEnd + 4
          const nextDelim = buf.indexOf(delim, bodyStart)
          let bodyEnd = nextDelim === -1 ? buf.length : nextDelim
          // 去掉分隔前的 \r\n
          if (bodyEnd >= 2 && buf[bodyEnd - 2] === 13 && buf[bodyEnd - 1] === 10) bodyEnd -= 2
          const name = nameMatch ? nameMatch[1] : ''
          if (fileMatch) {
            const typeMatch = headersStr.match(/Content-Type:\s*([^\r\n]+)/i)
            files.push({
              name: fileMatch[1],
              type: (typeMatch ? typeMatch[1] : 'application/octet-stream').trim(),
              data: buf.slice(bodyStart, bodyEnd),
            })
            fields[name] = files[files.length - 1]
          } else {
            fields[name] = buf.slice(bodyStart, bodyEnd).toString('utf8')
          }
          pos = nextDelim === -1 ? buf.length : nextDelim
        }
        resolve({ fields, files })
      } catch {
        resolve({ fields: {}, files: [] })
      }
    })
    req.on('error', () => resolve({ fields: {}, files: [] }))
  })
}

function handleAdminApi(req, res) {
  let url
  try {
    url = new URL(req.url, 'http://localhost')
  } catch {
    return false
  }
  const route = url.pathname.slice('/admin'.length) || '/'

  // 页面导航（浏览器 Accept 含 text/html）放行给前端路由 / SPA fallback
  const accept = req.headers['accept'] || ''
  if (req.method === 'GET' && accept.includes('text/html')) return false

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.end()
    return true
  }

  const run = async () => {
    /* ---- 登录（无需鉴权） ---- */
    if (route === '/login' && req.method === 'POST') {
      const body = await readBody(req)
      if (String(body.password || '') !== ADMIN_PASSWORD) return send(res, 401, { error: '密码错误' })
      return send(res, 200, { ok: true, token: LOCAL_ADMIN_TOKEN })
    }

    /* ---- 验证 token ---- */
    if (route === '/auth' && req.method === 'GET') {
      return send(res, 200, { ok: isAdminAuthed(req) })
    }

    if (!isAdminAuthed(req)) return send(res, 401, { error: '未授权' })

    /* ---- 概览面板 ---- */
    if (route === '/dashboard' && req.method === 'GET') {
      const stats = loadStats()
      const k = dayKey()
      return send(res, 200, {
        articles: loadAdminArray(ADMIN_ARTICLES_FILE, 'articles').length,
        shuoshuo: loadAdminArray(ADMIN_SHUOSHUO_FILE, 'shuoshuo').length,
        comments: loadComments().comments.length,
        totalViews: stats.total || 0,
        todayViews: (stats.days && stats.days[k] && stats.days[k].pv) || 0,
        uv: Array.isArray(stats.visitors) ? stats.visitors.length : 0,
      })
    }

    /* ---- 文章管理 ---- */
    if (route === '/articles' && req.method === 'GET') {
      const list = loadAdminArray(ADMIN_ARTICLES_FILE, 'articles')
      let version = 0
      try { version = Number(fs.readFileSync(ADMIN_ARTICLES_VERSION_FILE, 'utf-8')) || 0 } catch {}
      return send(res, 200, { list, version })
    }

    if (route === '/articles' && req.method === 'POST') {
      const body = await readBody(req)
      const articles = loadAdminArray(ADMIN_ARTICLES_FILE, 'articles')
      const content = String(body.content || '')
      const slug = String(body.slug || body.title || '')
        .toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '') || `a${Date.now().toString(36)}`
      const article = {
        id: slug,
        slug,
        title: body.title || '无标题',
        excerpt: body.excerpt || content.substring(0, 120).replace(/[#*\n]/g, ' ').trim(),
        content,
        cover: body.cover || '',
        category: body.category || '未分类',
        tags: Array.isArray(body.tags) ? body.tags : [],
        date: body.date || new Date().toISOString().slice(0, 10),
        views: 0,
        likes: 0,
        readingTime: Math.max(1, Math.ceil(content.length / 500)),
        isPinned: body.isPinned || false,
        wordCount: content.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      articles.unshift(article)
      writeJson(ADMIN_ARTICLES_FILE, articles)
      writeJson(ADMIN_ARTICLES_VERSION_FILE, Date.now())
      return send(res, 200, { ok: true, article })
    }

    if (route === '/articles' && req.method === 'PUT') {
      const body = await readBody(req)
      const articles = loadAdminArray(ADMIN_ARTICLES_FILE, 'articles')
      const idx = articles.findIndex((a) => a.id === body.id)
      if (idx < 0) return send(res, 404, { error: '文章不存在' })
      articles[idx] = { ...articles[idx], ...body, updatedAt: new Date().toISOString() }
      writeJson(ADMIN_ARTICLES_FILE, articles)
      writeJson(ADMIN_ARTICLES_VERSION_FILE, Date.now())
      return send(res, 200, { ok: true, article: articles[idx] })
    }

    if (route === '/articles' && req.method === 'DELETE') {
      const body = await readBody(req)
      const articles = loadAdminArray(ADMIN_ARTICLES_FILE, 'articles')
      const filtered = articles.filter((a) => a.id !== body.id)
      writeJson(ADMIN_ARTICLES_FILE, filtered)
      writeJson(ADMIN_ARTICLES_VERSION_FILE, Date.now())
      return send(res, 200, { ok: true, removed: articles.length - filtered.length })
    }

    /* ---- Markdown 文件上传（文章） ---- */
    if (route === '/articles/upload' && req.method === 'POST') {
      const contentType = req.headers['content-type'] || ''
      const boundary = (contentType.match(/boundary=(.+)$/) || [])[1]
      if (!boundary) return send(res, 400, { error: '缺少 multipart boundary' })
      const { fields, files } = await parseMultipartBody(req, boundary)
      const file = files[0]
      if (!file || !/\.md$/i.test(file.name)) return send(res, 400, { error: '请上传 .md 文件' })
      const text = file.data.toString('utf8')
      let meta = {}
      let content = text
      const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
      if (fmMatch) {
        content = fmMatch[2]
        for (const line of fmMatch[1].split('\n')) {
          const m = line.match(/^(\w+):\s*(.*)$/)
          if (!m) continue
          let val = m[2].trim()
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
          if (val.startsWith('[') && val.endsWith(']')) {
            val = val.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
          }
          meta[m[1]] = val
        }
      }
      const articles = loadAdminArray(ADMIN_ARTICLES_FILE, 'articles')
      const slug = String(meta.slug || meta.id || file.name.replace(/\.md$/, ''))
      const article = {
        id: slug,
        slug,
        title: meta.title || file.name.replace(/\.md$/, ''),
        excerpt: meta.excerpt || meta.description || content.substring(0, 120).replace(/[#*\n]/g, ' ').trim(),
        content,
        cover: meta.cover || meta.image || '',
        category: meta.category || '未分类',
        tags: Array.isArray(meta.tags) ? meta.tags : (meta.tags ? String(meta.tags).split(',').map((t) => t.trim()) : []),
        date: meta.date || new Date().toISOString().slice(0, 10),
        views: 0,
        likes: 0,
        readingTime: Math.max(1, Math.ceil(content.length / 500)),
        isPinned: false,
        wordCount: content.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const existingIdx = articles.findIndex((a) => a.slug === slug || a.id === slug)
      if (existingIdx >= 0) articles[existingIdx] = { ...articles[existingIdx], ...article }
      else articles.unshift(article)
      writeJson(ADMIN_ARTICLES_FILE, articles)
      writeJson(ADMIN_ARTICLES_VERSION_FILE, Date.now())
      return send(res, 200, { ok: true, article })
    }

    /* ---- 说说管理 ---- */
    if (route === '/shuoshuo' && req.method === 'GET') {
      return send(res, 200, { list: loadAdminArray(ADMIN_SHUOSHUO_FILE, 'shuoshuo') })
    }

    if (route === '/shuoshuo' && req.method === 'POST') {
      const body = await readBody(req)
      const list = loadAdminArray(ADMIN_SHUOSHUO_FILE, 'shuoshuo')
      const item = {
        id: `s${Date.now().toString(36)}`,
        content: String(body.content || ''),
        mood: String(body.mood || ''),
        date: body.date || new Date().toISOString().slice(0, 19).replace('T', ' '),
        images: Array.isArray(body.images) ? body.images : [],
        createdAt: new Date().toISOString(),
      }
      list.unshift(item)
      writeJson(ADMIN_SHUOSHUO_FILE, list)
      return send(res, 200, { ok: true, item })
    }

    if (route === '/shuoshuo' && req.method === 'PUT') {
      const body = await readBody(req)
      const list = loadAdminArray(ADMIN_SHUOSHUO_FILE, 'shuoshuo')
      const idx = list.findIndex((s) => s.id === body.id)
      if (idx < 0) return send(res, 404, { error: '说说不存在' })
      list[idx] = { ...list[idx], ...body, updatedAt: new Date().toISOString() }
      writeJson(ADMIN_SHUOSHUO_FILE, list)
      return send(res, 200, { ok: true, item: list[idx] })
    }

    if (route === '/shuoshuo' && req.method === 'DELETE') {
      const body = await readBody(req)
      const list = loadAdminArray(ADMIN_SHUOSHUO_FILE, 'shuoshuo')
      const filtered = list.filter((s) => s.id !== body.id)
      writeJson(ADMIN_SHUOSHUO_FILE, filtered)
      return send(res, 200, { ok: true, removed: list.length - filtered.length })
    }

    if (route === '/shuoshuo/upload' && req.method === 'POST') {
      const contentType = req.headers['content-type'] || ''
      const boundary = (contentType.match(/boundary=(.+)$/) || [])[1]
      if (!boundary) return send(res, 400, { error: '缺少 multipart boundary' })
      const { fields, files } = await parseMultipartBody(req, boundary)
      const file = files[0]
      if (!file) return send(res, 400, { error: '请上传文件' })
      const list = loadAdminArray(ADMIN_SHUOSHUO_FILE, 'shuoshuo')
      const item = {
        id: `s${Date.now().toString(36)}`,
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        mood: String(fields.mood || ''),
        content: file.data.toString('utf8').trim(),
        images: [],
        createdAt: new Date().toISOString(),
      }
      list.unshift(item)
      writeJson(ADMIN_SHUOSHUO_FILE, list)
      return send(res, 200, { ok: true, item })
    }

    /* ---- 评论管理 ---- */
    if (route === '/comments' && req.method === 'GET') {
      const comments = loadComments().comments
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      return send(res, 200, { list: comments, total: comments.length })
    }

    if (route === '/comments' && req.method === 'DELETE') {
      const body = await readBody(req)
      const db = loadComments()
      const dead = new Set([String(body.id || '')])
      let grew = true
      while (grew) {
        grew = false
        for (const c of db.comments) {
          if (c.parentId && dead.has(c.parentId) && !dead.has(c.id)) {
            dead.add(c.id)
            grew = true
          }
        }
      }
      db.comments = db.comments.filter((c) => !dead.has(c.id))
      writeJson(COMMENTS_FILE, db)
      return send(res, 200, { ok: true, removed: dead.size })
    }

    /* ---- 友链申请 ---- */
    if (route === '/friends' && req.method === 'GET') {
      return send(res, 200, { list: loadFriendApplications().reverse() })
    }

    if (route === '/friends/status' && req.method === 'PUT') {
      const body = await readBody(req)
      const all = loadFriendApplications()
      const app = all.find((a) => a.id === body.id)
      if (!app) return send(res, 404, { error: '申请不存在' })
      const r = reviewFriendApplication({ id: body.id, status: body.status || 'approved', token: ADMIN_TOKEN })
      if (r.error) return send(res, 400, r)
      return send(res, 200, { ok: true })
    }

    /* ---- 友链列表管理（内置种子 + 申请通过 + 手动新增，后台可增删改） ---- */
    if (route === '/friend-list' && req.method === 'GET') {
      return send(res, 200, { list: loadFriendsList() })
    }

    if (route === '/friend-list' && req.method === 'POST') {
      const body = await readBody(req)
      const name = String(body.name || '').trim().slice(0, 60)
      const url = String(body.url || '').trim().slice(0, 200)
      if (!name || !url) return send(res, 400, { error: '站点名称和地址不能为空' })
      const list = loadFriendsList()
      if (list.some((f) => f.url === url)) return send(res, 400, { error: '该站点已在友链中' })
      list.unshift({
        id: `fl${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        name,
        url,
        avatar: String(body.avatar || '').trim().slice(0, 300),
        description: String(body.description || '').trim().slice(0, 200),
        tag: String(body.tag || '博客').trim().slice(0, 30),
      })
      saveFriendsList(list)
      return send(res, 200, { ok: true, item: list[0] })
    }

    if (route === '/friend-list' && req.method === 'PUT') {
      const body = await readBody(req)
      const list = loadFriendsList()
      const idx = list.findIndex((f) => f.id === body.id)
      if (idx < 0) return send(res, 404, { error: '友链不存在' })
      if (body.name !== undefined) list[idx].name = String(body.name).trim().slice(0, 60) || list[idx].name
      if (body.url !== undefined) list[idx].url = String(body.url).trim().slice(0, 200)
      if (body.avatar !== undefined) list[idx].avatar = String(body.avatar).trim().slice(0, 300)
      if (body.description !== undefined) list[idx].description = String(body.description).trim().slice(0, 200)
      if (body.tag !== undefined) list[idx].tag = String(body.tag).trim().slice(0, 30)
      saveFriendsList(list)
      return send(res, 200, { ok: true, item: list[idx] })
    }

    if (route === '/friend-list' && req.method === 'DELETE') {
      const body = await readBody(req)
      const list = loadFriendsList()
      const filtered = list.filter((f) => f.id !== body.id)
      saveFriendsList(filtered)
      return send(res, 200, { ok: true, removed: list.length - filtered.length })
    }

    /* ---- 种子合并导入（把内置静态内容补齐到后台存储，幂等） ---- */
    if (route === '/seed' && req.method === 'POST') {
      const body = await readBody(req)
      const type = String(body.type || '')
      const items = Array.isArray(body.items) ? body.items : []
      const cfg = SEED_FILES[type]
      if (!cfg || items.length === 0) return send(res, 400, { error: '参数不完整' })
      const list = loadAdminArray(cfg.file, type)
      // 去重键：文章/说说/相册按 id，友链按 url
      const keyOf = (it) => (type === 'friends' ? String(it.url || '') : String(it.id || it.slug || ''))
      const existing = new Set(list.map(keyOf))
      let added = 0
      for (const it of items) {
        const k = keyOf(it)
        if (!k || existing.has(k)) continue
        existing.add(k)
        list.push(it)
        added++
      }
      writeJson(cfg.file, list)
      return send(res, 200, { ok: true, added, total: list.length })
    }

    /* ---- 统计详情 ---- */
    if (route === '/stats' && req.method === 'GET') {
      const s = loadStats()
      const days = (s.days || {})
      const dayList = Object.keys(days)
        .sort()
        .slice(-30)
        .map((d) => ({ date: d, pv: days[d].pv || 0, uv: Array.isArray(days[d].uv) ? days[d].uv.length : 0 }))
      return send(res, 200, { total: s.total || 0, uv: (s.visitors || []).length, days: dayList })
    }

    /* ---- 画廊管理 ---- */
    if (route === '/gallery' && req.method === 'GET') {
      return send(res, 200, { list: loadGallery() })
    }

    if (route === '/gallery' && req.method === 'POST') {
      const body = await readBody(req)
      const albums = loadGallery()
      const album = {
        id: `g${Date.now().toString(36)}`,
        title: String(body.title || '未命名相册').trim().slice(0, 60) || '未命名相册',
        cover: '',
        photos: [],
        updatedAt: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
      }
      albums.unshift(album)
      saveGallery(albums)
      return send(res, 200, { ok: true, album })
    }

    if (route === '/gallery' && req.method === 'PUT') {
      const body = await readBody(req)
      const albums = loadGallery()
      const idx = albums.findIndex((a) => a.id === body.id)
      if (idx < 0) return send(res, 404, { error: '相册不存在' })
      if (body.title !== undefined) albums[idx].title = String(body.title).trim().slice(0, 60)
      if (Array.isArray(body.photos)) albums[idx].photos = body.photos
      if (body.cover !== undefined) albums[idx].cover = body.cover
      albums[idx].updatedAt = new Date().toISOString().slice(0, 10)
      saveGallery(albums)
      return send(res, 200, { ok: true, album: albums[idx] })
    }

    if (route === '/gallery' && req.method === 'DELETE') {
      const body = await readBody(req)
      const albums = loadGallery()
      const filtered = albums.filter((a) => a.id !== body.id)
      saveGallery(filtered)
      return send(res, 200, { ok: true, removed: albums.length - filtered.length })
    }

    /* ---- 画廊：批量 URL 添加照片（本模块核心：粘贴一堆 URL 即生成相册照片） ---- */
    if (route === '/gallery/urls' && req.method === 'POST') {
      const body = await readBody(req)
      const albumId = String(body.albumId || '')
      const raw = Array.isArray(body.photos) ? body.photos : []
      if (!albumId) return send(res, 400, { error: '缺少相册 ID' })
      if (!raw.length) return send(res, 400, { error: '请至少提供一个图片 URL' })

      const albums = loadGallery()
      const idx = albums.findIndex((a) => a.id === albumId)
      if (idx < 0) return send(res, 404, { error: '相册不存在' })
      if (!Array.isArray(albums[idx].photos)) albums[idx].photos = []

      let added = 0
      for (const item of raw) {
        const url = sanitizePhotoUrl(item && (item.url !== undefined ? item.url : item))
        if (!url) continue
        // 去重：同一相册内相同 URL 跳过
        if (albums[idx].photos.some((p) => p.url === url)) continue
        const orientation = item && item.orientation === 'portrait' ? 'portrait' : 'landscape'
        albums[idx].photos.push({
          id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          url,
          caption: (item && String(item.caption || '').trim().slice(0, 100)) || '',
          orientation,
        })
        added++
      }
      if (added === 0) return send(res, 400, { error: '没有可添加的有效图片 URL（需 http(s):// 或 / 开头的站内路径）' })

      // 第一张图自动设为封面
      if (!albums[idx].cover) albums[idx].cover = albums[idx].photos[0].url
      albums[idx].updatedAt = new Date().toISOString().slice(0, 10)
      saveGallery(albums)
      return send(res, 200, { ok: true, added, album: albums[idx] })
    }

    /* ---- 画廊：文件上传（本地存 server-data/uploads，URL 为 /local-api/gallery-image/:id） ---- */
    if (route === '/gallery/upload' && req.method === 'POST') {
      const contentType = req.headers['content-type'] || ''
      const boundary = (contentType.match(/boundary=(.+)$/) || [])[1]
      if (!boundary) return send(res, 400, { error: '缺少 multipart boundary' })
      const { fields, files } = await parseMultipartBody(req, boundary)
      const file = files[0]
      const albumId = String(fields.albumId || '')
      const caption = String(fields.caption || '')
      if (!file) return send(res, 400, { error: '请上传图片文件' })
      if (!albumId) return send(res, 400, { error: '缺少相册 ID' })
      if (!/^image\//i.test(file.type)) return send(res, 400, { error: '仅支持图片文件' })
      if (file.data.length > 5 * 1024 * 1024) return send(res, 400, { error: '图片不能超过 5MB' })

      const albums = loadGallery()
      const idx = albums.findIndex((a) => a.id === albumId)
      if (idx < 0) return send(res, 404, { error: '相册不存在' })
      if (!Array.isArray(albums[idx].photos)) albums[idx].photos = []

      const photoId = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
      ensureDir()
      fs.mkdirSync(UPLOADS_DIR, { recursive: true })
      fs.writeFileSync(path.join(UPLOADS_DIR, `${photoId}.img`), file.data)
      fs.writeFileSync(path.join(UPLOADS_DIR, `${photoId}.json`), JSON.stringify({ type: file.type }))

      const photo = {
        id: photoId,
        caption: caption.slice(0, 100),
        orientation: 'landscape',
        url: `/local-api/gallery-image/${photoId}`,
      }
      albums[idx].photos.push(photo)
      if (!albums[idx].cover) albums[idx].cover = photo.url
      albums[idx].updatedAt = new Date().toISOString().slice(0, 10)
      saveGallery(albums)
      return send(res, 200, { ok: true, photo })
    }

    /* ---- 画廊：单张照片删除 ---- */
    if (route === '/gallery/photo' && req.method === 'DELETE') {
      const body = await readBody(req)
      const albums = loadGallery()
      let removed = false
      for (const album of albums) {
        if (!Array.isArray(album.photos)) continue
        const before = album.photos.length
        album.photos = album.photos.filter((p) => p.id !== body.id)
        if (album.photos.length !== before) {
          removed = true
          if (album.cover && album.photos.length > 0 && !album.photos.some((p) => p.url === album.cover)) {
            album.cover = album.photos[0].url
          } else if (album.photos.length === 0) {
            album.cover = ''
          }
          album.updatedAt = new Date().toISOString().slice(0, 10)
          break
        }
      }
      if (!removed) return send(res, 404, { error: '照片不存在' })
      saveGallery(albums)
      return send(res, 200, { ok: true, removed: 1 })
    }

    /* ---- 画廊：批量照片删除（跨相册，按 id 集合） ---- */
    if (route === '/gallery/photos' && req.method === 'DELETE') {
      const body = await readBody(req)
      const ids = Array.isArray(body.ids) ? body.ids.map(String) : []
      if (!ids.length) return send(res, 400, { error: '请选择要删除的照片' })
      const idSet = new Set(ids)
      const albums = loadGallery()
      let removed = 0
      for (const album of albums) {
        if (!Array.isArray(album.photos)) continue
        const before = album.photos.length
        album.photos = album.photos.filter((p) => !idSet.has(p.id))
        const delta = before - album.photos.length
        if (delta > 0) {
          removed += delta
          if (album.cover && album.photos.length > 0 && !album.photos.some((p) => p.url === album.cover)) {
            album.cover = album.photos[0].url
          } else if (album.photos.length === 0) {
            album.cover = ''
          }
          album.updatedAt = new Date().toISOString().slice(0, 10)
        }
      }
      saveGallery(albums)
      return send(res, 200, { ok: true, removed })
    }

    /* ---- 画廊：照片信息更新（caption / orientation） ---- */
    if (route === '/gallery/photo' && req.method === 'PUT') {
      const body = await readBody(req)
      const albums = loadGallery()
      for (const album of albums) {
        if (!Array.isArray(album.photos)) continue
        const photo = album.photos.find((p) => p.id === body.id)
        if (photo) {
          if (body.caption !== undefined) photo.caption = String(body.caption).slice(0, 100)
          if (body.orientation !== undefined) photo.orientation = body.orientation === 'portrait' ? 'portrait' : 'landscape'
          album.updatedAt = new Date().toISOString().slice(0, 10)
          saveGallery(albums)
          return send(res, 200, { ok: true, photo })
        }
      }
      return send(res, 404, { error: '照片不存在' })
    }

    return send(res, 404, { error: 'not found', route })
  }

  run().catch((e) => send(res, 500, { error: 'server error', message: String(e && e.message) }))
  return true
}

module.exports = { handleLocalApi, PREFIX, DATA_DIR }
