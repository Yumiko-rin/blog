import { useEffect, useRef, useCallback } from 'react'
import { useMusicStore, pickNextSong, getSongsByPlaylistId } from '@/store/useMusicStore'
import type { Song } from '@/types'

/**
 * 全局唯一 <audio> 实例（模块级单例）
 * 放在模块作用域，保证路由跳转时音频不中断
 */
let audioInstance: HTMLAudioElement | null = null
function getAudio(): HTMLAudioElement {
  if (!audioInstance) {
    audioInstance = new Audio()
    audioInstance.preload = 'metadata'
  }
  return audioInstance
}

/**
 * 音频核心逻辑 Hook
 * 职责：桥接 <audio> 元素与 musicStore
 * - 同步 isPlaying / currentSong / volume 到音频元素
 * - 监听音频事件，回写 currentTime / duration
 * - 自动切歌（依据 playMode）
 *
 * 使用方式：在 GlobalPlayer（路由外层）中调用一次即可全局生效
 */
export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(getAudio())

  // 选择性订阅，避免不必要的重渲染
  const currentSong = useMusicStore((s) => s.currentSong)
  const isPlaying = useMusicStore((s) => s.isPlaying)
  const volume = useMusicStore((s) => s.volume)
  const playMode = useMusicStore((s) => s.playMode)
  const currentPlaylistId = useMusicStore((s) => s.currentPlaylistId)

  const setCurrentTime = useMusicStore((s) => s.setCurrentTime)
  const setDuration = useMusicStore((s) => s.setDuration)
  const setIsPlaying = useMusicStore((s) => s.setIsPlaying)
  const setCurrentSong = useMusicStore((s) => s.setCurrentSong)

  const audio = audioRef.current

  /* ===== 切歌：src 变化时加载并自动播放 ===== */
  useEffect(() => {
    if (!currentSong) return
    if (audio.src !== currentSong.src) {
      audio.src = currentSong.src
    }
    if (isPlaying) {
      audio.play().catch(() => {
        // 自动播放策略可能阻止，静默处理
        setIsPlaying(false)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong])

  /* ===== 播放/暂停控制 ===== */
  useEffect(() => {
    if (!currentSong) return
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false))
    } else {
      audio.pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying])

  /* ===== 音量控制 ===== */
  useEffect(() => {
    audio.volume = volume
  }, [volume, audio])

  /* ===== 音频事件监听：回写状态 ===== */
  useEffect(() => {
    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoadedMeta = () => setDuration(audio.duration || 0)
    const onEnded = () => handleNext(true)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMeta)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMeta)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ===== 播放指定歌曲 ===== */
  const playSong = useCallback(
    (song: Song, playlistId?: string | number) => {
      setCurrentSong(song, playlistId)
    },
    [setCurrentSong]
  )

  /* ===== 上一曲 ===== */
  const handlePrev = useCallback(() => {
    const list = getSongsByPlaylistId(currentPlaylistId)
    const idx = list.findIndex((s) => s.id === currentSong?.id)
    const prev = list[(idx - 1 + list.length) % list.length]
    setCurrentSong(prev, currentPlaylistId ?? undefined)
  }, [currentSong, currentPlaylistId, setCurrentSong])

  /* ===== 下一曲 ===== */
  const handleNext = useCallback(
    (auto = false) => {
      const list = getSongsByPlaylistId(currentPlaylistId)
      // 单曲循环 + 自动结束 => 重新播放当前
      if (auto && playMode === 'single' && currentSong) {
        audio.currentTime = 0
        audio.play().catch(() => {})
        return
      }
      const next = pickNextSong(currentSong, playMode, list)
      setCurrentSong(next, currentPlaylistId ?? undefined)
    },
    [currentSong, playMode, currentPlaylistId, setCurrentSong, audio]
  )

  /* ===== 进度跳转 ===== */
  const seek = useCallback(
    (time: number) => {
      audio.currentTime = time
      setCurrentTime(time)
    },
    [audio, setCurrentTime]
  )

  return {
    currentSong,
    isPlaying,
    volume,
    playMode,
    audio,
    playSong,
    handlePrev,
    handleNext,
    seek,
  }
}
