import type { RiskSummary, RiskTrendPoint } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { StatGrid } from './StatGrid'
import type { StatGridItem } from './StatGrid'
import { TrendLineChart } from './charts/TrendLineChart'
import { CHART_COLORS } from './charts/chartColors'

export function RiskExposureTrendWidget({ risks, trend }: { risks: RiskSummary; trend: RiskTrendPoint[] }) {
  const summaryItems: StatGridItem[] = [
    { id: 'open', label: 'Open Risks', value: risks.totalOpen, tone: risks.totalOpen > 0 ? 'warning' : 'neutral' },
    { id: 'high-critical', label: 'High/Critical', value: risks.highCritical, tone: risks.highCritical > 0 ? 'danger' : 'neutral' },
    ...(risks.exposure !== undefined ? [{ id: 'exposure', label: 'Total Exposure', value: risks.exposure, tone: 'danger' as const }] : []),
  ]

  return (
    <DashboardWidget title="Risk Exposure / Risk Trend">
      <StatGrid items={summaryItems} />
      <div className="mt-3 border-t border-slate-100 pt-3">
        <TrendLineChart
          periods={trend.map((p) => p.period)}
          series={[{ id: 'exposure', label: 'Exposure', color: CHART_COLORS.rose, values: trend.map((p) => p.exposure) }]}
        />
      </div>
    </DashboardWidget>
  )
}
