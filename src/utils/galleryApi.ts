interface GalleryPhoto {
  id: string
  kvKey: string
  caption: string
  orientation: 'portrait' | 'landscape'
  url: string
}

interface GalleryAlbum {
  id: string
  title: string
  cover: string
  photos: GalleryPhoto[]
  updatedAt: string
}

/**
 * 公开画廊 API 客户端
 * 优先从 /gallery 接口加载，失败时回退到本地硬编码数据
 */
export async function fetchGalleries(): Promise<GalleryAlbum[]> {
  try {
    const res = await fetch('/gallery')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (Array.isArray(data.list) && data.list.length > 0) {
      // 转换字段名以匹配前台组件（前台用 numeric id，这里用 string）
      return data.list.map((a: any) => ({
        id: a.id,
        title: a.title,
        cover: a.cover,
        photos: (a.photos || []).map((p: any) => ({
          id: p.id,
          url: p.url,
          caption: p.caption || '',
          orientation: p.orientation || 'landscape',
        })),
        updatedAt: a.updatedAt,
      }))
    }
  } catch {
    // 静默回退
  }
  return []
}
