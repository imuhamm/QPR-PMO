import type { DashboardMilestone } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { StatGrid } from './StatGrid'
import type { StatGridItem } from './StatGrid'
import { BarList } from './charts/BarList'
import type { BarListItem } from './charts/BarList'

export function MilestonePerformanceWidget({ milestones }: { milestones: DashboardMilestone[] }) {
  const onTime = milestones.filter((m) => m.varianceDays <= 0).length
  const delayed = milestones.filter((m) => m.varianceDays > 0).length
  const avgSlip = Math.round(milestones.reduce((sum, m) => sum + Math.max(m.varianceDays, 0), 0) / (milestones.length || 1))

  const summaryItems: StatGridItem[] = [
    { id: 'on-time', label: 'On Time', value: onTime, tone: 'positive' },
    { id: 'delayed', label: 'Delayed', value: delayed, tone: delayed > 0 ? 'danger' : 'neutral' },
    { id: 'avg-slip', label: 'Avg Slip (Delayed)', value: `${avgSlip}d`, tone: avgSlip > 0 ? 'danger' : 'neutral' },
  ]

  const barItems: BarListItem[] = milestones.map((m) => ({
    id: m.id,
    label: m.name,
    value: Math.max(m.varianceDays, 0),
    tone: m.varianceDays > 0 ? 'danger' : 'positive',
  }))

  return (
    <DashboardWidget title="Milestone Performance">
      <StatGrid items={summaryItems} />
      <div className="mt-3 border-t border-slate-100 pt-3">
        <BarList items={barItems} valueFormatter={(v) => (v === 0 ? '0d' : `${v}d`)} />
      </div>
    </DashboardWidget>
  )
}
