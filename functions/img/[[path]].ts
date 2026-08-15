// Cloudflare Pages Function: /img/* → 代理 static.hiromu.top/Boke/* 图片并缓存
const UPSTREAM = 'https://static.hiromu.top/Boke'

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url)
  const upstream = new URL(UPSTREAM + url.pathname + url.search)

  const resp = await fetch(upstream.toString(), {
    headers: { 'User-Agent': 'Mozilla/5.0 CloudflarePages' },
    cf: { cacheTtl: 86400, cacheEverything: true },
  })

  if (!resp.ok) {
    return new Response('Image not found', { status: 404 })
  }

  const headers = new Headers(resp.headers)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  headers.set('Access-Control-Allow-Origin', '*')

  return new Response(resp.body, {
    status: resp.status,
    headers,
  })
}
