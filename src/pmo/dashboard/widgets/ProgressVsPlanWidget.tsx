import type { ProgressTrendPoint } from '../data/dashboardModels'
import type { HistoricalMetric } from '../data/historicalMetric'
import { DashboardWidget } from './DashboardWidget'
import { TrendLineChart } from './charts/TrendLineChart'
import { CHART_COLORS } from './charts/chartColors'

export function ProgressVsPlanWidget({ trend, actualPct, plannedPct }: { trend: ProgressTrendPoint[]; actualPct: HistoricalMetric<number>; plannedPct: number }) {
  return (
    <DashboardWidget
      title="Progress vs Plan"
      kpi={{ value: `${actualPct.current}%`, label: `vs ${plannedPct}% planned` }}
      trend={{ direction: actualPct.direction, label: actualPct.changeLabel, tone: actualPct.direction === 'up' ? 'positive' : actualPct.direction === 'down' ? 'negative' : 'neutral' }}
    >
      <TrendLineChart
        periods={trend.map((p) => p.period)}
        series={[
          { id: 'actual', label: 'Actual', color: CHART_COLORS.blue, values: trend.map((p) => p.actualPct) },
          { id: 'planned', label: 'Planned', color: CHART_COLORS.slate, values: trend.map((p) => p.plannedPct) },
        ]}
      />
    </DashboardWidget>
  )
}
