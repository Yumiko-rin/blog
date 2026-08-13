import { SkipBack, Play, Pause, SkipForward, Repeat, Repeat1, Shuffle, Heart } from 'lucide-react'
import { IconButton } from '@/components/atoms/IconButton'
import { playClickSound, playToggleSound } from '@/utils/sounds'
import type { PlayMode } from '@/types'

/**
 * PlayerControls 播放控制按钮组（受控组件）
 * --------------------------------------------------
 * - 播放/暂停：带缩放动画的圆形大按钮
 * - 上一曲/下一曲：优雅的跳转按钮
 * - 播放模式：列表循环/单曲循环/随机，带 tooltip
 * - 收藏按钮（UI 展示）
 */
interface PlayerControlsProps {
  isPlaying: boolean
  onTogglePlay: () => void
  onPrev: () => void
  onNext: () => void
  playMode: PlayMode
  onCycleMode: () => void
  size?: 'sm' | 'md' | 'lg'
}

function ModeIcon({ mode, size }: { mode: PlayMode; size: number }) {
  if (mode === 'single') return <Repeat1 size={size} />
  if (mode === 'random') return <Shuffle size={size} />
  return <Repeat size={size} />
}

const MODE_LABEL: Record<PlayMode, string> = {
  list: '列表循环',
  single: '单曲循环',
  random: '随机播放',
}

export function PlayerControls({
  isPlaying,
  onTogglePlay,
  onPrev,
  onNext,
  playMode,
  onCycleMode,
  size = 'md',
}: PlayerControlsProps) {
  const iconSize = size === 'lg' ? 24 : size === 'md' ? 20 : 16
  const playSize = size === 'lg' ? 56 : size === 'md' ? 44 : 36

  return (
    <div className="flex items-center gap-3">
      {/* 播放模式 */}
      <IconButton
        size={size}
        onClick={onCycleMode}
        aria-label={`播放模式：${MODE_LABEL[playMode]}`}
        title={MODE_LABEL[playMode]}
        className="relative"
      >
        <ModeIcon mode={playMode} size={iconSize} />
        {playMode === 'random' && (
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
        )}
      </IconButton>

      {/* 上一首 */}
      <IconButton size={size} onClick={onPrev} aria-label="上一首">
        <SkipBack size={iconSize} fill="currentColor" />
      </IconButton>

      {/* 播放/暂停 - 大圆形按钮 */}
      <button
        type="button"
        onClick={() => {
          playToggleSound()
          onTogglePlay()
        }}
        aria-label={isPlaying ? '暂停' : '播放'}
        className="relative flex items-center justify-center rounded-full
          bg-gradient-to-br from-indigo-500 to-purple-500
          text-white shadow-lg shadow-indigo-500/30
          hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-105
          active:scale-95 transition-all duration-300"
        style={{ width: playSize, height: playSize }}
      >
        {/* 播放中脉冲光环 */}
        {isPlaying && (
          <span className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
        )}
        <span className="relative z-10">
          {isPlaying ? (
            <Pause size={iconSize} fill="currentColor" />
          ) : (
            <Play size={iconSize} fill="currentColor" className="ml-0.5" />
          )}
        </span>
      </button>

      {/* 下一首 */}
      <IconButton size={size} onClick={onNext} aria-label="下一首">
        <SkipForward size={iconSize} fill="currentColor" />
      </IconButton>

      {/* 收藏 */}
      <IconButton size={size} onClick={() => playClickSound()} aria-label="收藏">
        <Heart size={iconSize} />
      </IconButton>
    </div>
  )
}
