/**
 * 全局共享背景图片配置
 * --------------------------------------------------
 * 设置面板（BackgroundSettings）与动态背景（DynamicBackground）共用同一份数据。
 * 所有图片均为本地托管，避免外网源失效或 CORS 问题：
 *  - 前 6 张为 boke.hiromu.top 官方背景（已下载到 public/bg）
 *  - 后 5 张为二次元日漫萝莉风格背景（konachan.net 画师原创作品，非 AI 生成）
 */
export interface BgImage {
  id: number
  /** 高清原图，用于背景与设置预览 */
  url: string
  /** 小尺寸缩略图，用于设置网格，加载更快 */
  thumb: string
  label: string
}

export const BG_IMAGES: BgImage[] = [
  { id: 1,  url: '/bg/1.webp',          thumb: '/bg/1.webp',          label: '背景 1' },
  { id: 2,  url: '/bg/42.webp',         thumb: '/bg/42.webp',         label: '背景 2' },
  { id: 3,  url: '/bg/20.webp',         thumb: '/bg/20.webp',         label: '背景 3' },
  { id: 4,  url: '/bg/36.webp',         thumb: '/bg/36.webp',         label: '背景 4' },
  { id: 5,  url: '/bg/39.webp',         thumb: '/bg/39.webp',         label: '背景 5' },
  { id: 6,  url: '/bg/41.webp',         thumb: '/bg/41.webp',         label: '背景 6' },
  { id: 7,  url: '/bg/anime_01.jpg',    thumb: '/bg/anime_01.jpg',    label: '幻想花田' },
  { id: 8,  url: '/bg/anime_02.jpg',    thumb: '/bg/anime_02.jpg',    label: '樱花少女' },
  { id: 9,  url: '/bg/anime_03.jpg',    thumb: '/bg/anime_03.jpg',    label: '森林夕阳' },
  { id: 10, url: '/bg/anime_04.jpg',    thumb: '/bg/anime_04.jpg',    label: '白裙草地' },
  { id: 11, url: '/bg/anime_05.jpg',    thumb: '/bg/anime_05.jpg',    label: '猫娘夏日' },
]
