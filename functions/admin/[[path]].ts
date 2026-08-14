/**
 * Cloudflare Pages Function: /admin/* 后台管理 API
 * ------------------------------------------------------------------
 * 鉴权：密码登录 → 签发 JWT（HttpOnly Cookie + Bearer Token 双通道）
 * 数据：文章/说说存 KV（JSON），评论/统计/友链复用现有 KV 数据
 *
 * 路由：
 *   POST /admin/login              — 登录
 *   GET  /admin/auth               — 验证 token
 *   GET  /admin/dashboard          — 概览数据
 *   GET  /admin/articles           — 文章列表
 *   POST /admin/articles           — 新建文章
 *   PUT  /admin/articles           — 更新文章（body.id）
 *   DELETE /admin/articles         — 删除文章（body.id）
 *   GET  /admin/shuoshuo           — 说说列表
 *   POST /admin/shuoshuo           — 新建说说
 *   PUT  /admin/shuoshuo           — 更新说说
 *   DELETE /admin/shuoshuo         — 删除说说
 *   GET  /admin/comments           — 全部评论
 *   DELETE /admin/comments         — 删除评论
 *   GET  /admin/friends            — 友链申请列表
 *   PUT  /admin/friends/status     — 审批友链申请
 */

interface Env {
  COMMENTS_KV?: KVNamespace
}

interface AdminEnv extends Env {
  ADMIN_KV?: KVNamespace
}

const ADMIN_PASSWORD = 'kirameki2026'
const JWT_SECRET = 'kirameki-jwt-secret-2026-very-long'

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

async function signJWT(payload: Record<string, any>): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 7 * 24 * 3600 * 1000 }))
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`))
  const sigStr = btoa(String.fromCharCode(...new Uint8Array(sig)))
  return `${header}.${body}.${sigStr}`
}

async function verifyJWT(token: string): Promise<boolean> {
  try {
    const [header, body, sig] = token.split('.')
    if (!header || !body || !sig) return false
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(JWT_SECRET),
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

async function requireAuth(req: Request): Promise<boolean> {
  const token = getToken(req)
  if (!token) return false
  return verifyJWT(token)
}

/* ===== KV 存储层 ===== */

const KV_ARTICLES = 'admin_articles'
const KV_SHUOSHUO = 'admin_shuoshuo'

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

  // SPA 页面导航（GET 无 Authorization 头）直接放行，交给前端路由
  // API 调用：POST 请求 或 GET 请求带 Authorization 头
  if (request.method === 'GET' && !getToken(request)) {
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

  try {
    /* ---- 登录 ---- */
    if (route === '/login' && request.method === 'POST') {
      const body = await readBody(request)
      if (body.password !== ADMIN_PASSWORD) {
        return json({ error: '密码错误' }, 401)
      }
      const token = await signJWT({ role: 'admin' })
      const cookie = `admin_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`
      return json({ ok: true, token }, 200, cookie)
    }

    /* ---- 验证 token ---- */
    if (route === '/auth' && request.method === 'GET') {
      const ok = await requireAuth(request)
      return json({ ok })
    }

    /* ---- 以下路由需要鉴权 ---- */
    const authed = await requireAuth(request)
    if (!authed) return json({ error: '未授权' }, 401)

    /* ---- 概览面板 ---- */
    if (route === '/dashboard' && request.method === 'GET') {
      const comments = await loadComments(kv)
      const stats = await loadStats(kv)
      const articles = await kvGet<any[]>(adminKv, KV_ARTICLES) || []
      const shuoshuo = await kvGet<any[]>(adminKv, KV_SHUOSHUO) || []
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
      const articles = await kvGet<any[]>(adminKv, KV_ARTICLES) || []
      return json({ list: articles })
    }

    if (route === '/articles' && request.method === 'POST') {
      const body = await readBody(request)
      const articles = await kvGet<any[]>(adminKv, KV_ARTICLES) || []
      const article = {
        id: `a${Date.now().toString(36)}`,
        ...body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      articles.unshift(article)
      await kvSet(adminKv, KV_ARTICLES, articles)
      return json({ ok: true, article })
    }

    if (route === '/articles' && request.method === 'PUT') {
      const body = await readBody(request)
      const articles = await kvGet<any[]>(adminKv, KV_ARTICLES) || []
      const idx = articles.findIndex(a => a.id === body.id)
      if (idx < 0) return json({ error: '文章不存在' }, 404)
      articles[idx] = { ...articles[idx], ...body, updatedAt: new Date().toISOString() }
      await kvSet(adminKv, KV_ARTICLES, articles)
      return json({ ok: true, article: articles[idx] })
    }

    if (route === '/articles' && request.method === 'DELETE') {
      const body = await readBody(request)
      const articles = await kvGet<any[]>(adminKv, KV_ARTICLES) || []
      const filtered = articles.filter(a => a.id !== body.id)
      await kvSet(adminKv, KV_ARTICLES, filtered)
      return json({ ok: true, removed: articles.length - filtered.length })
    }

    /* ---- 说说管理 ---- */
    if (route === '/shuoshuo' && request.method === 'GET') {
      const list = await kvGet<any[]>(adminKv, KV_SHUOSHUO) || []
      return json({ list })
    }

    if (route === '/shuoshuo' && request.method === 'POST') {
      const body = await readBody(request)
      const list = await kvGet<any[]>(adminKv, KV_SHUOSHUO) || []
      const item = {
        id: `s${Date.now().toString(36)}`,
        ...body,
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
      const sorted = comments.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      return json({ list: sorted, total: comments.length })
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
        }
        return json({ ok: true })
      } catch {
        return json({ error: '操作失败' }, 500)
      }
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

    return json({ error: 'not found', route }, 404)
  } catch (e) {
    return json({ error: 'server error', message: String(e instanceof Error ? e.message : e) }, 500)
  }
}
