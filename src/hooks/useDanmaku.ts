import { useEffect, useRef, useState, useCallback } from 'react'
import { useDanmakuStore } from '@/store/useDanmakuStore'
import { createDanmaku, DANMAKU_MAX_TRACKS, DANMAKU_INTERVAL } from '@/constants/danmaku'
import type { DanmakuItem } from '@/types'

/**
 * 弹幕调度 Hook
 * 职责：按固定间隔生成弹幕、管理存活列表、超时回收
 * 渲染交给 DanmakuLayer 组件（逻辑与 UI 分离）
 */
export function useDanmaku() {
  const enabled = useDanmakuStore((s) => s.enabled)
  const speed = useDanmakuStore((s) => s.speed)

  const [items, setItems] = useState<DanmakuItem[]>([])
  const idRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /** 生成一条弹幕并入列 */
  const spawn = useCallback(() => {
    const id = ++idRef.current
    // 速度倍率叠加到基础速度
    const item = createDanmaku(id, speed)
    setItems((prev) => [...prev, item])
  }, [speed])

  /** 弹幕飞出屏幕后回收 */
  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((d) => d.id !== id))
  }, [])

  /* ===== 开关 + 间隔控制 ===== */
  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearInterval(timerRef.current)
      setItems([])
      return
    }
    // 立即先出几条，避免空白
    for (let i = 0; i < 3; i++) {
      setTimeout(spawn, i * 400)
    }
    timerRef.current = setInterval(spawn, DANMAKU_INTERVAL)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [enabled, spawn])

  return {
    items,
    enabled,
    speed,
    remove,
    maxTracks: DANMAKU_MAX_TRACKS,
  }
}
