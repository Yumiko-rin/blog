/**
 * Cloudflare Pages Function: /admin/* 后台管理 API
 * ------------------------------------------------------------------
 * 鉴权：密码登录 → 签发 JWT（HttpOnly Cookie + Bearer Token 双通道）
 * 数据：文章/说说/友链/画廊存 KV（JSON），评论/统计复用现有 KV 数据
 *
 * 内置种子：首次使用（KV 对应键为空）时自动导入内置静态内容，
 * 使后台能直接管理前台已有的文章/说说/友链/画廊相册。
 */

// 内置种子（由 scripts/export-seeds.cjs 生成，勿手改）
import { SEED_ARTICLES } from '../../src/seed/articles'
import { SEED_SHUOSHUO } from '../../src/seed/shuoshuo'
import { SEED_FRIENDS } from '../../src/seed/friends'
import { SEED_GALLERY_ALBUMS } from '../../src/seed/gallery'

interface Env {
  COMMENTS_KV?: KVNamespace
}

interface AdminEnv extends Env {
  ADMIN_KV?: KVNamespace
  ADMIN_PASSWORD?: string
  JWT_SECRET?: string
  ASSETS?: { fetch: (req: Request) => Promise<Response> }
}

const ADMIN_PASSWORD = '123456'
const JWT_SECRET = 'kirameki-jwt-secret-2026-very-long'

function getAdminPassword(env?: AdminEnv): string {
  return env?.ADMIN_PASSWORD || ADMIN_PASSWORD
}

function getJwtSecret(env?: AdminEnv): string {
  return env?.JWT_SECRET || JWT_SECRET
}

/* ===== 工具函数 ===== */

function json(data: unknown, status = 200, cookie?: string): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
  if (cookie) headers['Set-Cookie'] = cookie
  return new Response(JSON.stringify(data), { status, headers })
}

async function readBody(req: Request): Promise<Record<string, any>> {
  try {
    const text = await req.text()
    return text ? JSON.parse(text) : {}
  } catch {
    return {}
  }
}

