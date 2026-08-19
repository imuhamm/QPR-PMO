import type { MyDependencyItem } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { fmtDate } from './formatters'

function DependencyRow({ item }: { item: MyDependencyItem }) {
  return (
    <li className="py-1.5 text-xs first:pt-0 last:pb-0">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{item.description}</span>
        {item.dueDate && <span className="shrink-0 text-[11px] text-slate-400">{fmtDate(item.dueDate)}</span>}
      </div>
      <div className="mt-0.5 truncate text-[11px] text-slate-500">
        {item.counterpart}
        {item.impact ? ` — ${item.impact}` : ''}
      </div>
    </li>
  )
}

// Plain-language "Waiting On" / "Blocking" framing instead of the
// dependency graph Program Manager's own Cross-Project Dependencies widget
// exposes — a Project Member needs to know what's stalling them and who's
// stalled on them, not navigate the graph itself.
export function MyDependenciesWidget({ dependencies }: { dependencies: MyDependencyItem[] }) {
  const waitingOn = dependencies.filter((d) => d.direction === 'waiting-on')
  const blocking = dependencies.filter((d) => d.direction === 'blocking')

  return (
    <DashboardWidget
      title="Dependencies Affecting My Work"
      loadState={dependencies.length === 0 ? 'empty' : 'idle'}
      emptyMessage="Nothing else is waiting on or blocking your work right now."
    >
      {waitingOn.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">Waiting On</div>
          <ul className="mt-1 divide-y divide-slate-100">
            {waitingOn.map((d) => (
              <DependencyRow key={d.id} item={d} />
            ))}
          </ul>
        </div>
      )}
      {blocking.length > 0 && (
        <div className={waitingOn.length > 0 ? 'mt-3' : undefined}>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-rose-600">Blocking</div>
          <ul className="mt-1 divide-y divide-slate-100">
            {blocking.map((d) => (
              <DependencyRow key={d.id} item={d} />
            ))}
          </ul>
        </div>
      )}
    </DashboardWidget>
  )
}
