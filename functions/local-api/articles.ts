/**
 * Cloudflare Pages Function: /local-api/articles 公开文章列表
 * 读取 KV 中的 admin_articles 返回给前台
 */
export async function onRequestGet({ env }: { env: { COMMENTS_KV?: KVNamespace } }) {
  const kv = env.COMMENTS_KV
  if (!kv) {
    return new Response(JSON.stringify({ list: [] }), {
      headers: { 'content-type': 'application/json' },
    })
  }
  try {
    const raw = await kv.get('admin_articles')
    const articles = raw ? JSON.parse(raw) : []
    return new Response(JSON.stringify({ list: articles }), {
      headers: { 'content-type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ list: [] }), {
      headers: { 'content-type': 'application/json' },
    })
  }
}