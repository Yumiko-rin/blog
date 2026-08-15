/**
 * z-index 层级常量
 * 统一管理全站 z-index，避免层叠冲突
 *
 * 层级说明：
 * - BACKGROUND:  背景层 (-10)
 * - BASE:        内容基础层 (10-20)
 * - SIDEBAR:     侧边栏/抽屉 (30-40)
 * - FLOATING:    浮动 UI 元素 - Header/Toolbox/Toast/Modal (50)
 * - DRAWER:      移动端抽屉 (55-60)
 * - LIGHTBOX:    图片灯箱/全屏遮罩 (9999)
 * - LOADING:     加载动画全覆盖 (99999)
 */
export const Z = {
  BACKGROUND: -10,
  BASE: 10,
  CONTENT: 20,
  SIDEBAR: 30,
  OVERLAY: 40,
  FLOATING: 50,
  DRAWER_MASK: 55,
  DRAWER: 58,
  DRAWER_BUTTON: 60,
  LIGHTBOX: 9999,
  READING_PROGRESS: 10001,
  LOADING: 99999,
} as const
