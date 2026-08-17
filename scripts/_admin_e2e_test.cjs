/* eslint-disable */
/**
 * 后台管理系统端到端测试
 * - 登录后逐个测试所有后台模块 CRUD
 * - 每次写操作后校验前台读取接口 /local-api/* 是否立即反映变更（实时控制前台验证）
 * - 测试结束清理所有产生的数据
 *
 * 运行：node scripts/_admin_e2e_test.cjs   （需先启动 dev server: npm run dev，端口 5173）
 */
const BASE = 'http://localhost:5173'
const ADMIN_PASSWORD = '123456'
const PREFIX = '[E2E测试]'

const results = []
let token = ''
const created = { articles: [], shuoshuo: [], albums: [], friends: [], comments: [] }

function rec(name, ok, detail = '') {
  results.push({ name, ok, detail })
  const tag = ok ? 'PASS' : 'FAIL'
  console.log(`[${tag}] ${name}${detail ? '  -> ' + detail : ''}`)
}

async function waitServer() {
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(`${BASE}/local-api/health`)
      if (r.ok) return true
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('dev server 未就绪')
}

// admin 写接口（带 token）
async function api(method, path, body, isForm = false) {
  const headers = { Authorization: `Bearer ${token}` }
  let init = { method, headers }
  if (isForm) {
    init.body = body // FormData
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  const res = await fetch(`${BASE}/admin${path}`, init)
  let data = {}
  try { data = await res.json() } catch {}
  return { status: res.status, data }
}

// 前台公开读接口（无需 token）
async function read(path) {
  const res = await fetch(`${BASE}/local-api${path}`)
  let data = {}
  try { data = await res.json() } catch {}
  return { status: res.status, data }
}

async function login() {
  const r = await api('POST', '/login', { password: ADMIN_PASSWORD })
  if (r.status === 200 && r.data.token) { token = r.data.token; return true }
  return false
}

// ---- 临时文件（用于上传测试）----
const fs = require('fs')
const os = require('os')
const path = require('path')
function tmpFile(name, content, encoding = 'utf-8') {
  const p = path.join(os.tmpdir(), name)
  fs.writeFileSync(p, content, encoding)
  return p
}
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')

async function main() {
  await waitServer()
  console.log('=== 0. 登录与鉴权 ===')
  rec('登录(正确密码)返回 token', await login())
  if (!token) { rec('登录失败，终止', false); return summarize() }

  const authNo = await fetch(`${BASE}/admin/auth`).then((r) => r.json())
  rec('无 token 访问 /auth 返回 ok:false', authNo.ok === false, JSON.stringify(authNo))
  const authYes = await api('GET', '/auth')
  rec('带 token 访问 /auth 通过', authYes.data.ok === true, JSON.stringify(authYes.data))

  console.log('\n=== 1. 概览面板 ===')
  const dash = await api('GET', '/dashboard')
  rec('GET /dashboard 返回统计', dash.status === 200 && typeof dash.data.articles === 'number',
    `articles=${dash.data.articles} shuoshuo=${dash.data.shuoshuo} comments=${dash.data.comments}`)

  console.log('\n=== 2. 文章管理（含实时性）===')
  const artBody = {
    title: `${PREFIX}文章A`, content: '# 标题\n\n这是正文内容，用于端到端测试。',
    category: '技术', tags: ['测试', 'e2e'], excerpt: '测试摘要', cover: 'https://picsum.photos/seed/e2e/400',
  }
  const artCreate = await api('POST', '/articles', artBody)
  const artId = artCreate.data.article && artCreate.data.article.id
  rec('POST /articles 创建文章', artCreate.status === 200 && !!artId, `id=${artId}`)
  if (artId) created.articles.push(artId)

  let admList = await api('GET', '/articles')
  rec('GET /articles(后台) 含新文章', admList.data.list.some((a) => a.id === artId))
  let pub = await read('/articles')
  rec('前台 /local-api/articles 实时反映新建', pub.status === 200 && pub.data.list.some((a) => a.id === artId),
    `source=${pub.data.source}`)

  const artUpd = await api('PUT', '/articles', { id: artId, title: `${PREFIX}文章A-改` })
  rec('PUT /articles 更新标题', artUpd.status === 200)
  pub = await read('/articles')
  const updArt = pub.data.list.find((a) => a.id === artId)
  rec('前台实时反映标题更新', updArt && updArt.title === `${PREFIX}文章A-改`, updArt && updArt.title)

  // markdown 上传
  const mdPath = tmpFile('e2e-article.md', '# 上传的Markdown\n\n> 引用内容\n\n- 列表项1\n- 列表项2\n')
  const mdForm = new FormData()
  mdForm.append('file', new Blob([fs.readFileSync(mdPath)], { type: 'text/markdown' }), 'e2e-article.md')
  const mdUp = await api('POST', '/articles/upload', mdForm, true)
  rec('POST /articles/upload 上传markdown', mdUp.status === 200 && !!mdUp.data.article, mdUp.data.article && mdUp.data.article.title)
  if (mdUp.data.article) created.articles.push(mdUp.data.article.id)

  const artDel = await api('DELETE', '/articles', { id: artId })
  rec('DELETE /articles 删除文章', artDel.status === 200 && artDel.data.removed === 1)
  pub = await read('/articles')
  rec('前台实时反映文章已删除', !pub.data.list.some((a) => a.id === artId))

  console.log('\n=== 3. 说说管理（含实时性）===')
  const shBody = { content: `${PREFIX}今天测试说说功能`, mood: '😺' }
  const shCreate = await api('POST', '/shuoshuo', shBody)
  const shId = shCreate.data.item && shCreate.data.item.id
  rec('POST /shuoshuo 创建说说', shCreate.status === 200 && !!shId, `id=${shId}`)
  if (shId) created.shuoshuo.push(shId)
  let shPub = await read('/shuoshuo')
  rec('前台 /local-api/shuoshuo 实时反映新建', shPub.status === 200 && shPub.data.list.some((s) => s.id === shId))
  const shUpd = await api('PUT', '/shuoshuo', { id: shId, content: `${PREFIX}说说改了` })
  rec('PUT /shuoshuo 更新', shUpd.status === 200)
  shPub = await read('/shuoshuo')
  const updSh = shPub.data.list.find((s) => s.id === shId)
  rec('前台实时反映说说更新', updSh && updSh.content === `${PREFIX}说说改了`)
  const shDel = await api('DELETE', '/shuoshuo', { id: shId })
  rec('DELETE /shuoshuo 删除', shDel.status === 200 && shDel.data.removed === 1)

  // shuoshuo 上传
  const shMd = tmpFile('e2e-shuo.md', `${PREFIX}上传的说说内容`)
  const shForm = new FormData()
  shForm.append('file', new Blob([fs.readFileSync(shMd)], { type: 'text/markdown' }), 'e2e-shuo.md')
  shForm.append('mood', '🌟')
  const shUp = await api('POST', '/shuoshuo/upload', shForm, true)
  rec('POST /shuoshuo/upload 上传', shUp.status === 200 && !!shUp.data.item, shUp.data.item && shUp.data.item.id)
  if (shUp.data.item) created.shuoshuo.push(shUp.data.item.id)

  console.log('\n=== 4. 评论管理 ===')
  const cmtList = await api('GET', '/comments')
  rec('GET /comments 返回列表', cmtList.status === 200 && Array.isArray(cmtList.data.list), `total=${cmtList.data.total}`)
  // 通过公开接口提交一条评论，再用后台删除，验证管理链路
  const cmtPost = await fetch(`${BASE}/local-api/comments`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nick: `${PREFIX}访客`, mail: 'e2e@example.com', content: '端到端测试评论', path: '/e2e-test' }),
  })
  let cmtData = {}
  try { cmtData = await cmtPost.json() } catch {}
  const cmtId = cmtData.id || (cmtData.comment && cmtData.comment.id)
  rec('公开 POST /local-api/comments 提交评论', cmtPost.ok && !!cmtId, `id=${cmtId}`)
  if (cmtId) {
    const cmtDel = await api('DELETE', '/comments', { id: cmtId })
    rec('DELETE /comments 删除评论', cmtDel.status === 200)
  }

  console.log('\n=== 5. 友链管理 ===')
  const frCreate = await api('POST', '/friend-list', { name: `${PREFIX}友链A`, url: 'https://example.com', description: '测试', avatar: '' })
  const frId = frCreate.data.item && frCreate.data.item.id
  rec('POST /friend-list 创建友链', frCreate.status === 200 && !!frId, `id=${frId}`)
  if (frId) created.friends.push(frId)
  const frList = await api('GET', '/friend-list')
  rec('GET /friend-list 含新建', frList.data.list.some((f) => f.id === frId))
  const frUpd = await api('PUT', '/friend-list', { id: frId, name: `${PREFIX}友链A-改` })
  rec('PUT /friend-list 更新', frUpd.status === 200)
  // 公开读接口（前台友链页）
  const frPub = await read('/friends')
  rec('前台 /local-api/friends 可读(200)', frPub.status === 200, `count=${(frPub.data.list || []).length}`)
  const frDel = await api('DELETE', '/friend-list', { id: frId })
  rec('DELETE /friend-list 删除', frDel.status === 200 && frDel.data.removed === 1)

  // 友链申请 -> 审核流程
  const appPost = await fetch(`${BASE}/local-api/friend-applications`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `${PREFIX}申请`, url: 'https://apply.test', avatar: 'https://picsum.photos/seed/avatar/100', description: '申请友链' }),
  })
  let appData = {}
  try { appData = await appPost.json() } catch {}
  const appId = appData.application && appData.application.id
  rec('公开提交友链申请', appPost.ok && !!appId, `id=${appId}`)
  if (appId) {
    const appList = await api('GET', '/friends')
    rec('后台 /friends 看到申请', appList.data.list.some((a) => a.id === appId))
    const appApprove = await api('PUT', '/friends/status', { id: appId, status: 'approved' })
    rec('PUT /friends/status 审核通过', appApprove.status === 200)
    // 审核通过后应进入友链列表（清理：通过 friend-list 删除若有对应项）
    const afterApprove = await api('GET', '/friend-list')
    const approved = afterApprove.data.list.find((f) => f.url === 'https://apply.test')
    if (approved) created.friends.push(approved.id)
  }

  console.log('\n=== 6. 画廊管理（含实时性 + 批量删除修复）===')
  const albCreate = await api('POST', '/gallery', { title: `${PREFIX}相册A` })
  const albId = albCreate.data.album && albCreate.data.album.id
  rec('POST /gallery 创建相册', albCreate.status === 200 && !!albId, `id=${albId}`)
  if (albId) created.albums.push(albId)
  const urlAdd = await api('POST', '/gallery/urls', {
    albumId: albId,
    photos: [
      { url: 'https://picsum.photos/seed/g1/400', caption: '图1', orientation: 'landscape' },
      { url: 'https://picsum.photos/seed/g2/400', caption: '图2', orientation: 'portrait' },
      { url: 'https://picsum.photos/seed/g3/400', caption: '图3', orientation: 'landscape' },
    ],
  })
  rec('POST /gallery/urls 批量加图', urlAdd.status === 200 && urlAdd.data.added === 3, `added=${urlAdd.data.added}`)
  let galPub = await read('/gallery')
  let albPub = galPub.data.list.find((a) => a.id === albId)
  rec('前台 /local-api/gallery 实时反映相册与图片', !!albPub && albPub.photos.length === 3, albPub && `photos=${albPub.photos.length}`)

  // 设封面 + 排序
  const photos = albPub.photos
  const newOrder = [photos[2], photos[0], photos[1]]
  const coverUrl = photos[2].url
  const updAlb = await api('PUT', '/gallery', { id: albId, title: `${PREFIX}相册A-改`, cover: coverUrl, photos: newOrder })
  rec('PUT /gallery 设封面+重排序', updAlb.status === 200)
  galPub = await read('/gallery')
  albPub = galPub.data.list.find((a) => a.id === albId)
  rec('前台实时反映封面与排序', albPub && albPub.cover === coverUrl && albPub.photos[0].id === photos[2].id,
    albPub && `cover=${albPub.cover === coverUrl} first=${albPub.photos[0].id}`)

  // 单张更新
  const phUpd = await api('PUT', '/gallery/photo', { id: photos[0].id, caption: '改了说明', orientation: 'portrait' })
  rec('PUT /gallery/photo 更新图片信息', phUpd.status === 200 && phUpd.data.photo.orientation === 'portrait')

  // 文件上传
  const imgPath = tmpFile('e2e-img.png', PNG_1PX)
  const imgForm = new FormData()
  imgForm.append('file', new Blob([fs.readFileSync(imgPath)], { type: 'image/png' }), 'e2e-img.png')
  imgForm.append('albumId', albId)
  imgForm.append('caption', '上传图')
  const imgUp = await api('POST', '/gallery/upload', imgForm, true)
  const upUrl = imgUp.data.photo && imgUp.data.photo.url
  rec('POST /gallery/upload 上传图片', imgUp.status === 200 && !!upUrl, upUrl)
  if (upUrl) {
    const imgGet = await fetch(`${BASE}${upUrl}`)
    rec('前台可实时读取上传的图片', imgGet.status === 200 && (imgGet.headers.get('content-type') || '').startsWith('image/'),
      `ct=${imgGet.headers.get('content-type')}`)
  }

  // 批量删除（本次修复点）
  galPub = await read('/gallery')
  albPub = galPub.data.list.find((a) => a.id === albId)
  const beforeCount = albPub.photos.length
  const delIds = albPub.photos.slice(0, 2).map((p) => p.id)
  const batchDel = await api('DELETE', '/gallery/photos', { ids: delIds })
  rec('DELETE /gallery/photos 批量删除(修复点)', batchDel.status === 200 && batchDel.data.removed === 2, `removed=${batchDel.data.removed}`)
  galPub = await read('/gallery')
  albPub = galPub.data.list.find((a) => a.id === albId)
  rec('前台实时反映批量删除结果', !!albPub && albPub.photos.length === beforeCount - 2, albPub && `photos=${albPub.photos.length}`)

  // 单张删除
  if (albPub && albPub.photos.length) {
    const singleDel = await api('DELETE', '/gallery/photo', { id: albPub.photos[0].id })
    rec('DELETE /gallery/photo 单张删除', singleDel.status === 200 && singleDel.data.removed === 1)
  }
  // 删除相册
  const albDel = await api('DELETE', '/gallery', { id: albId })
  rec('DELETE /gallery 删除相册', albDel.status === 200 && albDel.data.removed === 1)
  galPub = await read('/gallery')
  rec('前台实时反映相册已删除', !galPub.data.list.some((a) => a.id === albId))

  console.log('\n=== 7. 统计 & 种子导入 ===')
  const stats = await api('GET', '/stats')
  rec('GET /admin/stats 返回统计', stats.status === 200 && Array.isArray(stats.data.days), `total=${stats.data.total}`)
  const statsPub = await read('/stats')
  rec('前台 /local-api/stats 可读(200)', statsPub.status === 200)
  const seed = await api('POST', '/seed', {
    type: 'articles',
    items: [{
      id: 'seed-e2e-test', slug: 'seed-e2e-test', title: `${PREFIX}seed`, content: 'x', category: '测试',
      excerpt: '', cover: '', tags: [], date: '2026-08-17', views: 0, likes: 0, isPinned: false, wordCount: 1, readingTime: 1,
    }],
  })
  rec('POST /seed 种子导入路由可用', seed.status === 200 && seed.data.ok === true, `added=${seed.data.added}`)

  await cleanup()
  summarize()
}

