const TOKEN = 'local-admin-token-kirameki-2026'
const BASE = 'http://localhost:4173'
const AUTH = { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }

async function j(method, path, body) {
  const opt = { method, headers: AUTH }
  if (body) opt.body = JSON.stringify(body)
  const r = await fetch(BASE + path, opt)
  const t = await r.text()
  try { return { status: r.status, data: JSON.parse(t) } } catch { return { status: r.status, data: t } }
}

;(async () => {
  // 1) 新建测试相册
  const c = await j('POST', '/admin/gallery', { title: '优化测试相册' })
  const aid = c.data?.album?.id
  console.log('1) 新建相册:', c.status, 'aid=', aid)

  // 2) 批量加两张
  const u = await j('POST', '/admin/gallery/urls', { albumId: aid, photos: [
    { url: 'https://picsum.photos/id/1018/800/600', caption: '山', orientation: 'landscape' },
    { url: 'https://picsum.photos/id/1015/600/800', caption: '水', orientation: 'portrait' },
  ]})
  console.log('2) 加照片:', u.status, 'added=', u.data?.added)

  // 3) 批量改竖版（PUT /gallery with photos array）
  const list = await j('GET', '/admin/gallery')
  const album = list.data.list.find(a => a.id === aid)
  const pids = (album.photos || []).map(p => p.id)
  const newPhotos = album.photos.map(p => ({ ...p, orientation: 'portrait' }))
  const o = await j('PUT', '/admin/gallery', { id: aid, photos: newPhotos })
  const after = (o.data?.album?.photos || []).every(p => p.orientation === 'portrait')
  console.log('3) 批量改竖版:', o.status, '全部竖版=', after, 'pids=', pids.join(','))

  // 4) 批量删除（新接口）
  const d = await j('DELETE', '/admin/gallery/photos', { ids: pids })
  console.log('4) 批量删除:', d.status, 'removed=', d.data?.removed)

  // 5) 清理相册
  const del = await j('DELETE', '/admin/gallery', { id: aid })
  console.log('5) 删除相册:', del.status, 'removed=', del.data?.removed)
})().catch(e => console.error('ERR', e.message))
