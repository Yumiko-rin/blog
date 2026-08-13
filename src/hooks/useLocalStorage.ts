import { useState, useCallback, useRef, useEffect } from 'react'
import { storage } from '@/utils/storage'

/**
 * 通用 localStorage Hook
 * 受控式：state 与 localStorage 双向同步
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [stored, setStored] = useState<T>(() => storage.get<T>(key, initialValue))
  const keyRef = useRef(key)
  keyRef.current = key

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStored((prev) => {
        const next = value instanceof Function ? value(prev) : value
        storage.set(keyRef.current, next)
        return next
      })
    },
    []
  )

  // 跨标签页同步
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === keyRef.current) {
        setStored(storage.get<T>(keyRef.current, initialValue))
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return [stored, setValue]
}
