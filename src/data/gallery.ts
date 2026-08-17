/**
 * 画廊静态种子数据（内置相册）
 * --------------------------------------------------
 * 用途：
 *   1) 前台 Gallery 的静态兜底相册
 *   2) 后台「画廊管理」首次初始化时的种子数据（导入后可管理/删除/编辑）
 * 与 scripts/export-seeds.cjs 配合：生成 server/seed/gallery.json（本地后端）与
 * functions/seed/gallery.ts（线上后端）时以此文件为唯一来源。
 */

export interface GalleryPhoto {
  id: string
  url: string
  caption: string
  orientation: 'portrait' | 'landscape'
}

export interface GalleryAlbum {
  id: number | string
  title: string
  photos: GalleryPhoto[]
  updatedAt: string
}

/** 静态相册原始定义（id/标题/日期/照片说明与方向） */
type RawAlbum = Omit<GalleryAlbum, 'photos'> & { photos: Omit<GalleryPhoto, 'url'>[] }
const RAW_ALBUMS: RawAlbum[] = [
  {
    id: 2,
    title: '风景写真',
    updatedAt: '2026-05-26',
    photos: [
      { id: 'p1', caption: '山间晨雾', orientation: 'portrait' },
      { id: 'p2', caption: '湖畔夕照', orientation: 'portrait' },
      { id: 'p3', caption: '林间小径', orientation: 'portrait' },
      { id: 'p4', caption: '云海翻涌', orientation: 'portrait' },
      { id: 'p5', caption: '花田漫步', orientation: 'portrait' },
      { id: 'p6', caption: '溪水潺潺', orientation: 'portrait' },
      { id: 'p7', caption: '远山如黛', orientation: 'portrait' },
      { id: 'p8', caption: '星空露营', orientation: 'portrait' },
    ],
  },
  {
    id: 3,
    title: '日常记录',
    updatedAt: '2026-05-08',
    photos: [
      { id: 'p9', caption: '午后咖啡', orientation: 'landscape' },
      { id: 'p10', caption: '街角偶遇', orientation: 'landscape' },
      { id: 'p11', caption: '窗边读书', orientation: 'landscape' },
      { id: 'p12', caption: '雨后初晴', orientation: 'landscape' },
      { id: 'p13', caption: '厨房时光', orientation: 'landscape' },
      { id: 'p14', caption: '黄昏散步', orientation: 'landscape' },
      { id: 'p15', caption: '周末集市', orientation: 'landscape' },
      { id: 'p16', caption: '夜深人静', orientation: 'landscape' },
    ],
  },
  {
    id: 4,
    title: '旅行足迹',
    updatedAt: '2026-05-10',
    photos: [
      { id: 'p17', caption: '古镇晨曦', orientation: 'landscape' },
      { id: 'p18', caption: '海边日落', orientation: 'landscape' },
      { id: 'p19', caption: '山城夜景', orientation: 'landscape' },
      { id: 'p20', caption: '田园风光', orientation: 'landscape' },
      { id: 'p21', caption: '寺院钟声', orientation: 'landscape' },
      { id: 'p22', caption: '雪山远眺', orientation: 'landscape' },
      { id: 'p23', caption: '渔港黄昏', orientation: 'landscape' },
      { id: 'p24', caption: '荒野公路', orientation: 'landscape' },
    ],
  },
  {
    id: 5,
    title: '季节物语',
    updatedAt: '2026-08-15',
    photos: [
      { id: 'p25', caption: '春樱初绽', orientation: 'landscape' },
      { id: 'p26', caption: '夏空万里', orientation: 'portrait' },
      { id: 'p27', caption: '秋叶静美', orientation: 'portrait' },
      { id: 'p28', caption: '冬雪皑皑', orientation: 'portrait' },
      { id: 'p29', caption: '花火大会', orientation: 'landscape' },
      { id: 'p30', caption: '星空之下', orientation: 'portrait' },
      { id: 'p31', caption: '夕阳无限', orientation: 'portrait' },
      { id: 'p32', caption: '朝雾微凉', orientation: 'portrait' },
    ],
  },
  {
    id: 6,
    title: '城市印象',
    updatedAt: '2026-08-15',
    photos: [
      { id: 'p33', caption: '霓虹闪烁', orientation: 'portrait' },
      { id: 'p34', caption: '都市黄昏', orientation: 'landscape' },
      { id: 'p35', caption: '街角一隅', orientation: 'landscape' },
      { id: 'p36', caption: '高楼林立', orientation: 'landscape' },
      { id: 'p37', caption: '雨夜街灯', orientation: 'landscape' },
      { id: 'p38', caption: '夕阳余晖', orientation: 'portrait' },
      { id: 'p39', caption: '建筑之美', orientation: 'portrait' },
      { id: 'p40', caption: '繁华尽头', orientation: 'landscape' },
    ],
  },
]

const IMAGES_PER_ALBUM = 8

/** 填充图片 URL 的静态相册（与前台 Gallery 的 getPhotoUrl 规则一致） */
export const GALLERY_ALBUMS: GalleryAlbum[] = RAW_ALBUMS.map((album) => ({
  ...album,
  photos: album.photos.map((photo, idx) => ({
    ...photo,
    url: `/img/gallery/album${album.id}_${(idx % IMAGES_PER_ALBUM) + 1}.jpg?v=7`,
  })),
}))

/** 与旧版 Gallery.tsx 保持兼容的导出名 */
export const STATIC_ALBUMS: GalleryAlbum[] = GALLERY_ALBUMS
