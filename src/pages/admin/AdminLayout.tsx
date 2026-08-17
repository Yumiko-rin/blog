import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  FileText,
  MessageCircle,
  MessageSquare,
  Link2,
  BarChart3,
  Camera,
  LogOut,
  Home,
  Menu,
  Cat,
  type LucideIcon,
} from 'lucide-react'
import { useAdminStore } from '@/store/useAdminStore'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

const navItems: NavItem[] = [
  { to: '/admin', label: '概览', icon: LayoutDashboard, exact: true },
  { to: '/admin/articles', label: '文章', icon: FileText },
  { to: '/admin/shuoshuo', label: '说说', icon: MessageCircle },
  { to: '/admin/comments', label: '评论', icon: MessageSquare },
  { to: '/admin/friends', label: '友链', icon: Link2 },
  { to: '/admin/gallery', label: '画廊', icon: Camera },
  { to: '/admin/stats', label: '统计', icon: BarChart3 },
]

const titleMap: Record<string, string> = {
  '/admin': '概览',
  '/admin/articles': '文章管理',
  '/admin/shuoshuo': '说说管理',
  '/admin/comments': '评论管理',
  '/admin/friends': '友链管理',
  '/admin/gallery': '画廊管理',
  '/admin/stats': '访问统计',
}

/**
 * AdminLayout 后台布局
 * --------------------------------------------------
 * 左侧固定侧边栏（毛玻璃）+ 顶栏 + 主内容区（Outlet）
 */
export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAdminStore((s) => s.logout)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const currentTitle = titleMap[location.pathname] || '后台管理'

  const isActive = (item: NavItem): boolean => {
    if (item.exact) return location.pathname === item.to
    return location.pathname.startsWith(item.to)
  }

  const handleLogout = () => {
    logout()
    navigate('/admin/login', { replace: true })
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/5 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-purple-500/30">
          <Cat className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white">喵音小筑</h1>
          <p className="text-xs text-white/40">后台管理</p>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item)
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                active
                  ? 'border-violet-400/30 bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-white'
                  : 'border-transparent text-white/50 hover:bg-white/5 hover:text-white/80'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'text-violet-300' : ''}`} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* 底部：返回前台 */}
      <div className="border-t border-white/5 px-3 py-4">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white/50 transition-all hover:bg-white/5 hover:text-white/80"
        >
          <Home className="h-5 w-5" />
          返回前台
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a12] via-[#0d0b18] to-[#0a0a12] text-white">
      {/* 桌面端侧边栏 */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 border-r border-white/10 bg-white/5 backdrop-blur-xl lg:block">
        {sidebarContent}
      </aside>

      {/* 移动端侧边栏 */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25 }}
              className="fixed left-0 top-0 z-50 h-screen w-64 border-r border-white/10 bg-[#12101a] backdrop-blur-xl lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 主区域 */}
      <div className="lg:ml-64">
        {/* 顶栏 */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/10 bg-[#0a0a12]/80 px-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-white">{currentTitle}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 transition-all hover:bg-white/10 hover:text-white"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">前台</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300 transition-all hover:bg-red-500/20"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">退出</span>
            </button>
          </div>
        </header>

        {/* 主内容区 */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
