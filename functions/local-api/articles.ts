/**
 * Cloudflare Pages Function: /local-api/articles 公开文章列表
 * 读取 KV 中的 admin_articles 返回给前台，附带版本号用于缓存失效判断
 */
export async function onRequestGet({ env }: { env: { COMMENTS_KV?: KVNamespace } }) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  }
  const kv = env.COMMENTS_KV
  if (!kv) {
    return new Response(JSON.stringify({ list: [], version: 0 }), { headers })
  }
  try {
    const [raw, versionRaw] = await Promise.all([
      kv.get('admin_articles'),
      kv.get('articles_version'),
    ])
    const articles = raw ? JSON.parse(raw) : []
    const version = versionRaw ? Number(versionRaw) : 0
    return new Response(JSON.stringify({ list: articles, version }), { headers })
  } catch {
    return new Response(JSON.stringify({ list: [], version: 0 }), { headers })
  }
}