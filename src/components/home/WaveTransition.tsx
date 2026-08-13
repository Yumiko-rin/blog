/**
 * WaveTransition 波浪过渡
 * 对齐 qwq.sigrika.cc 的「水波纹」效果：
 * - 多层 gentle-wave <use> 叠加视差动画，营造海浪般流动感
 * - 颜色使用站点背景色（--bg-primary），与下方内容无缝衔接
 */
export function WaveTransition() {
  return (
    <div className="absolute bottom-0 left-0 w-full z-10 pointer-events-none translate-y-px waves-wrap">
      <svg
        className="waves-svg"
        viewBox="0 24 150 28"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <path
            id="gentle-wave"
            d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v48h-352z"
          />
        </defs>
        <g className="parallax">
          <use
            xlinkHref="#gentle-wave"
            x="48"
            y="0"
            className="opacity-25 fill-[rgb(var(--bg-primary))]"
          />
          <use
            xlinkHref="#gentle-wave"
            x="48"
            y="3"
            className="opacity-50 fill-[rgb(var(--bg-primary))]"
          />
          <use
            xlinkHref="#gentle-wave"
            x="48"
            y="5"
            className="opacity-65 fill-[rgb(var(--bg-primary))]"
          />
          <use
            xlinkHref="#gentle-wave"
            x="48"
            y="7"
            className="opacity-80 fill-[rgb(var(--bg-primary))]"
          />
        </g>
      </svg>
    </div>
  )
}

export default WaveTransition
