import { useEffect, useCallback } from 'react'
import { create } from 'zustand'

interface LightboxState {
  src: string | null
  alt: string
  open: (src: string, alt?: string) => void
  close: () => void
}

const useLightboxStore = create<LightboxState>((set) => ({
  src: null,
  alt: '',
  open: (src, alt = '') => set({ src, alt }),
  close: () => set({ src: null, alt: '' }),
}))

export function useImageLightbox() {
  return useLightboxStore()
}

export function ImageLightbox() {
  const { src, alt, close } = useLightboxStore()

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    },
    [close],
  )

  useEffect(() => {
    if (src) {
      document.addEventListener('keydown', onKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [src, onKeyDown])

  if (!src) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-[fadeIn_0.2s_ease]"
      onClick={close}
    >
      <img
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'zoomIn 0.25s ease' }}
      />
      <button
        onClick={close}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xl transition-colors"
        aria-label="关闭"
      >
        ✕
      </button>
      {alt && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-black/60 text-white/80 text-sm max-w-[80vw] text-center">
          {alt}
        </div>
      )}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes zoomIn { from { transform: scale(0.9); opacity: 0 } to { transform: scale(1); opacity: 1 } }
      `}</style>
    </div>
  )
}

export default ImageLightbox
