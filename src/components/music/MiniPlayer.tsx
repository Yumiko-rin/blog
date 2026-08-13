import { useState } from 'react'
import { ChevronUp, Volume2, VolumeX } from 'lucide-react'
import { PlayerControls } from './PlayerControls'
import { Slider } from '@/components/atoms/Slider'
import { IconButton } from '@/components/atoms/IconButton'
import { formatTime } from '@/utils/format'
import type { Song, PlayMode } from '@/types'

/**
 * MiniPlayer 底部迷你播放器 - 液态玻璃风格
 */
interface MiniPlayerProps {
  song: Song | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  playMode: PlayMode
  onTogglePlay: () => void
  onPrev: () => void
  onNext: () => void
  onSeek: (t: number) => void
  onVolumeChange: (v: number) => void
  onCycleMode: () => void
  onExpand: () => void
}

export function MiniPlayer({
  song,
  isPlaying,
  currentTime,
  duration,
  volume,
  playMode,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onCycleMode,
  onExpand,
}: MiniPlayerProps) {
  const [dragTime, setDragTime] = useState<number | null>(null)
  const displayTime = dragTime ?? currentTime
  const progress = duration > 0 ? (displayTime / duration) * 100 : 0

  if (!song) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2">
      <div className="glass-strong rounded-3xl overflow-hidden shadow-2xl shadow-black/10">
        {/* 底部极细进度条 */}
        <div className="h-0.5 w-full bg-black/5 dark:bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
        </div>

        {/* 主体内容 */}
        <div className="flex items-center gap-3 p-3 pt-2.5">
          {/* 左侧：唱片封面 + 歌曲信息 */}
          <button
            type="button"
            onClick={onExpand}
            className="flex min-w-0 flex-1 items-center gap-3 text-left group"
            aria-label="展开大型播放器"
          >
            <div className="relative shrink-0">
              <img
                src={song.cover}
                alt={song.name}
                className={`h-12 w-12 rounded-2xl object-cover shadow-lg
                  ${isPlaying ? 'animate-spin-slow' : ''}`}
              />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                {song.name}
              </div>
              <div className="truncate text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                {song.artist}
              </div>
            </div>
          </button>

          {/* 中间进度条（md+） */}
          <div className="hidden min-w-0 max-w-xs flex-1 items-center gap-2 md:flex">
            <span className="shrink-0 text-xs tabular-nums text-[rgb(var(--text-secondary))] w-10 text-right">
              {formatTime(displayTime)}
            </span>
            <Slider
              value={displayTime}
              max={duration}
              onChange={(v) => setDragTime(v)}
              onChangeEnd={(v) => {
                setDragTime(null)
                onSeek(v)
              }}
              className="flex-1"
              height={3}
            />
            <span className="shrink-0 text-xs tabular-nums text-[rgb(var(--text-secondary))] w-10">
              {formatTime(duration)}
            </span>
          </div>

          {/* 音量（lg+） */}
          <div className="hidden w-24 items-center gap-1.5 lg:flex">
            <IconButton
              size="sm"
              onClick={() => onVolumeChange(volume > 0 ? 0 : 0.7)}
              aria-label={volume > 0 ? '静音' : '恢复音量'}
            >
              {volume > 0 ? (
                <Volume2 size={14} className="text-[rgb(var(--text-secondary))]" />
              ) : (
                <VolumeX size={14} className="text-[rgb(var(--text-secondary))]" />
              )}
            </IconButton>
            <Slider
              value={volume}
              max={1}
              onChange={onVolumeChange}
              onChangeEnd={onVolumeChange}
              className="flex-1"
              height={2}
            />
          </div>

          {/* 右侧控制 */}
          <div className="flex shrink-0 items-center gap-0.5">
            <PlayerControls
              size="sm"
              isPlaying={isPlaying}
              onTogglePlay={onTogglePlay}
              onPrev={onPrev}
              onNext={onNext}
              playMode={playMode}
              onCycleMode={onCycleMode}
            />
            <IconButton size="sm" onClick={onExpand} aria-label="展开大型播放器">
              <ChevronUp size={18} className="text-[rgb(var(--text-secondary))]" />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  )
}
