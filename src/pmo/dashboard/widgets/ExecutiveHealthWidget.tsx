import type { HealthLevel, ProjectHealthSnapshot } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { fmtDate } from './formatters'

const LEVEL_STYLES: Record<HealthLevel, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  neutral: 'bg-slate-100 text-slate-500 ring-slate-200',
}
const LEVEL_LABEL: Record<HealthLevel, string> = { green: 'Green', amber: 'Amber', red: 'Red', neutral: 'N/A' }

function HealthCell({ label, level, sublabel }: { label: string; level: HealthLevel; sublabel?: string }) {
  return (
    <div className="min-w-0 px-5 first:pl-0 last:pr-0">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 inline-flex items-center rounded px-2.5 py-1 text-sm font-bold uppercase ring-1 ring-inset ${LEVEL_STYLES[level]}`}>
        {LEVEL_LABEL[level]}
      </div>
      {sublabel && <div className="mt-1 text-[11px] text-slate-400">{sublabel}</div>}
    </div>
  )
}

// One row, five large badges — the "understand this in 5-10 seconds"
// requirement drives the bigger type here, unlike every other role's more
// compact health rollup. Still a compact strip, not stretched to fill the
// full-width card: cells sit at their own width with a thin divider
// between them instead of spreading five badges across the whole row.
export function ExecutiveHealthWidget({ health }: { health: ProjectHealthSnapshot }) {
  return (
    <DashboardWidget title="Executive Project Health" footer={`As of ${fmtDate(health.lastUpdated)}`}>
      <div className="flex flex-wrap divide-x divide-slate-100">
        <HealthCell label="Overall" level={health.overall.current} sublabel={`Previously: ${LEVEL_LABEL[health.overall.previous]}`} />
        <HealthCell label="Schedule" level={health.schedule.level} />
        <HealthCell label="Budget" level={health.budget.level} />
        <HealthCell label="Scope" level={health.scope.level} />
        <HealthCell label="Risk" level={health.risk.level} />
      </div>
    </DashboardWidget>
  )
}
