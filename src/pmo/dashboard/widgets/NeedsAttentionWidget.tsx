import { useState } from 'react'
import type { SectionId } from '../../types'
import type { AttentionItem, AttentionSeverity } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { fmtDate } from './formatters'

const SEVERITY_RANK: Record<AttentionSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 }
const SEVERITY_DOT: Record<AttentionSeverity, string> = {
  critical: 'bg-rose-600',
  high: 'bg-rose-400',
  medium: 'bg-amber-500',
  low: 'bg-slate-400',
}

const DEFAULT_VISIBLE = 5

// Every row reads as Object → problem (the title, which already carries
// both — "Development Complete milestone delayed 17 days") → Impact (the
// line under it) → Action (the button, wired to the same tab-navigation
// the rest of Project Details already uses). Sorted worst-first so the
// default-visible slice is the highest-priority exceptions, not just the
// first N in data order.
//
// Reused across roles for any curated AttentionItem list, not just the
// Project Manager's own inbox — Program Manager's "Risks Requiring Program
// Intervention" and "Decisions Required" are the same component over a
// pre-filtered `items` array with their own title/description/emptyMessage.
export function NeedsAttentionWidget({
  items,
  onNavigateToSection,
  title = 'Needs My Attention',
  description,
  emptyMessage = 'Nothing needs your attention right now.',
}: {
  items: AttentionItem[]
  onNavigateToSection: (id: SectionId) => void
  title?: string
  description?: string
  emptyMessage?: string
}) {
  const [showAll, setShowAll] = useState(false)
  const sorted = [...items].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
  const visible = showAll ? sorted : sorted.slice(0, DEFAULT_VISIBLE)

  return (
    <DashboardWidget
      title={title}
      description={description ?? `${items.length} item${items.length === 1 ? '' : 's'} across Schedule, Risks, Approvals, and more`}
      loadState={items.length === 0 ? 'empty' : 'idle'}
      emptyMessage={emptyMessage}
    >
      <ul className="divide-y divide-slate-100">
        {visible.map((item) => (
          <li key={item.id} className="flex items-start gap-2 py-1.5 first:pt-0 last:pb-0">
            <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_DOT[item.severity]}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-slate-800">{item.title}</div>
              {item.impact && <div className="truncate text-[11px] text-slate-500">{item.impact}</div>}
            </div>
            {item.dueDate && <span className="shrink-0 pt-0.5 text-[11px] text-slate-400">{fmtDate(item.dueDate)}</span>}
            <button
              type="button"
              onClick={() => item.destination && onNavigateToSection(item.destination)}
              disabled={!item.destination}
              className="shrink-0 whitespace-nowrap pt-0.5 text-[11px] font-medium text-blue-600 hover:text-blue-700 disabled:cursor-default disabled:text-slate-400 disabled:hover:text-slate-400"
            >
              {item.actionLabel ?? 'Review'} {item.destination ? '→' : ''}
            </button>
          </li>
        ))}
      </ul>
      {sorted.length > DEFAULT_VISIBLE && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 text-[11px] font-medium text-blue-600 hover:text-blue-700"
        >
          {showAll ? 'Show less' : `View all (${sorted.length})`}
        </button>
      )}
    </DashboardWidget>
  )
}
