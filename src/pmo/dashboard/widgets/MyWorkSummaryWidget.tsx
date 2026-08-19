import type { MyWorkSummary } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { StatGrid } from './StatGrid'
import type { StatGridItem } from './StatGrid'

export function MyWorkSummaryWidget({ summary }: { summary: MyWorkSummary }) {
  const items: StatGridItem[] = [
    { id: 'active', label: 'Active Assignments', value: summary.activeAssignments, tone: 'neutral' },
    { id: 'overdue', label: 'Overdue', value: summary.overdue, tone: summary.overdue > 0 ? 'danger' : 'neutral' },
    { id: 'due-soon', label: 'Due Soon', value: summary.dueSoon, tone: summary.dueSoon > 0 ? 'warning' : 'neutral' },
    { id: 'blocked', label: 'Blocked', value: summary.blocked, tone: summary.blocked > 0 ? 'danger' : 'neutral' },
    { id: 'completed', label: 'Completed This Period', value: summary.completedThisPeriod, tone: 'positive' },
  ]

  return (
    <DashboardWidget title="My Work Summary">
      <StatGrid items={items} />
    </DashboardWidget>
  )
}
