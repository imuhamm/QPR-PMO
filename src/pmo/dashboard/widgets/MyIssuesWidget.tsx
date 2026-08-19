import type { AttentionSeverity, MyIssue } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'

const SEVERITY_DOT: Record<AttentionSeverity, string> = {
  critical: 'bg-rose-600',
  high: 'bg-rose-400',
  medium: 'bg-amber-500',
  low: 'bg-slate-400',
}

// Only issues assigned to or relevant to this member — never the
// project's full Issues register.
export function MyIssuesWidget({ issues }: { issues: MyIssue[] }) {
  return (
    <DashboardWidget
      title="My Blockers / Issues"
      loadState={issues.length === 0 ? 'empty' : 'idle'}
      emptyMessage="No open issues assigned to you."
    >
      <ul className="divide-y divide-slate-100">
        {issues.map((issue) => (
          <li key={issue.id} className="flex items-start gap-2 py-1.5 first:pt-0 last:pb-0">
            <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_DOT[issue.severity]}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-slate-800">{issue.title}</div>
              {issue.description && <div className="truncate text-[11px] text-slate-500">{issue.description}</div>}
            </div>
            <span className="shrink-0 pt-0.5 text-[11px] text-slate-400">{issue.ageDays}d open</span>
          </li>
        ))}
      </ul>
    </DashboardWidget>
  )
}
