import { useState, useEffect, useCallback, useRef } from 'react'
import { MapPin, Wind, Droplets, RefreshCw, ThermometerSun } from 'lucide-react'
import { useDailyTick, useIntervalTick } from '@/hooks/useDailyTick'

/**
 * 天气预报小部件
 * --------------------------------------------------
 * 1) 浏览器 Geolocation 自动定位（拒绝/超时则退回默认城市）
 * 2) Open-Meteo 取实况 + 逐日预报（免 key，CORS: *）
 * 3) BigDataCloud 逆地理编码得到中文城市名（CORS: *）
 *
 * 更新策略：坐标与结果写入 localStorage，进入页面先渲染缓存再静默刷新；
 * 每 30 分钟自动刷新实况，跨自然日强制刷新（保证「今天/明天」的预报和日期同步）。
 */

interface Current { temp: number; code: number; humidity: number; wind: number }
interface Day { date: string; code: number; tmax: number; tmin: number }
interface WeatherState {
  city: string
  located: boolean
  current: Current | null
  today: { tmax: number; tmin: number } | null
  daily: Day[]
  updatedAt: number
  lat?: number
  lon?: number
}

const DEFAULT_CITY = '北京'
const DEFAULT_LAT = 39.9042
const DEFAULT_LON = 116.4074
const CACHE_KEY = 'blog_weather_cache_v1'
const REFRESH = 30 * 60 * 1000

// WMO weather code -> { 文案, emoji }
function wmo(code: number): { text: string; icon: string } {
  const map: Record<number, [string, string]> = {
    0: ['晴', '☀️'], 1: ['晴间多云', '🌤️'], 2: ['多云', '⛅'], 3: ['阴', '☁️'],
    45: ['雾', '🌫️'], 48: ['雾凇', '🌫️'],
    51: ['毛毛雨', '🌦️'], 53: ['毛毛雨', '🌦️'], 55: ['毛毛雨', '🌦️'],
    56: ['冻雨', '🌧️'], 57: ['冻雨', '🌧️'],
    61: ['小雨', '🌧️'], 63: ['中雨', '🌧️'], 65: ['大雨', '🌧️'],
    66: ['冻雨', '🌧️'], 67: ['冻雨', '🌧️'],
    71: ['小雪', '🌨️'], 73: ['中雪', '🌨️'], 75: ['大雪', '🌨️'], 77: ['雪粒', '🌨️'],
    80: ['阵雨', '🌦️'], 81: ['阵雨', '🌦️'], 82: ['强阵雨', '🌧️'],
    85: ['阵雪', '🌨️'], 86: ['阵雪', '🌨️'],
    95: ['雷阵雨', '⛈️'], 96: ['雷阵雨伴冰雹', '⛈️'], 99: ['雷阵雨伴冰雹', '⛈️'],
  }
  return map[code] ? { text: map[code][0], icon: map[code][1] } : { text: '未知', icon: '🌡️' }
}

function weekday(d: string) {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return days[new Date(`${d}T00:00:00`).getDay()]
}

function readCache(): WeatherState | null {
  try {
    const v = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    return v && v.current ? v : null
  } catch {
    return null
  }
}

async function fetchWeather(lat: number, lon: number, located: boolean): Promise<WeatherState> {
  const [wx, geo] = await Promise.allSettled([
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`),
    fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`),
  ])

  let city = located ? '当前位置' : DEFAULT_CITY
  if (geo.status === 'fulfilled' && geo.value.ok) {
    const g = await geo.value.json()
    city = g.city || g.locality || g.principalSubdivision || city
  }

  let current: Current | null = null
  let today: { tmax: number; tmin: number } | null = null
  let daily: Day[] = []

  if (wx.status === 'fulfilled' && wx.value.ok) {
    const w = await wx.value.json()
    current = {
      temp: Math.round(w.current.temperature_2m),
      code: w.current.weather_code,
      humidity: w.current.relative_humidity_2m,
      wind: Math.round(w.current.wind_speed_10m),
    }
    today = {
      tmax: Math.round(w.daily.temperature_2m_max[0]),
      tmin: Math.round(w.daily.temperature_2m_min[0]),
    }
    const dates: string[] = w.daily.time
    daily = dates.slice(1, 4).map((date: string, i: number) => ({
      date,
      code: w.daily.weather_code[i + 1],
      tmax: Math.round(w.daily.temperature_2m_max[i + 1]),
      tmin: Math.round(w.daily.temperature_2m_min[i + 1]),
    }))
  }

  if (!current) throw new Error('weather unavailable')
  return { city, located, current, today, daily, updatedAt: Date.now(), lat, lon }
}

