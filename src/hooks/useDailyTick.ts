import { useEffect, useState } from 'react'

/** 本地日期键：YYYY-M-D */
export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/**
 * useDailyTick —— 跨日自动刷新
 * --------------------------------------------------
 * 返回当前日期键；当自然日发生变化（跨零点）时返回新值，
 * 依赖它的 useEffect 会重新执行，从而让「今日访问 / 倒计时 / 热搜」等数据自动更新。
 *
 * 另外在页面重新可见（切回标签页）时立即校验一次，
 * 避免长时间挂后台时定时器被节流导致数据停留在昨天。
 */
export function useDailyTick(intervalMs = 30_000): string {
  const [key, setKey] = useState(() => dateKey())

  useEffect(() => {
    const check = () => setKey((prev) => {
      const now = dateKey()
      return prev === now ? prev : now
    })

    const timer = window.setInterval(check, intervalMs)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [intervalMs])

  return key
}

/**
 * useIntervalTick —— 固定周期刷新
 * 返回自增计数，用于「每 N 分钟重新拉取一次」的场景（如天气、热搜）。
 * 页面不可见时不计数，切回可见时若已超过周期立即触发一次。
 */
export function useIntervalTick(periodMs: number): number {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let last = Date.now()
    const bump = () => {
      last = Date.now()
      setTick((t) => t + 1)
    }
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') bump()
    }, periodMs)
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - last >= periodMs) bump()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [periodMs])

  return tick
}

export default useDailyTick
