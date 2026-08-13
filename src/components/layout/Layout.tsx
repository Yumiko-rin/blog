import { Outlet, useLocation } from 'react-router-dom'
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
