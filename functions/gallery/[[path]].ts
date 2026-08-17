/**
 * Cloudflare Pages Function: /gallery/* 画廊公开 API
 * ------------------------------------------------------------------
 *   GET /gallery              — 获取所有相册（含照片元数据，不含图片二进制）
 *   GET /gallery/image/:id    — 从 KV 读取并返回图片二进制（带缓存头）
 *
 * KV 绑定名：COMMENTS_KV（与 admin 复用同一 KV）
 */

interface Env {
  COMMENTS_KV?: KVNamespace
  ADMIN_KV?: KVNamespace
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'public, max-age=300',
    },
  })
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)
  const route = url.pathname.replace('/gallery', '') || '/'

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    })
  }

  const kv = env.ADMIN_KV || env.COMMENTS_KV
  if (!kv) {
    return jsonResponse({ list: [] })
  }

  // GET /gallery — 相册列表
  if (route === '/' || route === '') {
    try {
      const raw = await kv.get('admin_gallery')
      const albums = raw ? JSON.parse(raw) : []
      return jsonResponse({ list: albums })
    } catch {
      return jsonResponse({ list: [] })
    }
  }

  // GET /gallery/image/:id — 图片二进制
  const imgMatch = route.match(/^\/image\/(.+)$/)
  if (imgMatch && request.method === 'GET') {
    const photoId = imgMatch[1]
    const kvKey = `gallery_img_${photoId}`
    try {
      const raw = await kv.get(kvKey)
      if (!raw) return new Response('Not Found', { status: 404 })
      const data = JSON.parse(raw)
      const binary = atob(data.data)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      return new Response(bytes, {
        status: 200,
        headers: {
          'Content-Type': data.type || 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*',
        },
      })
    } catch {
      return new Response('Not Found', { status: 404 })
    }
  }

  return jsonResponse({ error: 'not found' }, 404)
}
