import type { ChangeRequestSummary } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { StatGrid } from './StatGrid'
import type { StatGridItem } from './StatGrid'

// Governance lens over the same ChangeRequestSummary the Project Manager's
// ChangeRequestsWidget and Program Manager's ChangeImpactWidget already
// read — this one leads with aging and detected process exceptions instead
// of counts or schedule/cost impact.
export function ChangeControlWidget({ changeRequests }: { changeRequests: ChangeRequestSummary }) {
  const oldestPendingAgeDays = changeRequests.oldestPendingAgeDays
  const materialImpact = changeRequests.materialImpact ?? 0
  const exceptions = changeRequests.governanceExceptions ?? []

  const items: StatGridItem[] = [
    { id: 'pending', label: 'Pending', value: changeRequests.pending, tone: changeRequests.pending > 0 ? 'warning' : 'neutral' },
    { id: 'approved', label: 'Approved', value: changeRequests.approved, tone: 'positive' },
    { id: 'rejected', label: 'Rejected', value: changeRequests.rejected, tone: 'neutral' },
    {
      id: 'oldest-pending',
      label: 'Oldest Pending',
      value: oldestPendingAgeDays !== undefined ? `${oldestPendingAgeDays}d` : '—',
      tone: (oldestPendingAgeDays ?? 0) > 10 ? 'warning' : 'neutral',
    },
    { id: 'material-impact', label: 'Material Impact', value: materialImpact, tone: materialImpact > 0 ? 'warning' : 'neutral' },
  ]

  return (
    <DashboardWidget
      title="Change Control"
      status={
        exceptions.length > 0
          ? { level: 'amber', label: `${exceptions.length} exception${exceptions.length === 1 ? '' : 's'}` }
          : { level: 'green', label: 'No exceptions' }
      }
    >
      <StatGrid items={items} />
      {exceptions.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-slate-100 pt-2">
          {exceptions.map((exception) => (
            <li key={exception} className="text-[11px] text-amber-700">
              {exception}
            </li>
          ))}
        </ul>
      )}
    </DashboardWidget>
  )
}
