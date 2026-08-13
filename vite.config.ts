import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { createRequire } from 'node:module'

const requireCjs = createRequire(import.meta.url)

/**
 * 本地后端插件：把 server/local-api.cjs 挂到 dev / preview 服务器
 * 提供 /local-api/stats（访问统计）与 /local-api/comments（自建评论）
 */
function localApiPlugin(): PluginOption {
  const mount = (server: { middlewares: { use: (fn: (req: any, res: any, next: () => void) => void) => void } }) => {
    const { handleLocalApi } = requireCjs('./server/local-api.cjs')
    server.middlewares.use((req, res, next) => {
      if (!handleLocalApi(req, res)) next()
    })
  }
  return {
    name: 'blog-local-api',
    configureServer: mount,
    configurePreviewServer: mount,
  }
}

// Vite 配置：别名 @ 指向 src，便于按 react-bits 规范做组合式引用
export default defineConfig({
  plugins: [react(), localApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
    // 开发服务器同源代理：规避第三方接口不带 CORS 头的限制
    proxy: {
      '/api': {
        target: 'https://boke.hiromu.top',
        changeOrigin: true,
        secure: true,
      },
      // 工具箱：uapis.cn 不带 CORS 头，同源代理到其 /api/v1
      '/uapis': {
        target: 'https://uapis.cn/api/v1',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/uapis/, ''),
      },
      // 快递查询：kuaidi100 不带 CORS 头，同源代理到其 /query
      '/kuaidi': {
        target: 'https://www.kuaidi100.com',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/kuaidi/, ''),
      },
      // 音乐：自建 Meting-API（47.104.189.4，http 无 CORS 问题但需同源避免 mixed-content）
      '/music': {
        target: 'http://47.104.189.4/music',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/music/, ''),
      },
    },
  },
  preview: {
    port: 4173,
  },
})
