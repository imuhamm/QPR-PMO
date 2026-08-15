import type { ProjectDependency } from '../data/dashboardModels'
import { DashboardWidget, WidgetStatusBadge } from './DashboardWidget'
import { fmtDate } from './formatters'

function DependencyRow({ dep }: { dep: ProjectDependency }) {
  return (
    <li className="flex items-start gap-2 py-1.5 first:pt-0 last:pb-0">
      <WidgetStatusBadge value={{ level: dep.status }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-slate-800">
          {dep.description} <span className="font-normal text-slate-400">— {dep.counterpart}</span>
        </div>
        {dep.impact && <div className="truncate text-[11px] text-slate-500">{dep.impact}</div>}
      </div>
      {dep.dueDate && <span className="shrink-0 pt-0.5 text-[11px] text-slate-400">{fmtDate(dep.dueDate)}</span>}
    </li>
  )
}

function DependencySection({ title, items }: { title: string; items: ProjectDependency[] }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{title}</div>
      {items.length === 0 ? (
        <div className="py-1.5 text-[11px] text-slate-400">None</div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((dep) => (
            <DependencyRow key={dep.id} dep={dep} />
          ))}
        </ul>
      )}
    </div>
  )
}

// Incoming (what this Project needs from others) and Outgoing (what other
// projects need from this one) are kept visually separate, per the
// Program Manager's "which direction is the problem in" mental model.
// `onlyProblems` narrows both sections to non-green dependencies for the
// more exception-oriented Operational view; Analytical shows the full picture.
export function DependenciesWidget({ dependencies, onlyProblems }: { dependencies: ProjectDependency[]; onlyProblems?: boolean }) {
  const filtered = onlyProblems ? dependencies.filter((d) => d.status !== 'green') : dependencies
  const incoming = filtered.filter((d) => d.direction === 'incoming')
  const outgoing = filtered.filter((d) => d.direction === 'outgoing')

  return (
    <DashboardWidget
      title={onlyProblems ? 'Dependency Problems' : 'Cross-Project Dependencies'}
      loadState={filtered.length === 0 ? 'empty' : 'idle'}
      emptyMessage="No dependency issues right now."
    >
      <div className="space-y-3">
        <DependencySection title="Incoming" items={incoming} />
        <DependencySection title="Outgoing" items={outgoing} />
      </div>
    </DashboardWidget>
  )
}
