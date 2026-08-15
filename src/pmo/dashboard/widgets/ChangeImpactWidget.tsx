import type { ChangeRequestSummary } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { StatGrid } from './StatGrid'
import type { StatGridItem } from './StatGrid'
import { fmtSigned } from './formatters'

// Program Manager reads Change Requests impact-first — the aggregate
// schedule/budget/commitment consequence leads as the KPI, counts are
// secondary. Inverse emphasis from the Project Manager's ChangeRequestsWidget,
// which leads with counts — same underlying ChangeRequestSummary, different lens.
export function ChangeImpactWidget({ changeRequests }: { changeRequests: ChangeRequestSummary }) {
  const scheduleImpact = changeRequests.scheduleImpactDays
  const costImpact = changeRequests.costImpact

  const countItems: StatGridItem[] = [
    { id: 'pending', label: 'Pending', value: changeRequests.pending, tone: changeRequests.pending > 0 ? 'warning' : 'neutral' },
    { id: 'approved', label: 'Approved', value: changeRequests.approved, tone: 'positive' },
    { id: 'rejected', label: 'Rejected', value: changeRequests.rejected, tone: 'neutral' },
  ]

  return (
    <DashboardWidget
      title="Change Impact"
      description="Aggregate impact of approved and pending changes on this project's commitments"
      kpi={scheduleImpact !== undefined ? { value: `${fmtSigned(scheduleImpact)}d`, label: 'net schedule impact' } : undefined}
      trend={
        scheduleImpact
          ? { direction: scheduleImpact > 0 ? 'up' : scheduleImpact < 0 ? 'down' : 'flat', label: costImpact ? `$${costImpact.toLocaleString()} cost impact` : 'No cost impact recorded', tone: 'negative' }
          : undefined
      }
    >
      <div className="mt-2 border-t border-slate-100 pt-2">
        <StatGrid items={countItems} />
      </div>
    </DashboardWidget>
  )
}
