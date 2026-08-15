import type { BudgetPerformance } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { StatGrid } from './StatGrid'
import type { StatGridItem } from './StatGrid'
import { formatCurrency } from '../../budget/budgetData'
import { fmtSigned } from './formatters'

// "if data exists" — when Total Budget hasn't been configured yet
// (BudgetView's own real state today), this shows the same empty
// treatment as any other not-yet-available widget rather than fabricating
// numbers.
export function BudgetPerformanceWidget({ budget }: { budget: BudgetPerformance | undefined }) {
  if (!budget) {
    return <DashboardWidget title="Budget Performance" loadState="empty" emptyMessage="Total Budget not yet set" />
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
    <DashboardWidget title="Budget Performance">
      <StatGrid items={items} />
    </DashboardWidget>
  )
}
