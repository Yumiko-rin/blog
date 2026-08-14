import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAdminStore } from '@/store/useAdminStore'

interface RequireAdminProps {
  children: ReactNode
}

/**
 * 路由守卫：检查管理员登录状态
 * - 未授权时重定向到 /admin/login
 * - 授权时渲染 children
 */
export function RequireAdmin({ children }: RequireAdminProps) {
  const isAuthed = useAdminStore((s) => s.isAuthed)

  if (!isAuthed) {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}
