import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Trash2,
  X,
  Loader2,
  Camera,
  Upload,
  ImageIcon,
  RefreshCw,
  AlertCircle,
  Pencil,
  Link2,
  ListPlus,
  Star,
  Check,
  Square,
  GripVertical,
} from 'lucide-react'
import { adminApi } from '@/utils/adminApi'
import { useToast } from '@/hooks/useToast'
import { Toast } from '@/components/admin/Toast'
import { GALLERY_ALBUMS } from '@/data/gallery'

interface Photo {
  id: string
  kvKey?: string
  caption: string
  orientation: 'portrait' | 'landscape'
  url: string
}

interface Album {
  id: string
  title: string
  cover: string
  photos: Photo[]
  updatedAt: string
}

type Orientation = 'portrait' | 'landscape'

interface PendingFile {
  file: File
  url: string
  name: string
}

/** 解析文本框：每行一个图片 URL，行内 URL 后可用空格跟说明文字 */
function parseUrlLines(text: string): { url: string; caption: string }[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/)
      return { url: parts[0], caption: parts.slice(1).join(' ').slice(0, 100) }
    })
}

/** 客户端压缩图片：限制最长边，转 JPEG，规避后端 5MB 限制 */
async function compressImage(file: File, maxDim = 1600, quality = 0.85): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  try {
    const bitmap = await createImageBitmap(file)
    let { width, height } = bitmap
    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height)
      width = Math.round(width * scale)
      height = Math.round(height * scale)
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close?.()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', quality))
    if (!blob) return file
    const name = file.name.replace(/\.[^.]+$/, '.jpg')
    return new File([blob], name, { type: 'image/jpeg' })
  } catch {
    return file
  }
}

