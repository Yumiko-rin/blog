import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, Heart, Clock, Pin } from 'lucide-react'
import { formatDate, formatNumber } from '@/utils/format'
import { getArticleViews, getArticleLikes } from '@/utils/articleMetrics'
import { playClickSound } from '@/utils/sounds'
import type { Article } from '@/types'

interface PostCardProps {
  article: Article
  index?: number
}

/**
 * PostCard 文章卡片（封面式）
 * --------------------------------------------------
 * 与 boke.hiromu.top / Kirameku 的文章卡片保持一致：
 * - 封面图作为卡片主体（16:10 比例）
 * - 底部黑色渐变遮罩上叠加标题、摘要、元信息
 * - 圆角大卡片 + 悬停放大 + 3D 倾斜光泽效果
 * - 置顶文章显示「置顶」徽章
 */
export function PostCard({ article, index = 0 }: PostCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 })
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = ((y - centerY) / centerY) * -6
    const rotateY = ((x - centerX) / centerX) * 6
    setTilt({ rotateX, rotateY })
    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.15,
    })
  }

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 })
    setGlare({ x: 50, y: 50, opacity: 0 })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: 'easeOut' }}
    >
      <Link
        to={`/article/${article.id}`}
        onClick={playClickSound}
        className="block group"
      >
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative rounded-3xl overflow-hidden cursor-pointer"
          style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
        >
          <div
            className="relative transition-transform duration-200 ease-out"
            style={{
              transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
              transformStyle: 'preserve-3d',
            }}
          >
            {/* 封面图 */}
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#1a1a24]">
              {article.cover ? (
                <img
                  src={article.cover}
                  alt={article.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-accent/20 to-accent/5" />
              )}
              {/* 渐变遮罩 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* 置顶标记 */}
              {article.isPinned && (
                <div className="absolute top-2 left-2 md:top-4 md:left-4 flex items-center gap-1 px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-amber-500/90 backdrop-blur-sm text-white text-[10px] md:text-xs font-medium shadow">
                  <Pin className="w-3 h-3" />
                  置顶
                </div>
              )}

              {/* 底部信息 */}
              <div className="absolute bottom-0 left-0 right-0 p-3 md:p-5">
                <h3 className="text-base md:text-lg font-bold text-white mb-1 md:mb-2 line-clamp-2 leading-snug">
                  {article.title}
                </h3>
                <p className="text-white/70 text-xs md:text-sm line-clamp-1 mb-2 md:mb-3">
                  {article.excerpt}
                </p>
                <div className="flex items-center justify-between text-white/60 text-xs">
                  <div className="flex items-center gap-3">
                    {article.date && <span>{formatDate(article.date)}</span>}
                    {article.readingTime > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {article.readingTime} 分钟
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {formatNumber(getArticleViews(article))}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {formatNumber(getArticleLikes(article))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3D 光泽效果 */}
            <div
              className="absolute inset-0 pointer-events-none rounded-3xl transition-opacity duration-200"
              style={{
                background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity}), transparent 60%)`,
              }}
            />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default PostCard
