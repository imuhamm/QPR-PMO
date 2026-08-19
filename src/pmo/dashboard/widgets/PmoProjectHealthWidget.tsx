import type { ProjectDashboardData } from '../data/dashboardModels'
import { DashboardWidget, WidgetStatusBadge } from './DashboardWidget'
import { fmtDate } from './formatters'

// PMO Office's "is this project performing well" lens — the same rollup a
// Project Manager sees (ProjectHealthSummaryWidget), but widened to Scope
// and Resource since the PMO tracks all delivery domains, not just the
// four a single Project Manager's view leads with. Governance deliberately
// stays out of this widget — see GovernanceHealthWidget for the PMO's other
// question ("is this project being run the way it's supposed to be").
export function PmoProjectHealthWidget({ data }: { data: ProjectDashboardData }) {
  const { health, progress } = data

  const domains = [
    { id: 'schedule', label: 'Schedule', domain: health.schedule },
    { id: 'budget', label: 'Budget', domain: health.budget },
    { id: 'scope', label: 'Scope', domain: health.scope },
    { id: 'risk', label: 'Risk', domain: health.risk },
    // "where supported" — omitted entirely, not shown as Not Available, when a deployment hasn't modeled Resource health.
    ...(health.resource ? [{ id: 'resource', label: 'Resource', domain: health.resource }] : []),
  ]

  return (
    <DashboardWidget
      title="Overall Project Health"
      description="Performance health — see Governance Health for compliance"
      footer={`Last updated ${fmtDate(health.lastUpdated)} · ${progress.reportingPeriod}`}
    >
      <div className="flex flex-wrap divide-x divide-slate-100">
        <div className="min-w-0 px-4 first:pl-0 last:pr-0">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Overall</div>
          <div className="mt-1">
            <WidgetStatusBadge value={{ level: health.overall.current }} />
          </div>
          <div className="mt-1 truncate text-[10px] text-slate-400">{health.overall.changeLabel}</div>
        </div>
        {domains.map((d) => (
          <div key={d.id} className="min-w-0 px-4 first:pl-0 last:pr-0">
            <div className="text-[10px] uppercase tracking-wide text-slate-400">{d.label}</div>
            <div className="mt-1">
              <WidgetStatusBadge value={d.domain} />
            </div>
            {d.domain.note && <div className="mt-1 max-w-[160px] truncate text-[10px] text-slate-400">{d.domain.note}</div>}
          </div>
        ))}
      </div>
    </DashboardWidget>
  )
}
