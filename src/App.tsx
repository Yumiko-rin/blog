import { Routes, Route, useLocation } from 'react-router-dom'
import { useTheme } from '@/hooks/useTheme'
import { GlobalPlayer } from '@/components/music/GlobalPlayer'
import { DynamicBackground } from '@/components/background/DynamicBackground'
import { Live2DWidget } from '@/components/molecules/Live2DWidget'
import { Toolbox } from '@/components/home/Toolbox'
import { FloatingMiniPlayer } from '@/components/home/FloatingMiniPlayer'
import { Layout } from '@/components/layout/Layout'
import Home from '@/pages/Home'
import ArticleDetail from '@/pages/ArticleDetail'
import Archive from '@/pages/Archive'
import Tags from '@/pages/Tags'
import Music from '@/pages/Music'
import Friends from '@/pages/Friends'
import My from '@/pages/My'
import Moments from '@/pages/Moments'
import Gallery from '@/pages/Gallery'
import Shuoshuo from '@/pages/Shuoshuo'
import Login from '@/pages/Login'
import AdminLogin from '@/pages/admin/AdminLogin'
import AdminLayout from '@/pages/admin/AdminLayout'
import Dashboard from '@/pages/admin/Dashboard'
import ArticleManage from '@/pages/admin/ArticleManage'
import ShuoshuoManage from '@/pages/admin/ShuoshuoManage'
import CommentManage from '@/pages/admin/CommentManage'
import FriendManage from '@/pages/admin/FriendManage'
import StatsView from '@/pages/admin/StatsView'
import { RequireAdmin } from '@/components/admin/RequireAdmin'

/**
 * App 根组件
 */
export default function App() {
  useTheme()
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <>
      {/* 全局背景 - 始终动态（后台页面隐藏） */}
      {!isAdmin && <DynamicBackground />}

      {/* 带 Layout 的路由 */}
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

      {/* 全局音乐播放器（前台显示） */}
      {!isAdmin && <GlobalPlayer />}

      {/* 左下角工具箱（前台显示） */}
      {!isAdmin && <Toolbox />}

      {/* 左下角迷你音乐播放器（前台显示） */}
      {!isAdmin && <FloatingMiniPlayer />}

      {/* Live2D 看板娘（右下角，前台显示） */}
      {!isAdmin && <Live2DWidget />}
    </>
  )
}
