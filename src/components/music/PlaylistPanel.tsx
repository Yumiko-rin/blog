import { useState, useMemo, useEffect } from 'react'
import { Play, Pause, Clock, Disc3 } from 'lucide-react'
import { formatTime } from '@/utils/format'
import { useMusicStore } from '@/store/useMusicStore'
import type { Playlist, Song } from '@/types'

/**
 * PlaylistPanel 歌单/歌曲清单（完美版）
 * --------------------------------------------------
 * 设计要点：
 * - 左侧歌单卡片：大封面 + 渐变叠加 + 歌单信息 + 歌曲数
 * - 右侧歌曲清单：表头 + 歌曲列表，当前播放高亮 + 均衡器
 * - 每首歌悬停：封面放大 + 播放按钮滑入
 * - 播放全部按钮
 * - 流畅的切换动画
 */
interface PlaylistPanelProps {
  playlists: Playlist[]
  currentSongId: string | number | null
  isPlaying: boolean
  onPlaySong: (song: Song, playlistId: string | number) => void
}

/** 播放中的跳动均衡器 */
function PlayingIndicator() {
  return (
    <div className="flex h-3.5 items-end gap-[2px]" aria-label="播放中">
      {[6, 12, 8, 10].map((h, i) => (
        <span
          key={i}
          className="w-[2.5px] rounded-full bg-accent"
          style={{
            height: `${h}px`,
            animation: `equalizer 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes equalizer {
          0% { height: 4px; }
          100% { height: 14px; }
        }
      `}</style>
    </div>
  )
}

export function PlaylistPanel({
  playlists,
  currentSongId,
  isPlaying,
  onPlaySong,
}: PlaylistPanelProps) {
  const [selectedId, setSelectedId] = useState<string | number | undefined>(
    playlists[0]?.id
  )
  const selected = playlists.find((p) => p.id === selectedId) ?? playlists[0]

  // 计算歌单总时长
  const totalDuration = useMemo(() => {
    if (!selected) return 0
    return selected.songs.reduce((acc, s) => acc + (s.duration || 0), 0)
  }, [selected])

  // 后台预加载歌曲时长（逐首加载 metadata，不播放音频）
  useEffect(() => {
    if (!selected) return
    const songs = selected.songs.filter(s => !s.duration || s.duration === 0)
    if (songs.length === 0) return

    let cancelled = false
    const tmp = new Audio()
    tmp.preload = 'metadata'

    const preloadNext = (i: number) => {
      if (cancelled || i >= songs.length) { tmp.src = ''; return }
      const song = songs[i]
      tmp.src = song.src
      tmp.onloadedmetadata = () => {
        if (cancelled) return
        const d = tmp.duration
        if (d > 0 && Number.isFinite(d)) {
          useMusicStore.getState().updateSongDuration(song.id, d)
        }
        preloadNext(i + 1)
      }
      tmp.onerror = () => { if (!cancelled) preloadNext(i + 1) }
    }

    const timer = setTimeout(() => preloadNext(0), 800)
    return () => { cancelled = true; clearTimeout(timer); tmp.src = '' }
  }, [selected])

  // 播放全部
  const playAll = () => {
    if (selected && selected.songs.length > 0) {
      onPlaySong(selected.songs[0], selected.id)
    }
  }

  // 判断当前歌单是否有歌曲在播放
  const isCurrentPlaylist = selected?.songs.some((s) => s.id === currentSongId)

  if (!selected) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl py-20 text-[rgb(var(--text-secondary))]/60">
        <Disc3 size={64} className="mb-4 opacity-20 animate-spin-slow" />
        <p className="text-lg font-medium">暂无歌单</p>
        <p className="text-sm mt-1 text-[rgb(var(--text-secondary))]/60">去添加一些歌曲吧～</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      {/* ===== 左侧：歌单目录 ===== */}
      <div className="lg:w-72 shrink-0">
        {/* 歌单目录标题 */}
        <div className="flex items-center gap-2 mb-3 px-2">
          <Disc3 size={15} className="text-accent" />
          <h4 className="text-sm font-bold text-[rgb(var(--text-primary))] tracking-wide">歌单目录</h4>
          <span className="text-[11px] text-[rgb(var(--text-secondary))]/60">{playlists.length} 个</span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0 scrollbar-hide">
        {playlists.map((pl, idx) => {
          const isSelected = pl.id === selected.id
          const hasPlaying = pl.songs.some((s) => s.id === currentSongId)
          return (
            <button
              key={pl.id}
              type="button"
              onClick={() => setSelectedId(pl.id)}
              className={`group relative flex shrink-0 items-center gap-3 p-2 rounded-2xl
                transition-all duration-300 text-left w-full overflow-hidden
                ${isSelected
                  ? 'glass-strong ring-1 ring-accent/50 shadow-lg shadow-accent/10'
                  : 'glass hover:bg-white/5'
                }`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* 封面 */}
              <div className="relative shrink-0 h-14 w-14 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/20 overflow-hidden">
                <img
                  src={pl.cover}
                  alt={pl.name}
                  className={`h-14 w-14 rounded-xl object-cover shadow-md
                    transition-transform duration-300
                    ${isSelected ? 'scale-105' : 'group-hover:scale-105'}`}
                  onError={(e) => { e.currentTarget.style.opacity = '0' }}
                />
                {/* 播放中指示器 */}
                {hasPlaying && isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                    <PlayingIndicator />
                  </div>
                )}
              </div>

              {/* 信息 */}
              <div className="min-w-0 flex-1">
                <div className={`truncate text-sm font-semibold
                  ${isSelected ? 'text-[rgb(var(--text-primary))]' : 'text-[rgb(var(--text-secondary))] group-hover:text-[rgb(var(--text-primary))]'}`}>
                  {pl.name}
                </div>
                <div className="truncate text-xs text-[rgb(var(--text-secondary))]/60 mt-0.5">
                  {pl.songs.length} 首歌曲
                </div>
              </div>

              {/* 选中指示条 */}
              {isSelected && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-accent rounded-r-full" />
              )}
            </button>
          )
        })}
        </div>
      </div>

      {/* ===== 右侧：歌曲清单 ===== */}
      <div className="min-w-0 flex-1 glass rounded-3xl overflow-hidden">
        {/* 清单头部 */}
        <div className="relative p-5 pb-4">
          {/* 背景模糊封面 */}
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={selected.cover}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-20"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
          </div>

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/20 overflow-hidden ring-2 ring-white/10 shadow-xl">
                <img
                  src={selected.cover}
                  alt={selected.name}
                  className="h-16 w-16 rounded-2xl object-cover"
                  onError={(e) => { e.currentTarget.style.opacity = '0' }}
                />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[rgb(var(--text-primary))]">{selected.name}</h3>
                {selected.description && (
                  <p className="text-xs text-[rgb(var(--text-secondary))]/60 mt-0.5">{selected.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-[rgb(var(--text-secondary))]/60">
                  <span>{selected.songs.length} 首歌</span>
                  {totalDuration > 0 && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatTime(totalDuration)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 播放全部按钮 */}
            <button
              type="button"
              onClick={playAll}
              className="flex items-center gap-2 px-4 py-2 rounded-full
                bg-accent text-white text-sm font-medium
                hover:bg-accent/90 hover:shadow-lg hover:shadow-accent/30
                active:scale-95 transition-all duration-200"
            >
              {isCurrentPlaylist && isPlaying ? (
                <Pause size={16} fill="currentColor" />
              ) : (
                <Play size={16} fill="currentColor" />
              )}
              <span className="hidden sm:inline">播放全部</span>
            </button>
          </div>
        </div>

        {/* 表头 */}
        <div className="flex items-center gap-3 px-5 py-2 text-xs text-[rgb(var(--text-secondary))]/60 border-b border-white/5">
          <span className="w-8 text-center">#</span>
          <span className="flex-1">歌曲</span>
          <span className="w-20 text-right hidden sm:block">歌手</span>
          <span className="w-14 text-right">
            <Clock size={12} />
          </span>
        </div>

        {/* 歌曲列表 */}
        <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
          {selected.songs.map((song, idx) => {
            const isCurrent = song.id === currentSongId
            const isCurrentPlaying = isCurrent && isPlaying
            return (
              <div
                key={song.id}
                onClick={() => onPlaySong(song, selected.id)}
                className={`group flex cursor-pointer items-center gap-3 px-5 py-3
                  transition-all duration-200 border-b border-white/[0.02]
                  ${isCurrent
                    ? 'bg-accent/10'
                    : 'hover:bg-white/[0.03]'
                  }`}
              >
                {/* 序号 / 播放状态 */}
                <div className="w-8 shrink-0 text-center">
                  {isCurrentPlaying ? (
                    <PlayingIndicator />
                  ) : isCurrent ? (
                    <Disc3 size={14} className="text-accent animate-spin-slow mx-auto" />
                  ) : (
                    <span className="text-xs text-[rgb(var(--text-secondary))]/60 group-hover:hidden">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                  )}
                  {!isCurrent && (
                    <Play
                      size={14}
                      className="text-[rgb(var(--text-primary))] hidden group-hover:block mx-auto"
                      fill="currentColor"
                    />
                  )}
                </div>

                {/* 封面 + 歌曲信息 */}
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="relative shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/10 overflow-hidden">
                    <img
                      src={song.cover}
                      alt={song.name}
                      className={`h-10 w-10 rounded-lg object-cover shadow-sm
                        transition-transform duration-300
                        ${isCurrent ? 'ring-2 ring-accent/50' : 'group-hover:scale-110'}`}
                      onError={(e) => { e.currentTarget.style.opacity = '0' }}
                    />
                    {/* 悬停播放覆盖 */}
                    {!isCurrent && (
                      <div className="absolute inset-0 flex items-center justify-center
                        bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={14} className="text-[rgb(var(--text-primary))]" fill="currentColor" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className={`truncate text-sm font-medium
                      ${isCurrent ? 'text-accent' : 'text-[rgb(var(--text-primary))] group-hover:text-[rgb(var(--text-primary))]'}`}>
                      {song.name}
                    </div>
                    <div className="truncate text-xs text-[rgb(var(--text-secondary))]/60 sm:hidden">
                      {song.artist}
                    </div>
                  </div>
                </div>

                {/* 歌手（桌面端） */}
                <span className="w-20 text-right text-xs text-[rgb(var(--text-secondary))]/60 truncate hidden sm:block">
                  {song.artist}
                </span>

                {/* 时长 */}
                <span className="w-14 text-right text-xs tabular-nums text-[rgb(var(--text-secondary))]/60">
                  {song.duration ? formatTime(song.duration) : '--:--'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
