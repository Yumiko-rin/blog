import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, Loader2, Cat } from 'lucide-react'
import { adminApi } from '@/utils/adminApi'
import { useAdminStore } from '@/store/useAdminStore'

/**
 * AdminLogin 后台登录页
 * --------------------------------------------------
 * 暗色毛玻璃风格，背景使用 /bg/anime_01.jpg
 * 密码登录 → 获取 token → 存入 store → 跳转 /admin
 */
export default function AdminLogin() {
  const navigate = useNavigate()
  const login = useAdminStore((s) => s.login)

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      setError('请输入管理密码')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.login(password)
      login(res.token)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      style={{
        backgroundImage: 'url(/bg/anime_01.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* 暗色遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-purple-950/70" />

      {/* 登录卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-8 text-center"
          >
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-purple-500/30">
              <Cat className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">喵音小筑 · 后台</h1>
            <p className="mt-1 text-sm text-white/50">请输入管理密码以继续</p>
          </motion.div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <label className="mb-2 block text-sm font-medium text-white/70">
                管理密码
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  autoFocus
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-11 text-white placeholder-white/30 outline-none transition-all focus:border-violet-400/50 focus:bg-white/10 focus:ring-2 focus:ring-violet-400/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/60"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </motion.div>

            {/* 错误提示 */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="overflow-hidden rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              >
                {error}
              </motion.div>
            )}

            {/* 登录按钮 */}
            <motion.button
              type="submit"
              disabled={loading}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 py-3 font-semibold text-white shadow-lg shadow-purple-500/30 transition-all hover:shadow-purple-500/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  登录中...
                </>
              ) : (
                '登录后台'
              )}
            </motion.button>
          </form>
        </div>

        {/* 返回前台 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-6 text-center"
        >
          <Link
            to="/"
            className="text-sm text-white/40 transition-colors hover:text-white/70"
          >
            ← 返回前台
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}
