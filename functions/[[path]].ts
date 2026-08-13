// Cloudflare Pages Function：SPA 回退
// 对于没有对应静态文件的路由（如 /post/xxx、/blog/yyy），返回 index.html，
// 让前端路由（react-router）接管，避免刷新子页面出现 404。
// 静态资源（/assets/*、/avatars/* 等）由 Pages 直接命中，不会进入此函数。
export const onRequest: PagesFunction = async (context) => {
  const response = await context.next()
  if (response.status === 404) {
    const url = new URL(context.request.url)
    url.pathname = '/index.html'
    return context.env.ASSETS.fetch(new Request(url.toString(), context.request))
  }
  return response
}
