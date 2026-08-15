import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, Volume2, VolumeX, ListMusic } from 'lucide-react'
import { PlayerControls } from './PlayerControls'
import { LyricView } from './LyricView'
import { Slider } from '@/components/atoms/Slider'
import { IconButton } from '@/components/atoms/IconButton'
import { formatTime } from '@/utils/format'
import type { Song, PlayMode } from '@/types'

/**
 * FullPlayer 全屏大型播放面板 - 液态玻璃风格
 */
interface FullPlayerProps {
  song: Song | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  playMode: PlayMode
  lyric?: [number, string][]
  onTogglePlay: () => void
  onPrev: () => void
  onNext: () => void
  onSeek: (t: number) => void
  onVolumeChange: (v: number) => void
  onCycleMode: () => void
  onCollapse: () => void
}

export function FullPlayer({
  song,
  isPlaying,
  currentTime,
  duration,
  volume,
  playMode,
  lyric,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onCycleMode,
  onCollapse,
}: FullPlayerProps) {
  const [dragTime, setDragTime] = useState<number | null>(null)
  const displayTime = dragTime ?? currentTime

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
    >
      {/* 背景层 */}
      <div className="absolute inset-0 z-0">
        {song?.cover && (
          <img
            src={song.cover}
            alt=""
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-3xl opacity-30"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/70 dark:from-black/60 dark:via-black/70 dark:to-black/80" />
      </div>

      {/* 内容层 */}
      <div className="relative z-10 flex flex-col h-full">
        {/* 顶部栏 - 液态玻璃 */}
        <div className="flex items-center justify-between px-4 sm:px-8 pt-4 sm:pt-6">
          <IconButton size="md" onClick={onCollapse} aria-label="收起播放器">
            <ChevronDown size={24} className="text-white/60" />
          </IconButton>
          <div className="text-center">
            <p className="text-xs text-white/40 uppercase tracking-widest font-medium">正在播放</p>
          </div>
          <IconButton size="md" onClick={() => {}} aria-label="播放列表">
            <ListMusic size={20} className="text-white/60" />
          </IconButton>
        </div>

        {/* 主体 */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden px-4 sm:px-8 py-4 sm:py-6 md:flex-row">
          {/* 左侧 */}
          <div className="flex flex-1 flex-col items-center justify-center gap-4 sm:gap-6">
            {song ? (
              <>
                {/* 大唱片封面 */}
                <div className="relative group">
                  <div className={`absolute -inset-4 rounded-full bg-white/10 blur-2xl
                    ${isPlaying ? 'opacity-100 animate-pulse-slow' : 'opacity-50'} transition-opacity duration-500`} />
                  <div className="relative h-44 w-44 sm:h-56 sm:w-56 md:h-64 md:w-64 rounded-full bg-gradient-to-br from-purple-500/40 to-pink-500/30 overflow-hidden ring-4 ring-white/20 shadow-2xl shadow-black/30">
                    <img
                      src={song.cover}
                      alt={song.name}
                      decoding="async"
                      className={`relative z-10 h-44 w-44 sm:h-56 sm:w-56 md:h-64 md:w-64
                        rounded-full object-cover
                        ${isPlaying ? 'animate-spin-slow' : ''}`}
                      onError={(e) => { e.currentTarget.style.opacity = '0' }}
                    />
                    <div className="absolute inset-0 z-20 flex items-center justify-center">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/90 shadow-lg" />
                    </div>
                  </div>
                </div>

                {/* 歌名 / 歌手 */}
                <div className="text-center max-w-md">
                  <h2 className="text-xl sm:text-2xl font-bold text-white/90 truncate">
                    {song.name}
                  </h2>
                  <p className="mt-1 text-sm text-white/60 truncate">
                    {song.artist}
                    {song.album && (
                      <span className="text-white/40"> · {song.album}</span>
                    )}
                  </p>
                </div>

                {/* 控制 */}
                <PlayerControls
                  size="lg"
                  isPlaying={isPlaying}
                  onTogglePlay={onTogglePlay}
                  onPrev={onPrev}
                  onNext={onNext}
                  playMode={playMode}
                  onCycleMode={onCycleMode}
                />

                {/* 进度条 */}
                <div className="w-full max-w-md">
                  <Slider
                    value={displayTime}
                    max={duration}
                    onChange={(v) => setDragTime(v)}
                    onChangeEnd={(v) => {
                      setDragTime(null)
                      onSeek(v)
                    }}
                    height={4}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] tabular-nums text-white/40">
                      {formatTime(displayTime)}
                    </span>
                    <span className="text-[10px] tabular-nums text-white/40">
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>

                {/* 音量 */}
                <div className="flex w-full max-w-xs items-center gap-2">
                  <IconButton
                    size="sm"
                    onClick={() => onVolumeChange(volume > 0 ? 0 : 0.7)}
                    aria-label={volume > 0 ? '静音' : '恢复音量'}
                  >
                    {volume > 0 ? (
                      <Volume2 size={16} className="text-white/40" />
                    ) : (
                      <VolumeX size={16} className="text-white/40" />
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
              </>
            ) : (
              <div className="text-white/40 text-center">
                <div className="text-5xl mb-4">🎵</div>
                <p>还没有播放音乐哦～</p>
              </div>
            )}
          </div>

          {/* 右侧歌词 */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:max-w-md">
            <LyricView
              lyric={lyric}
              currentTime={currentTime}
              onSeek={onSeek}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
