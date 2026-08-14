import { create } from 'zustand'

const ADMIN_TOKEN_KEY = 'admin_token'

interface AdminState {
  token: string | null
  isAuthed: boolean
  login: (token: string) => void
  logout: () => void
  checkAuth: () => boolean
}

export const useAdminStore = create<AdminState>((set) => ({
  token: (() => {
    try { return localStorage.getItem(ADMIN_TOKEN_KEY) } catch { return null }
  })(),
  isAuthed: (() => {
    try { return !!localStorage.getItem(ADMIN_TOKEN_KEY) } catch { return false }
  })(),
  login: (token: string) => {
    try { localStorage.setItem(ADMIN_TOKEN_KEY, token) } catch { /* ignore */ }
    set({ token, isAuthed: true })
  },
  logout: () => {
    try { localStorage.removeItem(ADMIN_TOKEN_KEY) } catch { /* ignore */ }
    set({ token: null, isAuthed: false })
  },
  checkAuth: () => {
    try { return !!localStorage.getItem(ADMIN_TOKEN_KEY) } catch { return false }
  },
}))
