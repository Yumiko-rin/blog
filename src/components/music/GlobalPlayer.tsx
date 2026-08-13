import { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useAudioPlayer } from '@/hooks/useAudioPlayer'
import { useMusicStore } from '@/store/useMusicStore'
import { loadPlaylists, PLAYLISTS } from '@/data/playlists'
import { MiniPlayer } from './MiniPlayer'
import { FullPlayer } from './FullPlayer'

/**
 * GlobalPlayer 全局常驻播放器壳
 * --------------------------------------------------
 * 职责：在路由外层挂载，保证页面跳转时音频不中断
 * - 全局唯一调用 useAudioPlayer 的位置（音频元素单例，只在此初始化一次）
 * - 桥接 useAudioPlayer（音频控制）与 useMusicStore（UI 状态）
 * - 始终渲染 MiniPlayer；当 isFullPanelOpen 且有歌曲时渲染 FullPlayer
 * 本组件不含自身样式，仅做状态聚合与子组件编排
 */
export function GlobalPlayer() {
  // 音频核心控制（全局唯一调用，内部维护 <audio> 单例）
  const {
    currentSong,
    isPlaying,
    volume,
    playMode,
    handlePrev,
    handleNext,
    seek,
  } = useAudioPlayer()

  // 从 store 读取 UI 相关状态与派发动作（选择性订阅，减少重渲染）
  const currentTime = useMusicStore((s) => s.currentTime)
  const duration = useMusicStore((s) => s.duration)
  const isFullPanelOpen = useMusicStore((s) => s.isFullPanelOpen)
  const togglePlay = useMusicStore((s) => s.togglePlay)
  const cyclePlayMode = useMusicStore((s) => s.cyclePlayMode)
  const setVolume = useMusicStore((s) => s.setVolume)
  const setFullPanelOpen = useMusicStore((s) => s.setFullPanelOpen)
  const setPlaylists = useMusicStore((s) => s.setPlaylists)
  const presetCurrentSong = useMusicStore((s) => s.presetCurrentSong)

  // 启动即加载歌单：先同步内嵌歌单保证即时可用，再尝试线上接口刷新
  useEffect(() => {
    setPlaylists(PLAYLISTS)
    loadPlaylists().then((pls) => {
      if (pls.length > 0) {
        setPlaylists(pls)
        // 进入站点即预设歌单第一首歌的全部信息（标题/歌手/封面/歌词），但不自动播放
        const firstPlaylist = pls[0]
        if (firstPlaylist?.songs?.length && !useMusicStore.getState().currentSong) {
          presetCurrentSong(firstPlaylist.songs[0], firstPlaylist.id)
        }
      }
    })
  }, [setPlaylists, presetCurrentSong])

  return (
    <>
      {/* 迷你播放器：常驻底部，无歌曲时显示空状态 */}
      <MiniPlayer
        song={currentSong}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        playMode={playMode}
        onTogglePlay={togglePlay}
        onPrev={handlePrev}
        onNext={() => handleNext()}
        onSeek={seek}
        onVolumeChange={setVolume}
        onCycleMode={cyclePlayMode}
        onExpand={() => setFullPanelOpen(true)}
      />

      {/* 大型面板：展开时从底部滑入，收起时滑出 */}
      <AnimatePresence>
        {isFullPanelOpen && currentSong && (
          <FullPlayer
            key="full-player"
            song={currentSong}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            playMode={playMode}
            lyric={currentSong.lyric}
            onTogglePlay={togglePlay}
            onPrev={handlePrev}
            onNext={() => handleNext()}
            onSeek={seek}
            onVolumeChange={setVolume}
            onCycleMode={cyclePlayMode}
            onCollapse={() => setFullPanelOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
