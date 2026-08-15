import type { ProjectDashboardData } from '../data/dashboardModels'
import { DashboardWidget, WidgetStatusBadge } from './DashboardWidget'
import { fmtDate, fmtSigned } from './formatters'

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'neutral' | 'positive' | 'danger' }) {
  const toneClass = tone === 'positive' ? 'text-emerald-600' : tone === 'danger' ? 'text-rose-600' : 'text-slate-800'
  return (
    <div className="min-w-0">
      <div className="truncate text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${toneClass}`}>{value}</div>
    </div>
  )
}

// One dense widget, not four/eight separate cards — the whole "what's my
// project's status" answer in a single glance.
export function ProjectHealthSummaryWidget({ data }: { data: ProjectDashboardData }) {
  const { health, progress, forecast } = data

  return (
    <DashboardWidget title="Project Health Summary" footer={`Last updated ${fmtDate(health.lastUpdated)} · ${progress.reportingPeriod}`}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Overall</div>
          <div className="mt-1">
            <WidgetStatusBadge value={{ level: health.overall.current }} />
          </div>
          <div className="mt-1 text-[10px] text-slate-400">{health.overall.changeLabel}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Schedule</div>
          <div className="mt-1">
            <WidgetStatusBadge value={health.schedule} />
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Budget</div>
          <div className="mt-1">
            <WidgetStatusBadge value={health.budget} />
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Risk</div>
          <div className="mt-1">
            <WidgetStatusBadge value={health.risk} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-3 sm:grid-cols-4">
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
