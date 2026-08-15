import type { ChangeRequestSummary } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { StatGrid } from './StatGrid'
import type { StatGridItem } from './StatGrid'
import { fmtSigned } from './formatters'

// No Change Requests tab exists yet in Project Details, so unlike most
// other widgets here this one has no drill-down destination — it's
// summary-only until that surface exists.
export function ChangeRequestsWidget({ changeRequests }: { changeRequests: ChangeRequestSummary }) {
  const items: StatGridItem[] = [
    {
      id: 'awaiting',
      label: 'Awaiting My Action',
      value: changeRequests.awaitingCurrentUserAction,
      tone: changeRequests.awaitingCurrentUserAction > 0 ? 'danger' : 'neutral',
    },
    { id: 'pending', label: 'Pending', value: changeRequests.pending, tone: changeRequests.pending > 0 ? 'warning' : 'neutral' },
    { id: 'approved', label: 'Approved', value: changeRequests.approved, tone: 'positive' },
    { id: 'rejected', label: 'Rejected', value: changeRequests.rejected, tone: 'neutral' },
  ]

  const impactParts: string[] = []
  if (changeRequests.scheduleImpactDays) impactParts.push(`${fmtSigned(changeRequests.scheduleImpactDays)}d schedule impact`)
  if (changeRequests.costImpact) impactParts.push(`$${changeRequests.costImpact.toLocaleString()} cost impact`)

  return (
    <DashboardWidget title="Change Requests" footer={impactParts.length > 0 ? impactParts.join(' · ') : undefined}>
      <StatGrid items={items} />
    </DashboardWidget>
  )
}
