import { Routes, Route, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { GlobalPlayer } from '@/components/music/GlobalPlayer'
import { DynamicBackground } from '@/components/background/DynamicBackground'
import { Live2DWidget } from '@/components/molecules/Live2DWidget'
import { Toolbox } from '@/components/home/Toolbox'
import { CustomCursor } from '@/components/home/CustomCursor'
import { LoadingAnimation } from '@/components/home/LoadingAnimation'
import { ImageLightbox } from '@/components/home/ImageLightbox'
import { Layout } from '@/components/layout/Layout'
import { RequireAdmin } from '@/components/admin/RequireAdmin'

// 前台页面 — 懒加载
const Home = lazy(() => import('@/pages/Home'))
const ArticleDetail = lazy(() => import('@/pages/ArticleDetail'))
const Archive = lazy(() => import('@/pages/Archive'))
const Tags = lazy(() => import('@/pages/Tags'))
const Music = lazy(() => import('@/pages/Music'))
const Friends = lazy(() => import('@/pages/Friends'))
const My = lazy(() => import('@/pages/My'))
const Moments = lazy(() => import('@/pages/Moments'))
const Gallery = lazy(() => import('@/pages/Gallery'))
const Shuoshuo = lazy(() => import('@/pages/Shuoshuo'))
const Login = lazy(() => import('@/pages/Login'))
const NotFound = lazy(() => import('@/pages/NotFound'))

// 后台页面 — 独立分割
const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin'))
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'))
const Dashboard = lazy(() => import('@/pages/admin/Dashboard'))
const ArticleManage = lazy(() => import('@/pages/admin/ArticleManage'))
const ShuoshuoManage = lazy(() => import('@/pages/admin/ShuoshuoManage'))
const CommentManage = lazy(() => import('@/pages/admin/CommentManage'))
const FriendManage = lazy(() => import('@/pages/admin/FriendManage'))
const StatsView = lazy(() => import('@/pages/admin/StatsView'))

/** 空白 fallback — 避免路由切换时出现闪烁 spinner */
function PageFallback() {
  return null
}

/** 首屏加载后预获取所有路由 chunk，消除后续导航的 Suspense 延迟 */
function RoutePrefetcher() {
  useEffect(() => {
    const timer = setTimeout(() => {
      import('@/pages/ArticleDetail')
      import('@/pages/Archive')
      import('@/pages/Tags')
      import('@/pages/Music')
      import('@/pages/Friends')
      import('@/pages/My')
      import('@/pages/Gallery')
      import('@/pages/Shuoshuo')
      import('@/pages/Moments')
    }, 3000)
    return () => clearTimeout(timer)
  }, [])
  return null
}

/**
 * App 根组件
 */
export default function App() {
  useTheme()
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <>
      {/* 首次加载动画 */}
      <LoadingAnimation />

      {/* 预获取路由 chunk（延迟 3s 不与首屏竞争） */}
      <RoutePrefetcher />

      {/* 自定义鼠标光标（桌面端） */}
      {!isAdmin && <CustomCursor />}

      {/* 全局图片灯箱 */}
      {!isAdmin && <ImageLightbox />}

      {/* 全局背景 - 始终动态（后台页面隐藏） */}
      {!isAdmin && <DynamicBackground />}

      {/* 带 Layout 的路由 */}
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/article/:id" element={<ArticleDetail />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/tags" element={<Tags />} />
            <Route path="/music" element={<Music />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/my" element={<My />} />
            <Route path="/moments" element={<Moments />} />
            <Route path="/shuoshuo" element={<Shuoshuo />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* 后台管理路由（独立于前台 Layout） */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="articles" element={<ArticleManage />} />
            <Route path="shuoshuo" element={<ShuoshuoManage />} />
            <Route path="comments" element={<CommentManage />} />
            <Route path="friends" element={<FriendManage />} />
            <Route path="stats" element={<StatsView />} />
          </Route>
        </Routes>
      </Suspense>

      {/* 全局音乐播放器（前台显示） */}
      {!isAdmin && <GlobalPlayer />}

      {/* 左下角工具箱（前台显示） */}
      {!isAdmin && <Toolbox />}

      {/* Live2D 看板娘（右下角，前台显示） */}
      {!isAdmin && <Live2DWidget />}
    </>
  )
}
