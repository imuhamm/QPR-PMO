import type { ProjectForecast } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { StatGrid } from './StatGrid'
import type { StatGridItem } from './StatGrid'
import { fmtDate, fmtSigned } from './formatters'

export function ScheduleVarianceWidget({ forecast }: { forecast: ProjectForecast }) {
  const items: StatGridItem[] = [
    { id: 'baseline', label: 'Baseline Finish', value: fmtDate(forecast.baselineFinish) },
    { id: 'forecast', label: 'Forecast Finish', value: fmtDate(forecast.forecastFinish.current), tone: forecast.varianceDays > 0 ? 'danger' : 'neutral' },
    {
      id: 'variance',
      label: 'Variance',
      value: `${fmtSigned(forecast.varianceDays)}d`,
      tone: forecast.varianceDays > 0 ? 'danger' : forecast.varianceDays < 0 ? 'positive' : 'neutral',
    },
  ]

  return (
    <DashboardWidget title="Schedule Variance" footer={forecast.forecastFinish.changeLabel}>
      <StatGrid items={items} columns={3} />
    </DashboardWidget>
  )
}
