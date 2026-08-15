import { useState, useEffect, useMemo } from 'react'
import { ARTICLES, loadArticles } from '@/data/articles'
import { BG_IMAGES } from '@/data/backgrounds'
import { BannerOverlay } from '@/components/home/BannerOverlay'
import { WaveTransition } from '@/components/home/WaveTransition'
import { ScrollParallax } from '@/components/home/ScrollParallax'
import { ProfileCard } from '@/components/home/ProfileCard'
import { SidebarMusicPlayer } from '@/components/home/SidebarMusicPlayer'
import { ScheduleWidget } from '@/components/home/ScheduleWidget'
import { SiteStatsWidget } from '@/components/home/SiteStatsWidget'
import { AccessStatsWidget } from '@/components/home/AccessStatsWidget'
import { HotSearchWidget } from '@/components/home/HotSearchWidget'
import { WeatherWidget } from '@/components/home/WeatherWidget'
import { FestivalCountdownWidget } from '@/components/home/FestivalCountdownWidget'
import { PostCard } from '@/components/home/PostCard'
import { OnlineVisitors } from '@/components/home/OnlineVisitors'
import { ArticleHeatmap } from '@/components/home/ArticleHeatmap'
import { Footer } from '@/components/layout/Footer'

const PAGE_SIZE = 6

/** 仅首次访问首页时播放入场动画，避免路由切换时反复闪屏 */
let homeFirstVisit = true

/**
 * Home 首页 - Sigrika 风格三栏布局
 * --------------------------------------------------
 * 全屏 Banner + 三栏内容区 + 页脚
 * 文章列表：两两一行（双列网格），超出后底部数字分页（1-9 页标）
 */
export default function Home() {
  const shouldAnimate = homeFirstVisit
  const [bannerIndex, setBannerIndex] = useState(0)
  const [page, setPage] = useState(1)
  const [articles, setArticles] = useState(ARTICLES)

  useEffect(() => {
    homeFirstVisit = false
  }, [])

  // 异步加载文章（后台发布的 + 静态内置合并），静态数据作为初始值避免空白闪烁
  useEffect(() => {
    loadArticles().then(setArticles)
  }, [])

  // Banner 直接使用全局背景图（与设置/动态背景同源，数量已扩充）
  const bannerImages = BG_IMAGES.map((b) => b.url)

  // Banner 轮播 - 每5秒切换
  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % bannerImages.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [bannerImages.length])

  // 分页
  const totalPages = Math.max(1, Math.ceil(articles.length / PAGE_SIZE))

  // 异步加载后文章数减少时，自动修正当前页码避免越界空白
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [totalPages, page])

  const pageArticles = useMemo(
    () => articles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [articles, page]
  )

  // 计算要展示的页码（最多 9 个，超出则窗口化）
  const pageNumbers = useMemo(() => {
    const max = 9
    if (totalPages <= max) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const start = Math.max(1, Math.min(page - Math.floor(max / 2), totalPages - max + 1))
    return Array.from({ length: max }, (_, i) => start + i)
  }, [totalPages, page])

  return (
    <div className="min-h-screen">
      {/* ===== 滚动视差层 ===== */}
      <ScrollParallax />

      {/* ===== 全屏 Banner ===== */}
      <div className="banner-container">
        {/* 背景图轮播 */}
        {bannerImages.map((src, i) => (
          <div
            key={src}
            className="banner-image"
            style={{
              backgroundImage: `url(${src})`,
              opacity: i === bannerIndex ? 1 : 0,
              zIndex: i === bannerIndex ? 1 : 0,
            }}
          />
        ))}

        {/* 暗色遮罩 */}
        <div className="banner-dim" />

        {/* 标题覆盖层 */}
        <BannerOverlay />

        {/* 波浪过渡 */}
        <WaveTransition />
      </div>

      {/* ===== 三栏内容区 ===== */}
      <div className="main-grid relative z-20 -mt-16">
        {/* 左侧栏 */}
        <aside className="left-sidebar space-y-4">
          <div className={shouldAnimate ? 'onload-animation' : ''}>
            <ProfileCard />
          </div>
          <div className={shouldAnimate ? 'onload-animation' : ''}>
            <SidebarMusicPlayer />
          </div>
          <div className={shouldAnimate ? 'onload-animation' : ''}>
            <ScheduleWidget />
          </div>
          <div className={shouldAnimate ? 'onload-animation' : ''}>
            <AccessStatsWidget />
          </div>
          <div className={shouldAnimate ? 'onload-animation' : ''}>
            <HotSearchWidget />
          </div>
        </aside>

        {/* 主内容区 */}
        <div className="min-w-0 space-y-4">
          {/* 文章列表 - 双列网格 */}
          <div className="post-cards-grid">
            {pageArticles.map((article, index) => (
              <div key={article.id} className={shouldAnimate ? 'onload-animation' : ''} style={shouldAnimate ? { animationDelay: `${0.05 * (index + 1)}s` } : undefined}>
                <PostCard article={article} />
              </div>
            ))}
          </div>

          {articles.length === 0 && (
            <div className="widget-card p-8 text-center">
              <p className="text-[rgb(var(--text-secondary))]">暂无文章</p>
            </div>
          )}

          {/* 数字分页 */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                type="button"
                className="page-btn"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="上一页"
              >
                ‹
              </button>
              {pageNumbers[0] > 1 && (
                <>
                  <button type="button" className="page-btn" onClick={() => setPage(1)}>1</button>
                  {pageNumbers[0] > 2 && <span className="px-1 text-[rgb(var(--text-secondary))]">…</span>}
                </>
              )}
              {pageNumbers.map((n) => (
                <button
                  type="button"
                  key={n}
                  className={`page-btn ${n === page ? 'active' : ''}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              {pageNumbers[pageNumbers.length - 1] < totalPages && (
                <>
                  {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span className="px-1 text-[rgb(var(--text-secondary))]">…</span>}
                  <button type="button" className="page-btn" onClick={() => setPage(totalPages)}>{totalPages}</button>
                </>
              )}
              <button
                type="button"
                className="page-btn"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="下一页"
              >
                ›
              </button>
            </div>
          )}
        </div>

        {/* 右侧栏 */}
        <aside className="right-sidebar space-y-4">
          <div className={shouldAnimate ? 'onload-animation' : ''}>
            <SiteStatsWidget />
          </div>
          <div className={shouldAnimate ? 'onload-animation' : ''}>
            <OnlineVisitors />
          </div>
          <div className={shouldAnimate ? 'onload-animation' : ''}>
            <WeatherWidget />
          </div>
          <div className={shouldAnimate ? 'onload-animation' : ''}>
            <FestivalCountdownWidget />
          </div>
          <div className={shouldAnimate ? 'onload-animation' : ''}>
            <ArticleHeatmap />
          </div>
        </aside>

        {/* 页脚 - 跨所有栏 */}
        <div className="col-span-full">
          <Footer />
        </div>
      </div>
    </div>
  )
}
