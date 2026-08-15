import type { DashboardMilestone, MilestoneStatus } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { fmtDate, fmtSigned } from './formatters'

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

// Compact list, not a Gantt — baseline → forecast with the variance called
// out is enough to see what moved without a timeline visualization.
// `title`/`emptyMessage` are overridable so this same row rendering serves
// Program Manager's pre-filtered "Program-Relevant Milestones" too.
export function MilestoneTimelineWidget({
  milestones,
  title = 'Upcoming / Critical Milestones',
  emptyMessage,
}: {
  milestones: DashboardMilestone[]
  title?: string
  emptyMessage?: string
}) {
  const upcoming = milestones.slice(0, 5)

  return (
    <DashboardWidget title={title} loadState={upcoming.length === 0 ? 'empty' : 'idle'} emptyMessage={emptyMessage}>
      <ul className="divide-y divide-slate-100">
        {upcoming.map((m) => (
          <li key={m.id} className="flex items-center gap-2 py-1.5 text-xs first:pt-0 last:pb-0">
            <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{m.name}</span>
            <span className="hidden shrink-0 text-[11px] text-slate-400 sm:inline">
              {fmtDate(m.baselineDate)} → {fmtDate(m.forecastDate)}
            </span>
            <span
              className={`w-14 shrink-0 text-right text-[11px] font-medium ${
                m.varianceDays > 0 ? 'text-rose-600' : m.varianceDays < 0 ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              {m.varianceDays === 0 ? 'On time' : `${fmtSigned(m.varianceDays)}d`}
            </span>
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${STATUS_STYLES[m.status]}`}>
              {STATUS_LABEL[m.status]}
            </span>
          </li>
        ))}
      </ul>
    </DashboardWidget>
  )
}
