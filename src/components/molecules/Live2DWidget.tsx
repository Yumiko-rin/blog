import { useEffect } from 'react'

/**
 * Live2DWidget - 看板娘模型
 *
 * 与 https://boke.hiromu.top 完全一致：
 * 直接加载本站自托管的 Live2D 资源包（public/live2d/），
 * 复刻 Kirameku 项目的 autoload 脚本。
 *
 * - 默认模型：za/zastavam21_2104/normal
 *   （少女前线 Zastava M21 枪娘，常服；与 live 站首次访问看到的角色一致）
 * - 右下角定位由 public/live2d/css/right.css 负责
 * - 通过「切换模型 / 切换服装」工具可在同一套少女前线模型池中切换
 *
 * 说明：live 站点的 /live2d 资源未返回 CORS 头，浏览器无法跨域加载模型，
 * 因此已将整套资源（runtime + 角色模型 + model_list.json）自托管到本地 public/live2d。
 */
const AUTOLOAD_SRC = '/live2d/jsdelivr/random/autoload.js?v=5'

export function Live2DWidget() {
  useEffect(() => {
    // 幂等：避免 React StrictMode 或 HMR 重复注入脚本
    if (document.querySelector('script[src*="live2d/jsdelivr/random/autoload"]')) return
    const s = document.createElement('script')
    s.src = AUTOLOAD_SRC
    s.async = true
    s.onerror = () => console.error('[Live2DWidget] 看板娘脚本加载失败:', AUTOLOAD_SRC)
    document.body.appendChild(s)

    return () => {
      s.remove()
      const widget = document.getElementById('live2d-widget')
      if (widget) widget.remove()
      const canvases = document.querySelectorAll('canvas[data-live2d]')
      canvases.forEach(c => c.remove())
    }
  }, [])

  // 看板娘由上面的 autoload 脚本自行渲染到页面右下角
  return null
}

export default Live2DWidget
