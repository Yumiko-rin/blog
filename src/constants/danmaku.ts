import type { DanmakuItem } from '@/types'

/**
 * 弹幕固定文案库：二次元萝莉 / 猫娘风格语录
 * 随机抽取，不涉及敏感内容
 */
export const DANMAKU_MESSAGES: string[] = [
  '主人主人～欢迎回来喵！',
  '今天也要元气满满哦 (｡･ω･｡)ﾉ♡',
  '喵～听听这首歌好不好听呀？',
  '咕噜咕噜…肚子饿啦喵',
  ' nya～写博客好辛苦，休息一下吧',
  '夜晚的星光和音乐最配啦✨',
  '本喵会一直陪着主人的喵～',
  '听说点赞的都会变欧皇哦！',
  '呼噜噜…猫猫打盹中 zzz',
  '音乐响起来，尾巴摇起来喵～',
  '主人写的文章真棒呀！夸夸～',
  '萝莉控不是变态喵！(｀ε´)',
  '雨天和博客更配哦～',
  '今天的代码没有 bug，是奇迹喵！',
  '摇摇尾巴，烦恼走掉～',
  '在这里留言，本喵会回复的喵～',
  '星光不问赶路人，时光不负喵',
  '听歌的时候世界都温柔了呢',
  '踩着节拍，跳一支猫步舞～',
  '愿主人被世界温柔以待喵♡',
]

/** 弹幕随机颜色池（柔和二次元色） */
export const DANMAKU_COLORS: string[] = [
  '#ff7eb6',
  '#7eb6ff',
  '#b6ff7e',
  '#ffb67e',
  '#c67eff',
  '#7effe0',
  '#ffe07e',
]

/** 弹幕默认速度（px/s） */
export const DANMAKU_DEFAULT_SPEED = 80
/** 弹幕最大轨道数 */
export const DANMAKU_MAX_TRACKS = 6
/** 弹幕生成间隔（ms） */
export const DANMAKU_INTERVAL = 2000

/** 随机生成一条弹幕 */
export function createDanmaku(
  id: number,
  speed: number,
  maxTracks: number = DANMAKU_MAX_TRACKS
): DanmakuItem {
  const text = DANMAKU_MESSAGES[Math.floor(Math.random() * DANMAKU_MESSAGES.length)]
  const color = DANMAKU_COLORS[Math.floor(Math.random() * DANMAKU_COLORS.length)]
  return {
    id,
    text,
    track: Math.floor(Math.random() * maxTracks),
    color,
    speed,
  }
}
