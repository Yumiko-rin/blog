import { create } from 'zustand'
import type { Song, PlayMode, Playlist } from '@/types'
import { storage, STORAGE_KEYS } from '@/utils/storage'
import { ALL_SONGS, PLAYLISTS } from '@/data/playlists'

/**
 * 音乐全局状态 Store
 * 只存"数据状态"，不直接操作 <audio> DOM
 * 音频元素的实际控制交给 useAudioPlayer Hook，二者通过本 store 通信
 */
interface MusicState {
  /** 当前播放歌曲 */
  currentSong: Song | null
  /** 播放中标识 */
  isPlaying: boolean
  /** 播放模式 */
  playMode: PlayMode
  /** 音量 0~1 */
  volume: number
  /** 当前播放时间（秒）—— 由 audio timeupdate 同步 */
  currentTime: number
  /** 歌曲总时长（秒） */
  duration: number
  /** 播放历史（最近的歌曲 id） */
  playHistory: (string | number)[]
  /** 当前歌单 id */
  currentPlaylistId: string | number | null
  /** 大型面板是否展开 */
  isFullPanelOpen: boolean
  /** 已加载的歌单（网易云或本地） */
  playlists: Playlist[]

  /* ===== Actions ===== */
  setCurrentSong: (song: Song, playlistId?: string | number) => void
  /** 仅预设当前歌曲信息（用于进入站点时预载第一首歌的全部信息，不触发自动播放） */
  presetCurrentSong: (song: Song, playlistId?: string | number) => void
  setIsPlaying: (playing: boolean) => void
  togglePlay: () => void
  setPlayMode: (mode: PlayMode) => void
  cyclePlayMode: () => void
  setVolume: (v: number) => void
  setCurrentTime: (t: number) => void
  setDuration: (d: number) => void
  addToHistory: (songId: string | number) => void
  setFullPanelOpen: (open: boolean) => void
  /** 写入从网易云/本地加载到的歌单 */
  setPlaylists: (playlists: Playlist[]) => void
}

/** 模式循环顺序 */
const MODE_ORDER: PlayMode[] = ['list', 'single', 'random']

export const useMusicStore = create<MusicState>((set, get) => ({
  // 初始值从 localStorage 恢复，实现持久化
  currentSong: null,
  isPlaying: false,
  playMode: storage.get<PlayMode>(STORAGE_KEYS.playMode, 'list'),
  volume: storage.get<number>(STORAGE_KEYS.volume, 0.7),
  currentTime: 0,
  duration: 0,
  playHistory: storage.get<(string | number)[]>(STORAGE_KEYS.playHistory, []),
  currentPlaylistId: null,
  isFullPanelOpen: false,
  playlists: PLAYLISTS,

  setCurrentSong: (song, playlistId) => {
    set({ currentSong: song, isPlaying: true, currentTime: 0 })
    if (playlistId !== undefined) set({ currentPlaylistId: playlistId })
    // 写入播放历史
    get().addToHistory(song.id)
  },

  // 仅预设歌曲信息，不改变播放状态（进入站点时调用，避免浏览器自动播放策略拦截）
  presetCurrentSong: (song, playlistId) => {
    set({ currentSong: song })
    if (playlistId !== undefined) set({ currentPlaylistId: playlistId })
    get().addToHistory(song.id)
  },

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),

  setPlayMode: (mode) => {
    storage.set(STORAGE_KEYS.playMode, mode)
    set({ playMode: mode })
  },

  cyclePlayMode: () => {
    const idx = MODE_ORDER.indexOf(get().playMode)
    const next = MODE_ORDER[(idx + 1) % MODE_ORDER.length]
    get().setPlayMode(next)
  },

  setVolume: (v) => {
    const clamped = Math.max(0, Math.min(1, v))
    storage.set(STORAGE_KEYS.volume, clamped)
    set({ volume: clamped })
  },

  setCurrentTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),

  addToHistory: (songId) => {
    const history = get().playHistory.filter((id) => id !== songId)
    history.unshift(songId)
    const trimmed = history.slice(0, 50) // 最多保留 50 条
    storage.set(STORAGE_KEYS.playHistory, trimmed)
    set({ playHistory: trimmed })
  },

  setFullPanelOpen: (open) => set({ isFullPanelOpen: open }),
  setPlaylists: (playlists) => set({ playlists }),
}))

/**
 * 根据 playMode 计算下一首歌
 * 供 useAudioPlayer 调用
 */
export function pickNextSong(
  current: Song | null,
  mode: PlayMode,
  list: Song[]
): Song {
  if (list.length === 0) return ALL_SONGS[0]
  if (list.length === 1) return list[0]

  if (mode === 'single') {
    return current ?? list[0]
  }
  if (mode === 'random') {
    let next = current
    while (next?.id === current?.id) {
      next = list[Math.floor(Math.random() * list.length)]
    }
    return next ?? list[0]
  }
  // list 循环
  const idx = list.findIndex((s) => s.id === current?.id)
  return list[(idx + 1) % list.length]
}

/** 根据歌单 id 取歌曲列表（动态读取已加载的歌单） */
export function getSongsByPlaylistId(id: string | number | null): Song[] {
  const lists = useMusicStore.getState().playlists
  if (id === null) return lists.flatMap((p) => p.songs)
  return lists.find((p) => p.id === id)?.songs ?? lists.flatMap((p) => p.songs)
}
