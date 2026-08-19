import type { SectionId } from '../../types'
import type { UpdateRequiredItem } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'

// Deliberately separate from My Work's own overdue/blocked grouping — this
// answers "what update do I owe," not "what task is late." An item can
// appear here even when its due date is still far off (a stale status, or
// an update someone explicitly asked for).
export function UpdatesRequiredWidget({
  items,
  onNavigateToSection,
}: {
  items: UpdateRequiredItem[]
  onNavigateToSection: (id: SectionId) => void
}) {
  return (
    <DashboardWidget
      title="Updates Required"
      description="Progress updates overdue, requested, or stale"
      loadState={items.length === 0 ? 'empty' : 'idle'}
      emptyMessage="Nothing needs an update right now."
    >
      <ul className="divide-y divide-slate-100">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 py-1.5 first:pt-0 last:pb-0">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-slate-800">{item.activityName}</div>
              <div className="truncate text-[11px] text-slate-500">{item.reason}</div>
            </div>
            <button
              type="button"
              onClick={() => item.destination && onNavigateToSection(item.destination)}
              disabled={!item.destination}
              className="shrink-0 whitespace-nowrap pt-0.5 text-[11px] font-medium text-blue-600 hover:text-blue-700 disabled:cursor-default disabled:text-slate-400"
            >
              Update {item.destination ? '→' : ''}
            </button>
          </li>
        ))}
      </ul>
    </DashboardWidget>
  )
}
