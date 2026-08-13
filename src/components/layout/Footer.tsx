/**
 * Footer 页脚
 * Sigrika 风格：分隔线 + 备案信息 + 版权
 */
export function Footer() {
  return (
    <footer className="py-6">
      <div className="mx-auto max-w-4xl px-4">
        {/* 虚线分隔 */}
        <div className="border-t border-dashed border-[rgb(var(--text-secondary))]/20 mb-4" />

        <div className="text-center text-xs text-[rgb(var(--text-secondary))]/60 space-y-1.5">
          <p>
            🌸 喵音小筑 · 用代码和音乐构建的数字花园
          </p>
          <p>
            © {new Date().getFullYear()} 喵音小筑 · All Rights Reserved.
          </p>
          <p className="text-[10px] text-[rgb(var(--text-secondary))]/40">
            React + TypeScript + TailwindCSS + Zustand
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
