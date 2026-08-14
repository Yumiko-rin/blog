import { useEffect, useState, useRef } from 'react'

const SIGNATURES = [
  '代码是诗，音乐是魂 ✨',
  'Stay hungry, stay foolish.',
  '用键盘敲出星辰大海 🌊',
  'Music & Code, my life.',
  '保持热爱，奔赴山海 🌸',
]

export function SignatureDisplay() {
  const [text, setText] = useState('')
  const [idx, setIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const current = SIGNATURES[idx]

    if (!deleting && text === current) {
      timerRef.current = setTimeout(() => setDeleting(true), 2500)
    } else if (deleting && text === '') {
      setDeleting(false)
      setIdx((i) => (i + 1) % SIGNATURES.length)
    } else {
      timerRef.current = setTimeout(() => {
        setText((prev) =>
          deleting
            ? current.slice(0, prev.length - 1)
            : current.slice(0, prev.length + 1),
        )
      }, deleting ? 40 : 80)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [text, deleting, idx])

  return (
    <div className="text-center text-xs text-[rgb(var(--text-secondary))] min-h-[1.25rem] font-mono">
      <span>{text}</span>
      <span className="inline-block w-0.5 h-3 bg-accent ml-0.5 animate-pulse align-middle" />
    </div>
  )
}

export default SignatureDisplay
