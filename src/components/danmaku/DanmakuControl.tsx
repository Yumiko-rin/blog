import { useState, useEffect } from 'react'
import { MessageSquareText, MessageSquareOff, ChevronUp, ChevronDown } from 'lucide-react'
import { useDanmakuStore } from '@/store/useDanmakuStore'
import { IconButton } from '@/components/atoms/IconButton'
import { Slider } from '@/components/atoms/Slider'

/**
 * 速度滑块的映射常量
 * store 中 speed 范围为 0.5~2，Slider 组件的 value 从 0 开始
 * 因此做偏移映射：sliderValue = speed - 0.5，max = 1.5
 */
const SLIDER_MAX = 1.5
const SPEED_MIN = 0.5

/** 速度档位标签 */
const SPEED_LABELS: Record<string, string> = {
  '0.5': '慢速',
  '1.0': '正常',
  '1.5': '快速',
  '2.0': '极速',
}

/**
 * 根据 speed 数值返回可读标签
 */
function getSpeedLabel(speed: number): string {
  const key = speed.toFixed(1)
  return SPEED_LABELS[key] ?? `${speed.toFixed(1)}x`
}

/**
 * DanmakuControl —— 弹幕开关与速度控制面板
 *
 * - 使用 useDanmakuStore 管理弹幕开关（enabled）和速度（speed）
 * - 一个开关按钮：开 / 关弹幕，用 MessageSquareText / MessageSquareOff 图标
 * - 可展开的速度滑块面板：用 Slider 原子组件，范围 0.5~2
 * - 毛玻璃小面板，固定在左下角
 * - 弹幕关闭时自动收起速度面板
 */
export function DanmakuControl() {
  const { enabled, speed, toggle, setSpeed } = useDanmakuStore()

  // 速度面板展开 / 收起状态
  const [expanded, setExpanded] = useState(false)

  // 弹幕关闭时自动收起面板
  useEffect(() => {
    if (!enabled) {
      setExpanded(false)
    }
  }, [enabled])

  // 滑块值映射：speed(0.5~2) → slider(0~1.5)
  const sliderValue = speed - SPEED_MIN

  const handleSliderChange = (value: number) => {
    setSpeed(value + SPEED_MIN)
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2">
      {/* 按钮组：弹幕开关 + 面板展开 */}
      <div className="flex items-center gap-2">
        {/* 弹幕开关按钮 */}
        <IconButton
          active={enabled}
          onClick={toggle}
          size="md"
          aria-label={enabled ? '关闭弹幕' : '开启弹幕'}
          title={enabled ? '弹幕：开' : '弹幕：关'}
          className="glass-strong shadow-lg shadow-black/10"
        >
          {enabled ? (
            <MessageSquareText size={18} />
          ) : (
            <MessageSquareOff size={18} className="opacity-70" />
          )}
        </IconButton>

        {/* 展开 / 收起速度面板按钮 */}
        <IconButton
          onClick={() => setExpanded((prev) => !prev)}
          size="sm"
          aria-label={expanded ? '收起速度面板' : '展开速度面板'}
          title="弹幕速度"
          className="glass-strong shadow-lg shadow-black/10"
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </IconButton>
      </div>

      {/* 速度控制面板（展开时显示） */}
      {expanded && (
        <div className="glass-strong rounded-2xl p-4 w-48 shadow-xl shadow-black/10 animate-fade-in">
          {/* 标题行：速度标签 + 当前倍率 */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium opacity-70">弹幕速度</span>
            <span className="text-xs font-bold text-accent">
              {getSpeedLabel(speed)}
            </span>
          </div>

          {/* 速度滑块 */}
          <Slider
            value={sliderValue}
            max={SLIDER_MAX}
            onChange={handleSliderChange}
            onChangeEnd={handleSliderChange}
            height={4}
          />

          {/* 档位刻度 */}
          <div className="mt-1.5 flex justify-between text-[10px] opacity-50">
            <span>慢</span>
            <span>快</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default DanmakuControl
