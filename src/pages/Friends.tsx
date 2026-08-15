import { useState, useMemo, useEffect } from 'react'
import { Search, Shuffle, Plus, X, Check, ExternalLink, Copy } from 'lucide-react'
import { FRIENDS, loadFriends } from '@/data/friends'
import { storage, STORAGE_KEYS } from '@/utils/storage'
import type { Friend } from '@/types'

/** 本站信息：自助申请时要求对方先在本站友链页添加本站 */
const MY_SITE = {
  name: '喵音の小窝',
  // 部署后自动取当前域名；本地预览时为占位
  url: typeof window !== 'undefined' ? window.location.origin : 'https://your-blog.example',
  avatar: 'https://static.hiromu.top/Boke/15.jpg',
  description: '分享代码、音乐与二次元生活的博客',
}

/** 自助申请提交端点：POST 到同源后端（local-api），由后台管理系统审核 */
const FRIEND_APPLY_ENDPOINT = '/local-api/friend-applications'
const APPROVED_ENDPOINT = '/local-api/friend-applications/approved'
const APPLY_TOKEN_KEY = 'blog_friend_apply_token'

/** 访客令牌：标记「我的申请」（与评论 token 同源策略） */
function applyToken(): string {
  try {
    let t = localStorage.getItem(APPLY_TOKEN_KEY)
    if (!t) {
      t = `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(APPLY_TOKEN_KEY, t)
    }
    return t
  } catch {
    return 'anonymous'
  }
}

interface ApplyForm {
  title: string
  siteUrl: string
  imgUrl: string
  description: string
  email: string
  message: string
}

const EMPTY_FORM: ApplyForm = {
  title: '',
  siteUrl: '',
  imgUrl: '',
  description: '',
  email: '',
  message: '',
}

/** 友链申请格式校验（与后端一致）：通过后必须能正常展示为友链 */
function validateApply(f: ApplyForm): string {
  const name = f.title.trim()
  const url = f.siteUrl.trim()
  const avatar = f.imgUrl.trim()
  const email = f.email.trim()
  const URL_RE = /^https?:\/\/[\w-]+(\.[\w-]+)+([/?#].*)?$/i
  if (name.length < 2 || name.length > 24) return '站点名称需为 2~24 个字符'
  if (!URL_RE.test(url)) return '站点地址需为合法的 http(s):// 网址'
  if (!avatar) return '请填写头像链接'
  if (!URL_RE.test(avatar)) return '头像链接需为合法的 http(s):// 图片地址'
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '邮箱格式不正确'
  return ''
}

// 友链头像加载失败时的兜底
function Avatar({ friend }: { friend: Friend }) {
  const [errored, setErrored] = useState(false)
  if (!friend.avatar || errored) {
    return (
      <div className="w-16 h-16 shrink-0 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white font-bold text-xl">
        {friend.name[0]}
      </div>
    )
  }
  return (
    <div className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5">
      <img
        src={friend.avatar}
        alt={friend.name}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover"
        onError={() => setErrored(true)}
      />
    </div>
  )
}

// 自助申请弹窗
function ApplyModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState<ApplyForm>(EMPTY_FORM)
  const [submitted, setSubmitted] = useState(false)
  const [copied, setCopied] = useState(false)
  const [formError, setFormError] = useState('')

  const update = (k: keyof ApplyForm, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const copySiteInfo = async () => {
    try {
      await navigator.clipboard.writeText(
        `名称：${MY_SITE.name}\n地址：${MY_SITE.url}\n头像：${MY_SITE.avatar}\n描述：${MY_SITE.description}`
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const handleSubmit = async () => {
    // 提交前严格校验（与后端一致，确保通过后能正常展示为友链）
    const err = validateApply(form)
    if (err) {
      setFormError(err)
      return
    }
    setFormError('')
    const record = {
      name: form.title.trim(),
      url: form.siteUrl.trim(),
      avatar: form.imgUrl.trim(),
      description: form.description.trim(),
      email: form.email.trim(),
      message: form.message.trim(),
    }
    // 优先提交到同源后端（后台管理系统可审核）；失败则仅存本地兜底
    let serverOk = false
    let serverMsg = ''
    try {
      const r = await fetch(FRIEND_APPLY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...record, token: applyToken() }),
      })
      if (r.ok) serverOk = true
      else {
        const d = await r.json().catch(() => ({}))
        serverMsg = d?.error || ''
      }
    } catch {
      /* 后端不可用，走本地 */
    }
    if (!serverOk && serverMsg) {
      setFormError(serverMsg)
      return
    }
    if (serverOk) {
      // 清掉旧的本地记录，避免与后端重复
      storage.set(STORAGE_KEYS.friendApplications, [])
    } else {
      const all = storage.get<any[]>(STORAGE_KEYS.friendApplications, [])
      storage.set(STORAGE_KEYS.friendApplications, [{ ...record, createdAt: new Date().toISOString() }, ...all])
    }
    setSubmitted(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
      <div
        className="relative w-full max-w-lg rounded-3xl p-6 max-h-[85vh] overflow-y-auto
          bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl
          border border-white/50 dark:border-white/10 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/50 dark:bg-white/10 flex items-center justify-center text-[rgb(var(--text-secondary))] hover:text-accent transition-colors"
        >
          <X size={16} />
        </button>

        <h3 className="text-xl font-bold text-[rgb(var(--text-primary))] flex items-center gap-2">
          <Plus size={18} className="text-accent" /> 自助申请友链
        </h3>

        {submitted ? (
          <div className="py-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-green-500/15 flex items-center justify-center text-green-500 mb-4">
              <Check size={28} />
            </div>
            <p className="text-lg font-bold text-[rgb(var(--text-primary))]">提交成功！</p>
            <p className="mt-2 text-sm text-[rgb(var(--text-secondary))]">
              已收到你的申请，我会尽快审核～
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 px-6 py-2.5 rounded-full bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
            >
              好的
            </button>
          </div>
        ) : (
          <>
            {/* 步骤指示 */}
            <div className="flex items-center gap-2 mt-4 mb-5">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      step === s
                        ? 'bg-accent text-white'
                        : 'bg-black/5 dark:bg-white/10 text-[rgb(var(--text-secondary))]'
                    }`}
                  >
                    {s}
                  </div>
                  {s === 1 && <span className="text-sm text-[rgb(var(--text-secondary))]">添加本站</span>}
                  {s === 2 && <span className="text-sm text-[rgb(var(--text-secondary))]">填写信息</span>}
                </div>
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-[rgb(var(--text-secondary))]">
                  请先在<strong>你的网站友链页面</strong>添加本站信息，再填写申请：
                </p>
                <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-4 text-sm space-y-1.5">
                  <div><span className="text-[rgb(var(--text-secondary))]">名称：</span>{MY_SITE.name}</div>
                  <div><span className="text-[rgb(var(--text-secondary))]">地址：</span>{MY_SITE.url}</div>
                  <div className="break-all"><span className="text-[rgb(var(--text-secondary))]">头像：</span>{MY_SITE.avatar}</div>
                  <div><span className="text-[rgb(var(--text-secondary))]">描述：</span>{MY_SITE.description}</div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={copySiteInfo}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-black/5 dark:bg-white/10 text-sm font-medium text-[rgb(var(--text-primary))] hover:bg-black/10 transition-colors"
                  >
                    <Copy size={14} /> {copied ? '已复制' : '复制本站信息'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 px-4 py-2.5 rounded-full bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
                  >
                    下一步
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <Field label="站点名称 *" placeholder="您的站点名称" value={form.title} onChange={(v) => update('title', v)} />
                <Field label="站点地址 *" placeholder="https://example.com" value={form.siteUrl} onChange={(v) => update('siteUrl', v)} />
                <Field label="头像链接 *" placeholder="https://example.com/avatar.png" value={form.imgUrl} onChange={(v) => update('imgUrl', v)} />
                <Field label="站点描述" placeholder="您的站点描述" value={form.description} onChange={(v) => update('description', v)} />
                <Field label="电子邮箱" placeholder="方便站长必要时联系您" value={form.email} onChange={(v) => update('email', v)} />
                <Field label="留言" placeholder="例如已添加本站友链的页面地址" value={form.message} onChange={(v) => update('message', v)} />

                {formError && (
                  <p className="flex items-start gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">
                    <span>⚠️</span><span>{formError}</span>
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 px-4 py-2.5 rounded-full bg-black/5 dark:bg-white/10 text-sm font-medium text-[rgb(var(--text-primary))] hover:bg-black/10 transition-colors"
                  >
                    上一步
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!form.title.trim() || !form.siteUrl.trim() || !form.imgUrl.trim()}
                    className="flex-1 px-4 py-2.5 rounded-full bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    提交申请
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// 我的申请查看弹窗（优先从后端拉取，含审核状态；后端不可用时回退本地记录）
function ApplicationsModal({ onClose }: { onClose: () => void }) {
  const [apps, setApps] = useState<any[] | null>(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const r = await fetch(`${FRIEND_APPLY_ENDPOINT}?token=${encodeURIComponent(applyToken())}`, { cache: 'no-store' })
        if (r.ok) {
          const d = await r.json()
          if (alive && Array.isArray(d?.list)) {
            setApps(d.list)
            return
          }
        }
      } catch {
        /* fallthrough */
      }
      if (alive) setApps(storage.get<any[]>(STORAGE_KEYS.friendApplications, []))
    }
    load()
    return () => { alive = false }
  }, [])

  const statusBadge = (s: string) =>
    s === 'approved'
      ? 'bg-emerald-500/15 text-emerald-500'
      : s === 'rejected'
        ? 'bg-red-500/15 text-red-500'
        : 'bg-amber-400/15 text-amber-500'

  const statusText = (s: string) => (s === 'approved' ? '已通过' : s === 'rejected' ? '已拒绝' : '待审核')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-lg rounded-3xl p-6 max-h-[85vh] overflow-y-auto
          bg-white dark:bg-slate-800 border border-black/10 dark:border-white/10 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-[rgb(var(--text-secondary))] hover:text-accent transition-colors"
        >
          <X size={16} />
        </button>

        <h3 className="text-xl font-bold text-[rgb(var(--text-primary))] flex items-center gap-2">
          <Check size={18} className="text-accent" /> 我的友链申请
        </h3>
        <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">
          提交后由站长在后台管理系统统一审核。
        </p>

        {apps === null ? (
          <div className="py-12 text-center text-[rgb(var(--text-secondary))]">加载中…</div>
        ) : apps.length === 0 ? (
          <div className="py-12 text-center text-[rgb(var(--text-secondary))]">
            <div className="text-5xl mb-3">📭</div>
            还没有申请记录，点击「自助申请」交换友链吧～
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {apps.map((a: any, i: number) => (
              <div
                key={a.id || i}
                className="rounded-2xl border border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-[rgb(var(--text-primary))] truncate">{a.name || a.title}</div>
                  <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge(a.status || 'pending')}`}>
                    {statusText(a.status || 'pending')}
                  </span>
                </div>
                <a
                  href={a.url || a.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-1 text-xs text-accent break-all hover:underline"
                >
                  {a.url || a.siteUrl}
                </a>
                {(a.description || a.message) && (
                  <div className="mt-1.5 text-sm text-[rgb(var(--text-secondary))]">{a.description || a.message}</div>
                )}
                {a.email && (
                  <div className="mt-1 text-xs text-[rgb(var(--text-secondary))]">📧 {a.email}</div>
                )}
                <div className="mt-1.5 text-[11px] text-[rgb(var(--text-secondary))] opacity-70">
                  提交时间：{a.createdAt ? new Date(a.createdAt).toLocaleString('zh-CN') : '未知'}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full px-6 py-2.5 rounded-full bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  )
}

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[rgb(var(--text-secondary))] mb-1">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10
          px-3.5 py-2.5 text-sm text-[rgb(var(--text-primary))] outline-none
          focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
      />
    </label>
  )
}

/**
 * Friends 友链页面
 * 还原 https://denia.sigrika.cc/friends/ ：
 *  - 搜索过滤、随机访问、自助申请
 *  - 卡片式友链列表（合并 denia 与原站友链）
 */
export default function Friends() {
  const [keyword, setKeyword] = useState('')
  const [applyOpen, setApplyOpen] = useState(false)
  const [appsOpen, setAppsOpen] = useState(false)
  // 已通过申请的友链（后台审核通过后自动并入展示）
  const [approved, setApproved] = useState<Friend[]>([])
  // 友链列表（静态数据作为初始值，异步加载合并后台审批通过的友链）
  const [friends, setFriends] = useState(FRIENDS)

  useEffect(() => {
    loadFriends().then(setFriends)
  }, [])

  useEffect(() => {
    // 清除历史遗留的本地申请记录（申请已改为后端持久化，旧的本地草稿一并清理）
    try { localStorage.removeItem(STORAGE_KEYS.friendApplications) } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    let alive = true
    fetch(APPROVED_ENDPOINT, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && Array.isArray(d?.list)) {
          setApproved(d.list.filter((f: any) => f && f.name && f.url))
        }
      })
      .catch(() => { /* 后端不可用时仅显示静态友链 */ })
    return () => { alive = false }
  }, [])

  // 友链列表 + 已通过申请，按 url 去重
  const allFriends = useMemo(() => {
    const seen = new Set(friends.map((f) => f.url))
    const extra = approved.filter((f) => !seen.has(f.url))
    return [...extra, ...friends]
  }, [approved, friends])

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase()
    if (!k) return allFriends
    return allFriends.filter(
      (f) =>
        f.name.toLowerCase().includes(k) ||
        f.description.toLowerCase().includes(k) ||
        (f.tag || '').toLowerCase().includes(k)
    )
  }, [keyword, allFriends])

  const handleRandomVisit = () => {
    if (allFriends.length === 0) return
    const target = allFriends[Math.floor(Math.random() * allFriends.length)]
    window.open(target.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl text-[rgb(var(--text-primary))]">友链</h1>
        <p className="mt-2 text-[rgb(var(--text-secondary))]">这里是我的朋友们，欢迎互相访问交流</p>
      </header>

      {/* 工具栏：搜索 / 随机访问 / 自助申请 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgb(var(--text-secondary))]" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索友链..."
            className="w-full rounded-xl bg-white/70 dark:bg-slate-800/50 border border-black/5 dark:border-white/10
              pl-10 pr-4 py-2.5 text-sm text-[rgb(var(--text-primary))] outline-none
              focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
          />
        </div>
        <button
          type="button"
          onClick={handleRandomVisit}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl
            bg-white/70 dark:bg-slate-800/50 border border-black/5 dark:border-white/10
            text-[rgb(var(--text-primary))] hover:border-accent hover:text-accent transition-all text-sm font-medium"
        >
          <Shuffle size={16} /> <span className="hidden sm:inline">随机访问</span>
        </button>
        <button
          type="button"
          onClick={() => setAppsOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl
            bg-white/70 dark:bg-slate-800/50 border border-black/5 dark:border-white/10
            text-[rgb(var(--text-primary))] hover:border-accent hover:text-accent transition-all text-sm font-medium"
        >
          <Check size={16} /> <span className="hidden sm:inline">我的申请</span>
        </button>
        <button
          type="button"
          onClick={() => setApplyOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl
            bg-accent text-white hover:bg-accent/90 transition-colors text-sm font-medium shadow-lg shadow-accent/25"
        >
          <Plus size={16} /> <span className="hidden sm:inline">自助申请</span>
        </button>
      </div>

      {/* 友链卡片网格 */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((friend) => (
            <a
              key={friend.id}
              href={friend.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 p-2.5 rounded-xl border border-black/5 dark:border-white/10
                bg-white/60 dark:bg-slate-800/40 hover:border-accent hover:bg-white/90 dark:hover:bg-slate-800/70
                transition-all duration-300 hover:shadow-lg relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-accent opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none" />
              <Avatar friend={friend} />
              <div className="grow min-w-0 flex flex-col justify-center gap-0.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-base text-[rgb(var(--text-primary))] group-hover:text-accent transition-colors truncate pr-4">
                    {friend.name}
                  </div>
                  <ExternalLink
                    size={16}
                    className="text-accent opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 shrink-0"
                  />
                </div>
                <div className="text-xs text-[rgb(var(--text-secondary))] truncate">{friend.description}</div>
              </div>
              {friend.tag && (
                <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-md bg-accent/10 text-accent font-medium">
                  {friend.tag}
                </span>
              )}
            </a>
          ))}
        </div>
      ) : (
        <div className="widget-card p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-[rgb(var(--text-primary))] mb-2">没有找到相关友链</h3>
          <p className="text-[rgb(var(--text-secondary))]">换个关键词试试，或点击「自助申请」交换友链～</p>
        </div>
      )}

      {applyOpen && <ApplyModal onClose={() => setApplyOpen(false)} />}
      {appsOpen && <ApplicationsModal onClose={() => setAppsOpen(false)} />}
    </div>
  )
}
