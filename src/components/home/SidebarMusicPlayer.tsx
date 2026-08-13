import { Play, Pause, SkipBack, SkipForward, Music } from 'lucide-react'
import { useMusicStore } from '@/store/useMusicStore'
import { useAudioPlayer } from '@/hooks/useAudioPlayer'
import { playClickSound } from '@/utils/sounds'

/**
 * SidebarMusicPlayer 侧边栏迷你音乐播放器
 * 使用全局 useMusicStore + useAudioPlayer
 */
export function SidebarMusicPlayer() {
  const currentSong = useMusicStore((s) => s.currentSong)
  const isPlaying = useMusicStore((s) => s.isPlaying)
  const setCurrentSong = useMusicStore((s) => s.setCurrentSong)
  const togglePlay = useMusicStore((s) => s.togglePlay)
  const playlists = useMusicStore((s) => s.playlists)

  const { handlePrev, handleNext } = useAudioPlayer()

  // 取当前已加载歌单的第一首（线上刷新后为最新可播放地址，避免使用过期内嵌 src）
  const firstSong = playlists?.[0]?.songs?.[0]

  const handleTogglePlay = () => {
    playClickSound()
    if (!currentSong && firstSong) {
      // 没有歌曲时，播放当前歌单第一首（使用最新 src）
      setCurrentSong(firstSong)
    } else {
      togglePlay()
    }
  }

  return (
    <div className="widget-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-md bg-accent" />
        <span className="text-sm font-bold text-[rgb(var(--text-primary))]">音乐</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          {currentSong?.cover ? (
            <img src={currentSong.cover} alt={currentSong.name}
              className={`w-14 h-14 rounded-xl object-cover shadow-md ${isPlaying ? 'animate-spin-slow' : ''}`} />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center">
              <Music size={24} className="text-accent" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-[rgb(var(--text-primary))] truncate">
            {currentSong?.name || '未播放'}
          </div>
          <div className="text-xs text-[rgb(var(--text-secondary))] truncate">
            {currentSong?.artist || '点击播放开始听歌'}
          </div>
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="flex items-center justify-center gap-3 mt-3">
        <button type="button" onClick={() => { playClickSound(); handlePrev() }}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[rgb(var(--text-secondary))] hover:text-accent hover:bg-accent/10 transition-colors">
          <SkipBack size={14} />
        </button>
        <button type="button" onClick={handleTogglePlay}
          className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white shadow-md shadow-accent/25 hover:shadow-lg hover:shadow-accent/30 hover:scale-105 active:scale-95 transition-all duration-300">
          {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>
        <button type="button" onClick={() => { playClickSound(); handleNext() }}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[rgb(var(--text-secondary))] hover:text-accent hover:bg-accent/10 transition-colors">
          <SkipForward size={14} />
        </button>
      </div>
    </div>
  )
}

export default SidebarMusicPlayer
