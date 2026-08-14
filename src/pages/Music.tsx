import { useState, useEffect, useRef, useMemo, type MouseEvent, type ReactElement } from 'react'
import { Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle, Volume2, VolumeX, FileText, ListMusic } from 'lucide-react'
import { useMusicStore } from '@/store/useMusicStore'
import { useAudioPlayer } from '@/hooks/useAudioPlayer'
import { PlaylistPanel } from '@/components/music/PlaylistPanel'
import { formatTime } from '@/utils/format'
import { playClickSound } from '@/utils/sounds'
import type { PlayMode, Song } from '@/types'

type TabType = 'lyrics' | 'playlist'

const MODE_ICON: Record<PlayMode, ReactElement> = {
  list: <Repeat size={16} />,
  single: <Repeat1 size={16} />,
  random: <Shuffle size={16} />,
}
const MODE_LABEL: Record<PlayMode, string> = {
  list: '列表循环',
  single: '单曲循环',
  random: '随机播放',
}

/**
 * Music 音乐页 - 对齐 boke.hiromu.top 播放器视觉
 * 使用全局 useMusicStore + useAudioPlayer
 */
export default function Music() {
  const [activeTab, setActiveTab] = useState<TabType>('lyrics')
  const [isMuted, setIsMuted] = useState(false)

  const currentSong = useMusicStore((s) => s.currentSong)
  const isPlaying = useMusicStore((s) => s.isPlaying)
  const volume = useMusicStore((s) => s.volume)
  const playMode = useMusicStore((s) => s.playMode)
  const currentTime = useMusicStore((s) => s.currentTime)
  const duration = useMusicStore((s) => s.duration)
  const togglePlay = useMusicStore((s) => s.togglePlay)
  const cyclePlayMode = useMusicStore((s) => s.cyclePlayMode)
  const setVolume = useMusicStore((s) => s.setVolume)
  const setCurrentSong = useMusicStore((s) => s.setCurrentSong)
  const playlists = useMusicStore((s) => s.playlists)

  const { handlePrev, handleNext, seek } = useAudioPlayer()

  const allLyrics = useMemo(
    () => (currentSong?.lyric || []).map(([t, text]) => ({ time: t / 1000, text })),
    [currentSong]
  )
  const currentLyricIndex = useMemo(() => {
    if (!allLyrics.length) return -1
    for (let i = allLyrics.length - 1; i >= 0; i--) {
      if (currentTime >= allLyrics[i].time) return i
    }
    return 0
  }, [allLyrics, currentTime])
  const currentLyric = currentLyricIndex >= 0 ? allLyrics[currentLyricIndex]?.text : ''

  const lyricsRef = useRef<HTMLDivElement>(null)
  const activeLyricRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (activeLyricRef.current && lyricsRef.current) {
      const el = activeLyricRef.current
      const container = lyricsRef.current
      const top = el.offsetTop - container.offsetTop - container.clientHeight / 2 + el.clientHeight / 2
      container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    }
  }, [currentLyricIndex])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const onSeekBar = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    seek(pct * (duration || 0))
  }

  const playSong = (song: Song, playlistId: string | number) => {
    playClickSound()
    setCurrentSong(song, playlistId)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    setVolume(isMuted ? 0.7 : 0)
  }

  if (!playlists.length) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 md:py-12">
        <div className="rounded-2xl md:rounded-3xl bg-white/40 dark:bg-slate-800/50 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl p-6">
          <div className="flex items-center justify-center h-40 md:h-64">
            <div className="text-sm md:text-base text-slate-600 dark:text-slate-300 font-medium">暂无音乐，请在配置中设置歌单</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:py-12">
      {/* 背景模糊封面光晕 */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20"
          style={{ backgroundImage: `url(${currentSong?.cover || ''})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
      </div>

      {/* 主卡片 */}
      <div className="rounded-2xl md:rounded-3xl bg-white/40 dark:bg-slate-800/50 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl p-4 md:p-6 transition-all duration-700">
        {/* 信息 + 控制 */}
        <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-8">
          {/* 黑胶唱片封面 */}
          <div className="relative shrink-0">
            <div className="w-36 h-36 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-3 rounded-full border border-white/5" />
              <div className="absolute inset-6 rounded-full border border-white/5" />
              <div className="absolute inset-9 rounded-full border border-white/5" />
              <div className="absolute inset-12 rounded-full border border-white/5" />
              <div
                className="w-[72px] h-[72px] md:w-24 md:h-24 rounded-full overflow-hidden shadow-inner bg-gradient-to-br from-purple-500/40 to-pink-500/30 flex items-center justify-center"
                style={{ animation: isPlaying ? 'spin 8s linear infinite' : 'none' }}
              >
                <img
                  src={currentSong?.cover}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/80 shadow" />
            </div>
            {isPlaying && (
              <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-xl -z-10 animate-pulse" />
            )}
          </div>

          {/* 标题 / 进度 / 控制 */}
          <div className="flex-1 text-center sm:text-left w-full">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-1 drop-shadow-sm truncate">
              {currentSong?.name || '选择歌曲开始播放'}
            </h1>
            <p className="text-xs md:text-sm text-slate-700 dark:text-slate-200 font-medium mb-4 md:mb-6 truncate">
              {currentSong?.artist || ''}
            </p>

            {/* 进度条 */}
            <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
              <span className="text-[10px] md:text-xs text-slate-600 dark:text-slate-300 font-bold w-8 md:w-10 text-right tabular-nums">
                {formatTime(currentTime)}
              </span>
              <div
                className="flex-1 relative group h-1.5 bg-slate-200/80 dark:bg-slate-600/50 rounded-full overflow-hidden cursor-pointer"
                onClick={onSeekBar}
              >
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] md:text-xs text-slate-600 dark:text-slate-300 font-bold w-8 md:w-10 tabular-nums">
                {formatTime(duration)}
              </span>
            </div>

            {/* 控制 */}
            <div className="flex items-center justify-center sm:justify-start gap-1.5 md:gap-2">
              <button
                type="button"
                onClick={() => { playClickSound(); cyclePlayMode() }}
                title={MODE_LABEL[playMode]}
                className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-indigo-500 hover:bg-white/30 dark:hover:bg-slate-700/50 transition-colors"
              >
                {MODE_ICON[playMode]}
              </button>
              <button
                type="button"
                onClick={() => { playClickSound(); handlePrev() }}
                title="上一首"
                className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-indigo-500 hover:bg-white/30 dark:hover:bg-slate-700/50 transition-colors"
              >
                <SkipBack size={20} fill="currentColor" />
              </button>
              <button
                type="button"
                onClick={() => { playClickSound(); togglePlay() }}
                title={isPlaying ? '暂停' : '播放'}
                className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:bg-indigo-600 hover:scale-105 transition-all"
              >
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-0.5" />}
              </button>
              <button
                type="button"
                onClick={() => { playClickSound(); handleNext() }}
                title="下一首"
                className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-indigo-500 hover:bg-white/30 dark:hover:bg-slate-700/50 transition-colors"
              >
                <SkipForward size={20} fill="currentColor" />
              </button>
              <div className="flex items-center gap-1 ml-1 md:ml-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  title={isMuted ? '取消静音' : '静音'}
                  className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-indigo-500 hover:bg-white/30 dark:hover:bg-slate-700/50 transition-colors"
                >
                  {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => { setVolume(parseFloat(e.target.value)); setIsMuted(false) }}
                  title="音量"
                  className="w-12 md:w-16 h-1 accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            {/* 当前歌词行 */}
            <div className="mt-3 md:mt-4 h-6 md:h-7 flex items-center">
              {currentLyric && (
                <span className="text-xs md:text-sm text-indigo-600 dark:text-indigo-300 font-bold italic drop-shadow-sm truncate w-full">
                  “{currentLyric}”
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 标签切换 */}
        <div className="flex gap-1 mb-3 md:mb-4 mt-4 rounded-xl md:rounded-2xl bg-white/30 dark:bg-slate-800/40 backdrop-blur-md border border-white/30 dark:border-white/10 p-1">
          <button
            type="button"
            onClick={() => { playClickSound(); setActiveTab('lyrics') }}
            className={`flex-1 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1 md:gap-1.5 ${
              activeTab === 'lyrics' ? 'bg-white/60 dark:bg-slate-700/70 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText size={14} /> 歌词
          </button>
          <button
            type="button"
            onClick={() => { playClickSound(); setActiveTab('playlist') }}
            className={`flex-1 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1 md:gap-1.5 ${
              activeTab === 'playlist' ? 'bg-white/60 dark:bg-slate-700/70 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ListMusic size={14} /> 播放列表
          </button>
        </div>

        {/* 内容区域 */}
        {activeTab === 'lyrics' ? (
          <div
            ref={lyricsRef}
            className="h-[280px] md:h-[400px] overflow-y-auto"
            style={{ maskImage: 'linear-gradient(transparent, black 10%, black 90%, transparent)', WebkitMaskImage: 'linear-gradient(transparent, black 10%, black 90%, transparent)' }}
          >
            {allLyrics.length > 0 ? (
              <div className="py-12 md:py-20 space-y-3 md:space-y-5">
                {allLyrics.map((lyric, index) => (
                  <div
                    key={index}
                    ref={index === currentLyricIndex ? activeLyricRef : null}
                    className={`text-center transition-all duration-300 cursor-pointer select-none ${
                      index === currentLyricIndex
                        ? 'text-base md:text-xl font-black text-indigo-600 dark:text-indigo-300 scale-105 drop-shadow-sm'
                        : index < currentLyricIndex
                        ? 'text-xs md:text-sm text-slate-500 dark:text-slate-400'
                        : 'text-xs md:text-sm text-slate-600 dark:text-slate-300 font-medium'
                    }`}
                    onClick={() => seek((lyric.time / (duration || 1)) * 100)}
                  >
                    {lyric.text}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                <FileText size={28} />
                <span className="text-xs md:text-sm font-medium">暂无歌词</span>
              </div>
            )}
          </div>
        ) : (
          <PlaylistPanel
            playlists={playlists}
            currentSongId={currentSong?.id ?? null}
            isPlaying={isPlaying}
            onPlaySong={playSong}
          />
        )}
      </div>
    </div>
  )
}
