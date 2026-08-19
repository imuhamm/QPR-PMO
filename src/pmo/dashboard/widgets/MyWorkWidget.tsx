import type { SectionId } from '../../types'
import type { AssignmentPriority, AssignmentStatus, MyAssignment } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { fmtDate } from './formatters'

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  blocked: 'Blocked',
}
const STATUS_STYLES: Record<AssignmentStatus, string> = {
  'not-started': 'bg-slate-100 text-slate-500',
  'in-progress': 'bg-blue-50 text-blue-700',
  blocked: 'bg-rose-50 text-rose-700',
}
const PRIORITY_STYLES: Record<AssignmentPriority, string> = {
  high: 'bg-rose-50 text-rose-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-slate-100 text-slate-500',
}

const GROUP_LABEL: Record<MyAssignment['bucket'], string> = { overdue: 'Overdue', 'due-soon': 'Due Soon', later: 'Later' }
const GROUP_HEADING_TONE: Record<MyAssignment['bucket'], string> = {
  overdue: 'text-rose-600',
  'due-soon': 'text-amber-600',
  later: 'text-slate-400',
}

function AssignmentRow({ assignment, onNavigateToSection }: { assignment: MyAssignment; onNavigateToSection: (id: SectionId) => void }) {
  return (
    <li className="flex items-center gap-3 py-1.5 text-xs first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium text-slate-800">{assignment.name}</span>
          {assignment.priority && (
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${PRIORITY_STYLES[assignment.priority]}`}>
              {assignment.priority}
            </span>
          )}
        </div>
        {assignment.blockedReason && <div className="mt-0.5 truncate text-[11px] text-rose-500">{assignment.blockedReason}</div>}
      </div>

      <span className="hidden w-24 shrink-0 items-center gap-1.5 sm:flex">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <span className="block h-full rounded-full bg-blue-500" style={{ width: `${assignment.progressPct}%` }} />
        </span>
        <span className="w-7 shrink-0 text-right text-[10px] text-slate-400">{assignment.progressPct}%</span>
      </span>

      <span className={`hidden w-20 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-medium leading-none sm:inline-block ${STATUS_STYLES[assignment.status]}`}>
        {STATUS_LABEL[assignment.status]}
      </span>

      <span className="w-14 shrink-0 text-right text-[11px] text-slate-400">{fmtDate(assignment.dueDate)}</span>

      <button
        type="button"
        onClick={() => assignment.destination && onNavigateToSection(assignment.destination)}
        disabled={!assignment.destination}
        className="shrink-0 whitespace-nowrap text-[11px] font-medium text-blue-600 hover:text-blue-700 disabled:cursor-default disabled:text-slate-400"
      >
        Open {assignment.destination ? '→' : ''}
      </button>
    </li>
  )
}

// The primary Project Member widget — grouped Overdue / Due Soon / Later,
// same ordering as the mental model ("what's late, what's next, what's
// coming"). Only "Open" is wired as an action: the real Schedule data
// model (ActivityRow) has no progress/status/note fields or mutation
// functions to update them, so this deliberately doesn't fabricate
// update-progress/update-status/add-note controls that don't exist
// anywhere else in the app.
export function MyWorkWidget({
  assignments,
  onNavigateToSection,
}: {
  assignments: MyAssignment[]
  onNavigateToSection: (id: SectionId) => void
}) {
  const groups: MyAssignment['bucket'][] = ['overdue', 'due-soon', 'later']

  return (
    <DashboardWidget title="My Work" loadState={assignments.length === 0 ? 'empty' : 'idle'} emptyMessage="No assignments right now.">
      <div className="space-y-4">
        {groups.map((bucket) => {
          const items = assignments.filter((a) => a.bucket === bucket)
          if (items.length === 0) return null
          return (
            <div key={bucket}>
              <div className={`text-[10px] font-semibold uppercase tracking-wide ${GROUP_HEADING_TONE[bucket]}`}>
                {GROUP_LABEL[bucket]} ({items.length})
              </div>
              <ul className="mt-1 divide-y divide-slate-100">
                {items.map((a) => (
                  <AssignmentRow key={a.id} assignment={a} onNavigateToSection={onNavigateToSection} />
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </DashboardWidget>
  )
}
