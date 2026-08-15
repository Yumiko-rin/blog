import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAdminStore } from '@/store/useAdminStore'
import { adminApi } from '@/utils/adminApi'

interface RequireAdminProps {
  children: ReactNode
}

/**
 * 路由守卫：检查管理员登录状态
 * - 挂载时向服务端验证 token 有效性
 * - 未授权或 token 失效时重定向到 /admin/login
 */
export function RequireAdmin({ children }: RequireAdminProps) {
  const isAuthed = useAdminStore((s) => s.isAuthed)
  const logout = useAdminStore((s) => s.logout)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!isAuthed) {
      setChecking(false)
      return
    }
    adminApi.checkAuth()
      .then(() => setChecking(false))
      .catch(() => {
        logout()
        setChecking(false)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f0f17]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
      </div>
    )
  }

  if (!isAuthed) {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}