export default function GalleryManage() {
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [uploadingAlbum, setUploadingAlbum] = useState<string | null>(null)
  const [deletingAlbum, setDeletingAlbum] = useState<string | null>(null)
  const [editingPhoto, setEditingPhoto] = useState<{ albumId: string; photo: Photo } | null>(null)
  const [editCaption, setEditCaption] = useState('')
  const [editOrientation, setEditOrientation] = useState<Orientation>('landscape')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const uploadAlbumRef = useRef<string | null>(null)
  const { toast, showToast } = useToast()

  // 新建相册弹窗（标题 + 可选 URL 列表 → 一键生成相册）
  const [createOpen, setCreateOpen] = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createUrls, setCreateUrls] = useState('')
  const [createOrientation, setCreateOrientation] = useState<Orientation>('landscape')
  const [creating, setCreating] = useState(false)

  // 相册内批量添加照片 URL 弹窗
  const [urlAlbum, setUrlAlbum] = useState<Album | null>(null)
  const [urlText, setUrlText] = useState('')
  const [urlOrientation, setUrlOrientation] = useState<Orientation>('landscape')
  const [addingUrls, setAddingUrls] = useState(false)

  // 相册内「批量管理」选择态
  const [manageAlbum, setManageAlbum] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [batchBusy, setBatchBusy] = useState(false)

  // 待上传队列（拖拽/选择文件后先预览，确认后再压缩上传）
  const [pending, setPending] = useState<Record<string, PendingFile[]>>({})
  const [pendingOrientation, setPendingOrientation] = useState<Orientation>('landscape')

  // 拖拽上传高亮 + 照片排序拖拽
  const [dragOverAlbum, setDragOverAlbum] = useState<string | null>(null)
  const [dragPhotoIdx, setDragPhotoIdx] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { list } = await adminApi.listGallery()
      setAlbums(list as Album[])
      // 存储为空时自动导入内置静态相册（后台可管理原有画廊内容）
      if ((list as any[]).length === 0) {
        try {
          await adminApi.importSeed('gallery', GALLERY_ALBUMS as any[])
          const { list: reloaded } = await adminApi.listGallery()
          setAlbums(reloaded as Album[])
        } catch { /* 静默 */ }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  /** 同步内置静态相册到后台存储（幂等） */
  const syncSeed = async () => {
    try {
      const { added, total } = await adminApi.importSeed('gallery', GALLERY_ALBUMS as any[])
      showToast(added > 0 ? `已同步 ${added} 个内置相册（共 ${total} 个）` : '内置相册已全部在后台（无需同步）')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '同步失败')
    }
  }

  useEffect(() => {
    load()
    // 卸载时释放所有待上传预览 URL
    return () => {
      setPending((p) => {
        Object.values(p).forEach((arr) => arr.forEach((f) => URL.revokeObjectURL(f.url)))
        return {}
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---- 新建相册：标题 + URL 列表，一步生成 ---- */
  const handleCreate = async () => {
    if (!createTitle.trim()) {
      showToast('请输入相册名称')
      return
    }
    setCreating(true)
    try {
      const { album } = await adminApi.createAlbum(createTitle.trim())
      const photos = parseUrlLines(createUrls)
      if (photos.length > 0) {
        await adminApi.addPhotosByUrl(
          album.id,
          photos.map((p) => ({ url: p.url, caption: p.caption, orientation: createOrientation }))
        )
      }
      setCreateOpen(false)
      setCreateTitle('')
      setCreateUrls('')
      showToast(photos.length > 0 ? `相册已创建，添加了 ${photos.length} 张照片` : '相册创建成功')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '创建失败')
    } finally {
      setCreating(false)
    }
  }

  /* ---- 相册内批量添加照片 URL ---- */
  const handleAddUrls = async () => {
    if (!urlAlbum) return
    const photos = parseUrlLines(urlText)
    if (photos.length === 0) {
      showToast('请粘贴至少一个图片 URL（每行一个）')
      return
    }
    setAddingUrls(true)
    try {
      const { added } = await adminApi.addPhotosByUrl(
        urlAlbum.id,
        photos.map((p) => ({ url: p.url, caption: p.caption, orientation: urlOrientation }))
      )
      showToast(added > 0 ? `成功添加 ${added} 张照片` : '没有可添加的有效图片 URL')
      setUrlAlbum(null)
      setUrlText('')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '添加失败')
    } finally {
      setAddingUrls(false)
    }
  }

  const handleDeleteAlbum = async (id: string) => {
    setDeletingAlbum(id)
    try {
      await adminApi.deleteAlbum(id)
      showToast('相册已删除')
      setAlbums((prev) => prev.filter((a) => a.id !== id))
    } catch (e) {
      showToast(e instanceof Error ? e.message : '删除失败')
    } finally {
      setDeletingAlbum(null)
    }
  }

  /* ---- 设为封面（手动指定） ---- */
  const handleSetCover = async (album: Album, photo: Photo) => {
    try {
      await adminApi.updateAlbum({ id: album.id, cover: photo.url })
      showToast('已设为封面')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '操作失败')
    }
  }

  /* ---- 照片排序：拖拽调整后整体回写 ---- */
  const handleReorder = async (album: Album, from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return
    const photos = [...album.photos]
    const [moved] = photos.splice(from, 1)
    photos.splice(to, 0, moved)
    try {
      await adminApi.updateAlbum({ id: album.id, photos })
      setAlbums((prev) =>
        prev.map((a) => (a.id === album.id ? { ...a, photos } : a))
      )
    } catch (e) {
      showToast(e instanceof Error ? e.message : '排序失败')
    }
  }

  /* ---- 批量管理：进入/退出 + 选择 ---- */
  const toggleManage = (albumId: string) => {
    if (manageAlbum === albumId) {
      setManageAlbum(null)
      setSelected(new Set())
    } else {
      setManageAlbum(albumId)
      setSelected(new Set())
    }
  }

  const toggleSelect = (photoId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(photoId)) next.delete(photoId)
      else next.add(photoId)
      return next
    })
  }

  const selectAllInAlbum = (album: Album) => {
    const all = new Set(album.photos.map((p) => p.id))
    setSelected(all)
  }

  /* ---- 批量删除 ---- */
  const handleBatchDelete = async () => {
    if (selected.size === 0) {
      showToast('请先选择照片')
      return
    }
    setBatchBusy(true)
    try {
      const { removed } = await adminApi.deletePhotos(Array.from(selected))
      showToast(`已删除 ${removed} 张照片`)
      setSelected(new Set())
      setManageAlbum(null)
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '批量删除失败')
    } finally {
      setBatchBusy(false)
    }
  }

  /* ---- 批量改方向 ---- */
  const handleBatchOrientation = async (album: Album, orientation: Orientation) => {
    if (selected.size === 0) {
      showToast('请先选择照片')
      return
    }
    setBatchBusy(true)
    try {
      const newPhotos = album.photos.map((p) =>
        selected.has(p.id) ? { ...p, orientation } : p
      )
      await adminApi.updateAlbum({ id: album.id, photos: newPhotos })
      showToast('已更新选中照片方向')
      setSelected(new Set())
      setManageAlbum(null)
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '操作失败')
    } finally {
      setBatchBusy(false)
    }
  }

  /* ---- 文件选择 / 拖拽：先生成预览，不直接上传 ---- */
  const stageFiles = (albumId: string, files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'))
    if (images.length === 0) return
    const staged = images.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
    }))
    setPending((prev) => ({ ...prev, [albumId]: [...(prev[albumId] || []), ...staged] }))
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const albumId = uploadAlbumRef.current
    if (!albumId || files.length === 0) return
    stageFiles(albumId, files)
    e.target.value = ''
  }

  const clearPending = (albumId: string) => {
    setPending((prev) => {
      const next = { ...prev }
      ;(next[albumId] || []).forEach((f) => URL.revokeObjectURL(f.url))
      delete next[albumId]
      return next
    })
  }

  /* ---- 确认上传：压缩后逐张上传 ---- */
  const handleConfirmUpload = async (albumId: string) => {
    const files = pending[albumId] || []
    if (files.length === 0) return
    setUploadingAlbum(albumId)
    let success = 0
    let fail = 0
    for (const item of files) {
      try {
        const compressed = await compressImage(item.file)
        await adminApi.uploadPhoto(compressed, albumId, '', pendingOrientation)
        success++
      } catch {
        fail++
      }
    }
    clearPending(albumId)
    setUploadingAlbum(null)
    if (success > 0) showToast(`上传成功 ${success} 张${fail > 0 ? `，${fail} 张失败` : ''}`)
    else if (fail > 0) showToast('上传失败，请重试')
    await load()
  }

  const handleDeletePhoto = async (photoId: string) => {
    try {
      await adminApi.deletePhoto(photoId)
      showToast('照片已删除')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '删除失败')
    }
  }

  const handleEditPhoto = (albumId: string, photo: Photo) => {
    setEditingPhoto({ albumId, photo })
    setEditCaption(photo.caption || '')
    setEditOrientation(photo.orientation || 'landscape')
  }

  const handleSavePhoto = async () => {
    if (!editingPhoto) return
    try {
      await adminApi.updatePhoto(editingPhoto.photo.id, {
        caption: editCaption.trim(),
        orientation: editOrientation,
      })
      showToast('已保存')
      setEditingPhoto(null)
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '保存失败')
    }
  }

  const handleRenameAlbum = async (album: Album) => {
    const title = prompt('修改相册名称', album.title)
    if (!title || !title.trim() || title === album.title) return
    try {
      await adminApi.updateAlbum({ id: album.id, title: title.trim() })
      showToast('已重命名')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '操作失败')
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-white/50">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          <p>加载中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <p className="text-red-300">{error}</p>
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition-all hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
            重新加载
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg">
            <Camera className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">相册管理</h3>
            <p className="text-sm text-white/40">共 {albums.length} 个相册 · 拖拽图片到相册即可上传，支持排序与批量管理</p>
          </div>
        </div>

        {/* 添加相册 / 同步内置 */}
        <div className="flex items-center gap-2">
          <button
            onClick={syncSeed}
            title="把内置静态相册同步到后台存储"
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/70 transition-all hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
            同步内置
          </button>
          <button
            onClick={() => { setCreateOpen(true); setCreateTitle(''); setCreateUrls(''); setCreateOrientation('landscape') }}
            className="flex items-center gap-1.5 rounded-xl border border-violet-400/30 bg-violet-500/20 px-4 py-2.5 text-sm font-medium text-violet-200 transition-all hover:bg-violet-500/30"
          >
            <Plus className="h-4 w-4" />
            添加相册
          </button>
        </div>
      </div>

      {/* 相册列表 */}
      {albums.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <Camera className="h-12 w-12 text-white/20" />
          <p className="mt-3 text-white/40">还没有相册，点击右上角「添加相册」开始</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {albums.map((album) => {
            const isExpanded = expandedId === album.id
            const isManaging = manageAlbum === album.id
            const pendingList = pending[album.id] || []
            const isDragOver = dragOverAlbum === album.id
            return (
              <motion.div
                key={album.id}
                layout
                onDragOver={(e) => {
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    e.preventDefault()
                    if (!isDragOver) setDragOverAlbum(album.id)
                  }
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget === e.target) setDragOverAlbum(null)
                }}
                onDrop={(e) => {
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    e.preventDefault()
                    setDragOverAlbum(null)
                    stageFiles(album.id, Array.from(e.dataTransfer.files))
                  }
                }}
                className={`relative rounded-2xl border bg-white/5 backdrop-blur-xl overflow-hidden transition-colors ${
                  isDragOver
                    ? 'border-violet-400/60 ring-2 ring-violet-400/40'
                    : 'border-white/10'
                }`}
              >
                {/* 拖拽上传遮罩 */}
                {isDragOver && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-violet-500/20 backdrop-blur-sm">
                    <Upload className="h-8 w-8 text-white" />
                    <p className="text-sm font-medium text-white">松开即可添加图片</p>
                  </div>
                )}

                {/* 相册头部 */}
                <div className="flex items-center gap-4 p-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/5">
                    {album.cover ? (
                      <img src={album.cover} alt={album.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-white/20" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="truncate text-base font-semibold text-white">{album.title}</h4>
                    <p className="text-xs text-white/40">
                      {album.photos?.length || 0} 张 · 更新于 {album.updatedAt}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleRenameAlbum(album)}
                      className="rounded-lg p-2 text-white/50 transition-colors hover:bg-white/5 hover:text-white/80"
                      title="重命名"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAlbum(album.id)}
                      disabled={deletingAlbum === album.id}
                      className="rounded-lg p-2 text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                      title="删除相册"
                    >
                      {deletingAlbum === album.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* 操作栏：查看 / URL 添加 / 上传 / 批量 */}
                <div className="flex items-center gap-2 border-t border-white/5 px-4 py-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : album.id)}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-sm text-white/70 transition-all hover:bg-white/10 hover:text-white"
                  >
                    {isExpanded ? '收起照片' : '查看照片'}
                  </button>
                  <button
                    onClick={() => { setUrlAlbum(album); setUrlText(''); setUrlOrientation('landscape') }}
                    className="flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-500/20 px-3 py-2 text-sm text-sky-200 transition-all hover:bg-sky-500/30"
                    title="粘贴图片 URL 批量添加照片"
                  >
                    <Link2 className="h-4 w-4" />
                    URL 添加
                  </button>
                  <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-500/20 px-3 py-2 text-sm text-violet-200 transition-all hover:bg-violet-500/30">
                    {uploadingAlbum === album.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    上传
                    <input
                      ref={(el) => { if (el && uploadAlbumRef.current === album.id) fileInputRef.current = el }}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                      onClick={() => { uploadAlbumRef.current = album.id }}
                    />
                  </label>
                  <button
                    onClick={() => toggleManage(album.id)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-all ${
                      isManaging
                        ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                    title="批量选择照片"
                  >
                    <Check className="h-4 w-4" />
                    批量
                  </button>
                </div>

                {/* 待上传预览区 */}
                {pendingList.length > 0 && (
                  <div className="border-t border-white/5 bg-black/20 px-4 py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs text-white/50">待上传 {pendingList.length} 张（已自动压缩）</span>
                      <button onClick={() => clearPending(album.id)} className="text-xs text-white/40 hover:text-white/70">
                        清空
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {pendingList.map((f, i) => (
                        <div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-white/5">
                          <img src={f.url} alt={f.name} className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40">方向</span>
                        {(['landscape', 'portrait'] as Orientation[]).map((o) => (
                          <button
                            key={o}
                            onClick={() => setPendingOrientation(o)}
                            className={`rounded-lg border px-2.5 py-1 text-xs transition-all ${
                              pendingOrientation === o
                                ? 'border-violet-400/50 bg-violet-500/20 text-violet-200'
                                : 'border-white/10 bg-white/5 text-white/50'
                            }`}
                          >
                            {o === 'landscape' ? '横版' : '竖版'}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => handleConfirmUpload(album.id)}
                        disabled={uploadingAlbum === album.id}
                        className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition-all hover:shadow-purple-500/50 disabled:opacity-60"
                      >
                        {uploadingAlbum === album.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        上传 {pendingList.length} 张
                      </button>
                    </div>
                  </div>
                )}

                {/* 批量操作栏 */}
                {isManaging && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
                    <span className="text-xs text-emerald-200">已选 {selected.size} 张</span>
                    <button
                      onClick={() => selectAllInAlbum(album)}
                      className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/10"
                    >
                      <Check className="h-3.5 w-3.5" />
                      全选
                    </button>
                    <button
                      onClick={() => setSelected(new Set())}
                      className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/10"
                    >
                      <Square className="h-3.5 w-3.5" />
                      取消选择
                    </button>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => handleBatchOrientation(album, 'landscape')}
                        disabled={batchBusy}
                        className="rounded-lg border border-sky-400/30 bg-sky-500/20 px-2.5 py-1.5 text-xs text-sky-200 hover:bg-sky-500/30 disabled:opacity-50"
                      >
                        设横版
                      </button>
                      <button
                        onClick={() => handleBatchOrientation(album, 'portrait')}
                        disabled={batchBusy}
                        className="rounded-lg border border-sky-400/30 bg-sky-500/20 px-2.5 py-1.5 text-xs text-sky-200 hover:bg-sky-500/30 disabled:opacity-50"
                      >
                        设竖版
                      </button>
                      <button
                        onClick={() => handleBatchDelete()}
                        disabled={batchBusy}
                        className="flex items-center gap-1 rounded-lg border border-red-400/30 bg-red-500/20 px-2.5 py-1.5 text-xs text-red-200 hover:bg-red-500/30 disabled:opacity-50"
                      >
                        {batchBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        删除选中
                      </button>
                    </div>
                  </div>
                )}

                {/* 照片网格 */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden border-t border-white/5"
                    >
                      <div className="grid grid-cols-3 gap-2 p-4 sm:grid-cols-4">
                        {album.photos?.map((photo, idx) => {
                          const isSelected = selected.has(photo.id)
                          const isCover = album.cover === photo.url
                          return (
                            <div
                              key={photo.id}
                              draggable={!isManaging}
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', String(idx))
                                setDragPhotoIdx(idx)
                              }}
                              onDragEnd={() => setDragPhotoIdx(null)}
                              onDragOver={(e) => {
                                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) return
                                e.preventDefault()
                              }}
                              onDrop={(e) => {
                                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) return
                                e.preventDefault()
                                const from = Number(e.dataTransfer.getData('text/plain'))
                                handleReorder(album, from, idx)
                                setDragPhotoIdx(null)
                              }}
                              onClick={() => isManaging && toggleSelect(photo.id)}
                              className={`group relative aspect-square overflow-hidden rounded-lg bg-white/5 ${
                                isManaging ? 'cursor-pointer' : ''
                              } ${dragPhotoIdx === idx ? 'opacity-40' : ''} ${
                                isSelected ? 'ring-2 ring-emerald-400' : ''
                              }`}
                            >
                              <img src={photo.url} alt={photo.caption} className="h-full w-full object-cover" loading="lazy" />

                              {/* 批量选择遮罩 */}
                              {isManaging && (
                                <div className={`absolute inset-0 flex items-center justify-center ${isSelected ? 'bg-emerald-500/30' : 'bg-black/40'}`}>
                                  {isSelected ? (
                                    <Check className="h-6 w-6 text-white" />
                                  ) : (
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white/70" />
                                  )}
                                </div>
                              )}

                              {/* 封面标记 */}
                              {isCover && !isManaging && (
                                <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-md bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
                                  <Star className="h-3 w-3 fill-white" />
                                  封面
                                </div>
                              )}

                              {/* 拖拽手柄（非批量模式） */}
                              {!isManaging && (
                                <div className="absolute right-1.5 top-1.5 cursor-grab rounded-md bg-black/40 p-1 text-white/70 opacity-0 transition-opacity group-hover:opacity-100">
                                  <GripVertical className="h-3.5 w-3.5" />
                                </div>
                              )}

                              {/* 悬浮操作（非批量模式） */}
                              {!isManaging && (
                                <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEditPhoto(album.id, photo) }}
                                    className="rounded-lg bg-white/10 p-1.5 text-white transition-colors hover:bg-white/20"
                                    title="编辑"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleSetCover(album, photo) }}
                                    className="rounded-lg bg-amber-500/30 p-1.5 text-amber-200 transition-colors hover:bg-amber-500/50"
                                    title="设为封面"
                                  >
                                    <Star className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id) }}
                                    className="rounded-lg bg-red-500/20 p-1.5 text-red-300 transition-colors hover:bg-red-500/30"
                                    title="删除"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}

                              {photo.caption && (
                                <div className="absolute bottom-0 left-0 right-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 py-1 text-[10px] text-white/80">
                                  {photo.caption}
                                </div>
                              )}
                            </div>
                          )
                        })}
                        {(!album.photos || album.photos.length === 0) && (
                          <div className="col-span-full py-8 text-center text-sm text-white/30">
                            暂无照片，点击「URL 添加」粘贴图片地址，或拖拽 / 上传本地图片
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ===== 新建相册弹窗（标题 + URL 列表） ===== */}
      <AnimatePresence>
        {createOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!creating) setCreateOpen(false) }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-[#12101a] p-6 shadow-2xl"
              style={{ maxHeight: '85vh', overflowY: 'auto' }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                    <ListPlus className="h-5 w-5 text-violet-300" />
                    添加相册
                  </h3>
                  <p className="mt-1 text-xs text-white/40">填写相册名称，再粘贴图片 URL（每行一个），保存后立即在前台画廊展示</p>
                </div>
                <button onClick={() => { if (!creating) setCreateOpen(false) }} className="text-white/40 hover:text-white/60">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <label className="mb-2 block text-sm font-medium text-white/70">相册名称 *</label>
              <input
                autoFocus
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="例如：夏日祭典"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-violet-400/50"
              />

              <label className="mb-2 mt-4 block text-sm font-medium text-white/70">
                照片 URL <span className="text-white/30">（每行一个，URL 后可跟空格加说明文字；可留空先建空相册）</span>
              </label>
              <textarea
                value={createUrls}
                onChange={(e) => setCreateUrls(e.target.value)}
                rows={6}
                placeholder={'https://example.com/photo1.jpg 山间晨雾\nhttps://example.com/photo2.jpg\nhttps://example.com/photo3.jpg 花火大会'}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-violet-400/50"
              />

              <label className="mb-2 mt-4 block text-sm font-medium text-white/70">照片方向</label>
              <div className="flex gap-2">
                {(['landscape', 'portrait'] as Orientation[]).map((o) => (
                  <button
                    key={o}
                    onClick={() => setCreateOrientation(o)}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-all ${
                      createOrientation === o
                        ? 'border-violet-400/50 bg-violet-500/20 text-violet-200'
                        : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {o === 'landscape' ? '横版（4:3）' : '竖版（4:5）'}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setCreateOpen(false)}
                  disabled={creating}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition-all hover:bg-white/10 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition-all hover:shadow-purple-500/50 disabled:opacity-60"
                >
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  创建相册
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== 相册内批量添加照片 URL 弹窗 ===== */}
      <AnimatePresence>
        {urlAlbum && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!addingUrls) setUrlAlbum(null) }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-[#12101a] p-6 shadow-2xl"
              style={{ maxHeight: '85vh', overflowY: 'auto' }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                    <Link2 className="h-5 w-5 text-sky-300" />
                    添加照片到「{urlAlbum.title}」
                  </h3>
                  <p className="mt-1 text-xs text-white/40">粘贴图片 URL，每行一个，URL 后可跟空格加说明文字</p>
                </div>
                <button onClick={() => { if (!addingUrls) setUrlAlbum(null) }} className="text-white/40 hover:text-white/60">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <textarea
                autoFocus
                value={urlText}
                onChange={(e) => setUrlText(e.target.value)}
                rows={8}
                placeholder={'https://example.com/photo1.jpg 说明一\nhttps://example.com/photo2.jpg\nhttps://example.com/photo3.jpg 说明三'}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-sky-400/50"
              />

              <label className="mb-2 mt-4 block text-sm font-medium text-white/70">照片方向</label>
              <div className="flex gap-2">
                {(['landscape', 'portrait'] as Orientation[]).map((o) => (
                  <button
                    key={o}
                    onClick={() => setUrlOrientation(o)}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-all ${
                      urlOrientation === o
                        ? 'border-sky-400/50 bg-sky-500/20 text-sky-200'
                        : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {o === 'landscape' ? '横版（4:3）' : '竖版（4:5）'}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setUrlAlbum(null)}
                  disabled={addingUrls}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition-all hover:bg-white/10 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleAddUrls}
                  disabled={addingUrls}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-blue-500/50 disabled:opacity-60"
                >
                  {addingUrls && <Loader2 className="h-4 w-4 animate-spin" />}
                  添加到相册
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 照片编辑弹窗（支持横/竖方向 + 实时预览） */}
      <AnimatePresence>
        {editingPhoto && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingPhoto(null)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-[#12101a] p-6 shadow-2xl"
              style={{ maxHeight: '85vh', overflowY: 'auto' }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">编辑照片</h3>
                <button onClick={() => setEditingPhoto(null)} className="text-white/40 hover:text-white/60">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className={`mb-4 overflow-hidden rounded-xl bg-white/5 ${editOrientation === 'portrait' ? 'max-h-80' : 'max-h-64'}`}>
                <img
                  src={editingPhoto.photo.url}
                  alt={editCaption}
                  className={`w-full object-contain ${editOrientation === 'portrait' ? 'max-h-80' : 'max-h-64'}`}
                />
              </div>

              <label className="mb-2 block text-sm font-medium text-white/70">说明文字</label>
              <input
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                placeholder="给这张照片加个说明..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-violet-400/50"
              />

              <label className="mb-2 mt-4 block text-sm font-medium text-white/70">照片方向</label>
              <div className="flex gap-2">
                {(['landscape', 'portrait'] as Orientation[]).map((o) => (
                  <button
                    key={o}
                    onClick={() => setEditOrientation(o)}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-all ${
                      editOrientation === o
                        ? 'border-violet-400/50 bg-violet-500/20 text-violet-200'
                        : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {o === 'landscape' ? '横版（4:3）' : '竖版（4:5）'}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setEditingPhoto(null)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition-all hover:bg-white/10"
                >
                  取消
                </button>
                <button
                  onClick={handleSavePhoto}
                  className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition-all hover:shadow-purple-500/50"
                >
                  保存
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast */}
      <Toast message={toast} />
    </div>
  )
}
