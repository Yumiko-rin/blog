import { useState, useEffect } from 'react'
import { MapPin, Calendar, Code, Heart, Github, Mail, ExternalLink, Star, GitFork, Loader2, Tv, PlayCircle, CheckCircle, Clock, Trophy, RefreshCw } from 'lucide-react'
import { GlassCard } from '@/components/molecules/GlassCard'
import { SocialLinks } from '@/components/molecules/SocialLinks'
import { ARTICLES, loadArticles } from '@/data/articles'
import { FRIENDS, loadFriends } from '@/data/friends'
import { getCurrentAvatar, FALLBACK_AVATAR } from '@/data/avatars'

interface GitHubRepo {
  id: number
  name: string
  description: string | null
  html_url: string
  stargazers_count: number
  forks_count: number
  language: string | null
  topics: string[]
  updated_at: string
  homepage: string | null
  created_at: string
  pushed_at: string
}

interface AnimeItem {
  id: number
  title: string
  title_japanese?: string
  cover: string
  score?: number
  episodes?: number
  genres?: string[]
  airing?: boolean
  type?: string
}

interface MyAnime {
  title: string
  titleJp: string
  cover: string
  score: number
  status: 'watching' | 'completed' | 'planned'
  progress: string
  genres: string[]
  comment: string
}

