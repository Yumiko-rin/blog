// Cloudflare Pages Function：/kuaidi/* 同源代理 → https://www.kuaidi100.com
// 本地开发由 vite server.proxy 处理；部署到 Cloudflare 后此处接力。
const UPSTREAM = 'https://www.kuaidi100.com'

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url)
  const path = url.pathname.replace(/^\/kuaidi/, '') || '/'
  const upstream = new URL(UPSTREAM + path + url.search)
  const headers = new Headers(context.request.headers)
  headers.delete('host')
  headers.delete('connection')
  return fetch(upstream.toString(), {
    method: context.request.method,
    headers,
    body: context.request.method === 'GET' || context.request.method === 'HEAD' ? undefined : context.request.body,
    redirect: 'follow',
  })
}
