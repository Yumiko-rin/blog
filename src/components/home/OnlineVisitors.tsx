import { useState, useEffect } from 'react'
import { Users, Radio } from 'lucide-react'

/**
 * OnlineVisitors 在线访客计数
 * 基于 localStorage 的近似在线统计
 * 5 秒心跳更新，60 秒超时清理
 */

const HEARTBEAT_KEY = 'blog_online_heartbeat'
const VISITORS_KEY = 'blog_online_visitors'
const SESSION_ID = Math.random().toString(36).substring(2, 10)
const HEARTBEAT_INTERVAL = 5000
const TIMEOUT = 60000

interface VisitorRecord {
  id: string
  lastSeen: number
}

function getOnlineCount(): number {
  try {
    const raw = localStorage.getItem(VISITORS_KEY)
    if (!raw) return 1
    const visitors: VisitorRecord[] = JSON.parse(raw)
    const now = Date.now()
    const active = visitors.filter(v => now - v.lastSeen < TIMEOUT)
    return Math.max(1, active.length)
  } catch {
    return 1
  }
}

function updateHeartbeat() {
  try {
    const raw = localStorage.getItem(VISITORS_KEY)
    let visitors: VisitorRecord[] = raw ? JSON.parse(raw) : []
    const now = Date.now()
    visitors = visitors.filter(v => now - v.lastSeen < TIMEOUT)
    const idx = visitors.findIndex(v => v.id === SESSION_ID)
    if (idx >= 0) {
      visitors[idx].lastSeen = now
    } else {
      visitors.push({ id: SESSION_ID, lastSeen: now })
    }
    localStorage.setItem(VISITORS_KEY, JSON.stringify(visitors))
    localStorage.setItem(HEARTBEAT_KEY, String(now))
  } catch { /* ignore */ }
}

export function OnlineVisitors() {
  const [count, setCount] = useState(1)

  useEffect(() => {
    updateHeartbeat()
    setCount(getOnlineCount())

    const heartbeatTimer = setInterval(() => {
      updateHeartbeat()
    }, HEARTBEAT_INTERVAL)

    const countTimer = setInterval(() => {
      setCount(getOnlineCount())
    }, 3000)

    const onStorage = (e: StorageEvent) => {
      if (e.key === VISITORS_KEY || e.key === HEARTBEAT_KEY) {
        setCount(getOnlineCount())
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      clearInterval(heartbeatTimer)
      clearInterval(countTimer)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return (
    <div className="widget-card p-3 flex items-center gap-3">
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400/20 to-emerald-500/20 flex items-center justify-center">
          <Users size={18} className="text-green-500" />
        </div>
        {/* 脉动指示器 */}
        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400">
          <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
        </div>
      </div>
      <div className="flex-1">
        <div className="text-lg font-bold text-[rgb(var(--text-primary))]">
          {count}
          <span className="text-xs font-normal text-[rgb(var(--text-secondary))] ml-1">人在线</span>
        </div>
        <div className="text-[10px] text-[rgb(var(--text-secondary))] flex items-center gap-1">
          <Radio size={10} className="text-green-400" />
          实时连接中
        </div>
      </div>
    </div>
  )
}

export default OnlineVisitors
