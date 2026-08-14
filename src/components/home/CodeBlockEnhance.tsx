import { useState, useEffect, useRef, useCallback } from 'react'
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'

/**
 * CodeBlockEnhance 代码块增强组件
 * 为 Markdown 代码块添加：复制按钮、语言标签、折叠/展开
 * 用于替代 ArticleDetail 中 ReactMarkdown 的 pre 渲染
 */

interface CodeBlockProps {
  className?: string
  children: React.ReactNode
}

const COLLAPSE_THRESHOLD = 20 // 超过 20 行自动折叠

export function CodeBlock({ className, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [canCollapse, setCanCollapse] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)

  // 提取语言
  const language = className?.replace('language-', '') || 'text'

  // 提取纯文本用于复制
  const getText = useCallback(() => {
    if (!preRef.current) return ''
    return preRef.current.textContent || ''
  }, [])

  // 检测行数决定是否可折叠
  useEffect(() => {
    if (preRef.current) {
      const text = preRef.current.textContent || ''
      const lines = text.split('\n').length
      setCanCollapse(lines > COLLAPSE_THRESHOLD)
      if (lines > COLLAPSE_THRESHOLD) setCollapsed(true)
    }
  }, [children])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getText())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }, [getText])

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-black/5 dark:border-white/10">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-[rgb(var(--bg-secondary))] border-b border-black/5 dark:border-white/5">
        {/* 语言标签 */}
        <span className="text-xs font-mono text-[rgb(var(--text-secondary))] uppercase">
          {language}
        </span>

        <div className="flex items-center gap-2">
          {/* 折叠按钮 */}
          {canCollapse && (
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="text-[rgb(var(--text-secondary))] hover:text-accent transition-colors flex items-center gap-1 text-xs"
              title={collapsed ? '展开' : '折叠'}
            >
              {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              {collapsed ? '展开' : '折叠'}
            </button>
          )}

          {/* 复制按钮 */}
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1 text-xs transition-colors ${
              copied ? 'text-green-500' : 'text-[rgb(var(--text-secondary))] hover:text-accent'
            }`}
            title="复制代码"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? '已复制' : '复制'}
          </button>
        </div>
      </div>

      {/* 代码内容 */}
      <pre
        ref={preRef}
        className={`glass p-4 overflow-x-auto !rounded-none !m-0 transition-all duration-300 ${
          collapsed ? 'max-h-32 overflow-hidden' : ''
        }`}
      >
        <code className={className}>{children}</code>
      </pre>

      {/* 折叠遮罩 */}
      {collapsed && (
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[rgb(var(--bg-primary))] to-transparent flex items-end justify-center pb-2">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="text-xs text-accent hover:underline flex items-center gap-1"
          >
            <ChevronDown size={14} />
            展开全部
          </button>
        </div>
      )}
    </div>
  )
}

export default CodeBlock
