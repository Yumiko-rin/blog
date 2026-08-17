/**
 * Cloudflare Pages Function: /local-api/comments 端点
 * ------------------------------------------------------------------
 * 在 Cloudflare Pages 上提供评论系统后端，使用 KV 持久化存储。
 * 与本地 server/local-api.cjs 接口完全兼容：
 *   GET  /local-api/comments        — 列表（分页 / 排序）
 *   POST /local-api/comments        — 发表
 *   POST /local-api/comments/like   — 点赞 / 取消
 *   POST /local-api/comments/delete — 删除（本人或管理员）
 *   GET  /local-api/comments/count  — 批量计数
 *   GET  /local-api/stats           — 访问统计（简化版）
 *
 * KV 绑定名：COMMENTS_KV（在 wrangler.toml 中配置）
 * 如果 KV 未绑定，降级返回空数据（前端 localStorage 兜底）。
 */

// 内置种子：KV 为空时自动导入内置静态内容（画廊相册等）
import { SEED_GALLERY_ALBUMS } from '../../src/seed/gallery'

interface CommentRow {
  id: string
  path: string
  nick: string
  mail: string
  link: string
  content: string
  avatar: string
  parentId: string
  replyTo: string
  createdAt: string
  likedBy: string[]
  ownerToken: string
  admin: boolean
  cid: string
}

interface Env {
  COMMENTS_KV?: KVNamespace
}

const ADMIN_TOKEN = 'kirameku-admin'
const ADMIN_MAIL = 'jaychou8421@gmail.com'
const ADMIN_NICK = 'jay'
const NICK_MAX = 24
const CONTENT_MAX = 1000
const POST_INTERVAL_MS = 5000

/* 头像池：混合多种风格，增加多样性 */
const AVATAR_POOL: string[] = [
  ...Array.from({ length: 24 }, (_, i) => `/avatars/dmoe_${String(i + 1).padStart(2, '0')}.jpg`),
  ...Array.from({ length: 8 }, (_, i) => `/avatars/avatar_${String(i + 1).padStart(2, '0')}.png`),
  '/avatars/real_15.jpg',
  '/avatars/friend_ringo.png',
  '/avatars/friend_yukina.png',
]
const AVATAR_TOTAL = AVATAR_POOL.length

/* ===== 工具函数 ===== */

async function sha256(s: string): Promise<string> {
  const data = new TextEncoder().encode(s)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function avatarFor(seed: string): string {
  let h = 5381
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0
  return AVATAR_POOL[h % AVATAR_TOTAL]
}

function safeLink(v: unknown): string {
  const s = String(v || '').trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s.slice(0, 200)
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(s)) return `https://${s.slice(0, 200)}`
  return ''
}

function publicComment(c: CommentRow, viewer: string) {
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

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const text = await req.text()
    return text ? JSON.parse(text) : {}
  } catch {
    return {}
  }
}

async function getClientId(req: Request): Promise<string> {
  const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const ua = req.headers.get('user-agent') || ''
  return (await sha256(`${ip}|${ua}`)).slice(0, 20)
}

/* ===== KV 存储层 ===== */

const KV_KEY_COMMENTS = 'comments_data'
const KV_KEY_LASTPOST = 'lastpost_map'

async function loadComments(kv?: KVNamespace): Promise<CommentRow[]> {
  if (!kv) return []
  try {
    const raw = await kv.get(KV_KEY_COMMENTS)
    if (!raw) return []
    const d = JSON.parse(raw)
    return Array.isArray(d?.comments) ? d.comments : []
  } catch {
    return []
  }
}

async function saveComments(kv: KVNamespace, comments: CommentRow[]): Promise<void> {
  await kv.put(KV_KEY_COMMENTS, JSON.stringify({ comments }))
}

