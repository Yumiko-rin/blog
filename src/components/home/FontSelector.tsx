import { useEffect, useState } from 'react'

const FONTS = [
  { label: 'Aa', value: 'system-ui, sans-serif', name: '默认' },
  { label: '永', value: '"Noto Serif SC", serif', name: '宋体' },
  { label: '永', value: '"Noto Sans SC", sans-serif', name: '黑体' },
  { label: 'Aa', value: '"Fira Code", monospace', name: '等宽' },
]

export function FontSelector() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const saved = localStorage.getItem('blog-font')
    if (saved) {
      const i = FONTS.findIndex((f) => f.value === saved)
      if (i >= 0) {
        setActive(i)
        document.documentElement.style.fontFamily = saved
      }
    }
  }, [])

  const select = (i: number) => {
    setActive(i)
    setOpen(false)
    localStorage.setItem('blog-font', FONTS[i].value)
    document.documentElement.style.fontFamily = FONTS[i].value
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-full bg-[rgb(var(--bg-secondary))] flex items-center justify-center hover:bg-accent/10 hover:scale-110 transition-all duration-200 text-sm font-bold text-[rgb(var(--text-secondary))]"
        title={`字体: ${FONTS[active].name}`}
      >
        {FONTS[active].label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-2 right-0 z-50 w-28 rounded-lg bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] shadow-xl overflow-hidden">
            {FONTS.map((f, i) => (
              <button
                key={i}
                type="button"
                onClick={() => select(i)}
                className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors hover:bg-accent/10 ${
                  i === active ? 'text-accent font-bold' : 'text-[rgb(var(--text-secondary))]'
                }`}
              >
                <span className="w-5 text-center font-bold">{f.label}</span>
                {f.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default FontSelector
