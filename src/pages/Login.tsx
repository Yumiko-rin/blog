import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LogOut, ArrowLeft, ShieldCheck, UserCog } from 'lucide-react'
import { GlassCard } from '@/components/molecules/GlassCard'
import {
  getSession, clearSession, quickLogin, isAdminUser,
  avatarFor, type UserSession,
} from '@/utils/comments'

/**
 * Login 身份设置页（无验证码）
 * --------------------------------------------------
 * 填昵称 + 邮箱即可设置身份，无需验证码。
 * 邮箱匹配博主邮箱则获得博主权限（删除任意评论等）。
 */
export default function Login() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const redirect = params.get('redirect') || '/'

  const [nick, setNick] = useState('')
  const [mail, setMail] = useState('')
  const [error, setError] = useState('')
  const [session, setSession] = useState<UserSession | null>(() => getSession())

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const r = quickLogin(nick, mail)
    if (!r.ok) {
      setError(r.error || '设置失败')
      return
    }
    setSession(getSession())
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
          </div>
        ) : (
          <>
            <h1 className="text-center text-2xl font-black text-[rgb(var(--text-primary))]">
              设置身份
            </h1>
            <p className="mt-1 text-center text-sm text-[rgb(var(--text-secondary))]">
              填写昵称和邮箱即可评论，无需验证码
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
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

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-accent to-accent/85 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent/25 transition-all hover:shadow-md active:scale-[0.98]"
              >
                确认设置
              </button>
            </form>

            <div className="mt-4 flex items-start gap-2 rounded-xl bg-[rgb(var(--bg-secondary))]/60 px-3.5 py-2.5 text-xs text-[rgb(var(--text-secondary))]">
              <UserCog size={14} className="mt-0.5 shrink-0 text-accent" />
              <span>无需注册和验证码，填昵称即可评论。博主邮箱匹配后自动获得管理权限。</span>
            </div>
          </>
        )}
      </GlassCard>
    </div>
  )
}
