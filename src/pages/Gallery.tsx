import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Camera, X, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react'

interface Photo {
  id: string
  url: string
  caption: string
  orientation: 'portrait' | 'landscape'
}

interface Album {
  id: number
  title: string
  photos: Photo[]
  updatedAt: string
}

/**
 * 生成本地画廊图片 URL
 * 每个相册 8 张照片，对应 album{id}_1.jpg ~ album{id}_8.jpg
 */
const IMAGES_PER_ALBUM = 8

function getPhotoUrl(photo: Photo): string {
  for (const album of ALBUMS) {
    const idx = album.photos.findIndex(p => p.id === photo.id)
    if (idx !== -1) {
      const imageNum = (idx % IMAGES_PER_ALBUM) + 1
      return `/img/gallery/album${album.id}_${imageNum}.jpg?v=7`
    }
  }
  return '/img/gallery/album2_1.jpg?v=7'
}

// ========== 相册数据 ==========
const ALBUMS: Album[] = [
  {
    id: 2,
    title: '风景写真',
    updatedAt: '2026-05-26',
    photos: [
      { id: 'p1', url: '', caption: '山间晨雾', orientation: 'portrait' },
      { id: 'p2', url: '', caption: '湖畔夕照', orientation: 'portrait' },
      { id: 'p3', url: '', caption: '林间小径', orientation: 'portrait' },
      { id: 'p4', url: '', caption: '云海翻涌', orientation: 'portrait' },
      { id: 'p5', url: '', caption: '花田漫步', orientation: 'portrait' },
      { id: 'p6', url: '', caption: '溪水潺潺', orientation: 'portrait' },
      { id: 'p7', url: '', caption: '远山如黛', orientation: 'portrait' },
      { id: 'p8', url: '', caption: '星空露营', orientation: 'portrait' },
    ],
  },
  {
    id: 3,
    title: '日常记录',
    updatedAt: '2026-05-08',
    photos: [
      { id: 'p9', url: '', caption: '午后咖啡', orientation: 'landscape' },
      { id: 'p10', url: '', caption: '街角偶遇', orientation: 'landscape' },
      { id: 'p11', url: '', caption: '窗边读书', orientation: 'landscape' },
      { id: 'p12', url: '', caption: '雨后初晴', orientation: 'landscape' },
      { id: 'p13', url: '', caption: '厨房时光', orientation: 'landscape' },
      { id: 'p14', url: '', caption: '黄昏散步', orientation: 'landscape' },
      { id: 'p15', url: '', caption: '周末集市', orientation: 'landscape' },
      { id: 'p16', url: '', caption: '夜深人静', orientation: 'landscape' },
    ],
  },
  {
    id: 4,
    title: '旅行足迹',
    updatedAt: '2026-05-10',
    photos: [
      { id: 'p17', url: '', caption: '古镇晨曦', orientation: 'landscape' },
      { id: 'p18', url: '', caption: '海边日落', orientation: 'landscape' },
      { id: 'p19', url: '', caption: '山城夜景', orientation: 'landscape' },
      { id: 'p20', url: '', caption: '田园风光', orientation: 'landscape' },
      { id: 'p21', url: '', caption: '寺院钟声', orientation: 'landscape' },
      { id: 'p22', url: '', caption: '雪山远眺', orientation: 'landscape' },
      { id: 'p23', url: '', caption: '渔港黄昏', orientation: 'landscape' },
      { id: 'p24', url: '', caption: '荒野公路', orientation: 'landscape' },
    ],
  },
  {
    id: 5,
    title: '季节物语',
    updatedAt: '2026-08-15',
    photos: [
      { id: 'p25', url: '', caption: '春樱初绽', orientation: 'landscape' },
      { id: 'p26', url: '', caption: '夏空万里', orientation: 'portrait' },
      { id: 'p27', url: '', caption: '秋叶静美', orientation: 'portrait' },
      { id: 'p28', url: '', caption: '冬雪皑皑', orientation: 'portrait' },
      { id: 'p29', url: '', caption: '花火大会', orientation: 'landscape' },
      { id: 'p30', url: '', caption: '星空之下', orientation: 'portrait' },
      { id: 'p31', url: '', caption: '夕阳无限', orientation: 'portrait' },
      { id: 'p32', url: '', caption: '朝雾微凉', orientation: 'portrait' },
    ],
  },
  {
    id: 6,
    title: '城市印象',
    updatedAt: '2026-08-15',
    photos: [
      { id: 'p33', url: '', caption: '霓虹闪烁', orientation: 'portrait' },
      { id: 'p34', url: '', caption: '都市黄昏', orientation: 'landscape' },
      { id: 'p35', url: '', caption: '街角一隅', orientation: 'landscape' },
      { id: 'p36', url: '', caption: '高楼林立', orientation: 'landscape' },
      { id: 'p37', url: '', caption: '雨夜街灯', orientation: 'landscape' },
      { id: 'p38', url: '', caption: '夕阳余晖', orientation: 'portrait' },
      { id: 'p39', url: '', caption: '建筑之美', orientation: 'portrait' },
      { id: 'p40', url: '', caption: '繁华尽头', orientation: 'landscape' },
    ],
  },
]