async function cleanup() {
  console.log('\n=== 清理测试数据 ===')
  for (const id of created.articles) {
    try { await api('DELETE', '/articles', { id }) } catch {}
  }
  for (const id of created.shuoshuo) {
    try { await api('DELETE', '/shuoshuo', { id }) } catch {}
  }
  for (const id of created.friends) {
    try { await api('DELETE', '/friend-list', { id }) } catch {}
  }
  for (const id of created.albums) {
    try { await api('DELETE', '/gallery', { id }) } catch {}
  }
  // 兜底：扫描并删除任何残留的 E2E 前缀数据
  try {
    const arts = await api('GET', '/articles')
    for (const a of arts.data.list.filter((x) => String(x.title || '').includes(PREFIX))) {
      await api('DELETE', '/articles', { id: a.id })
    }
    const sh = await api('GET', '/shuoshuo')
    for (const s of sh.data.list.filter((x) => String(x.content || '').includes(PREFIX))) {
      await api('DELETE', '/shuoshuo', { id: s.id })
    }
    const fr = await api('GET', '/friend-list')
    for (const f of fr.data.list.filter((x) => String(x.name || '').includes(PREFIX))) {
      await api('DELETE', '/friend-list', { id: f.id })
    }
    const gal = await api('GET', '/gallery')
    for (const g of gal.data.list.filter((x) => String(x.title || '').includes(PREFIX))) {
      await api('DELETE', '/gallery', { id: g.id })
    }
  } catch (e) { console.log('兜底清理异常:', e.message) }
  console.log('清理完成')
}

function summarize() {
  const pass = results.filter((r) => r.ok).length
  const fail = results.length - pass
  console.log(`\n================ 测试汇总 ================`)
  console.log(`总计: ${results.length}  通过: ${pass}  失败: ${fail}`)
  if (fail > 0) {
    console.log('失败项:')
    results.filter((r) => !r.ok).forEach((r) => console.log(`  - ${r.name}  ${r.detail}`))
    process.exit(1)
  } else {
    console.log('全部通过 ✅')
    process.exit(0)
  }
}

main().catch((e) => { console.error('测试异常:', e); process.exit(2) })
