/**
 * 评论内容的轻量 Markdown 渲染
 * --------------------------------------------------
 * 安全策略：先整体转义 HTML，再仅生成受控标签，
 * 因此评论中的任何原始 HTML / <script> 都不会被执行。
 * 支持：代码块、行内代码、粗体、斜体、删除线、引用、图片、链接、自动链接、换行。
 */

const ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPE[c])
}

/** 仅允许 http(s) 与站内绝对路径，阻断 javascript: / data: 等协议 */
function safeUrl(raw: string): string | null {
  const u = raw.trim()
  if (/^https?:\/\/[^\s]+$/i.test(u)) return u
  if (/^\/[^\s]*$/.test(u)) return u
  return null
}

export function renderCommentContent(input: string): string {
  let text = escapeHtml(String(input || '').trim())

  // 1) 代码块先抽出占位，避免内部内容被后续规则改写
  const blocks: string[] = []
  text = text.replace(/```([\s\S]*?)```/g, (_m, code: string) => {
    blocks.push(`<pre class="cmt-pre"><code>${code.replace(/^\n+|\n+$/g, '')}</code></pre>`)
    return `\u0000BLOCK${blocks.length - 1}\u0000`
  })

  const inline: string[] = []
  text = text.replace(/`([^`\n]+)`/g, (_m, code: string) => {
    inline.push(`<code class="cmt-code">${code}</code>`)
    return `\u0000INLINE${inline.length - 1}\u0000`
  })

  // 2) 图片 ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt: string, url: string) => {
    const safe = safeUrl(url)
    return safe ? `<img class="cmt-img" src="${safe}" alt="${alt}" loading="lazy" />` : m
  })

  // 3) 链接 [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label: string, url: string) => {
    const safe = safeUrl(url)
    return safe ? `<a class="cmt-link" href="${safe}" target="_blank" rel="nofollow noreferrer">${label}</a>` : m
  })

  // 4) 裸链接自动识别（跳过已在标签属性中的）
  text = text.replace(/(^|[\s(])((?:https?:\/\/)[^\s<]+)/g, (_m, pre: string, url: string) => {
    const clean = url.replace(/[.,;:!?)]+$/, '')
    const tail = url.slice(clean.length)
    return `${pre}<a class="cmt-link" href="${clean}" target="_blank" rel="nofollow noreferrer">${clean}</a>${tail}`
  })

  // 5) 强调
  text = text
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/~~([^~\n]+)~~/g, '<del>$1</del>')

  // 6) 引用行
  text = text.replace(/^&gt;\s?(.*)$/gm, '<blockquote class="cmt-quote">$1</blockquote>')

  // 7) 换行（引用/代码块之间的多余换行收敛）
  text = text.replace(/\n{3,}/g, '\n\n').replace(/\n/g, '<br />')
  text = text.replace(/(<\/blockquote>)<br \/>/g, '$1')

  // 8) 还原占位
  text = text
    .replace(/\u0000INLINE(\d+)\u0000/g, (_m, i: string) => inline[Number(i)] ?? '')
    .replace(/\u0000BLOCK(\d+)\u0000<br \/>?/g, (_m, i: string) => blocks[Number(i)] ?? '')
    .replace(/\u0000BLOCK(\d+)\u0000/g, (_m, i: string) => blocks[Number(i)] ?? '')

  return text
}

/** 常用表情（点击插入评论框） */
export const EMOJI_LIST = [
  '😀', '😂', '🥰', '😍', '🤔', '😭', '😱', '😴',
  '🥳', '😎', '🙃', '😶‍🌫️', '👍', '👏', '🙏', '💪',
  '🌸', '🍑', '🍰', '☕', '🎉', '✨', '❤️', '🔥',
  '(๑•̀ㅂ•́)و✧', '(*/ω＼*)', '(¦3[▓▓]', 'ヽ(≧□≦)ノ',
]

export default renderCommentContent
