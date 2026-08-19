import type { ReportingCompliance } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { StatGrid } from './StatGrid'
import type { StatGridItem } from './StatGrid'
import { fmtDate } from './formatters'

// Formal PMO-tracked reporting cadence — distinct from the ad-hoc "Monthly
// status report" reminder a Project Manager sees in their own attention
// list, which is a data-refresh nudge, not this governance-tracked report.
export function ReportingComplianceWidget({ reporting }: { reporting: ReportingCompliance }) {
  const isLate = reporting.status === 'late'

  const items: StatGridItem[] = [
    { id: 'latest', label: 'Latest Update', value: fmtDate(reporting.latestUpdate) },
    { id: 'next-due', label: 'Next Due', value: fmtDate(reporting.nextDue) },
    { id: 'missed', label: 'Missed Periods', value: reporting.missedPeriods, tone: reporting.missedPeriods > 0 ? 'danger' : 'neutral' },
    isLate
      ? { id: 'overdue', label: 'Days Overdue', value: `${reporting.daysOverdue ?? 0}d`, tone: 'danger' }
      : { id: 'status', label: 'Status', value: 'On Time', tone: 'positive' },
  ]

  return (
    <DashboardWidget
      title="Reporting Compliance"
      status={{ level: isLate ? 'red' : 'green', label: isLate ? 'Late' : 'On Time' }}
    >
      <StatGrid items={items} columns={2} />
    </DashboardWidget>
  )
}
