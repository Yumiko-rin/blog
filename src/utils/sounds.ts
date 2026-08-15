/**
 * 音效播放工具
 * 使用 Web Audio API 生成轻量级 UI 音效
 * 无需加载外部音频文件
 */

let audioCtx: AudioContext | null = null

function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem('sound-enabled') !== 'false'
  } catch {
    return true
  }
}

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

/** 播放点击音效（清脆的叮咚声） */
export function playClickSound() {
  if (!isSoundEnabled()) return
  try {
    const ctx = getAudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05)
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1)

    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.15)
  } catch {
    // 静默失败
  }
}

/** 播放悬停音效（轻柔的气泡声） */
export function playHoverSound() {
  if (!isSoundEnabled()) return
  try {
    const ctx = getAudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(1000, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.03)

    gain.gain.setValueAtTime(0.06, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.06)
  } catch {
    // 静默失败
  }
}

/** 播放展开音效（上升音） */
export function playExpandSound() {
  if (!isSoundEnabled()) return
  try {
    const ctx = getAudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(400, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.12)

    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.2)
  } catch {
    // 静默失败
  }
}

/** 播放切换音效（双音） */
export function playToggleSound() {
  if (!isSoundEnabled()) return
  try {
    const ctx = getAudioContext()

    // 第一个音
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(600, ctx.currentTime)
    gain1.gain.setValueAtTime(0.1, ctx.currentTime)
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
    osc1.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.08)

    // 第二个音（稍后）
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(900, ctx.currentTime + 0.06)
    gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.06)
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14)
    osc2.start(ctx.currentTime + 0.06)
    osc2.stop(ctx.currentTime + 0.14)
  } catch {
    // 静默失败
  }
}