async function signJWT(payload: Record<string, any>, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 7 * 24 * 3600 * 1000 }))
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`))
  const sigStr = btoa(String.fromCharCode(...new Uint8Array(sig)))
  return `${header}.${body}.${sigStr}`
}

async function verifyJWT(token: string, secret: string): Promise<boolean> {
  try {
    const [header, body, sig] = token.split('.')
    if (!header || !body || !sig) return false
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    )
    const sigBytes = Uint8Array.from(atob(sig), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(`${header}.${body}`))
    if (!valid) return false
    const payload = JSON.parse(atob(body))
    return payload.exp > Date.now()
  } catch {
    return false
  }
}

function getToken(req: Request): string | null {
  const auth = req.headers.get('Authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  const cookie = req.headers.get('Cookie') || ''
  const m = cookie.match(/admin_token=([^;]+)/)
  return m ? m[1] : null
}

async function requireAuth(req: Request, secret: string): Promise<boolean> {
  const token = getToken(req)
  if (!token) return false
  return verifyJWT(token, secret)
}

/* ===== KV 存储层 ===== */

const KV_ARTICLES = 'admin_articles'
const KV_SHUOSHUO = 'admin_shuoshuo'
const KV_FRIENDS = 'admin_friends'
const KV_GALLERY = 'admin_gallery'
const KV_ARTICLES_VERSION = 'articles_version'

/** 写入文章数据时同步更新版本号（用于前台缓存失效判断） */
async function kvSetArticles(kv: KVNamespace | undefined, data: unknown): Promise<void> {
  await kvSet(kv, KV_ARTICLES, data)
  await kvSet(kv, KV_ARTICLES_VERSION, Date.now())
}

/** 内置种子映射：对应 KV 为空时自动导入（后台可管理前台已有的静态内容） */
const SEED_MAP: { key: string; seed: any[] }[] = [
  { key: KV_ARTICLES, seed: SEED_ARTICLES },
  { key: KV_SHUOSHUO, seed: SEED_SHUOSHUO },
  { key: KV_FRIENDS, seed: SEED_FRIENDS },
  { key: KV_GALLERY, seed: SEED_GALLERY_ALBUMS },
]

/** 计算种子内容指纹（djb2 哈希），用于判断内置种子是否相对 KV 已变更 */
function hashSeed(arr: unknown): string {
  const s = JSON.stringify(arr)
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  }
  return h.toString(36)
}

/**
 * 确保 KV 中存在对应数据：
 * - 首次（KV 空）或内置种子内容已变更 → 用最新种子覆盖写入（保证部署后线上自动更新）
 * - 种子未变 → 保留 KV 现有数据（含用户在后台的手动改动）
 */
async function ensureSeed(kv: KVNamespace | undefined, key: string): Promise<any[]> {
  const cfg = SEED_MAP.find(m => m.key === key)
  const existing = await kvGet<any[]>(kv, key)
  if (!kv || !cfg || !Array.isArray(cfg.seed) || cfg.seed.length === 0) {
    return existing || []
  }
  const newHash = hashSeed(cfg.seed)
  const oldHash = await kvGet<string>(kv, key + '_seedhash')
  if (!Array.isArray(existing) || existing.length === 0 || oldHash !== newHash) {
    await kvSet(kv, key, cfg.seed)
    await kvSet(kv, key + '_seedhash', newHash)
    if (key === KV_ARTICLES) await kvSet(kv, KV_ARTICLES_VERSION, Date.now())
    return cfg.seed
  }
  return existing
}

async function kvGet<T>(kv: KVNamespace | undefined, key: string): Promise<T | null> {
  if (!kv) return null
  try {
    const raw = await kv.get(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

async function kvSet(kv: KVNamespace, key: string, data: unknown): Promise<void> {
  await kv.put(key, JSON.stringify(data))
}

/* ===== 评论/统计（复用 COMMENTS_KV）===== */

async function loadComments(kv?: KVNamespace): Promise<any[]> {
  if (!kv) return []
  try {
    const raw = await kv.get('comments_data')
    if (!raw) return []
    const d = JSON.parse(raw)
    return Array.isArray(d?.comments) ? d.comments : []
  } catch {
    return []
  }
}

async function saveComments(kv: KVNamespace, comments: any[]): Promise<void> {
  await kv.put('comments_data', JSON.stringify({ comments }))
}

async function loadStats(kv?: KVNamespace): Promise<any> {
  if (!kv) return { total: 0, today: 0, uv: 0 }
  try {
    const raw = await kv.get('stats_data')
    return raw ? JSON.parse(raw) : { total: 0, visitors: [], days: {} }
  } catch {
    return { total: 0, visitors: [], days: {} }
  }
}

/* ===== 主入口 ===== */

export const onRequest: PagesFunction<AdminEnv> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)
  const route = url.pathname.replace('/admin', '') || '/'

  // SPA 页面导航（浏览器请求 Accept 包含 text/html）直接放行，交给前端路由
  // API 调用：Accept 不包含 text/html
  const accept = request.headers.get('Accept') || ''
  if (request.method === 'GET' && accept.includes('text/html')) {
    return context.next()
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  const kv = env.COMMENTS_KV
  const adminKv = env.ADMIN_KV || env.COMMENTS_KV // 复用同一 KV
  const jwtSecret = getJwtSecret(env)
  const adminPassword = getAdminPassword(env)

  try {
    /* ---- 登录 ---- */
    if (route === '/login' && request.method === 'POST') {
      const body = await readBody(request)
      if (body.password !== adminPassword) {
        return json({ error: '密码错误' }, 401)
      }
      const token = await signJWT({ role: 'admin' }, jwtSecret)
      const cookie = `admin_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`
      return json({ ok: true, token }, 200, cookie)
    }

    /* ---- 验证 token ---- */
    if (route === '/auth' && request.method === 'GET') {
      const ok = await requireAuth(request, jwtSecret)
      return json({ ok })
    }

    /* ---- 以下路由需要鉴权 ---- */
    const authed = await requireAuth(request, jwtSecret)
    if (!authed) return json({ error: '未授权' }, 401)

    /* ---- 概览面板 ---- */
    if (route === '/dashboard' && request.method === 'GET') {
      const comments = await loadComments(kv)
      const stats = await loadStats(kv)
      const articles = await ensureSeed(adminKv, KV_ARTICLES)
      const shuoshuo = await ensureSeed(adminKv, KV_SHUOSHUO)
      const dayKey = new Date().toISOString().slice(0, 10)
      return json({
        articles: articles.length,
        shuoshuo: shuoshuo.length,
        comments: comments.length,
        totalViews: stats.total || 0,
        todayViews: stats.days?.[dayKey]?.pv || 0,
        uv: stats.visitors?.length || 0,
      })
    }

    /* ---- 文章管理 ---- */
    if (route === '/articles' && request.method === 'GET') {
      const articles = await ensureSeed(adminKv, KV_ARTICLES)
      return json({ list: articles })
    }

    if (route === '/articles' && request.method === 'POST') {
      const body = await readBody(request)
      const articles = await kvGet<any[]>(adminKv, KV_ARTICLES) || []
      const slug = body.slug || body.title
        ? (body.slug || body.title).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '') || `a${Date.now().toString(36)}`
        : `a${Date.now().toString(36)}`
      const content = body.content || ''
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
      await kvSetArticles(adminKv, articles)
      return json({ ok: true, article })
    }

    if (route === '/articles' && request.method === 'PUT') {
      const body = await readBody(request)
      const articles = await kvGet<any[]>(adminKv, KV_ARTICLES) || []
      const idx = articles.findIndex(a => a.id === body.id)
      if (idx < 0) return json({ error: '文章不存在' }, 404)
      articles[idx] = { ...articles[idx], ...body, updatedAt: new Date().toISOString() }
      await kvSetArticles(adminKv, articles)
      return json({ ok: true, article: articles[idx] })
    }

    if (route === '/articles' && request.method === 'DELETE') {
      const body = await readBody(request)
      const articles = await kvGet<any[]>(adminKv, KV_ARTICLES) || []
      const filtered = articles.filter(a => a.id !== body.id)
      await kvSetArticles(adminKv, filtered)
      return json({ ok: true, removed: articles.length - filtered.length })
    }

    /* ---- 说说管理 ---- */
    if (route === '/shuoshuo' && request.method === 'GET') {
      const list = await ensureSeed(adminKv, KV_SHUOSHUO)
      return json({ list })
    }

    if (route === '/shuoshuo' && request.method === 'POST') {
      const body = await readBody(request)
      const list = await kvGet<any[]>(adminKv, KV_SHUOSHUO) || []
      const item = {
        id: `s${Date.now().toString(36)}`,
        content: body.content || '',
        mood: body.mood || '',
        date: body.date || new Date().toISOString().slice(0, 19).replace('T', ' '),
        images: Array.isArray(body.images) ? body.images : [],
        createdAt: new Date().toISOString(),
      }
      list.unshift(item)
      await kvSet(adminKv, KV_SHUOSHUO, list)
      return json({ ok: true, item })
    }

    if (route === '/shuoshuo' && request.method === 'PUT') {
      const body = await readBody(request)
      const list = await kvGet<any[]>(adminKv, KV_SHUOSHUO) || []
      const idx = list.findIndex(s => s.id === body.id)
      if (idx < 0) return json({ error: '说说不存在' }, 404)
      list[idx] = { ...list[idx], ...body, updatedAt: new Date().toISOString() }
      await kvSet(adminKv, KV_SHUOSHUO, list)
      return json({ ok: true, item: list[idx] })
    }

    if (route === '/shuoshuo' && request.method === 'DELETE') {
      const body = await readBody(request)
      const list = await kvGet<any[]>(adminKv, KV_SHUOSHUO) || []
      const filtered = list.filter(s => s.id !== body.id)
      await kvSet(adminKv, KV_SHUOSHUO, filtered)
      return json({ ok: true, removed: list.length - filtered.length })
    }

    /* ---- 评论管理（复用 COMMENTS_KV）---- */
    if (route === '/comments' && request.method === 'GET') {
      const comments = await loadComments(kv)
      const sorted = [...comments].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      // 字段归一化：存储用 nick/createdAt，管理端展示用 name/date（兼容旧数据）
      const list = sorted.map((c: any) => ({
        id: c.id || '',
        name: c.nick || c.name || '匿名',
        content: c.content || '',
        path: c.path || c.url || '',
        date: c.createdAt || c.date || '',
        avatar: c.avatar || '',
      }))
      return json({ list, total: comments.length })
    }

    if (route === '/comments' && request.method === 'DELETE') {
      const body = await readBody(request)
      const comments = await loadComments(kv)
      const dead = new Set([body.id])
      let grew = true
      while (grew) {
        grew = false
        for (const c of comments) {
          if (c.parentId && dead.has(c.parentId) && !dead.has(c.id)) {
            dead.add(c.id)
            grew = true
          }
        }
      }
      const filtered = comments.filter(c => !dead.has(c.id))
      await saveComments(kv, filtered)
      return json({ ok: true, removed: dead.size })
    }

    /* ---- 友链申请 ---- */
    if (route === '/friends' && request.method === 'GET') {
      try {
        const raw = await kv?.get('friend_applications')
        const list = raw ? JSON.parse(raw) : []
        return json({ list: Array.isArray(list) ? list.reverse() : [] })
      } catch {
        return json({ list: [] })
      }
    }

    if (route === '/friends/status' && request.method === 'PUT') {
      const body = await readBody(request)
      try {
        const raw = await kv?.get('friend_applications')
        const list: any[] = raw ? JSON.parse(raw) : []
        const idx = list.findIndex(f => f.id === body.id)
        if (idx >= 0) {
          list[idx].status = body.status || 'approved'
          await kv?.put('friend_applications', JSON.stringify(list))
          // 通过时同步写入后台友链表（后台可管理全部友链）
          if (list[idx].status === 'approved' && adminKv) {
            const friendList = await ensureSeed(adminKv, KV_FRIENDS)
            if (!friendList.some((f: any) => f.url === list[idx].url)) {
              friendList.unshift({
                id: list[idx].id,
                name: list[idx].name,
                url: list[idx].url,
                avatar: list[idx].avatar || '',
                description: list[idx].description || '',
                tag: '友链申请',
              })
              await kvSet(adminKv, KV_FRIENDS, friendList)
            }
          }
        }
        return json({ ok: true })
      } catch {
        return json({ error: '操作失败' }, 500)
      }
    }

    /* ---- 友链列表管理（内置种子 + 申请通过 + 手动新增） ---- */
    if (route === '/friend-list' && request.method === 'GET') {
      const list = await ensureSeed(adminKv, KV_FRIENDS)
      return json({ list })
    }

    if (route === '/friend-list' && request.method === 'POST') {
      const body = await readBody(request)
      const name = String(body.name || '').trim().slice(0, 60)
      const url = String(body.url || '').trim().slice(0, 200)
      if (!name || !url) return json({ error: '站点名称和地址不能为空' }, 400)
      const list = await ensureSeed(adminKv, KV_FRIENDS)
      if (list.some((f: any) => f.url === url)) return json({ error: '该站点已在友链中' }, 400)
      const item = {
        id: `fl${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        name,
        url,
        avatar: String(body.avatar || '').trim().slice(0, 300),
        description: String(body.description || '').trim().slice(0, 200),
        tag: String(body.tag || '博客').trim().slice(0, 30),
      }
      list.unshift(item)
      await kvSet(adminKv, KV_FRIENDS, list)
      return json({ ok: true, item })
    }

    if (route === '/friend-list' && request.method === 'PUT') {
      const body = await readBody(request)
      const list = await ensureSeed(adminKv, KV_FRIENDS)
      const idx = list.findIndex((f: any) => f.id === body.id)
      if (idx < 0) return json({ error: '友链不存在' }, 404)
      if (body.name !== undefined) list[idx].name = String(body.name).trim().slice(0, 60) || list[idx].name
      if (body.url !== undefined) list[idx].url = String(body.url).trim().slice(0, 200)
      if (body.avatar !== undefined) list[idx].avatar = String(body.avatar).trim().slice(0, 300)
      if (body.description !== undefined) list[idx].description = String(body.description).trim().slice(0, 200)
      if (body.tag !== undefined) list[idx].tag = String(body.tag).trim().slice(0, 30)
      await kvSet(adminKv, KV_FRIENDS, list)
      return json({ ok: true, item: list[idx] })
    }

    if (route === '/friend-list' && request.method === 'DELETE') {
      const body = await readBody(request)
      const list = await ensureSeed(adminKv, KV_FRIENDS)
      const filtered = list.filter((f: any) => f.id !== body.id)
      await kvSet(adminKv, KV_FRIENDS, filtered)
      return json({ ok: true, removed: list.length - filtered.length })
    }

    /* ---- 种子合并导入（把内置静态内容补齐到后台存储，幂等） ---- */
    if (route === '/seed' && request.method === 'POST') {
      const body = await readBody(request)
      const type = String(body.type || '')
      const items = Array.isArray(body.items) ? body.items : []
      const cfg = SEED_MAP.find(m => m.key === `admin_${type}`)
      if (!cfg || items.length === 0) return json({ error: '参数不完整' }, 400)
      const list = await ensureSeed(adminKv, cfg.key)
      const keyOf = (it: any) => (type === 'friends' ? String(it.url || '') : String(it.id || it.slug || ''))
      const existing = new Set(list.map(keyOf))
      let added = 0
      for (const it of items) {
        const k = keyOf(it)
        if (!k || existing.has(k)) continue
        existing.add(k)
        list.push(it)
        added++
      }
      await kvSet(adminKv, cfg.key, list)
      if (cfg.key === KV_ARTICLES) await kvSet(adminKv, KV_ARTICLES_VERSION, Date.now())
      return json({ ok: true, added, total: list.length })
    }

    /* ---- Markdown 文件上传（文章）---- */
    if (route === '/articles/upload' && request.method === 'POST') {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      if (!file || !file.name.endsWith('.md')) {
        return json({ error: '请上传 .md 文件' }, 400)
      }
      const text = await file.text()
      // 解析 frontmatter（--- 分隔的 YAML 头部）
      let meta: Record<string, any> = {}
      let content = text
      const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
      if (fmMatch) {
        const fmText = fmMatch[1]
        content = fmMatch[2]
        // 简单 YAML 解析（key: value 格式）
        for (const line of fmText.split('\n')) {
          const m = line.match(/^(\w+):\s*(.*)$/)
          if (m) {
            const key = m[1]
            let val: any = m[2].trim()
            // 去除引号
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
            else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
            // 数组格式 [a, b, c]
            if (val.startsWith('[') && val.endsWith(']')) {
              val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
            }
            meta[key] = val
          }
        }
      }
      const articles = await kvGet<any[]>(adminKv, KV_ARTICLES) || []
      const slug = meta.slug || meta.id || file.name.replace(/\.md$/, '')
      const article = {
        id: slug,
        slug,
        title: meta.title || file.name.replace(/\.md$/, ''),
        excerpt: meta.excerpt || meta.description || content.substring(0, 120).replace(/[#*\n]/g, ' ').trim(),
        content,
        cover: meta.cover || meta.image || '',
        category: meta.category || '未分类',
        tags: Array.isArray(meta.tags) ? meta.tags : (meta.tags ? String(meta.tags).split(',').map((t: string) => t.trim()) : []),
        date: meta.date || new Date().toISOString().slice(0, 10),
        views: 0,
        likes: 0,
        readingTime: Math.max(1, Math.ceil(content.length / 500)),
        isPinned: false,
        wordCount: content.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      // 去重：同 slug 覆盖
      const existingIdx = articles.findIndex(a => a.slug === slug || a.id === slug)
      if (existingIdx >= 0) {
        articles[existingIdx] = { ...articles[existingIdx], ...article }
      } else {
        articles.unshift(article)
      }
      await kvSetArticles(adminKv, articles)
      return json({ ok: true, article })
    }

    /* ---- Markdown 文件上传（说说）---- */
    if (route === '/shuoshuo/upload' && request.method === 'POST') {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      const mood = (formData.get('mood') as string) || ''
      if (!file) return json({ error: '请上传文件' }, 400)
      const text = await file.text()
      const list = await kvGet<any[]>(adminKv, KV_SHUOSHUO) || []
      const item = {
        id: `s${Date.now().toString(36)}`,
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        mood: mood || '',
        content: text.trim(),
        images: [] as string[],
        createdAt: new Date().toISOString(),
      }
      list.unshift(item)
      await kvSet(adminKv, KV_SHUOSHUO, list)
      return json({ ok: true, item })
    }

    /* ---- 统计详情 ---- */
    if (route === '/stats' && request.method === 'GET') {
      const stats = await loadStats(kv)
      const days = stats.days || {}
      const dayList = Object.entries(days).map(([date, d]: [string, any]) => ({
        date,
        pv: d.pv || 0,
        uv: Array.isArray(d.uv) ? d.uv.length : 0,
      })).sort((a, b) => a.date.localeCompare(b.date)).slice(-30)
      return json({
        total: stats.total || 0,
        uv: stats.visitors?.length || 0,
        days: dayList,
      })
    }

    /* ---- 画廊管理 ---- */
    if (route === '/gallery' && request.method === 'GET') {
      const albums = await ensureSeed(adminKv, KV_GALLERY)
      return json({ list: albums })
    }

    if (route === '/gallery' && request.method === 'POST') {
      const body = await readBody(request)
      const albums = await kvGet<any[]>(adminKv, KV_GALLERY) || []
      const album = {
        id: `g${Date.now().toString(36)}`,
        title: body.title || '未命名相册',
        cover: '',
        photos: [],
        updatedAt: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
      }
      albums.unshift(album)
      await kvSet(adminKv, KV_GALLERY, albums)
      return json({ ok: true, album })
    }

    if (route === '/gallery' && request.method === 'PUT') {
      const body = await readBody(request)
      const albums = await kvGet<any[]>(adminKv, KV_GALLERY) || []
      const idx = albums.findIndex(a => a.id === body.id)
      if (idx < 0) return json({ error: '相册不存在' }, 404)
      if (body.title !== undefined) albums[idx].title = body.title
      if (Array.isArray(body.photos)) albums[idx].photos = body.photos
      if (body.cover !== undefined) albums[idx].cover = body.cover
      albums[idx].updatedAt = new Date().toISOString().slice(0, 10)
      await kvSet(adminKv, KV_GALLERY, albums)
      return json({ ok: true, album: albums[idx] })
    }

    if (route === '/gallery' && request.method === 'DELETE') {
      const body = await readBody(request)
      const albums = await kvGet<any[]>(adminKv, KV_GALLERY) || []
      const album = albums.find(a => a.id === body.id)
      // 删除相册内所有图片的 KV 数据
      if (album?.photos?.length) {
        for (const photo of album.photos) {
          if (photo.kvKey) {
            try { await adminKv.delete(photo.kvKey) } catch { /* ignore */ }
          }
        }
      }
      const filtered = albums.filter(a => a.id !== body.id)
      await kvSet(adminKv, KV_GALLERY, filtered)
      return json({ ok: true, removed: albums.length - filtered.length })
    }

    /* ---- 画廊：批量 URL 添加照片（粘贴一堆图片 URL 即生成相册照片） ---- */
    if (route === '/gallery/urls' && request.method === 'POST') {
      const body = await readBody(request)
      const albumId = String(body.albumId || '')
      const raw = Array.isArray(body.photos) ? body.photos : []
      if (!albumId) return json({ error: '缺少相册 ID' }, 400)
      if (!raw.length) return json({ error: '请至少提供一个图片 URL' }, 400)

      const albums = await kvGet<any[]>(adminKv, KV_GALLERY) || []
      const idx = albums.findIndex(a => a.id === albumId)
      if (idx < 0) return json({ error: '相册不存在' }, 404)
      if (!Array.isArray(albums[idx].photos)) albums[idx].photos = []

      const sanitize = (v: unknown): string => {
        const s = String(v || '').trim().slice(0, 500)
        if (/^https?:\/\/\S+$/i.test(s)) return s
        if (/^\/\S+$/i.test(s)) return s
        return ''
      }

      let added = 0
      for (const item of raw) {
        const itemObj = (item && typeof item === 'object') ? item as Record<string, unknown> : null
        const url = sanitize(itemObj && itemObj.url !== undefined ? itemObj.url : item)
        if (!url) continue
        if (albums[idx].photos.some((p: any) => p.url === url)) continue
        const orientation = itemObj?.orientation === 'portrait' ? 'portrait' : 'landscape'
        albums[idx].photos.push({
          id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          url,
          caption: itemObj && String(itemObj.caption || '').trim().slice(0, 100),
          orientation,
        })
        added++
      }
      if (added === 0) return json({ error: '没有可添加的有效图片 URL（需 http(s):// 或 / 开头的站内路径）' }, 400)

      if (!albums[idx].cover) albums[idx].cover = albums[idx].photos[0].url
      albums[idx].updatedAt = new Date().toISOString().slice(0, 10)
      await kvSet(adminKv, KV_GALLERY, albums)
      return json({ ok: true, added, album: albums[idx] })
    }

    /* ---- 画廊图片上传 ---- */
    if (route === '/gallery/upload' && request.method === 'POST') {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      const albumId = (formData.get('albumId') as string) || ''
      const caption = (formData.get('caption') as string) || ''
      if (!file) return json({ error: '请上传图片文件' }, 400)
      if (!albumId) return json({ error: '缺少相册 ID' }, 400)

      // 限制 5MB
      if (file.size > 5 * 1024 * 1024) {
        return json({ error: '图片不能超过 5MB' }, 400)
      }

      const buf = await file.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
      const photoId = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
      const kvKey = `gallery_img_${photoId}`

      // 存储图片数据到 KV
      await adminKv.put(kvKey, JSON.stringify({
        data: base64,
        type: file.type || 'image/jpeg',
      }))

      // 更新相册元数据
      const albums = await kvGet<any[]>(adminKv, KV_GALLERY) || []
      const idx = albums.findIndex(a => a.id === albumId)
      if (idx < 0) return json({ error: '相册不存在' }, 404)

      const photo = {
        id: photoId,
        kvKey,
        caption,
        orientation: (formData.get('orientation') as string) === 'portrait' ? 'portrait' : 'landscape',
        url: `/gallery/image/${photoId}`,
      }
      albums[idx].photos = albums[idx].photos || []
      albums[idx].photos.push(photo)
      // 第一张图自动设为封面
      if (!albums[idx].cover) {
        albums[idx].cover = photo.url
      }
      albums[idx].updatedAt = new Date().toISOString().slice(0, 10)
      await kvSet(adminKv, KV_GALLERY, albums)

      return json({ ok: true, photo })
    }

    /* ---- 画廊单张照片删除 ---- */
    if (route === '/gallery/photo' && request.method === 'DELETE') {
      const body = await readBody(request)
      const albums = await kvGet<any[]>(adminKv, KV_GALLERY) || []
      let removed = false
      for (const album of albums) {
        if (!album.photos) continue
        const before = album.photos.length
        album.photos = album.photos.filter((p: any) => {
          if (p.id === body.id) {
            if (p.kvKey) { try { adminKv.delete(p.kvKey) } catch { /* ignore */ } }
            removed = true
            return false
          }
          return true
        })
        if (removed) {
          // 更新封面
          if (album.cover && album.photos.length > 0 && !album.photos.some((p: any) => p.url === album.cover)) {
            album.cover = album.photos[0].url
          } else if (album.photos.length === 0) {
            album.cover = ''
          }
          album.updatedAt = new Date().toISOString().slice(0, 10)
          break
        }
      }
      if (removed) {
        await kvSet(adminKv, KV_GALLERY, albums)
        return json({ ok: true, removed: 1 })
      }
      return json({ error: '照片不存在' }, 404)
    }

    /* ---- 画廊照片信息更新（caption / orientation）---- */
    if (route === '/gallery/photo' && request.method === 'PUT') {
      const body = await readBody(request)
      const albums = await kvGet<any[]>(adminKv, KV_GALLERY) || []
      for (const album of albums) {
        if (!album.photos) continue
        const photo = album.photos.find((p: any) => p.id === body.id)
        if (photo) {
          if (body.caption !== undefined) photo.caption = body.caption
          if (body.orientation !== undefined) photo.orientation = body.orientation
          album.updatedAt = new Date().toISOString().slice(0, 10)
          await kvSet(adminKv, KV_GALLERY, albums)
          return json({ ok: true, photo })
        }
      }
      return json({ error: '照片不存在' }, 404)
    }

    /* ---- 画廊批量删除照片（跨相册，联动清理 KV 图片、更新封面）---- */
    if (route === '/gallery/photos' && request.method === 'DELETE') {
      const body = await readBody(request)
      const ids = Array.isArray(body.ids) ? body.ids.map(String) : []
      if (!ids.length) return json({ error: '请选择要删除的照片' }, 400)
      const idSet = new Set(ids)
      const albums = await kvGet<any[]>(adminKv, KV_GALLERY) || []
      let removed = 0
      for (const album of albums) {
        if (!album.photos) continue
        const before = album.photos.length
        album.photos = album.photos.filter((p: any) => {
          if (idSet.has(String(p.id))) {
            if (p.kvKey) { try { adminKv.delete(p.kvKey) } catch { /* ignore */ } }
            removed++
            return false
          }
          return true
        })
        if (album.photos.length !== before) {
          if (album.cover && album.photos.length > 0 && !album.photos.some((p: any) => p.url === album.cover)) {
            album.cover = album.photos[0].url
          } else if (album.photos.length === 0) {
            album.cover = ''
          }
          album.updatedAt = new Date().toISOString().slice(0, 10)
        }
      }
      await kvSet(adminKv, KV_GALLERY, albums)
      return json({ ok: true, removed })
    }

    /* ---- 非 API 路由 - 回退到 SPA（让前端路由处理） ---- */
    if (env?.ASSETS) {
      const assetUrl = new URL(request.url)
      if (route === '/') {
        assetUrl.pathname = '/index.html'
      } else {
        // 非 / 路径且非 API 路由，也回退到 index.html
        assetUrl.pathname = '/index.html'
      }
      return env.ASSETS.fetch(new Request(assetUrl, request))
    }

    return json({ error: 'not found', route }, 404)
  } catch (e) {
    return json({ error: 'server error', message: String(e instanceof Error ? e.message : e) }, 500)
  }
}
