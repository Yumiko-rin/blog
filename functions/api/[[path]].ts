// Cloudflare Pages Function：/api/* 同源代理 → https://boke.hiromu.top
// 本地开发由 vite server.proxy 处理；部署到 Cloudflare 后此处接力，避免路由失效。
const UPSTREAM = 'https://boke.hiromu.top'

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url)
  const upstream = new URL(UPSTREAM + url.pathname + url.search)
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
