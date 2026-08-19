import type { MilestoneStatus, MyMilestone } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { fmtDate } from './formatters'

const STATUS_STYLES: Record<MilestoneStatus, string> = {
  completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  'on-track': 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  'at-risk': 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  delayed: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
  'not-started': 'bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200',
}
const STATUS_LABEL: Record<MilestoneStatus, string> = {
  completed: 'Completed',
  'on-track': 'On Track',
  'at-risk': 'At Risk',
  delayed: 'Delayed',
  'not-started': 'Not Started',
}
const RELEVANCE_LABEL: Record<MyMilestone['relevance'], string> = { owned: 'Owned by me', 'feeds-into': 'Feeds into my work' }

// Only milestones relevant to this member — either they own it, or their
// own work gates it without owning it (relevance: 'feeds-into') — never
// the project's full milestone list.
export function MyMilestonesWidget({ milestones }: { milestones: MyMilestone[] }) {
  return (
    <DashboardWidget
      title="My Upcoming Milestones"
      loadState={milestones.length === 0 ? 'empty' : 'idle'}
      emptyMessage="No milestones relevant to your work right now."
    >
      <ul className="divide-y divide-slate-100">
        {milestones.map((m) => (
          <li key={m.id} className="py-1.5 text-xs first:pt-0 last:pb-0">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{m.name}</span>
              <span className="shrink-0 text-[11px] text-slate-400">{fmtDate(m.dueDate)}</span>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${STATUS_STYLES[m.status]}`}>
                {STATUS_LABEL[m.status]}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">{RELEVANCE_LABEL[m.relevance]}</div>
          </li>
        ))}
      </ul>
    </DashboardWidget>
  )
}
