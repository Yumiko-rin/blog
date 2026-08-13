// 本地预览服务器：托管 Vite 构建产物（默认 dist），并把 /api/* 同源代理到 boke.hiromu.top。
// 解决 Vite preview 内置代理在 SPA fallback 之后执行、导致 /api/music 被重写为 index.html 的问题。
// 使用：npm run preview  （或 node preview-server.cjs，可用 DIST_DIR / PORT 环境变量覆盖）
const http = require('http')
const fs = require('fs')
const path = require('path')
const { URL } = require('url')
const { handleLocalApi } = require('./server/local-api.cjs')

const ROOT = path.resolve(__dirname, process.env.DIST_DIR || 'dist')
const PORT = Number(process.env.PORT || 4173)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.moc': 'application/octet-stream',
  '.model.json': 'application/json',
  '.txt': 'text/plain',
  '.mp3': 'audio/mpeg',
  '.wasm': 'application/wasm',
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost')

  // 0) 本地后端：访问统计 + 自建评论（/local-api/*）
  if (handleLocalApi(req, res)) return

  // 通用同源代理：把带 CORS 头缺失的第三方接口转发到同源前缀
  //   /api    -> https://boke.hiromu.top/api
  //   /uapis  -> https://uapis.cn/api/v1
  //   /kuaidi -> https://www.kuaidi100.com
  // 注意：prefix 不带结尾斜杠，suffix 自带前导斜杠，拼接后路径正确
  const proxyRules = [
    { prefix: '/api', base: 'https://boke.hiromu.top/api' },
    { prefix: '/uapis', base: 'https://uapis.cn/api/v1' },
    { prefix: '/kuaidi', base: 'https://www.kuaidi100.com' },
    // 音乐：自建 Meting-API（同源避免 https 页面 mixed-content）
    { prefix: '/music', base: 'http://47.104.189.4/music' },
  ]
  for (const rule of proxyRules) {
    if (u.pathname.startsWith(rule.prefix)) {
      const suffix = u.pathname.slice(rule.prefix.length) || ''
      const target = rule.base + suffix + u.search
      try {
        const r = await fetch(target, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': rule.base },
        })
        res.statusCode = r.status
        r.headers.forEach((v, k) => {
          const l = k.toLowerCase()
          if (l === 'content-encoding' || l === 'transfer-encoding') return
          res.setHeader(k, v)
        })
        res.setHeader('Access-Control-Allow-Origin', '*')
        const buf = Buffer.from(await r.arrayBuffer())
        res.end(buf)
      } catch (e) {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'proxy error', message: String(e) }))
      }
      return
    }
  }
  // 2) 静态资源 + SPA fallback
  let p = decodeURIComponent(u.pathname)
  if (p === '/') p = '/index.html'
  let filePath = path.join(ROOT, p)
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(ROOT, 'index.html')
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404
      res.end('not found')
      return
    }
    const ext = path.extname(filePath).toLowerCase()
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream')
    res.end(data)
  })
})

server.listen(PORT, () => console.log('[preview] serving', ROOT, 'on http://localhost:' + PORT))
