import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LogIn, UserPlus, LogOut, ArrowLeft, ShieldCheck } from 'lucide-react'
import { GlassCard } from '@/components/molecules/GlassCard'
import {
  getSession, clearSession, walineRegister, walineLogin, requestWalineCode,
  isAdminUser, avatarFor, type UserSession,
} from '@/utils/comments'

/**
 * Login 登录 / 注册页（Waline 邮箱验证码）
 * --------------------------------------------------
 * - 评论区「登录 / 注册」按钮跳转到本页（?redirect= 回跳）
 * - 对接用户自建 Waline 服务：邮箱验证码登录/注册，成功后保存 Waline token
 * - 登录身份用于评论区展示「我」与博主徽章
 */
export default function Login() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const redirect = params.get('redirect') || '/'

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [nick, setNick] = useState('')
  const [mail, setMail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<number>(0)
  const [session, setSession] = useState<UserSession | null>(() => getSession())

  const mailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.trim())

  /** 发送邮箱验证码（Waline SMTP），60 秒倒计时防刷 */
  const sendCode = async () => {
    if (!mailOk) return setError('请先填写正确的邮箱')
    if (sending || countdown > 0) return
    setSending(true)
    setError('')
    const r = await requestWalineCode(mail)
    setSending(false)
    if (!r.ok) return setError(r.error || '验证码发送失败')
    setCountdown(60)
    timerRef.current = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          window.clearInterval(timerRef.current)
          return 0
        }
        return c - 1
      })
    }, 1000)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (mode === 'register') {
      const r = await walineRegister(nick, mail, code)
      if (!r.ok) return setError(r.error || '注册失败')
    } else {
      const r = await walineLogin(mail, code)
      if (!r.ok) return setError(r.error || '登录失败')
    }
    setSession(getSession())
    // 登录成功，跳回来源页
    navigate(redirect, { replace: true })
  }

  const doLogout = () => {
    clearSession()
    setSession(null)
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Link
        to={redirect}
        className="mb-6 inline-flex items-center gap-1 text-sm text-[rgb(var(--text-secondary))] hover:text-accent transition-colors"
      >
        <ArrowLeft size={16} /> 返回
      </Link>

      <GlassCard className="p-6 sm:p-8">
        {session ? (
          /* 已登录状态 */
          <div className="text-center py-6">
            <img
              src={avatarFor(`${session.nick}|${session.mail}`)}
              alt="avatar"
              className="mx-auto h-20 w-20 rounded-full object-cover ring-2 ring-accent/25"
            />
            <h2 className="mt-4 text-xl font-bold text-[rgb(var(--text-primary))]">{session.nick}</h2>
            <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">{session.mail}</p>
            <div className="mt-2 flex justify-center gap-2">
              {isAdminUser() && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
                  <ShieldCheck size={12} /> 博主
                </span>
              )}
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-500">已登录</span>
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate(redirect, { replace: true })}
                className="rounded-full bg-accent px-6 py-2 text-sm font-semibold text-white hover:opacity-90 transition-colors"
              >
                返回
              </button>
              <button
                type="button"
                onClick={doLogout}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] px-6 py-2 text-sm font-semibold text-[rgb(var(--text-secondary))] hover:text-accent hover:border-accent transition-colors"
              >
                <LogOut size={14} /> 退出登录
              </button>
            </div>
            <p className="mt-4 text-xs text-[rgb(var(--text-secondary))] opacity-70">
              登录后评论会显示你的 Waline 账号身份
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-center text-2xl font-black text-[rgb(var(--text-primary))]">
              {mode === 'login' ? '登录' : '注册'}
            </h1>
            <p className="mt-1 text-center text-sm text-[rgb(var(--text-secondary))]">
              {mode === 'login' ? '使用邮箱验证码登录，评论显示你的账号身份' : '注册 Waline 账号，参与评论与互动'}
            </p>

            {/* 模式切换 */}
            <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-[rgb(var(--bg-secondary))] p-1">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(''); setCode('') }}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors ${
                    mode === m
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-[rgb(var(--text-secondary))] hover:text-accent'
                  }`}
                >
                  {m === 'login' ? <><LogIn size={14} />登录</> : <><UserPlus size={14} />注册</>}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="mt-5 space-y-4">
              {mode === 'register' && (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[rgb(var(--text-secondary))]">昵称 *</span>
                  <input
                    value={nick}
                    onChange={(e) => setNick(e.target.value)}
                    maxLength={24}
                    placeholder="你希望展示的名字"
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[rgb(var(--bg-secondary))] px-3.5 py-2.5 text-sm outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/25"
                  />
                </label>
              )}
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[rgb(var(--text-secondary))]">邮箱 *</span>
                <input
                  type="email"
                  value={mail}
                  onChange={(e) => setMail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[rgb(var(--bg-secondary))] px-3.5 py-2.5 text-sm outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/25"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[rgb(var(--text-secondary))]">邮箱验证码 *</span>
                <div className="flex gap-2">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                    placeholder="6 位验证码"
                    className="w-full flex-1 rounded-xl border border-[var(--border-color)] bg-[rgb(var(--bg-secondary))] px-3.5 py-2.5 text-sm tracking-[0.3em] outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/25"
                  />
                  <button
                    type="button"
                    onClick={sendCode}
                    disabled={sending || countdown > 0}
                    className="shrink-0 rounded-xl border border-[var(--border-color)] px-4 text-sm font-medium text-[rgb(var(--text-primary))] hover:border-accent hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {countdown > 0 ? `${countdown}s` : sending ? '发送中…' : '发送验证码'}
                  </button>
                </div>
              </label>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-accent to-accent/85 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent/25 transition-all hover:shadow-md active:scale-[0.98]"
              >
                {mode === 'login' ? '登录' : '注册并登录'}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-[rgb(var(--text-secondary))] opacity-70">
              验证码由 Waline 邮件服务发送，登录后评论将归入你的账号
            </p>
          </>
        )}
      </GlassCard>
    </div>
  )
}