export function WeatherWidget() {
  const [state, setState] = useState<WeatherState | null>(() => readCache())
  const [loading, setLoading] = useState(!readCache())
  const [err, setErr] = useState(false)
  const day = useDailyTick()
  const tick = useIntervalTick(REFRESH)
  const busy = useRef(false)

  /** 拉取并写缓存 */
  const apply = useCallback((s: WeatherState) => {
    setState(s)
    setErr(false)
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(s)) } catch { /* ignore */ }
  }, [])

  const load = useCallback((askLocation: boolean) => {
    if (busy.current) return
    busy.current = true
    setLoading(true)

    const done = () => { busy.current = false; setLoading(false) }
    const cached = readCache()

    const useDefault = () =>
      fetchWeather(DEFAULT_LAT, DEFAULT_LON, false)
        .then(apply)
        .catch(() => { if (!cached) setErr(true) })
        .finally(done)

    // 已有缓存坐标：直接按旧坐标刷新（不再弹权限框）
    if (!askLocation && cached?.lat != null && cached?.lon != null) {
      fetchWeather(cached.lat, cached.lon, cached.located)
        .then(apply)
        .catch(() => { /* 保留缓存 */ })
        .finally(done)
      return
    }

    if (!('geolocation' in navigator)) return void useDefault()

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        fetchWeather(pos.coords.latitude, pos.coords.longitude, true)
          .then(apply)
          .catch(() => void useDefault())
          .finally(done),
      () => void useDefault(),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    )
  }, [apply])

  // 首次进入请求定位；跨日 / 每 30 分钟静默刷新
  useEffect(() => { load(!readCache()) }, [load, day, tick])

  const timeText = state?.updatedAt
    ? new Date(state.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className="widget-card p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-md bg-accent" />
          <span className="text-sm font-bold text-[rgb(var(--text-primary))]">天气预报</span>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          className="text-[rgb(var(--text-secondary))] hover:text-accent transition-colors"
          aria-label="重新定位"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {!state && loading ? (
        <div className="h-24 rounded-xl bg-[rgb(var(--bg-secondary))] animate-pulse" />
      ) : !state && err ? (
        <div className="text-center text-xs text-[rgb(var(--text-secondary))] py-6">天气获取失败，请稍后重试</div>
      ) : state && state.current ? (
        <div>
          <div className="flex items-center gap-1 text-xs text-[rgb(var(--text-secondary))] mb-1">
            <MapPin size={12} className="text-accent" />
            <span>{state.city}</span>
            {!state.located && <span className="text-[10px] opacity-70">（默认城市·未授权定位）</span>}
          </div>

          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl leading-none">{wmo(state.current.code).icon}</span>
            <div>
              <div className="text-3xl font-black text-accent tabular-nums">{state.current.temp}°</div>
              <div className="text-xs text-[rgb(var(--text-secondary))]">{wmo(state.current.code).text}</div>
            </div>
            {state.today && (
              <div className="ml-auto text-right text-[11px] text-[rgb(var(--text-secondary))] tabular-nums">
                <div className="flex items-center gap-1 justify-end">
                  <ThermometerSun size={12} className="text-orange-400" />今日
                </div>
                <div>{state.today.tmax}° / {state.today.tmin}°</div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-[11px] text-[rgb(var(--text-secondary))] mb-3">
            <span className="flex items-center gap-1"><Droplets size={12} className="text-sky-400" />{state.current.humidity}%</span>
            <span className="flex items-center gap-1"><Wind size={12} className="text-teal-400" />{state.current.wind} km/h</span>
            {timeText && <span className="ml-auto opacity-70">{timeText} 更新</span>}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {state.daily.map((d) => (
              <div key={d.date} className="text-center rounded-lg bg-[rgb(var(--bg-secondary))] py-2">
                <div className="text-[10px] text-[rgb(var(--text-secondary))]">{weekday(d.date)}</div>
                <div className="text-lg leading-tight my-0.5">{wmo(d.code).icon}</div>
                <div className="text-[10px] tabular-nums text-[rgb(var(--text-primary))]">{d.tmax}°/{d.tmin}°</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center text-xs text-[rgb(var(--text-secondary))] py-6">暂无天气数据</div>
      )}
    </div>
  )
}

export default WeatherWidget
