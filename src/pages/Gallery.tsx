import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, X, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react'
import { playClickSound } from '@/utils/sounds'

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

// ========== 所有照片数据（来自 boke.hiromu.top）==========
const ALBUMS: Album[] = [
  {
    id: 2,
    title: '风景写真',
    updatedAt: '2026-05-26',
    photos: [
      { id: 'p1', url: '/img/2e45f3f255f14d06979148160bac1b7c.webp', caption: '风景1', orientation: 'portrait' },
      { id: 'p2', url: '/img/c6d1c99db3644706bc86f9ae97c8bc00.webp', caption: '风景2', orientation: 'portrait' },
      { id: 'p3', url: '/img/a319cea329a84d589aa01866fe6dcd89.webp', caption: '风景3', orientation: 'portrait' },
      { id: 'p4', url: '/img/51830eac34b949ca87c2163bbfdafd0f.webp', caption: '风景4', orientation: 'portrait' },
      { id: 'p5', url: '/img/5ce3c84d1924445d8756ed0cbe88f180.webp', caption: '风景5', orientation: 'portrait' },
      { id: 'p6', url: '/img/deec38eaa6114d0b9733072329aa446f.webp', caption: '风景6', orientation: 'portrait' },
      { id: 'p7', url: '/img/cd0913c692ec4b7aa147b2dc29e99b93.webp', caption: '风景7', orientation: 'portrait' },
      { id: 'p8', url: '/img/9d5a8683d2984f9bb3edc1b6f2227e1d.webp', caption: '风景8', orientation: 'portrait' },
      { id: 'p9', url: '/img/e5e7f934f96546328ba9a91124c26eb1.webp', caption: '风景9', orientation: 'portrait' },
      { id: 'p10', url: '/img/02e96e7700e543ccbbc5774f7bf272d3.webp', caption: '风景10', orientation: 'portrait' },
      { id: 'p11', url: '/img/a60c801076c241a690e6831581ca7d15.webp', caption: '风景11', orientation: 'portrait' },
      { id: 'p12', url: '/img/7e4afcbc5ff849b0951a15a8136c3901.webp', caption: '风景12', orientation: 'portrait' },
      { id: 'p13', url: '/img/57c66bb62e9f4ebfbe6a6cd5351e852e.webp', caption: '风景13', orientation: 'portrait' },
      { id: 'p14', url: '/img/beac62cd602347cc8ca100aa95d488c5.jpg', caption: '风景14', orientation: 'portrait' },
      { id: 'p15', url: '/img/33f636cbdc2b45c0a6db0bdb58f9d6b8.jpg', caption: '风景15', orientation: 'portrait' },
      { id: 'p16', url: '/img/79df9e0b583f499f90195fca9ceba795.jpg', caption: '风景16', orientation: 'portrait' },
      { id: 'p17', url: '/img/a0765227c9874588b9ec09b67516fa3f.jpg', caption: '风景17', orientation: 'portrait' },
      { id: 'p18', url: '/img/9c91cba5b06548d4a66ac28ef4f4d98c.webp', caption: '风景18', orientation: 'portrait' },
      { id: 'p19', url: '/img/79e0e03bd5394d39887db1a0128f4dbc.webp', caption: '风景19', orientation: 'portrait' },
    ],
  },
  {
    id: 3,
    title: '日常记录',
    updatedAt: '2026-05-08',
    photos: [
      { id: 'p20', url: '/img/814f4b66bd7045e296754ca46ca22342.webp', caption: '日常1', orientation: 'landscape' },
      { id: 'p21', url: '/img/c0b7e306748f4a0ab7da6ae3eb9b34cc.webp', caption: '日常2', orientation: 'landscape' },
      { id: 'p22', url: '/img/c317869ba5e64b4988c38fcb119720c8.webp', caption: '日常3', orientation: 'landscape' },
      { id: 'p23', url: '/img/3c1b448e88d14f11973cbc596e4da2c6.webp', caption: '日常4', orientation: 'landscape' },
      { id: 'p24', url: '/img/f3846e90afac4a7e89fc10fa933b34db.webp', caption: '日常5', orientation: 'landscape' },
      { id: 'p25', url: '/img/98dcb290db664a3782c4c7e1ab714ad0.webp', caption: '日常6', orientation: 'landscape' },
      { id: 'p26', url: '/img/20a1beaf680e4265bc0637bd71d01837.webp', caption: '日常7', orientation: 'landscape' },
      { id: 'p27', url: '/img/bf98690f44164c0ba47930df237e3049.webp', caption: '日常8', orientation: 'landscape' },
      { id: 'p28', url: '/img/a7ad38d3e180404ebb6b309ff65ec00e.webp', caption: '日常9', orientation: 'landscape' },
      { id: 'p29', url: '/img/faaf2c294ee94b8c9233e8fe861060d2.webp', caption: '日常10', orientation: 'landscape' },
      { id: 'p30', url: '/img/d2b8300dc8dd42b9ae58b426f1311b27.webp', caption: '日常11', orientation: 'landscape' },
      { id: 'p31', url: '/img/903b1044b9564c5cb27be20a1e65a844.webp', caption: '日常12', orientation: 'landscape' },
      { id: 'p32', url: '/img/c94159cd03d7420b890e75e3de7de56a.webp', caption: '日常13', orientation: 'landscape' },
      { id: 'p33', url: '/img/95a84ca02a04459aa7a273844ec6fd3e.webp', caption: '日常14', orientation: 'landscape' },
      { id: 'p34', url: '/img/b82468228ec545f09032687b1fb2697d.webp', caption: '日常15', orientation: 'landscape' },
      { id: 'p35', url: '/img/8935e36de0cd4c2c8438174f7cfe7e48.jpg', caption: '日常16', orientation: 'landscape' },
      { id: 'p36', url: '/img/98030b561d90468cbeccec1293785ba2.png', caption: '日常17', orientation: 'landscape' },
      { id: 'p37', url: '/img/ecd1f1e72dbf41d285b2d3723fd3efc0.jpg', caption: '日常18', orientation: 'landscape' },
      { id: 'p38', url: '/img/b58b763430b74ff39654732fdda8899c.jpg', caption: '日常19', orientation: 'landscape' },
      { id: 'p39', url: '/img/1cd852b06e1944079ce3c716476fd26d.jpg', caption: '日常20', orientation: 'landscape' },
    ],
  },
  {
    id: 4,
    title: '旅行足迹',
    updatedAt: '2026-05-10',
    photos: [
      { id: 'p40', url: '/img/d94ba7b63fc24cbb8f01c9129054735c.jpg', caption: '旅行1', orientation: 'landscape' },
      { id: 'p41', url: '/img/d40a93b7b96c4547bb879c63fdcf52ee.jpg', caption: '旅行2', orientation: 'landscape' },
      { id: 'p42', url: '/img/dfbccc631c944c37becc64db0480e03f.webp', caption: '旅行3', orientation: 'landscape' },
      { id: 'p43', url: '/img/4b476a96911b47a1b869f97a1b6c87a5.webp', caption: '旅行4', orientation: 'landscape' },
      { id: 'p44', url: '/img/d7ec34624c4b4304bea4e35c1fd1ca14.webp', caption: '旅行5', orientation: 'landscape' },
      { id: 'p45', url: '/img/2c8f13ee219d471fabe6f06210879453.jpg', caption: '旅行6', orientation: 'landscape' },
      { id: 'p46', url: '/img/0d7be4f4a06841f3b054f1b8bbba0085.jpg', caption: '旅行7', orientation: 'landscape' },
      { id: 'p47', url: '/img/7bb4d72918e04f6f9cd11ea083b6f950.webp', caption: '旅行8', orientation: 'landscape' },
      { id: 'p48', url: '/img/de82114ff2884e389a6756250b678ef1.webp', caption: '旅行9', orientation: 'landscape' },
      { id: 'p49', url: '/img/3e0a8128796d45bcad0dec76070cbc24.webp', caption: '旅行10', orientation: 'landscape' },
      { id: 'p50', url: '/img/219200fe2af74adbbcb476ebc2762365.webp', caption: '旅行11', orientation: 'landscape' },
      { id: 'p51', url: '/img/c1c1a29e38b749329bd139944e925042.jpg', caption: '旅行12', orientation: 'landscape' },
      { id: 'p52', url: '/img/6389bf7394324b6e90eab8bfd14faf8a.webp', caption: '旅行13', orientation: 'landscape' },
      { id: 'p53', url: '/img/3d0e181f9626442a9c5a2bb0b418d09c.webp', caption: '旅行14', orientation: 'landscape' },
      { id: 'p54', url: '/img/a1cb61affc804101b19b82ec810c455d.webp', caption: '旅行15', orientation: 'landscape' },
      { id: 'p55', url: '/img/0b6fed56b1814015b869d999dbee0f87.jpg', caption: '旅行16', orientation: 'landscape' },
      { id: 'p56', url: '/img/635cdea8a6104e2a8c3bba412a626e55.jpg', caption: '旅行17', orientation: 'landscape' },
      { id: 'p57', url: '/img/9251820c350e4f4d8a2b79229c3cfe03.webp', caption: '旅行18', orientation: 'landscape' },
      { id: 'p58', url: '/img/b9ce1b6954094d48851ec6e3fa0c1eaa.jpg', caption: '旅行19', orientation: 'landscape' },
      { id: 'p59', url: '/img/6773b4b03e5e49c099823d915bdc64b7.webp', caption: '旅行20', orientation: 'landscape' },
      { id: 'p60', url: '/img/a8991f49c1ab4a8b9c3e00d63bcb9849.webp', caption: '旅行21', orientation: 'landscape' },
      { id: 'p61', url: '/img/b9d888f6652c48539768ebeb55498d76.webp', caption: '旅行22', orientation: 'landscape' },
      { id: 'p62', url: '/img/c7e9af339b4b4b5fa7785eb08613ae2a.webp', caption: '旅行23', orientation: 'landscape' },
      { id: 'p63', url: '/img/22fa812169bd45ebb2e04c152b31a6e0.webp', caption: '旅行24', orientation: 'landscape' },
      { id: 'p64', url: '/img/df3ccd1d473a4b8aa546f532e14501b5.jpg', caption: '旅行25', orientation: 'landscape' },
      { id: 'p65', url: '/img/3178a904eba744d1a900b667064ed0a1.webp', caption: '旅行26', orientation: 'landscape' },
      { id: 'p66', url: '/img/abf30216b0f14d928d8336969d69d42a.jpg', caption: '旅行27', orientation: 'landscape' },
      { id: 'p67', url: '/img/088df570c8db4d6398b16b8ca3ef8920.webp', caption: '旅行28', orientation: 'landscape' },
      { id: 'p68', url: '/img/e73f4cfd5ced49bd8340cde1aaf33985.webp', caption: '旅行29', orientation: 'landscape' },
      { id: 'p69', url: '/img/c9f36719cafe41bfb422351755157798.jpg', caption: '旅行30', orientation: 'landscape' },
      { id: 'p70', url: '/img/a1b556561aaa4136bb4de3ddaad400de.webp', caption: '旅行31', orientation: 'landscape' },
      { id: 'p71', url: '/img/8696f8333595489f9e027054f324fff7.jpg', caption: '旅行32', orientation: 'landscape' },
    ],
  },
]

// ========== 照片卡片（拍立得风格，与原站一致）==========

function PhotoCard({ photo, index, onClick }: { photo: Photo; index: number; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

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
              src={photo.url}
              alt={photo.caption || '照片'}
              loading="lazy"
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => setErrored(true)}
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
                onClick={(e) => { e.stopPropagation(); setErrored(false); setLoaded(false); setRetryKey(k => k + 1) }}
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
      onClick={() => { playClickSound(); onToggle() }}
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
                  src={photo.url}
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
      img.src = p.url
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
              <img key={imgRetryKey} src={photo.url} alt={photo.caption || '照片'}
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
      {/* 页头（与原站一致） */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 md:mb-12"
      >
        <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
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
