import type { HealthLevel, ProjectForecast, RiskTrendPoint } from '../data/dashboardModels'
import type { HistoricalMetric } from '../data/historicalMetric'
import { DashboardWidget } from './DashboardWidget'
import { TrendLineChart } from './charts/TrendLineChart'
import { CHART_COLORS } from './charts/chartColors'
import { fmtSigned } from './formatters'

// Compact movement summary, not a set of separate charts — three
// pre-formatted changeLabels (health, schedule variance, forecast
// movement) plus a single risk-exposure line, reusing the exact same
// HistoricalMetric/RiskTrendPoint data every other role's widgets read.
export function ExecutiveTrendWidget({
  overallHealth,
  forecast,
  riskTrend,
}: {
  overallHealth: HistoricalMetric<HealthLevel>
  forecast: ProjectForecast
  riskTrend: RiskTrendPoint[]
}) {
  return (
    <DashboardWidget title="Health / Performance Trend" description="Movement since the previous reporting period">
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Overall Health</div>
          <div className="mt-0.5 font-medium text-slate-800">{overallHealth.changeLabel}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Schedule Variance</div>
          <div className={`mt-0.5 font-medium ${forecast.varianceDays > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
            {fmtSigned(forecast.varianceDays)}d vs baseline
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Forecast Movement</div>
          <div className="mt-0.5 font-medium text-slate-800">{forecast.forecastFinish.changeLabel}</div>
        </div>
      </div>
      <div className="mt-3 border-t border-slate-100 pt-3">
        <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">Risk Exposure Trend</div>
        <TrendLineChart
          periods={riskTrend.map((p) => p.period)}
          series={[{ id: 'exposure', label: 'Exposure', color: CHART_COLORS.rose, values: riskTrend.map((p) => p.exposure) }]}
        />
      </div>
    </DashboardWidget>
  )
}
