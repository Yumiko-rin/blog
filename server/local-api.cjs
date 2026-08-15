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

    /* ---- 前台文章/说说列表（本地开发返回空列表，前端会 fallback 到静态数据） ---- */
    if (route === '/articles' && req.method === 'GET') return send(res, 200, { list: [] })
    if (route === '/shuoshuo' && req.method === 'GET') return send(res, 200, { list: [] })

    return send(res, 404, { error: 'not found', route })
  }

  run().catch((e) => send(res, 500, { error: 'server error', message: String(e && e.message) }))
  return true
}

module.exports = { handleLocalApi, PREFIX, DATA_DIR }
