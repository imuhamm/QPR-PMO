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

// Column tracks size to their own content instead of stretching to fill
// whatever width the card happens to have — a fixed `1fr` grid put huge gaps
// between a handful of small stats on any wide card. Literal per-count
// classes (not a template-literal `grid-cols-${n}`) so Tailwind's JIT
// scanner can see them.
const GRID_COLS: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-[repeat(2,minmax(0,max-content))]',
  3: 'grid-cols-[repeat(3,minmax(0,max-content))]',
  4: 'grid-cols-[repeat(4,minmax(0,max-content))]',
}

// Small labeled-number grid — the shape most exception/count widgets in
// this dashboard share (Schedule Exceptions, Team/Workload, Change
// Requests, Risks & Issues). A cell is drillable when `onClick` is given;
// otherwise it's a plain stat.
export function StatGrid({ items, columns = 3 }: { items: StatGridItem[]; columns?: 2 | 3 | 4 }) {
  return (
    <div className={`grid ${GRID_COLS[columns]} gap-x-8 gap-y-2.5`}>
      {items.map((item) => {
        const content = (
          <>
            <div className="max-w-[160px] truncate text-[10px] uppercase tracking-wide text-slate-400">{item.label}</div>
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
