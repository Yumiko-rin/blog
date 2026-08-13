import { useState, useEffect } from 'react'
import { MapPin, Calendar, Code, Heart, Github, Mail, ExternalLink, Star, GitFork, Loader2 } from 'lucide-react'
import { GlassCard } from '@/components/molecules/GlassCard'
import { SocialLinks } from '@/components/molecules/SocialLinks'
import { ARTICLES } from '@/data/articles'
import { FRIENDS } from '@/data/friends'
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

export default function My() {
  // 与首页 ProfileCard 共用同一头像（localStorage 持久化，保持两处一致）
  const avatar = getCurrentAvatar()
  const [activeTab, setActiveTab] = useState<'about' | 'skills' | 'projects' | 'links'>('about')
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loadingRepos, setLoadingRepos] = useState(true)

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

  const skills = [
    { name: 'HTML/CSS', level: 85, color: 'from-orange-400 to-orange-600' },
    { name: 'JavaScript', level: 75, color: 'from-yellow-400 to-yellow-600' },
    { name: 'React', level: 70, color: 'from-sky-400 to-sky-600' },
    { name: 'TypeScript', level: 65, color: 'from-blue-400 to-blue-600' },
    { name: 'Python', level: 60, color: 'from-green-400 to-green-600' },
    { name: 'Node.js', level: 55, color: 'from-emerald-400 to-emerald-600' },
  ]

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Hero */}
      <GlassCard className="relative overflow-hidden p-8 sm:p-10 mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex flex-col sm:flex-row items-center gap-6">
          <div className="avatar-frame shrink-0">
            <img src={avatar} alt="Avatar"
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
          { key: 'skills' as const, label: '技能', icon: '💻' },
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
                <div className="text-2xl font-black text-indigo-500">{ARTICLES.length}</div>
                <div className="text-xs text-gray-500 mt-1">篇文章</div>
              </GlassCard>
              <GlassCard className="p-5 text-center">
                <div className="text-3xl mb-2">🎵</div>
                <div className="text-2xl font-black text-purple-500">6</div>
                <div className="text-xs text-gray-500 mt-1">个歌单</div>
              </GlassCard>
              <GlassCard className="p-5 text-center">
                <div className="text-3xl mb-2">🔗</div>
                <div className="text-2xl font-black text-pink-500">{FRIENDS.length}</div>
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

        {/* Skills */}
        {activeTab === 'skills' && (
          <div className="space-y-6 animate-fade-in">
            <GlassCard className="p-6 sm:p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Code size={20} className="text-blue-500" />正在学习
              </h2>
              <div className="space-y-5">
                {skills.map((skill) => (
                  <div key={skill.name}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-bold">{skill.name}</span>
                      <span className="text-sm text-gray-500">{skill.level}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${skill.color} transition-all duration-1000`}
                        style={{ width: `${skill.level}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
            <GlassCard className="p-6 sm:p-8">
              <h2 className="text-xl font-bold mb-4">🛠️ 常用工具</h2>
              <div className="flex flex-wrap gap-2">
                {['VS Code', 'Git', 'Vercel', 'Figma', 'Notion', 'ChatGPT'].map((tool) => (
                  <span key={tool} className="px-3 py-1.5 rounded-lg text-sm font-medium card text-gray-600 dark:text-gray-400 hover:text-indigo-500 transition-colors cursor-default">
                    {tool}
                  </span>
                ))}
              </div>
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