const FALLBACK_SEASONAL: AnimeItem[] = [
  { id: 154587, title: '葬送的芙莉莲', title_japanese: '葬送のフリーレン', cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx154587-qQTzQnEJJ3oB.jpg', score: 9.1, episodes: 28, type: 'TV', airing: false, genres: ['Adventure', 'Fantasy'] },
  { id: 161645, title: '药屋少女的呢喃', title_japanese: '薬屋のひとりごと', cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx161645-QLbzHXiYRgV2.jpg', score: 8.8, episodes: 24, type: 'TV', airing: false, genres: ['Mystery', 'Drama'] },
  { id: 142838, title: '间谍过家家', title_japanese: 'SPY×FAMILY', cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx142838-26JrqcFU1ljB.jpg', score: 8.1, episodes: 13, type: 'TV', airing: false, genres: ['Comedy', 'Action'] },
  { id: 145064, title: '咒术回战 第二季', title_japanese: '呪術廻戦 第2期', cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx145064-hSNRJM03pvv1.jpg', score: 8.6, episodes: 23, type: 'TV', airing: false, genres: ['Action', 'Supernatural'] },
  { id: 21827, title: '紫罗兰永恒花园', title_japanese: 'ヴァイオレット・エヴァーガーデン', cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx21827-ubzq619ZA2E9.png', score: 8.5, episodes: 13, type: 'TV', airing: false, genres: ['Drama', 'Fantasy'] },
  { id: 182255, title: '葬送的芙莉莲 第二季', title_japanese: '葬送のフリーレン 第2期', cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx182255-butzrqd4I0aC.jpg', score: 8.8, episodes: 10, type: 'TV', airing: true, genres: ['Adventure', 'Fantasy'] },
  { id: 153288, title: '怪兽8号', title_japanese: '怪獣8号', cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx153288-25FBfFJzEQ5O.jpg', score: 8.1, episodes: 12, type: 'TV', airing: true, genres: ['Action', 'Sci-Fi'] },
  { id: 185874, title: 'BLEACH 千年血战篇', title_japanese: 'BLEACH 千年血戦篇', cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx185874-aU3e6tBT6wwA.jpg', score: 8.8, episodes: 10, type: 'TV', airing: true, genres: ['Action', 'Adventure'] },
  { id: 178789, title: '无职转生 III', title_japanese: '無職転生 III', cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx178789-hNXjKFzUq7mk.jpg', score: 8.4, episodes: 14, type: 'TV', airing: true, genres: ['Adventure', 'Drama'] },
  { id: 196187, title: '便利店角落的你', title_japanese: 'スーパーの裏でヤニ吸うふたり', cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx196187-0dgFi2CPp3xn.jpg', score: 8.2, episodes: 12, type: 'TV', airing: true, genres: ['Comedy', 'Romance'] },
  { id: 199111, title: '碧蓝之海 第三季', title_japanese: 'ぐらんぶる 3期', cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx199111-gBSuBG61ElcW.jpg', score: 8.1, episodes: 12, type: 'TV', airing: true, genres: ['Comedy', 'Slice of Life'] },
  { id: 135865, title: '幼女战记 II', title_japanese: '幼女戦記 II', cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx135865-T7XIPMAbqcxN.png', score: 8.1, episodes: 12, type: 'TV', airing: true, genres: ['Action', 'Fantasy'] },
]

export default function My() {
  // 与首页 ProfileCard 共用同一头像（localStorage 持久化，保持两处一致）
  const avatar = getCurrentAvatar()
  const [activeTab, setActiveTab] = useState<'about' | 'anime' | 'projects' | 'links'>('about')
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loadingRepos, setLoadingRepos] = useState(true)
  const [seasonalAnime, setSeasonalAnime] = useState<AnimeItem[]>([])
  const [loadingAnime, setLoadingAnime] = useState(true)
  const [animeFilter, setAnimeFilter] = useState<'all' | 'tv' | 'movie' | 'ova'>('all')
  const [failedCovers, setFailedCovers] = useState<Set<number>>(new Set())
  // 文章与友链计数：静态数据作为初始值，异步加载合并后台发布的数据
  const [articles, setArticles] = useState(ARTICLES)
  const [friends, setFriends] = useState(FRIENDS)

  useEffect(() => {
    loadArticles().then(setArticles)
  }, [])
  useEffect(() => {
    loadFriends().then(setFriends)
  }, [])

  const [uptime, setUptime] = useState('0天 0小时 0分钟')
  useEffect(() => {
    const start = localStorage.getItem('blog_start_time')
    if (!start) localStorage.setItem('blog_start_time', Date.now().toString())
    const base = Number(start || Date.now())
    const tick = () => {
      const diff = Date.now() - base
      const days = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      setUptime(`${days}天 ${hours}小时 ${minutes}分钟`)
    }
    tick()
    const timer = setInterval(tick, 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const response = await fetch(
          'https://api.github.com/users/jaychou4399/repos?sort=pushed&per_page=12'
        )
        const data = await response.json()
        if (Array.isArray(data)) {
          setRepos(data)
        }
      } catch (err) {
        console.error('Failed to fetch repos:', err)
      } finally {
        setLoadingRepos(false)
      }
    }
    fetchRepos()
  }, [])

  useEffect(() => {
    const fetchSeasonal = async () => {
      try {
        const now = new Date()
        const month = now.getMonth() + 1
        let season = 'WINTER'
        if (month >= 4 && month <= 6) season = 'SPRING'
        else if (month >= 7 && month <= 9) season = 'SUMMER'
        else if (month >= 10 && month <= 12) season = 'FALL'
        const year = now.getFullYear()
        const query = `query{Page(page:1,perPage:16){media(type:ANIME,season:${season},seasonYear:${year},sort:SCORE_DESC,isAdult:false){id title{romaji native} coverImage{large} averageScore episodes type status genres}}}`
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)
        const res = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
          signal: controller.signal,
        })
        clearTimeout(timeout)
        const json = await res.json()
        const media = json?.data?.Page?.media
        if (media && Array.isArray(media) && media.length > 0) {
          setSeasonalAnime(media.map((a: any) => ({
            id: a.id,
            title: a.title?.romaji || a.title?.native || '未知',
            title_japanese: a.title?.native,
            cover: a.coverImage?.large || '',
            score: a.averageScore ? a.averageScore / 10 : undefined,
            episodes: a.episodes || undefined,
            type: a.type || 'TV',
            airing: a.status === 'RELEASING',
            genres: (a.genres || []).slice(0, 3),
          })))
        } else {
          setSeasonalAnime(FALLBACK_SEASONAL)
        }
      } catch (err) {
        console.error('Failed to fetch seasonal anime:', err)
        setSeasonalAnime(FALLBACK_SEASONAL)
      } finally {
        setLoadingAnime(false)
      }
    }
    fetchSeasonal()
  }, [])

  const seasonName = (() => {
    const m = new Date().getMonth() + 1
    if (m >= 1 && m <= 3) return '冬季'
    if (m >= 4 && m <= 6) return '春季'
    if (m >= 7 && m <= 9) return '夏季'
    return '秋季'
  })()

  const myAnimeList: MyAnime[] = [
    {
      title: '葬送的芙莉莲',
      titleJp: '葬送のフリーレン',
      cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx154587-qQTzQnEJJ3oB.jpg',
      score: 9.1,
      status: 'watching',
      progress: '28/28',
      genres: ['冒险', '奇幻', '治愈'],
      comment: '看完后对时间和生命有了新的理解，神作。',
    },
    {
      title: '间谍过家家',
      titleJp: 'SPY×FAMILY',
      cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx142838-26JrqcFU1ljB.jpg',
      score: 8.1,
      status: 'watching',
      progress: '13/13',
      genres: ['喜剧', '日常', '治愈'],
      comment: '阿尼亚太可爱了！每集都在笑。',
    },
    {
      title: '药屋少女的呢喃',
      titleJp: '薬屋のひとりごと',
      cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx161645-QLbzHXiYRgV2.jpg',
      score: 8.8,
      status: 'watching',
      progress: '24/24',
      genres: ['悬疑', '古装', '剧情'],
      comment: '猫猫太帅了，推理剧情很过瘾。',
    },
    {
      title: '咒术回战 第二季',
      titleJp: '呪術廻戦 第2期',
      cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx145064-hSNRJM03pvv1.jpg',
      score: 8.6,
      status: 'completed',
      progress: '23/23',
      genres: ['战斗', '超自然', '热血'],
      comment: '渋谷事変太燃了，作画炸裂。',
    },
    {
      title: '紫罗兰永恒花园',
      titleJp: 'ヴァイオレット・エヴァーガーデン',
      cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx21827-ubzq619ZA2E9.png',
      score: 8.5,
      status: 'completed',
      progress: '13/13',
      genres: ['治愈', '剧情', '感人'],
      comment: '每一帧都是壁纸，看哭了无数次。',
    },
    {
      title: '葬送的芙莉莲 第二季',
      titleJp: '葬送のフリーレン 第2期',
      cover: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx182255-butzrqd4I0aC.jpg',
      score: 8.8,
      status: 'planned',
      progress: '0/10',
      genres: ['冒险', '奇幻', '治愈'],
      comment: '期待已久，准备补番！',
    },
  ]

  const filteredSeasonal = animeFilter === 'all'
    ? seasonalAnime
    : seasonalAnime.filter(a => (a.type || 'TV').toLowerCase().includes(animeFilter))

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Hero */}
      <GlassCard className="relative overflow-hidden p-8 sm:p-10 mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex flex-col sm:flex-row items-center gap-6">
          <div className="avatar-frame shrink-0">
            <img src={avatar} alt="Avatar"
              decoding="async"
              onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_AVATAR }}
              className="w-32 h-32 sm:w-36 sm:h-36 rounded-full object-cover shadow-xl" />
          </div>
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-3xl sm:text-4xl font-black mb-2">
              <span className="rainbow-name">喵音</span>
            </h1>
            <p className="text-lg text-gray-500 dark:text-gray-400 mb-3">
              大学生 · 编程爱好者 · 二次元 🎌
            </p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5"><MapPin size={14} className="text-indigo-500" />中国</span>
              <span className="flex items-center gap-1.5"><Calendar size={14} className="text-purple-500" />2026年建站</span>
              <span className="flex items-center gap-1.5"><Code size={14} className="text-green-500" />在学习中</span>
            </div>
            <div className="mt-4"><SocialLinks iconSize={18} /></div>
          </div>
        </div>
      </GlassCard>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { key: 'about' as const, label: '关于我', icon: '👋' },
          { key: 'anime' as const, label: '番组', icon: '📺' },
          { key: 'projects' as const, label: '开源项目', icon: '🚀' },
          { key: 'links' as const, label: '联系', icon: '📬' },
        ].map((tab) => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'card text-gray-600 dark:text-gray-400 hover:text-indigo-500'
            }`}>
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {/* About */}
        {activeTab === 'about' && (
          <div className="space-y-6 animate-fade-in">
            <GlassCard className="p-6 sm:p-8">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Heart size={20} className="text-pink-500" />关于我
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
                <p>
                  你好！我是一名普通大学生，平时喜欢折腾代码、听音乐、看动漫。
                  虽然不是计算机专业的，但对编程有着浓厚的兴趣，正在自学 vibe coding。
                </p>
                <p>
                  这个博客是我学习过程中的记录，分享一些学到的知识和踩过的坑。
                  同时也想通过这个网站认识更多志同道合的朋友。
                </p>
                <p>
                  平时最喜欢做的事情就是写代码时听音乐，感觉特别治愈。
                  也很喜欢二次元文化，尤其是那些治愈系的动漫～
                </p>
                <p className="text-sm text-gray-400 italic">
                  "代码和音乐一样，都是一种表达美好的方式。"
                </p>
              </div>
            </GlassCard>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <GlassCard className="p-5 text-center">
                <div className="text-3xl mb-2">📝</div>
                <div className="text-2xl font-black text-indigo-500">{articles.length}</div>
                <div className="text-xs text-gray-500 mt-1">篇文章</div>
              </GlassCard>
              <GlassCard className="p-5 text-center">
                <div className="text-3xl mb-2">🎵</div>
                <div className="text-2xl font-black text-purple-500">6</div>
                <div className="text-xs text-gray-500 mt-1">个歌单</div>
              </GlassCard>
              <GlassCard className="p-5 text-center">
                <div className="text-3xl mb-2">🔗</div>
                <div className="text-2xl font-black text-pink-500">{friends.length}</div>
                <div className="text-xs text-gray-500 mt-1">条友链</div>
              </GlassCard>
              <GlassCard className="p-5 text-center">
                <div className="text-3xl mb-2">⏰</div>
                <div className="text-lg font-black text-green-500">{uptime.split(' ')[0]}</div>
                <div className="text-xs text-gray-500 mt-1">运行天数</div>
              </GlassCard>
            </div>
          </div>
        )}

        {/* Anime 番组 */}
        {activeTab === 'anime' && (
          <div className="space-y-6 animate-fade-in">
            {/* 我的追番 */}
            <GlassCard className="p-6 sm:p-8">
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                <Tv size={20} className="text-purple-500" />我的追番
              </h2>
              <p className="text-sm text-gray-500 mb-5">记录我看过的和正在追的番剧</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myAnimeList.map((anime) => (
                  <div key={anime.title} className="card rounded-xl overflow-hidden hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 group hover:-translate-y-1">
                    <div className="flex gap-3 p-3">
                      <div className="relative shrink-0">
                        <img
                          src={anime.cover}
                          alt={anime.title}
                          className="rounded-lg object-cover shadow-md"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3' }}
                          style={{ width: '64px', height: '90px' }}
                        />
                        <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow ${
                          anime.status === 'watching' ? 'bg-green-500' :
                          anime.status === 'completed' ? 'bg-blue-500' : 'bg-orange-400'
                        }`}>
                          {anime.status === 'watching' ? '▶' : anime.status === 'completed' ? '✓' : '★'}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200 group-hover:text-purple-500 transition-colors line-clamp-1">
                          {anime.title}
                        </h3>
                        <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{anime.titleJp}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="flex items-center gap-0.5 text-xs font-bold text-amber-500">
                            <Star size={10} className="fill-amber-500" />{anime.score}
                          </span>
                          <span className="text-[10px] text-gray-400">{anime.progress}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {anime.genres.map(g => (
                            <span key={g} className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-500 text-[9px] font-bold">{g}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="px-3 pb-3 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 italic">
                      "{anime.comment}"
                    </p>
                  </div>
                ))}
              </div>
              {/* 状态图例 */}
              <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span><PlayCircle size={12} />追番中</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span><CheckCircle size={12} />已追完</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-400"></span><Clock size={12} />想看</span>
              </div>
            </GlassCard>

            {/* 当季新番 */}
            <GlassCard className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Trophy size={20} className="text-amber-500" />{new Date().getFullYear()}年{seasonName}新番
                </h2>
                <button
                  type="button"
                  onClick={() => { setLoadingAnime(true); window.location.reload() }}
                  className="text-sm text-indigo-500 hover:underline font-medium flex items-center gap-1"
                >
                  <RefreshCw size={14} />刷新
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">数据来源 MyAnimeList，按评分排序</p>

              {/* 类型筛选 */}
              <div className="flex gap-2 mb-4">
                {([
                  { key: 'all' as const, label: '全部' },
                  { key: 'tv' as const, label: 'TV' },
                  { key: 'movie' as const, label: '剧场版' },
                  { key: 'ova' as const, label: 'OVA' },
                ]).map(f => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setAnimeFilter(f.key)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      animeFilter === f.key
                        ? 'bg-purple-500 text-white shadow'
                        : 'card text-gray-500 hover:text-purple-500'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {loadingAnime ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={32} className="text-purple-500 animate-spin" />
                  <span className="ml-3 text-gray-500">加载番组中...</span>
                </div>
              ) : filteredSeasonal.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredSeasonal.slice(0, 16).map((anime) => (
                    <div key={anime.id} className="card rounded-xl overflow-hidden hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 group hover:-translate-y-1">
                      <div className="relative overflow-hidden">
                        {failedCovers.has(anime.id) ? (
                          <div className="w-full aspect-[3/4] flex items-center justify-center bg-gradient-to-br from-purple-500/40 via-pink-500/30 to-indigo-500/40 group-hover:scale-105 transition-transform duration-500">
                            <span className="text-white/90 text-sm font-bold text-center px-3 line-clamp-3 drop-shadow-md">{anime.title}</span>
                          </div>
                        ) : (
                          <img
                            src={anime.cover}
                            alt={anime.title}
                            className="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            onError={() => setFailedCovers(prev => new Set(prev).add(anime.id))}
                          />
                        )}
                        {anime.airing && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-red-500/90 text-white text-[9px] font-bold backdrop-blur-sm">
                            ON AIR
                          </div>
                        )}
                        {anime.score && (
                          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-amber-400 text-xs font-bold flex items-center gap-0.5">
                            <Star size={8} className="fill-amber-400" />{anime.score}
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <h3 className="font-bold text-xs text-gray-800 dark:text-gray-200 group-hover:text-purple-500 transition-colors line-clamp-2 min-h-[32px]">
                          {anime.title}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {anime.type && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 text-[9px] font-bold">
                              {anime.type}
                            </span>
                          )}
                          {anime.episodes && (
                            <span className="text-[10px] text-gray-400">{anime.episodes}集</span>
                          )}
                        </div>
                        {anime.genres && anime.genres.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {anime.genres.slice(0, 2).map(g => (
                              <span key={g} className="text-[9px] text-gray-400">{g}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Tv size={40} className="mx-auto mb-3 opacity-30" />
                  暂时无法获取当季番组数据
                </div>
              )}
            </GlassCard>
          </div>
        )}

        {/* Projects */}
        {activeTab === 'projects' && (
          <div className="space-y-6 animate-fade-in">
            <GlassCard className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Github size={20} />开源项目
                </h2>
                <a href="https://github.com/jaychou4399" target="_blank" rel="noopener noreferrer"
                  className="text-sm text-indigo-500 hover:underline font-medium flex items-center gap-1">
                  GitHub 主页 <ExternalLink size={14} />
                </a>
              </div>

              {loadingRepos ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={32} className="text-indigo-500 animate-spin" />
                  <span className="ml-3 text-gray-500">加载项目中...</span>
                </div>
              ) : repos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {repos.map((repo) => (
                    <a key={repo.id} href={repo.html_url} target="_blank" rel="noopener noreferrer" className="block">
                      <div className="card rounded-xl p-5 h-full hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 group hover:-translate-y-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-bold text-gray-800 dark:text-gray-200 group-hover:text-indigo-500 transition-colors truncate text-sm">
                            {repo.name}
                          </h3>
                          <ExternalLink size={12} className="shrink-0 text-gray-400 group-hover:text-indigo-500" />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 min-h-[32px]">
                          {repo.description || '暂无描述'}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          {repo.language && (
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-indigo-500" />
                              {repo.language}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Star size={10} />{repo.stargazers_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <GitFork size={10} />{repo.forks_count}
                          </span>
                        </div>
                        {repo.topics && repo.topics.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {repo.topics.slice(0, 3).map((topic) => (
                              <span key={topic} className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 text-[9px] font-bold">
                                {topic}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">暂无项目数据</div>
              )}
            </GlassCard>
          </div>
        )}

        {/* Links */}
        {activeTab === 'links' && (
          <div className="space-y-6 animate-fade-in">
            <GlassCard className="p-6 sm:p-8">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Mail size={20} className="text-indigo-500" />联系我
              </h2>
              <p className="text-gray-500 mb-6">欢迎通过以下方式联系我，一起交流学习！</p>
              <SocialLinks iconSize={24} />
            </GlassCard>
            <GlassCard className="p-6 sm:p-8">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Github size={20} />GitHub
              </h2>
              <p className="text-gray-500 mb-4">我的 GitHub 上有一些开源项目，欢迎 Star ⭐</p>
              <div className="grid grid-cols-2 gap-3">
                <a href="https://github.com/jaychou4399" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 rounded-xl card font-bold hover:text-indigo-500 transition-all hover:shadow-md">
                  <Github size={18} />GitHub 主页
                </a>
                <a href="mailto:jaychou8421@gmail.com"
                  className="flex items-center gap-2 px-4 py-3 rounded-xl card font-bold hover:text-red-500 transition-all hover:shadow-md">
                  <Mail size={18} />发送邮件
                </a>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  )
}
