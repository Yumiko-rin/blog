// Cloudflare Pages Function：/music/* 同源代理 → 自建 Meting-API
//
// 关键：部署到 Cloudflare（HTTPS）后，Meting 接口会 302 到网易云 http(s) 的签名 mp3。
// 若直接把 302 透传给浏览器，浏览器在 HTTPS 页面里请求 http mp3 会触发 mixed-content 被拦截。
// 因此这里在服务端「跟随 302」并取回 mp3 字节，再以 HTTPS 原样回传给浏览器，
// 浏览器全程只与同源 HTTPS 交互，彻底避免 mixed-content。
const UPSTREAM = 'http://47.104.189.4/music'

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url)
  const upstreamUrl = new URL(UPSTREAM + url.search)

  const reqHeaders = new Headers()
  const range = context.request.headers.get('range')
  if (range) reqHeaders.set('Range', range)
  reqHeaders.set('Referer', 'https://music.163.com/')
  reqHeaders.set('User-Agent', 'Mozilla/5.0 (compatible; CloudflarePages/1.0)')

  const upstream = await fetch(upstreamUrl.toString(), {
    method: context.request.method,
    headers: reqHeaders,
    redirect: 'manual',
  })

  // 302 → 服务端跟随到网易云签名 mp3，再以 HTTPS 回传字节
  if (upstream.status === 301 || upstream.status === 302) {
    const loc = upstream.headers.get('location')
    if (loc) {
      const mp3Headers = new Headers()
      if (range) mp3Headers.set('Range', range)
      mp3Headers.set('Referer', 'https://music.163.com/')
      const mp3 = await fetch(loc, { headers: mp3Headers, redirect: 'follow' })
      const out = new Response(mp3.body, {
        status: mp3.status,
        headers: {
          'Content-Type': mp3.headers.get('content-type') || 'audio/mpeg',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        },
      })
      const cl = mp3.headers.get('content-length')
      if (cl) out.headers.set('Content-Length', cl)
      const cr = mp3.headers.get('content-range')
      if (cr) out.headers.set('Content-Range', cr)
      return out
    }
  }

  // 其余（歌单 / 歌词 JSON 等）原样回传
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
