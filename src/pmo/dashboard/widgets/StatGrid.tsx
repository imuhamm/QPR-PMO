import type { ReactNode } from 'react'

export interface StatGridItem {
  id: string
  label: string
  value?: string | number
  /** Escape hatch for a non-numeric cell (e.g. a health badge) — overrides `value` when set. */
  valueNode?: ReactNode
  tone?: 'neutral' | 'positive' | 'warning' | 'danger'
  onClick?: () => void
}

const TONE_CLASS: Record<NonNullable<StatGridItem['tone']>, string> = {
  neutral: 'text-slate-800',
  positive: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-rose-600',
}

// Small labeled-number grid — the shape most exception/count widgets in
// this dashboard share (Schedule Exceptions, Team/Workload, Change
// Requests, Risks & Issues). A cell is drillable when `onClick` is given;
// otherwise it's a plain stat.
export function StatGrid({ items, columns = 3 }: { items: StatGridItem[]; columns?: 2 | 3 | 4 }) {
  const colsClass = columns === 2 ? 'grid-cols-2' : columns === 4 ? 'grid-cols-4' : 'grid-cols-3'
  return (
    <div className={`grid ${colsClass} gap-x-3 gap-y-2.5`}>
      {items.map((item) => {
        const content = (
          <>
            <div className="truncate text-[10px] uppercase tracking-wide text-slate-400">{item.label}</div>
            <div className={`mt-0.5 text-sm font-semibold ${TONE_CLASS[item.tone ?? 'neutral']}`}>
              {item.valueNode ?? item.value}
            </div>
          </>
        )
        if (item.onClick) {
          return (
            <button key={item.id} type="button" onClick={item.onClick} className="min-w-0 rounded text-left hover:bg-slate-50">
              {content}
            </button>
          )
        }
        return (
          <div key={item.id} className="min-w-0">
            {content}
          </div>
        )
      })}
    </div>
  )
}
