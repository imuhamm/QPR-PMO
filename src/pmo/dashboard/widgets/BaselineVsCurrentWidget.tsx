import type { BaselineComparison } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { StatGrid } from './StatGrid'
import type { StatGridItem } from './StatGrid'
import { formatCurrency } from '../../budget/budgetData'
import { fmtDate, fmtSigned } from './formatters'

export function BaselineVsCurrentWidget({ baseline }: { baseline: BaselineComparison }) {
  const items: StatGridItem[] = [
    {
      id: 'start',
      label: 'Project Start',
      value: `${fmtDate(baseline.startDate.baseline)} → ${fmtDate(baseline.startDate.current)}`,
      tone: baseline.startDate.varianceDays > 0 ? 'danger' : 'neutral',
    },
    {
      id: 'finish',
      label: 'Project Finish',
      value: `${fmtDate(baseline.finishDate.baseline)} → ${fmtDate(baseline.finishDate.current)}`,
      tone: baseline.finishDate.varianceDays > 0 ? 'danger' : 'neutral',
    },
    {
      id: 'budget',
      label: 'Budget',
      value: `${formatCurrency(baseline.budget.baseline)} → ${formatCurrency(baseline.budget.current)}`,
      tone: baseline.budget.variancePct > 0 ? 'warning' : 'neutral',
    },
    {
      id: 'approved-change',
      label: 'Accumulated Approved Change',
      value: formatCurrency(baseline.accumulatedApprovedChange),
      tone: baseline.accumulatedApprovedChange > 0 ? 'warning' : 'neutral',
    },
  ]

  return (
    <DashboardWidget
      title="Baseline vs Current"
      footer={`Finish variance ${fmtSigned(baseline.finishDate.varianceDays, 'd')} · Budget variance ${fmtSigned(baseline.budget.variancePct, '%')}`}
    >
      <StatGrid items={items} columns={2} />
    </DashboardWidget>
  )
}
