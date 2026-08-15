/**
 * Cloudflare Pages Function: /local-api/shuoshuo 公开说说列表
 * 读取 KV 中的 admin_shuoshuo 返回给前台
 */
export async function onRequestGet({ env }: { env: { COMMENTS_KV?: KVNamespace } }) {
  const kv = env.COMMENTS_KV
  if (!kv) {
    return new Response(JSON.stringify({ list: [] }), {
      headers: { 'content-type': 'application/json' },
    })
  }
  try {
    const raw = await kv.get('admin_shuoshuo')
    const list = raw ? JSON.parse(raw) : []
    return new Response(JSON.stringify({ list }), {
      headers: { 'content-type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ list: [] }), {
      headers: { 'content-type': 'application/json' },
    })
  }
}