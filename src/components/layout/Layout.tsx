import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'
import { FloatingBackToTop } from '@/components/home/FloatingBackToTop'

/**
 * Layout 布局组件
 * 首页使用全屏 Banner，其他页面使用标准布局
 */
export function Layout() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  // 路由切换时滚动到顶部（返回/前进由浏览器 history 自动恢复）
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className={`flex-1 ${isHome ? '' : 'pt-16 pb-10'}`}>
        <Outlet />
      </main>
      {!isHome && <Footer />}
      <FloatingBackToTop />
    </div>
  )
}
