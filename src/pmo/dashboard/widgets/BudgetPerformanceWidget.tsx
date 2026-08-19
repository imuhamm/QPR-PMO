import type { BudgetPerformance } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { StatGrid } from './StatGrid'
import type { StatGridItem } from './StatGrid'
import { formatCurrency } from '../../budget/budgetData'
import { fmtSigned } from './formatters'

// "if data exists" — when Total Budget hasn't been configured yet
// (BudgetView's own real state today), this shows the same empty
// treatment as any other not-yet-available widget rather than fabricating
// numbers. `title` is overridable so the Executive role can reuse this
// as-is under its own "Financial Outlook" framing instead of duplicating it.
export function BudgetPerformanceWidget({ budget, title = 'Budget Performance' }: { budget: BudgetPerformance | undefined; title?: string }) {
  if (!budget) {
    return <DashboardWidget title={title} loadState="empty" emptyMessage="Total Budget not yet set" />
  }

  const items: StatGridItem[] = [
    { id: 'total', label: 'Total Budget', value: formatCurrency(budget.totalBudget) },
    { id: 'actual', label: 'Actual Spend', value: formatCurrency(budget.actualSpend) },
    { id: 'forecast', label: 'Forecast at Completion', value: formatCurrency(budget.forecastAtCompletion) },
    {
      id: 'variance',
      label: 'Variance',
      value: `${fmtSigned(budget.variancePct)}%`,
      tone: budget.variancePct > 0 ? 'danger' : budget.variancePct < 0 ? 'positive' : 'neutral',
    },
  ]

  return (
    <DashboardWidget title={title}>
      <StatGrid items={items} />
    </DashboardWidget>
  )
}
