import type { ProjectLifecycleStatus } from '../types'

// Single source of truth for how a Project's lifecycle status renders,
// wherever it appears (Register table, Project header). Adding a status
// later is one entry here, not a change anywhere it's displayed.
const STATUS_STYLES: Record<ProjectLifecycleStatus, string> = {
  Draft: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  'Pending Approval': 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200',
  Submitted: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
  Active: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  'On Hold': 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
  Closed: 'bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200',
}

export function ProjectStatusBadge({ status }: { status: ProjectLifecycleStatus }) {
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium leading-none ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  )
}
