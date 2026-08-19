import type { ProjectForecast, ProjectProgress } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { StatGrid } from './StatGrid'
import type { StatGridItem } from './StatGrid'
import { fmtDate, fmtSigned } from './formatters'

// Combines ProjectProgress and ProjectForecast — Project Manager's own
// Progress vs Plan (a trend chart) and Schedule Variance widgets show these
// separately; the Executive lens wants both in one glance instead.
export function ExecutiveProgressForecastWidget({ progress, forecast }: { progress: ProjectProgress; forecast: ProjectForecast }) {
  const items: StatGridItem[] = [
    { id: 'actual', label: 'Actual Progress', value: `${progress.actualPct.current}%` },
    { id: 'planned', label: 'Planned Progress', value: `${progress.plannedPct}%` },
    { id: 'baseline-finish', label: 'Baseline Completion', value: fmtDate(forecast.baselineFinish) },
    {
      id: 'forecast-finish',
      label: 'Current Forecast',
      value: fmtDate(forecast.forecastFinish.current),
      tone: forecast.varianceDays > 0 ? 'danger' : 'neutral',
    },
    {
      id: 'variance',
      label: 'Variance',
      value: `${fmtSigned(forecast.varianceDays)}d`,
      tone: forecast.varianceDays > 0 ? 'danger' : forecast.varianceDays < 0 ? 'positive' : 'neutral',
    },
  ]

  return (
    <DashboardWidget title="Progress & Forecast" footer={progress.reportingPeriod}>
      <StatGrid items={items} />
    </DashboardWidget>
  )
}
