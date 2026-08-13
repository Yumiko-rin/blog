import { Routes, Route } from 'react-router-dom'
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

/**
 * App 根组件
 */
export default function App() {
  useTheme()

  return (
    <>
      {/* 全局背景 - 始终动态 */}
      <DynamicBackground />

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
      </Routes>

      {/* 全局音乐播放器 */}
      <GlobalPlayer />

      {/* 左下角工具箱 */}
      <Toolbox />

      {/* 左下角迷你音乐播放器 */}
      <FloatingMiniPlayer />

      {/* Live2D 看板娘（右下角） */}
      <Live2DWidget />
    </>
  )
}
