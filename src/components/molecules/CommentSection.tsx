import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MessageSquare, Send, ThumbsUp, Reply, Trash2, Smile,
  ChevronUp, ChevronDown, Link2, ShieldCheck, AtSign, RotateCw, LogOut,
  Mail, Lock, ImageIcon,
} from 'lucide-react'
import {
  listComments, createComment, likeComment, deleteComment,
  readIdentity, saveIdentity, avatarFor, relativeTime,
  getSession, clearSession, isAdminUser,
  type CommentNode, type CommentPage, type Identity, type SortKey,
} from '@/utils/comments'
import { renderCommentContent, EMOJI_LIST } from '@/utils/commentMarkdown'

/**
 * 评论区（自建，denia / Twikoo 风格）
 * --------------------------------------------------
 * - 输入区：头像预览 + 昵称(必填) / 邮箱 / 网址 + 表情 + 字数 + 预览
 * - 列表：楼层号、头像、昵称徽章（博主 / 我）、相对时间、内容（轻 Markdown）、
 *         点赞 / 回复 / 删除（自己的或博主可删），回复扁平化嵌套显示
 * - 排序：最新 / 热度；分页每页 10 条
 */

const PAGE_SIZE = 10

/* ------------------------------- 工具 ------------------------------- */

function isAdminNick(nick: string) {
  return ['kirameku', '站长', '博主', 'admin'].includes(nick.trim().toLowerCase())
}

function floorNo(c: CommentNode): string {
  const f = c.floor ?? 0
  if (f === 1) return '沙发'
  if (f === 2) return '板凳'
  if (f === 3) return '地板'
  return `${f} 楼`
}

