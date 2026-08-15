import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * useToast - 轻量 Toast 提示 Hook
 * 自动在指定时间后清除消息，组件卸载时清理定时器
 */
export function useToast(duration = 2500) {
  const [toast, setToast] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setToast(''), duration)
  }, [duration])

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  return { toast, showToast }
}
