import { useAdminStore } from '@/store/useAdminStore'

const BASE = '/admin'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAdminStore.getState().token
  const isFormData = options.body instanceof FormData
  const headers: Record<string, string> = {
    // FormData 时由浏览器自动设置 Content-Type（含 multipart boundary）
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401) useAdminStore.getState().logout()
    throw new Error((data as any)?.error || `HTTP ${res.status}`)
  }
  return data as T
}

export const adminApi = {
  login: (password: string) =>
    request<{ ok: boolean; token: string }>('/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  checkAuth: () => request<{ ok: boolean }>('/auth'),

  dashboard: () =>
    request<{
      articles: number
      shuoshuo: number
      comments: number
      totalViews: number
      todayViews: number
      uv: number
    }>('/dashboard'),

  // Articles
  listArticles: () => request<{ list: any[] }>('/articles'),
  createArticle: (data: any) =>
    request<{ ok: boolean; article: any }>('/articles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateArticle: (data: any) =>
    request<{ ok: boolean; article: any }>('/articles', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteArticle: (id: string) =>
    request<{ ok: boolean; removed: number }>('/articles', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    }),
  uploadArticleMarkdown: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request<{ ok: boolean; article: any }>('/articles/upload', {
      method: 'POST',
      body: formData,
    })
  },

  // Shuoshuo
  listShuoshuo: () => request<{ list: any[] }>('/shuoshuo'),
  createShuoshuo: (data: any) =>
    request<{ ok: boolean; item: any }>('/shuoshuo', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateShuoshuo: (data: any) =>
    request<{ ok: boolean; item: any }>('/shuoshuo', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteShuoshuo: (id: string) =>
    request<{ ok: boolean; removed: number }>('/shuoshuo', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    }),
  uploadShuoshuoMarkdown: (file: File, mood?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (mood) formData.append('mood', mood)
    return request<{ ok: boolean; item: any }>('/shuoshuo/upload', {
      method: 'POST',
      body: formData,
    })
  },

  // Comments
  listComments: () => request<{ list: any[]; total: number }>('/comments'),
  deleteComment: (id: string) =>
    request<{ ok: boolean; removed: number }>('/comments', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    }),

  // Friends
  listFriends: () => request<{ list: any[] }>('/friends'),
  updateFriendStatus: (id: string, status: string) =>
    request<{ ok: boolean }>('/friends/status', {
      method: 'PUT',
      body: JSON.stringify({ id, status }),
    }),

  // Stats
  getStats: () =>
    request<{ total: number; uv: number; days: { date: string; pv: number; uv: number }[] }>(
      '/stats'
    ),
}
