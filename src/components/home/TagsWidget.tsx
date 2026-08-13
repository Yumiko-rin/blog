import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ALL_TAGS } from '@/data/articles'

/**
 * TagsWidget 标签云小部件
 */
export function TagsWidget() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="widget-card">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-md bg-accent" />
          <span className="text-sm font-bold text-[rgb(var(--text-primary))]">标签</span>
        </div>
        {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
      {!collapsed && (
        <div className="px-3 pb-3 flex flex-wrap gap-1.5">
          {ALL_TAGS.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full bg-accent/8 text-accent text-[11px] font-medium
                border border-accent/10 hover:bg-accent/15 hover:border-accent/25 transition-colors cursor-pointer"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default TagsWidget
