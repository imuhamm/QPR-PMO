import type { ProjectDashboardData } from '../data/dashboardModels'
import { DashboardWidget, WidgetStatusBadge } from './DashboardWidget'
import type { WidgetStatus } from './DashboardWidget'
import { fmtDate, fmtSigned } from './formatters'

function HealthStat({ label, status, sublabel }: { label: string; status: WidgetStatus; sublabel?: string }) {
  return (
    <div className="min-w-0 px-4 first:pl-0 last:pr-0">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1">
        <WidgetStatusBadge value={status} />
      </div>
      {sublabel && <div className="mt-1 truncate text-[10px] text-slate-400">{sublabel}</div>}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'neutral' | 'positive' | 'danger' }) {
  const toneClass = tone === 'positive' ? 'text-emerald-600' : tone === 'danger' ? 'text-rose-600' : 'text-slate-800'
  return (
    <div className="min-w-0 px-4 first:pl-0 last:pr-0">
      <div className="truncate text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${toneClass}`}>{value}</div>
    </div>
  )
}

// A compact status strip, not four/eight sparse grid cells stretched across
// the widget's full-width column — each stat sits at its own natural width
// with a thin divider between it and the next, so the row is only as wide
// as its content and leftover space collects once at the end, not between
// every value.
export function ProjectHealthSummaryWidget({ data }: { data: ProjectDashboardData }) {
  const { health, progress, forecast } = data

  return (
    <DashboardWidget title="Project Health Summary" footer={`Last updated ${fmtDate(health.lastUpdated)} · ${progress.reportingPeriod}`}>
      <div className="flex flex-wrap divide-x divide-slate-100">
        <HealthStat label="Overall" status={{ level: health.overall.current }} sublabel={health.overall.changeLabel} />
        <HealthStat label="Schedule" status={health.schedule} />
        <HealthStat label="Budget" status={health.budget} />
        <HealthStat label="Risk" status={health.risk} />
      </div>

      <div className="mt-3 flex flex-wrap divide-x divide-slate-100 border-t border-slate-100 pt-3">
        <Stat label="Actual Progress" value={`${progress.actualPct.current}%`} />
        <Stat label="Planned Progress" value={`${progress.plannedPct}%`} />
        <Stat
          label="Progress Variance"
          value={`${fmtSigned(progress.variancePct)} pts`}
          tone={progress.variancePct < 0 ? 'danger' : progress.variancePct > 0 ? 'positive' : 'neutral'}
        />
        <Stat
          label="Forecast Variance"
          value={`${fmtSigned(forecast.varianceDays)}d`}
          tone={forecast.varianceDays > 0 ? 'danger' : forecast.varianceDays < 0 ? 'positive' : 'neutral'}
        />
      </div>
    </DashboardWidget>
  )
}