/** 楼层徽章：前三楼用彩色渐变，普通楼层用次级色 */
function FloorBadge({ node }: { node: CommentNode }) {
  const f = node.floor ?? 0
  const cls =
    f === 1
      ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white'
      : f === 2
        ? 'bg-gradient-to-r from-slate-300 to-slate-400 text-white'
        : f === 3
          ? 'bg-gradient-to-r from-orange-300 to-amber-600 text-white'
          : 'bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))]'
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold shadow-sm ${cls}`}>
      {floorNo(node)}
    </span>
  )
}

/* ------------------------------- 编辑区 ------------------------------- */

interface EditorProps {
  path: string
  parentId?: string
  replyTo?: string
  submitLabel?: string
  autoFocus?: boolean
  onPosted: () => void
  onCancel?: () => void
}

function CommentEditor({ path, parentId, replyTo, submitLabel, autoFocus, onPosted, onCancel }: EditorProps) {
  // 已登录用户：昵称/邮箱以会话为准（锁定不可改）
  const session = getSession()
  const [identity, setIdentity] = useState<Identity>(() => readIdentity())
  const [content, setContent] = useState('')
  const [nick, setNick] = useState(session?.nick || identity.nick)
  const [mail, setMail] = useState(session?.mail || identity.mail)
  const [link, setLink] = useState(identity.link)
  const [showMore, setShowMore] = useState(Boolean(identity.nick))
  const [showEmoji, setShowEmoji] = useState(false)
  const [preview, setPreview] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (autoFocus) taRef.current?.focus()
  }, [autoFocus])

  const canSubmit = nick.trim() && mail.trim() && content.trim() && !sending

  const submit = async () => {
    if (!canSubmit) {
      setError(!nick.trim() ? '请填写昵称' : !mail.trim() ? '请填写邮箱' : '评论内容不能为空')
      return
    }
    setSending(true)
    setError('')
    // 已登录用户强制使用会话身份（昵称/邮箱不可伪造）
    const s = getSession()
    const finalNick = s?.nick || nick.trim()
    const finalMail = s?.mail || mail.trim()
    const id = { nick: finalNick, mail: finalMail, link: link.trim() }
    saveIdentity(id)
    setIdentity(id)
    const r = await createComment({
      path,
      nick: id.nick,
      mail: id.mail,
      link: id.link,
      content: content.trim(),
      parentId,
    })
    setSending(false)
    if (!r.ok) {
      setError(r.error || '发表失败，请稍后再试')
      return
    }
    setContent('')
    setShowEmoji(false)
    setPreview(false)
    onPosted()
    onCancel?.()
  }

  const insertEmoji = (e: string) => {
    const ta = taRef.current
    if (!ta) return
    const start = ta.selectionStart ?? content.length
    const end = ta.selectionEnd ?? content.length
    const next = content.slice(0, start) + e + content.slice(end)
    setContent(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(start + e.length, start + e.length)
    })
  }

  const fileRef = useRef<HTMLInputElement>(null)
  const [imgUploading, setImgUploading] = useState(false)

  const insertText = (text: string) => {
    const ta = taRef.current
    if (!ta) { setContent(c => c + text); return }
    const start = ta.selectionStart ?? content.length
    const end = ta.selectionEnd ?? content.length
    const next = content.slice(0, start) + text + content.slice(end)
    setContent(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(start + text.length, start + text.length)
    })
  }

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    if (file.size > 2 * 1024 * 1024) {
      setError('图片大小不能超过 2MB')
      return
    }
    setImgUploading(true)
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      insertText(`\n![图片](${dataUrl})\n`)
      setImgUploading(false)
    }
    reader.onerror = () => {
      setError('图片读取失败')
      setImgUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const onPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) handleImageFile(file)
        return
      }
    }
  }

  const btn =
    'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[rgb(var(--text-secondary))] hover:text-accent hover:bg-accent/10 transition-colors'

  return (
    <div className="flex gap-3">
      {/* 头像（实时预览） */}
      <img
        src={avatarFor(`${nick.trim() || '匿名'}|${mail}`)}
        alt="avatar"
        className="hidden h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-accent/25 sm:block"
        loading="lazy"
      />
      <div className="flex-1 min-w-0">
        {replyTo && (
          <div className="mb-2 flex items-center gap-1.5 text-xs text-accent">
            <AtSign size={12} />
            回复 @{replyTo}
            {onCancel && (
              <button type="button" onClick={onCancel} className="text-[rgb(var(--text-secondary))] hover:text-accent ml-auto">取消</button>
            )}
          </div>
        )}

        <textarea
          ref={taRef}
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 5000))}
          onPaste={onPaste}
          placeholder={replyTo ? `回复 @${replyTo}…` : '写下你的评论，支持 Markdown（`代码`、**加粗**、可粘贴/上传图片）'}
          rows={preview ? 8 : 3}
          className="w-full resize-y rounded-xl border border-[var(--border-color)] bg-[rgb(var(--bg-secondary))] px-3.5 py-2.5 text-sm leading-relaxed outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/25 placeholder:text-[rgb(var(--text-secondary))]/40"
        />

        {/* 工具行 */}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <button type="button" onClick={() => setShowEmoji((v) => !v)} className={btn} title="表情">
            <Smile size={14} />
          </button>
          <button type="button" onClick={() => setPreview((v) => !v)} className={btn}>
            {preview ? <><ChevronUp size={14} />编辑</> : <><ChevronDown size={14} />预览</>}
          </button>
          <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={(e) => {
            if (e.target.files && e.target.files[0]) handleImageFile(e.target.files[0])
          }} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={btn}
            title="上传图片"
            disabled={imgUploading}
          >
            <ImageIcon size={14} className={imgUploading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className={`${btn} ${showMore ? 'text-accent' : ''}`}
          >
            <RotateCw size={13} className={showMore ? 'rotate-180 transition-transform' : 'transition-transform'} />
            更多信息
          </button>

          {showMore && (
            <span className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[rgb(var(--bg-secondary))] px-2.5 py-1.5 transition-colors focus-within:border-accent">
                <Link2 size={12} className="shrink-0 text-[rgb(var(--text-secondary))]" />
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value.slice(0, 200))}
                  placeholder="网址（可选）"
                  className="w-28 bg-transparent text-xs outline-none placeholder:text-[rgb(var(--text-secondary))]/40"
                />
              </label>
            </span>
          )}

          <span className={`ml-auto text-[11px] tabular-nums ${content.length > 900 ? 'text-amber-500' : 'text-[rgb(var(--text-secondary))]'}`}>
            {content.length}/1000
          </span>
        </div>

        {/* 表情面板 */}
        {showEmoji && (
          <div className="mt-2 flex flex-wrap gap-1 rounded-xl border border-[var(--border-color)] bg-[rgb(var(--bg-secondary))] p-2">
            {EMOJI_LIST.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => insertEmoji(e)}
                className="rounded-lg px-1.5 py-1 text-lg leading-none hover:bg-accent/15 transition-colors"
              >
                {e}
              </button>
            ))}
          </div>
        )}

        {/* 预览 */}
        {preview && content.trim() && (
          <div
            className="cmt-content mt-2 rounded-xl border border-dashed border-[var(--border-color)] bg-[rgb(var(--bg-secondary))] px-3.5 py-2.5 text-sm"
            dangerouslySetInnerHTML={{ __html: renderCommentContent(content) }}
          />
        )}

        {/* 昵称 + 邮箱 + 提交（已登录则锁定会话身份） */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[rgb(var(--bg-secondary))] px-3 py-1.5">
            <span className="text-xs text-[rgb(var(--text-secondary))]">昵称</span>
            {session ? (
              <span className="flex items-center gap-1 text-sm font-semibold text-[rgb(var(--text-primary))]">
                {session.nick}
                <Lock size={12} className="text-[rgb(var(--text-secondary))]" />
              </span>
            ) : (
              <input
                value={nick}
                onChange={(e) => setNick(e.target.value.slice(0, 24))}
                placeholder="必填"
                maxLength={24}
                className="w-24 bg-transparent text-sm outline-none placeholder:text-[rgb(var(--text-secondary))]/40"
              />
            )}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[rgb(var(--bg-secondary))] px-3 py-1.5">
            <Mail size={12} className="shrink-0 text-[rgb(var(--text-secondary))]" />
            {session ? (
              <span className="flex items-center gap-1 text-sm font-semibold text-[rgb(var(--text-primary))]">
                {session.mail}
                <Lock size={12} className="text-[rgb(var(--text-secondary))]" />
              </span>
            ) : (
              <input
                value={mail}
                onChange={(e) => setMail(e.target.value.slice(0, 120))}
                placeholder="邮箱（必填）"
                type="email"
                className="w-32 bg-transparent text-sm outline-none placeholder:text-[rgb(var(--text-secondary))]/40"
              />
            )}
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={sending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent to-accent/85 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-accent/25 transition-all hover:shadow-md hover:shadow-accent/35 active:scale-95 disabled:opacity-40 disabled:shadow-none"
          >
            <Send size={14} />
            {sending ? '发表中…' : submitLabel || '发表评论'}
          </button>
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------ 单条评论 ------------------------------ */

interface RowProps {
  node: CommentNode
  path: string
  isChild: boolean
  onLike: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onReply: (c: CommentNode) => void
}

function CommentRow({ node, path, isChild, onLike, onDelete, onReply }: RowProps) {
  const [busy, setBusy] = useState(false)
  const admin = isAdminNick(node.nick)

  const act = async (fn: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    try { await fn() } finally { setBusy(false) }
  }

  return (
    <div className={isChild ? 'cmt-child' : 'cmt-row group'}>
      <div className="flex gap-3">
        <img
          src={node.avatar || avatarFor(node.nick)}
          alt={node.nick}
          className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-accent/20 transition-transform group-hover:scale-105"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = avatarFor(node.nick) }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-bold text-[rgb(var(--text-primary))]">{node.nick}</span>
            {admin && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                <ShieldCheck size={10} /> 博主
              </span>
            )}
            {node.mine && (
              <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-500">我</span>
            )}
            {node.replyTo && (
              <span className="inline-flex items-center gap-0.5 text-xs text-[rgb(var(--text-secondary))]">
                <Reply size={11} className="-scale-x-100" />
                <span className="text-accent">@{node.replyTo}</span>
              </span>
            )}
            <FloorBadge node={node} />
            <span className="ml-auto text-[11px] text-[rgb(var(--text-secondary))] opacity-75">{relativeTime(node.createdAt)}</span>
          </div>

          <div
            className="cmt-content mt-1.5 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderCommentContent(node.content) }}
          />

          <div className="mt-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => act(() => onLike(node.id))}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors ${
                node.liked
                  ? 'text-accent bg-accent/10'
                  : 'text-[rgb(var(--text-secondary))] hover:text-accent hover:bg-accent/10'
              }`}
            >
              <ThumbsUp size={13} className={node.liked ? 'fill-current' : ''} />
              {node.likes > 0 ? node.likes : '赞'}
            </button>
            <button
              type="button"
              onClick={() => onReply(node)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[rgb(var(--text-secondary))] hover:text-accent hover:bg-accent/10 transition-colors"
            >
              <Reply size={13} /> 回复
            </button>
            {isAdminUser() && (
              <button
                type="button"
                onClick={() => act(() => onDelete(node.id))}
                title="博主删除评论"
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[rgb(var(--text-secondary))] hover:text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={13} /> 删除
              </button>
            )}
          </div>

          {node.children && node.children.length > 0 && (
            <div className="cmt-children mt-3 space-y-3 rounded-xl border-l-2 border-accent/20 bg-[rgb(var(--bg-secondary))]/50 py-2.5 pr-2.5 pl-3">
              {node.children.map((c) => (
                <CommentRow key={c.id} node={c} path={path} isChild onLike={onLike} onDelete={onDelete} onReply={onReply} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------ 评论区主体 ------------------------------ */

export function CommentSection({ path }: { path: string }) {
  const [page, setPage] = useState<CommentPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<SortKey>('new')
  const [pageNo, setPageNo] = useState(1)
  const [replyingTo, setReplyingTo] = useState<CommentNode | null>(null)
  const [notice, setNotice] = useState('')
  // 当前登录会话（通过 /login 页面设置身份）
  const [session, setSession] = useState(() => getSession())

  const load = async (p = pageNo, s = sort) => {
    setLoading(true)
    const d = await listComments(path, { page: p, pageSize: PAGE_SIZE, sort: s })
    setPage(d)
    setLoading(false)
  }

  useEffect(() => {
    load(1, sort)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  const changeSort = (s: SortKey) => {
    if (s === sort) return
    setSort(s)
    setPageNo(1)
    load(1, s)
  }

  const flash = (msg: string) => {
    setNotice(msg)
    window.setTimeout(() => setNotice(''), 3000)
  }

  const handleLike = async (id: string) => {
    const r = await likeComment(id)
    if (!r.ok) return
    setPage((p) => {
      if (!p) return p
      const patch = (c: CommentNode): CommentNode =>
        c.id === id
          ? { ...c, likes: r.likes ?? c.likes, liked: r.liked ?? !c.liked }
          : { ...c, children: c.children?.map(patch) }
      return { ...p, comments: p.comments.map(patch) }
    })
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定删除这条评论及其回复吗？')) return
    const s = getSession()
    const ident = readIdentity()
    const r = await deleteComment(id, s?.mail || ident.mail, s?.nick || ident.nick)
    if (!r.ok) {
      flash(r.error || '删除失败')
      return
    }
    flash('已删除')
    setReplyingTo(null)
    load(pageNo, sort)
  }

  const handlePosted = () => {
    flash('评论发表成功 🎉')
    setSort('new')
    setPageNo(1)
    load(1, 'new')
  }

  const totalText = useMemo(() => {
    if (page == null) return ''
    const n = page.total
    if (n === 0) return '暂无评论'
    return `共 ${n} 条评论`
  }, [page])

  return (
    <section className="widget-card p-4 sm:p-6">
      {/* 头部 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-sm">
            <MessageSquare size={15} />
          </div>
          <h3 className="text-base font-bold text-[rgb(var(--text-primary))] sm:text-lg">评论区</h3>
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent tabular-nums">{totalText}</span>
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-lg bg-[rgb(var(--bg-secondary))] p-0.5">
          {([['new', '最新'], ['hot', '最热']] as [SortKey, string][]).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => changeSort(k)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                sort === k ? 'bg-accent text-white' : 'text-[rgb(var(--text-secondary))] hover:text-accent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 身份栏：已登录显示用户信息 */}
      {session && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[rgb(var(--bg-secondary))]/50 px-3.5 py-2.5">
          <img
            src={avatarFor(`${session.nick}|${session.mail}`)}
            alt={session.nick}
            loading="lazy"
            decoding="async"
            className="h-7 w-7 rounded-full object-cover ring-2 ring-accent/25"
          />
          <span className="text-sm font-bold text-[rgb(var(--text-primary))]">{session.nick}</span>
          {isAdminUser() && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
              <ShieldCheck size={10} /> 博主
            </span>
          )}
          <span className="text-[11px] text-[rgb(var(--text-secondary))] opacity-75">{session.mail}</span>
          <button
            type="button"
            onClick={() => { clearSession(); setSession(null) }}
            className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[rgb(var(--text-secondary))] hover:text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={12} /> 退出
          </button>
        </div>
      )}

      {/* 发表框 */}
      <div className="mb-6 rounded-2xl border border-[var(--border-color)] bg-[rgb(var(--bg-secondary))]/60 p-3.5 sm:p-4">
        <CommentEditor path={path} onPosted={handlePosted} />
      </div>

      {/* 列表 */}
      {loading && !page ? (
        <div className="space-y-4 py-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-10 w-10 rounded-full bg-[rgb(var(--bg-secondary))] animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 rounded bg-[rgb(var(--bg-secondary))] animate-pulse" />
                <div className="h-3 w-full rounded bg-[rgb(var(--bg-secondary))] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : page && page.comments.length === 0 ? (
        <div className="py-12 text-center">
          <div className="cmt-empty mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[rgb(var(--bg-secondary))] text-2xl">💬</div>
          <p className="text-sm font-medium text-[rgb(var(--text-primary))]">还没有评论，来抢沙发吧～</p>
          <p className="mt-1 text-xs text-[rgb(var(--text-secondary))]">支持 Markdown 与表情，友善交流从你开始</p>
        </div>
      ) : (
        <div className="space-y-1">
          {page?.comments.map((c, i) => (
            <div key={c.id} className={i > 0 ? 'border-t border-[rgb(var(--text-secondary))]/10 pt-5 mt-4' : ''}>
              <CommentRow node={c} path={path} isChild={false} onLike={handleLike} onDelete={handleDelete} onReply={setReplyingTo} />
              {replyingTo?.id === c.id && (
                <div className="mt-3 rounded-xl border border-accent/25 bg-[rgb(var(--bg-secondary))]/70 p-3.5">
                  <CommentEditor
                    path={path}
                    parentId={c.id}
                    replyTo={c.nick}
                    submitLabel="回复"
                    autoFocus
                    onPosted={handlePosted}
                    onCancel={() => setReplyingTo(null)}
                  />
                </div>
              )}
            </div>
          ))}

          {/* 分页 */}
          {page && page.totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-2">
              <button
                type="button"
                disabled={page.page <= 1}
                onClick={() => { setPageNo(page.page - 1); load(page.page - 1, sort) }}
                className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs disabled:opacity-30 hover:border-accent hover:text-accent"
              >
                上一页
              </button>
              <span className="px-2 text-xs text-[rgb(var(--text-secondary))] tabular-nums">
                {page.page} / {page.totalPages}
              </span>
              <button
                type="button"
                disabled={page.page >= page.totalPages}
                onClick={() => { setPageNo(page.page + 1); load(page.page + 1, sort) }}
                className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs disabled:opacity-30 hover:border-accent hover:text-accent"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      )}

      {/* 底部提示 */}
      <div className="mt-5 flex items-center justify-between text-[11px] text-[rgb(var(--text-secondary))] opacity-80">
        <span className="inline-flex items-center gap-1">
          <Link2 size={11} /> 评论内容会自动保存，仅博主可删除评论
        </span>
        {notice && <span className="text-accent">{notice}</span>}
      </div>
    </section>
  )
}

export default CommentSection