// ========== 照片卡片（拍立得风格，与原站一致）==========

function PhotoCard({ photo, index, onClick }: { photo: Photo; index: number; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const retryCount = useRef(0)

  const rotation = (() => {
    const seed = photo.id.charCodeAt(0) + photo.id.charCodeAt(photo.id.length - 1)
    return ((seed % 7) - 3) * 0.8
  })()

  const isLandscape = photo.orientation === 'landscape'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotate: rotation * 2 }}
      animate={{ opacity: 1, y: 0, rotate: rotation }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3), ease: 'easeOut' }}
      whileHover={{ rotate: 0, scale: 1.03, zIndex: 10, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
      onClick={onClick}
      className="relative cursor-pointer group break-inside-avoid mb-3 md:mb-5"
      style={{ transformOrigin: 'center center' }}
    >
      {/* 照片外框（拍立得白边） */}
      <div className="relative bg-white dark:bg-slate-800 p-2 pb-6 md:p-2.5 md:pb-8 rounded-sm shadow-lg dark:shadow-black/30 group-hover:shadow-2xl transition-shadow duration-300">
        <div className={`relative overflow-hidden rounded-[1px] ${isLandscape ? 'aspect-[4/3]' : 'aspect-[4/5]'}`}>
          {/* CSS 渐变占位（不再用 LQIP，避免双倍请求） */}
          {!loaded && !errored && (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-pulse" />
          )}
          {/* 图片：直接使用原图，加载完成后淡入 */}
          {!errored && (
            <img
              key={retryKey}
              src={getPhotoUrl(photo)}
              alt={photo.caption || '照片'}
              loading="lazy"
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => {
                if (retryCount.current < 2) {
                  retryCount.current++
                  setTimeout(() => setRetryKey(k => k + 1), 500)
                } else {
                  setErrored(true)
                }
              }}
              className="w-full h-full object-cover group-hover:scale-105"
              style={{
                opacity: loaded ? 1 : 0,
                transition: 'opacity 0.5s ease, transform 0.5s ease',
              }}
            />
          )}
          {errored && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-200 dark:bg-slate-700 gap-2">
              <Camera className="w-8 h-8 text-slate-400" />
              <span className="text-[10px] text-slate-400">加载失败</span>
              <button type="button"
                onClick={(e) => { e.stopPropagation(); retryCount.current = 0; setErrored(false); setLoaded(false); setRetryKey(k => k + 1) }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-300 dark:bg-slate-600 text-[10px] text-slate-600 dark:text-slate-200 hover:bg-accent hover:text-white transition-colors">
                <RotateCw className="w-3 h-3" /> 重试
              </button>
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
        </div>

        {photo.caption && (
          <div className="absolute bottom-1.5 left-0 right-0 text-center">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-serif italic tracking-wide">
              {photo.caption}
            </span>
          </div>
        )}
      </div>

      {/* 胶带装饰 */}
      <div
        className="absolute -top-2 left-2 md:left-3 w-8 h-3 md:w-10 md:h-4 bg-amber-200/60 dark:bg-amber-300/30 rounded-sm rotate-[-6deg] pointer-events-none"
        style={{ backdropFilter: 'blur(2px)' }}
      />
    </motion.div>
  )
}

// ========== 相册卡片（叠放照片 + 就地展开，与原站一致）==========
const STACK_ANGLES = [-4, 0, 3]
const FAN_ANGLES = [-12, 0, 12]
const FAN_Y = [-4, -10, -4]

function AlbumCard({ album, isExpanded, onToggle, onPhotoClick }: {
  album: Album
  isExpanded: boolean
  onToggle: () => void
  onPhotoClick: (photos: Photo[], index: number) => void
}) {
  const covers = album.photos.slice(0, 3).reverse()

  return (
    <div
      className="rounded-3xl overflow-hidden cursor-pointer"
      onClick={() => { onToggle() }}
    >
      {/* 封面区域 */}
      <div className="relative px-4 pt-4 pb-3 md:px-6 md:pt-6 md:pb-4">
        {/* 堆叠照片 */}
        <motion.div
          className="relative h-36 md:h-48 mx-auto max-w-[200px] md:max-w-[260px]"
          initial="rest"
          animate={isExpanded ? 'hover' : 'rest'}
          whileHover="hover"
        >
          {covers.map((photo, i) => (
            <motion.div
              key={photo.id}
              className="absolute inset-0"
              style={{ zIndex: i + 1 }}
              variants={{
                rest: {
                  rotate: STACK_ANGLES[i] ?? 0,
                  y: i * 12,
                  scale: 1 - i * 0.04,
                  zIndex: i + 1,
                },
                hover: {
                  rotate: FAN_ANGLES[i] ?? 0,
                  y: FAN_Y[i] ?? 0,
                  scale: i === 1 ? 1 : 0.95,
                },
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <div className="relative w-full h-full rounded-xl overflow-hidden shadow-lg ring-1 ring-black/5 dark:ring-white/10">
                {/* CSS 渐变占位 */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-300 via-slate-400 to-slate-300 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700" />
                {/* 图片 */}
                <img
                  src={getPhotoUrl(photo)}
                  alt={photo.caption || album.title}
                  className="relative w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => { e.currentTarget.style.opacity = '0' }}
                />
              </div>
            </motion.div>
          ))}

          {/* 照片数量徽标 */}
          <div className="absolute -bottom-2 right-0 z-20 px-2 py-0.5 md:px-2.5 rounded-full bg-sky-500 text-white text-[10px] md:text-xs font-bold shadow-lg shadow-sky-500/30">
            {album.photos.length} 张
          </div>
        </motion.div>

        {/* 相册信息 */}
        <div className="mt-4 md:mt-6 text-center">
          <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100">
            {album.title}
          </h3>
          <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-1">
            {album.updatedAt.replace('T', ' ').slice(0, 19)}
          </p>
        </div>
      </div>

      {/* 展开的照片网格 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="overflow-hidden"
          >
            <div className="px-4 pb-6 md:px-6">
              <div className="p-4 md:p-6 rounded-2xl">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-5">
                  {album.photos.map((photo, photoIndex) => (
                    <PhotoCard
                      key={photo.id}
                      photo={photo}
                      index={photoIndex}
                      onClick={() => onPhotoClick(album.photos, photoIndex)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ========== 全屏灯箱（单张照片查看，与原站一致）==========
function Lightbox({ photos, currentIndex, isOpen, onClose, onPrev, onNext }: {
  photos: Photo[]
  currentIndex: number
  isOpen: boolean
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const photo = photos[currentIndex]
  const open = isOpen && photo !== undefined
  const [imgError, setImgError] = useState(false)
  const [imgRetryKey, setImgRetryKey] = useState(0)

  useEffect(() => { setImgError(false) }, [currentIndex, isOpen])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowLeft') onPrev()
    if (e.key === 'ArrowRight') onNext()
  }, [open, onClose, onPrev, onNext])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // 预加载相邻图片（下一张 + 上一张），切换时更流畅
  useEffect(() => {
    if (!open || photos.length <= 1) return
    const preload = (idx: number) => {
      const p = photos[idx]
      if (!p) return
      const img = new Image()
      img.src = getPhotoUrl(p)
    }
    preload((currentIndex + 1) % photos.length)
    preload((currentIndex - 1 + photos.length) % photos.length)
  }, [currentIndex, photos, open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          onClick={onClose}
        >
          {/* 背景遮罩 */}
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

          {/* 关闭 */}
          <button type="button" onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
            <X className="w-6 h-6" />
          </button>

          {/* 上一张 */}
          {photos.length > 1 && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onPrev() }}
              className="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* 下一张 */}
          {photos.length > 1 && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onNext() }}
              className="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* 图片 */}
          <motion.div
            key={photo.id}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative z-10 max-w-[90vw] max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {!imgError ? (
              <img key={imgRetryKey} src={getPhotoUrl(photo)} alt={photo.caption || '照片'}
                decoding="async"
                onError={() => setImgError(true)}
                className="max-h-[85vh] w-auto object-contain rounded-lg shadow-2xl" />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 w-80 h-60 rounded-lg bg-white/5">
                <Camera className="w-10 h-10 text-white/30" />
                <span className="text-sm text-white/50">图片加载失败</span>
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); setImgError(false); setImgRetryKey(k => k + 1) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-colors">
                  <RotateCw className="w-3.5 h-3.5" /> 重新加载
                </button>
              </div>
            )}
            {photo.caption && !imgError && (
              <div className="absolute -bottom-10 left-0 right-0 text-center">
                <span className="text-sm text-white/70 font-serif italic">{photo.caption}</span>
              </div>
            )}
          </motion.div>

          {/* 页码 */}
          {photos.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 text-center z-10">
              <span className="text-sm text-white/50">{currentIndex + 1} / {photos.length}</span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ========== 主页面 ==========
export default function Gallery() {
  const navigate = useNavigate()
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentPhotos, setCurrentPhotos] = useState<Photo[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const expandedRef = useRef<HTMLDivElement>(null)

  // 点击相册外部时收起已展开的相册
  useEffect(() => {
    if (expandedId === null) return
    const handler = (e: MouseEvent) => {
      if (lightboxOpen) return
      if (expandedRef.current && !expandedRef.current.contains(e.target as Node)) {
        setExpandedId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [expandedId, lightboxOpen])

  const openLightbox = (photos: Photo[], index: number) => {
    setCurrentPhotos(photos)
    setCurrentIndex(index)
    setLightboxOpen(true)
  }

  const sortedAlbums = useMemo(
    () => [...ALBUMS].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    []
  )

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12">
      {/* 页头 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 md:mb-12"
      >
        <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
          <button type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => {
            if (expandedId !== null) {
              setExpandedId(null)
            } else {
              navigate(-1)
            }
          }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium
              bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))]
              hover:bg-accent/10 hover:text-accent transition-all mr-2 md:mr-3"
            aria-label={expandedId !== null ? '收起相册' : '返回上一页'}>
            <ArrowLeft size={14} /> {expandedId !== null ? '收起' : '返回'}
          </button>
          <Camera className="w-5 h-5 md:w-7 md:h-7 text-sky-500" />
          <h1 className="text-xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">照片墙</h1>
        </div>
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 ml-7 md:ml-10">
          用照片记录生活的每一个瞬间
        </p>
      </motion.div>

      {/* 相册网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 select-none">
        {sortedAlbums.map((album, albumIndex) => {
          const isExpanded = expandedId === album.id
          const isHidden = expandedId !== null && !isExpanded

          return (
            <AnimatePresence key={album.id}>
              {!isHidden && (
                <motion.div
                  layout
                  initial={expandedId === null ? { opacity: 0, y: 30 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: expandedId === null ? albumIndex * 0.1 : 0 }}
                  className={isExpanded ? 'sm:col-span-2 lg:col-span-3' : ''}
                >
                  <div ref={isExpanded ? expandedRef : undefined}>
                    <AlbumCard
                      album={album}
                      isExpanded={isExpanded}
                      onToggle={() => setExpandedId((prev) => (prev === album.id ? null : album.id))}
                      onPhotoClick={openLightbox}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )
        })}
      </div>

      {/* 灯箱 */}
      <Lightbox
        photos={currentPhotos}
        currentIndex={currentIndex}
        isOpen={lightboxOpen}
        onClose={() => { setLightboxOpen(false); setCurrentPhotos([]) }}
        onPrev={() => currentPhotos.length > 0 && setCurrentIndex((i) => (i - 1 + currentPhotos.length) % currentPhotos.length)}
        onNext={() => currentPhotos.length > 0 && setCurrentIndex((i) => (i + 1) % currentPhotos.length)}
      />
    </div>
  )
}