async function getLastPostMap(kv?: KVNamespace): Promise<Record<string, number>> {
  if (!kv) return {}
  try {
    const raw = await kv.get(KV_KEY_LASTPOST)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

async function saveLastPostMap(kv: KVNamespace, map: Record<string, number>): Promise<void> {
  await kv.put(KV_KEY_LASTPOST, JSON.stringify(map))
}

/* ===== 评论操作 ===== */

function listComments(comments: CommentRow[], query: URLSearchParams, viewer: string) {
  const p = (query.get('path') || '').trim()
  const page = Math.max(1, parseInt(query.get('page') || '1', 10) || 1)
  const pageSize = Math.min(50, Math.max(1, parseInt(query.get('pageSize') || '10', 10) || 10))
  const sort = query.get('sort') === 'hot' ? 'hot' : 'new'

  const all = comments.filter(c => !p || c.path === p)
  const roots = all.filter(c => !c.parentId)
  const byTime = (a: CommentRow, b: CommentRow) => +new Date(b.createdAt) - +new Date(a.createdAt)
  const byHot = (a: CommentRow, b: CommentRow) => {
    const la = (a.likedBy || []).length
    const lb = (b.likedBy || []).length
    return lb - la || byTime(a, b)
  }
  roots.sort(sort === 'hot' ? byHot : byTime)

  const start = (page - 1) * pageSize
  const pageRoots = roots.slice(start, start + pageSize)

  const floorMap = new Map<string, number>()
  ;[...roots].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)).forEach((c, i) => {
    floorMap.set(c.id, i + 1)
  })

  const data = pageRoots.map(root => {
    const children: CommentRow[] = []
    const walk = (parentId: string) => {
      all.filter(c => c.parentId === parentId)
        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
        .forEach(c => { children.push(c); walk(c.id) })
    }
    walk(root.id)
    return {
      ...publicComment(root, viewer),
      floor: floorMap.get(root.id) || 0,
      children: children.map(c => publicComment(c, viewer)),
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

async function createComment(body: Record<string, unknown>, req: Request, kv: KVNamespace, cid: string) {
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

  // 频率限制
  const now = Date.now()
  const lastPostMap = await getLastPostMap(kv)
  const prev = lastPostMap[cid] || 0
  if (now - prev < POST_INTERVAL_MS) {
    return { error: `发表太频繁，请 ${Math.ceil((POST_INTERVAL_MS - (now - prev)) / 1000)} 秒后再试` }
  }

  const comments = await loadComments(kv)

  // 重复内容拦截
  const dup = comments.find(c =>
    c.path === p && c.nick === nick && c.content === content &&
    now - +new Date(c.createdAt) < 60000
  )
  if (dup) return { error: '重复的评论内容' }

  let replyTo = ''
  if (parentId) {
    const parent = comments.find(c => c.id === parentId)
    if (!parent) return { error: '被回复的评论不存在' }
    replyTo = parent.nick
  }

  const comment: CommentRow = {
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

  comments.push(comment)
  await saveComments(kv, comments)

  lastPostMap[cid] = now
  await saveLastPostMap(kv, lastPostMap)

  return { ok: true, comment: publicComment(comment, token) }
}

async function toggleLike(body: Record<string, unknown>, kv: KVNamespace) {
  const id = String(body.id || '')
  const token = String(body.token || '').trim().slice(0, 64)
  if (!id || !token) return { error: '参数不完整' }

  const comments = await loadComments(kv)
  const c = comments.find(x => x.id === id)
  if (!c) return { error: '评论不存在' }

  if (!Array.isArray(c.likedBy)) c.likedBy = []
  const i = c.likedBy.indexOf(token)
  if (i >= 0) c.likedBy.splice(i, 1)
  else c.likedBy.push(token)

  await saveComments(kv, comments)
  return { ok: true, likes: c.likedBy.length, liked: i < 0 }
}

async function removeComment(body: Record<string, unknown>, kv: KVNamespace) {
  const id = String(body.id || '')
  const token = String(body.token || '').trim().slice(0, 64)
  const mail = String(body.mail || '').trim().slice(0, 120)
  if (!id) return { error: '参数不完整' }

  const comments = await loadComments(kv)
  const c = comments.find(x => x.id === id)
  if (!c) return { error: '评论不存在' }

  const isAdmin = token === ADMIN_TOKEN || (mail && mail.toLowerCase() === ADMIN_MAIL.toLowerCase())
  if (!isAdmin) return { error: '只有博主可以删除评论' }

  // 连带删除所有后代
  const dead = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const x of comments) {
      if (x.parentId && dead.has(x.parentId) && !dead.has(x.id)) {
        dead.add(x.id)
        grew = true
      }
    }
  }
  const filtered = comments.filter(x => !dead.has(x.id))
  await saveComments(kv, filtered)
  return { ok: true, removed: dead.size }
}

function countComments(comments: CommentRow[], query: URLSearchParams) {
  const paths = (query.get('paths') || '').split(',').map(s => s.trim()).filter(Boolean)
  const map: Record<string, number> = {}
  if (paths.length) {
    for (const p of paths) map[p] = comments.filter(c => c.path === p).length
  } else {
    for (const c of comments) map[c.path] = (map[c.path] || 0) + 1
  }
  return { ok: true, counts: map, total: comments.length }
}

/* ===== 主入口 ===== */

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)
  const route = url.pathname.replace('/local-api', '') || '/'

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  const kv = env.COMMENTS_KV
  const q = url.searchParams
  const viewer = (q.get('token') || '').trim().slice(0, 64)

  try {
    // 健康检查
    if (route === '/health') return json({ ok: true, time: new Date().toISOString() })

    // 评论列表
    if (route === '/comments' && request.method === 'GET') {
      const comments = await loadComments(kv)
      return json(listComments(comments, q, viewer))
    }

    // 评论计数
    if (route === '/comments/count' && request.method === 'GET') {
      const comments = await loadComments(kv)
      return json(countComments(comments, q))
    }

    // 发表评论
    if (route === '/comments' && request.method === 'POST') {
      if (!kv) return json({ error: 'KV not configured' }, 503)
      const body = await readBody(request)
      const cid = await getClientId(request)
      const r = await createComment(body, request, kv, cid)
      return json(r, r.error ? 400 : 200)
    }

    // 点赞
    if (route === '/comments/like' && request.method === 'POST') {
      if (!kv) return json({ error: 'KV not configured' }, 503)
      const body = await readBody(request)
      const r = await toggleLike(body, kv)
      return json(r, r.error ? 400 : 200)
    }

    // 删除
    if (route === '/comments/delete' && request.method === 'POST') {
      if (!kv) return json({ error: 'KV not configured' }, 503)
      const body = await readBody(request)
      const r = await removeComment(body, kv)
      return json(r, r.error ? 400 : 200)
    }

    // 访问统计（简化版，KV 存储总浏览数）
    if (route === '/stats' && request.method === 'GET') {
      if (!kv) return json({ total: 0, today: 0, todayUv: 0, uv: 0, days: 0, recent: [], source: 'kv' })
      const raw = await kv.get('stats_data')
      const s = raw ? JSON.parse(raw) : { total: 0, visitors: [], days: {} }
      const dayKey = new Date().toISOString().slice(0, 10)
      const today = s.days?.[dayKey] || { pv: 0, uv: [] }
      return json({
        total: s.total || 0,
        today: today.pv || 0,
        todayUv: Array.isArray(today.uv) ? today.uv.length : 0,
        uv: s.visitors?.length || 0,
        days: Object.keys(s.days || {}).length,
        recent: [],
        source: 'kv',
      })
    }

    // 访问记录
    if (route === '/stats/visit' && request.method === 'POST') {
      if (!kv) return json({ total: 0, source: 'kv' })
      const raw = await kv.get('stats_data')
      const s = raw ? JSON.parse(raw) : { total: 0, visitors: [], days: {} }
      const cid = await getClientId(request)
      const dayKey = new Date().toISOString().slice(0, 10)
      if (!s.days) s.days = {}
      if (!s.days[dayKey]) s.days[dayKey] = { pv: 0, uv: [] }
      s.total = (s.total || 0) + 1
      s.days[dayKey].pv = (s.days[dayKey].pv || 0) + 1
      if (!s.days[dayKey].uv.includes(cid)) s.days[dayKey].uv.push(cid)
      if (!s.visitors) s.visitors = []
      if (!s.visitors.includes(cid)) s.visitors.push(cid)
      if (s.visitors.length > 20000) s.visitors = s.visitors.slice(-20000)
      await kv.put('stats_data', JSON.stringify(s))
      return json({ total: s.total, today: s.days[dayKey].pv, source: 'kv' })
    }

    // 音乐流式代理：/local-api/music-stream?type=pic|url|lrc&id=<neteaseId>
    // 与本地 server/local-api.cjs 的 /music-stream 端点完全兼容
    // 服务端跟随 302 重定向，避免浏览器 mixed-content 问题
    if (route === '/music-stream' && request.method === 'GET') {
      const type = q.get('type') || 'url'
      const id = q.get('id')
      if (!id) return json({ error: 'missing id' }, 400)

      // type=pic: meting.naihee.com 的 type=pic 返回 500，改用 api.injahow.cn
      if (type === 'pic') {
        const picMetingUrl = `https://api.injahow.cn/meting/?server=netease&type=pic&id=${encodeURIComponent(id)}`
        const picRes = await fetch(picMetingUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          redirect: 'manual',
        })
        if (picRes.status === 301 || picRes.status === 302) {
          const loc = picRes.headers.get('location')
          if (loc) {
            const imgRes = await fetch(loc, { redirect: 'follow' })
            return new Response(imgRes.body, {
              status: imgRes.status,
              headers: {
                'Content-Type': imgRes.headers.get('content-type') || 'image/jpeg',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=3600',
              },
            })
          }
        }
        return json({ error: 'failed to resolve pic' }, 502)
      }

      const metingUrl = `https://meting.naihee.com/api?server=netease&type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`
      const range = request.headers.get('range')

      const reqHeaders = new Headers()
      if (range) reqHeaders.set('Range', range)
      reqHeaders.set('Referer', 'https://music.163.com/')
      reqHeaders.set('User-Agent', 'Mozilla/5.0 (compatible; CloudflarePages/1.0)')

      const upstream = await fetch(metingUrl, {
        method: 'GET',
        headers: reqHeaders,
        redirect: 'manual',
      })

      // 302 → 服务端跟随到网易云签名 URL（mp3 或图片），再以 HTTPS 回传字节
      if (upstream.status === 301 || upstream.status === 302) {
        const loc = upstream.headers.get('location')
        if (loc) {
          const followHeaders = new Headers()
          if (range) followHeaders.set('Range', range)
          followHeaders.set('Referer', 'https://music.163.com/')
          const followed = await fetch(loc, { headers: followHeaders, redirect: 'follow' })
          const out = new Response(followed.body, {
            status: followed.status,
            headers: {
              'Content-Type': followed.headers.get('content-type') || (type === 'pic' ? 'image/jpeg' : 'audio/mpeg'),
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'public, max-age=3600',
            },
          })
          const cl = followed.headers.get('content-length')
          if (cl) out.headers.set('Content-Length', cl)
          const cr = followed.headers.get('content-range')
          if (cr) out.headers.set('Content-Range', cr)
          return out
        }
      }

      // 非 302（如歌词 JSON）原样回传
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          'Content-Type': upstream.headers.get('content-type') || 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300',
        },
      })
    }

    /* ===== 公开数据接口：文章 / 说说 / 画廊 / 友链 ===== */

    // 画廊相册列表（从 KV 读取后台发布的相册，前台实时同步；KV 为空时导入内置相册）
    if (route === '/gallery' && request.method === 'GET') {
      try {
        const raw = await kv?.get('admin_gallery')
        let list = raw ? JSON.parse(raw) : []
        if (!Array.isArray(list)) list = []
        if (list.length === 0 && Array.isArray(SEED_GALLERY_ALBUMS) && SEED_GALLERY_ALBUMS.length > 0 && kv) {
          await kv.put('admin_gallery', JSON.stringify(SEED_GALLERY_ALBUMS))
          list = SEED_GALLERY_ALBUMS
        }
        return json({ list, source: 'kv' })
      } catch {
        return json({ list: [], source: 'kv' })
      }
    }

    // 文章列表（从 KV 读取后台发布的文章）
    if (route === '/articles' && request.method === 'GET') {
      try {
        const [raw, versionRaw] = await Promise.all([
          kv?.get('admin_articles'),
          kv?.get('articles_version'),
        ])
        const list = raw ? JSON.parse(raw) : []
        const version = versionRaw ? Number(versionRaw) : 0
        return json({ list: Array.isArray(list) ? list : [], version, source: 'kv' })
      } catch {
        return json({ list: [], version: 0, source: 'kv' })
      }
    }

    // 说说列表（从 KV 读取后台发布的说说）
    if (route === '/shuoshuo' && request.method === 'GET') {
      try {
        const raw = await kv?.get('admin_shuoshuo')
        const list = raw ? JSON.parse(raw) : []
        return json({ list: Array.isArray(list) ? list : [], source: 'kv' })
      } catch {
        return json({ list: [], source: 'kv' })
      }
    }

    // 友链列表（后台友链表：内置种子 + 申请通过 + 手动新增；兼容旧的 approved 申请）
    if (route === '/friends' && request.method === 'GET') {
      try {
        const raw = await kv?.get('admin_friends')
        const friendList: any[] = raw ? JSON.parse(raw) : []
        const list = Array.isArray(friendList) ? friendList : []

        // 兼容旧数据：把 friend_applications 中已批准的申请也并入（去重）
        const appsRaw = await kv?.get('friend_applications')
        const apps: any[] = appsRaw ? JSON.parse(appsRaw) : []
        if (Array.isArray(apps)) {
          const urls = new Set(list.map((f: any) => f.url))
          for (const a of apps.filter((x: any) => x.status === 'approved')) {
            if (a.url && !urls.has(a.url)) {
              urls.add(a.url)
              list.push({
                id: a.id || `friend-${a.name}`,
                name: a.name || '',
                url: a.url || '',
                avatar: a.avatar || '',
                description: a.description || '',
                tag: a.tag || '博客',
              })
            }
          }
        }
        return json({ list, source: 'kv' })
      } catch {
        return json({ list: [], source: 'kv' })
      }
    }

    // 友链申请提交（与前端 Friends.tsx 路由一致）
    if (route === '/friend-applications' && request.method === 'POST') {
      if (!kv) return json({ error: 'KV not configured' }, 503)
      const body = await readBody(request)
      const name = String(body.name || '').trim().slice(0, 60)
      const url = String(body.url || '').trim().slice(0, 200)
      const avatar = String(body.avatar || '').trim().slice(0, 300)
      const description = String(body.description || '').trim().slice(0, 200)
      const email = String(body.email || '').trim().slice(0, 120)
      const message = String(body.message || '').trim().slice(0, 500)
      const token = String(body.token || '').trim().slice(0, 64)

      const URL_RE = /^https?:\/\/[\w-]+(\.[\w-]+)+([/?#].*)?$/i
      const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      if (name.length < 2 || name.length > 24) return json({ error: '站点名称需为 2~24 个字符' }, 400)
      if (!URL_RE.test(url)) return json({ error: '站点地址需为合法的 http(s):// 网址' }, 400)
      if (!avatar) return json({ error: '请填写头像链接' }, 400)
      if (!URL_RE.test(avatar)) return json({ error: '头像链接需为合法的 http(s):// 图片地址' }, 400)
      if (email && !EMAIL_RE.test(email)) return json({ error: '邮箱格式不正确' }, 400)

      try {
        const raw = await kv.get('friend_applications')
        const list: any[] = raw ? JSON.parse(raw) : []
        const dup = list.find((a: any) => a.url === url && (a.status === 'pending' || a.status === 'approved'))
        if (dup) {
          return json({ error: dup.status === 'approved' ? '该站点已是友链' : '该站点已提交过申请，请等待审核' }, 400)
        }

        const app = {
          id: `fa${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          name,
          url,
          avatar,
          description,
          email,
          message,
          tag: '博客',
          status: 'pending',
          createdAt: new Date().toISOString(),
          ownerToken: token,
        }
        list.push(app)
        await kv.put('friend_applications', JSON.stringify(list))

        const publicApp = {
          id: app.id,
          name: app.name,
          url: app.url,
          avatar: app.avatar || '',
          description: app.description || '',
          email: app.email || '',
          message: app.message || '',
          status: app.status,
          createdAt: app.createdAt,
          mine: !!token,
        }
        return json({ ok: true, application: publicApp })
      } catch {
        return json({ error: '申请失败' }, 500)
      }
    }

    // 查询我的友链申请
    if (route === '/friend-applications' && request.method === 'GET') {
      try {
        const raw = await kv?.get('friend_applications')
        const list: any[] = raw ? JSON.parse(raw) : []
        const mine = list.filter((a: any) => a.ownerToken === viewer)
        return json({
          ok: true,
          list: mine.map((a: any) => ({
            id: a.id,
            name: a.name,
            url: a.url,
            avatar: a.avatar || '',
            description: a.description || '',
            status: a.status || 'pending',
            createdAt: a.createdAt,
            mine: true,
          })),
        })
      } catch {
        return json({ ok: true, list: [] })
      }
    }

    // 获取已通过的友链
    if (route === '/friend-applications/approved' && request.method === 'GET') {
      try {
        const raw = await kv?.get('friend_applications')
        const list: any[] = raw ? JSON.parse(raw) : []
        const approved = list
          .filter((a: any) => a.status === 'approved')
          .map((a: any) => ({
            id: a.id || `friend-${a.name}`,
            name: a.name || '',
            url: a.url || '',
            avatar: a.avatar || '',
            description: a.description || '',
            tag: a.tag || '博客',
          }))
        return json({ ok: true, list: approved })
      } catch {
        return json({ ok: true, list: [] })
      }
    }

    return json({ error: 'not found', route }, 404)
  } catch (e) {
    return json({ error: 'server error', message: String(e instanceof Error ? e.message : e) }, 500)
  }
}
