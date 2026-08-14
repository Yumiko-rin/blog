import { Link } from 'react-router-dom'
import { Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
      <div className="text-[8rem] font-black leading-none bg-gradient-to-br from-purple-500 to-pink-500 bg-clip-text text-transparent animate-pulse">
        404
      </div>
      <p className="text-lg text-[rgb(var(--text-secondary))] mt-4 mb-2">
        页面走丢了...
      </p>
      <p className="text-sm text-[rgb(var(--text-secondary))] opacity-60 mb-8">
        你访问的页面不存在或已被移动
      </p>
      <div className="flex gap-4">
        <Link
          to="/"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium text-sm hover:scale-105 active:scale-95 transition-transform"
        >
          <Home size={16} /> 返回首页
        </Link>
        <Link
          to="/archive"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[rgb(var(--rule))] text-[rgb(var(--text-primary))] font-medium text-sm hover:border-purple-500 hover:text-purple-500 transition-colors"
        >
          <Search size={16} /> 浏览文章
        </Link>
      </div>
    </div>
  )
}
