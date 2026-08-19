import type { ActivityFeedEvent, ActivityFeedEventType } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'

// Meaningful governance/admin change types only — a filtered subset of
// ActivityFeedEventType, not the full feed (that's Recent Activity, reused
// as-is by the Project Manager and Program Manager roles). PMO cares about
// what changed in the project's governed record, not every progress ping.
const GOVERNANCE_EVENT_TYPES: ActivityFeedEventType[] = ['change-approved', 'milestone-rescheduled', 'field-updated']

// A curated slice, deliberately not the full audit log — no audit-history
// surface exists yet in this prototype, so the footer says so honestly
// rather than linking to a page that isn't there.
export function AuditSignalsWidget({
  activityFeed,
  title = 'Audit Signals',
}: {
  activityFeed: ActivityFeedEvent[]
  title?: string
}) {
  const signals = activityFeed.filter((e) => GOVERNANCE_EVENT_TYPES.includes(e.type))

  return (
    <DashboardWidget
      title={title}
      description="Recent governance/admin changes — not the full audit log"
      loadState={signals.length === 0 ? 'empty' : 'idle'}
      emptyMessage="No governance/admin changes recently."
      footer="Full audit history is not yet available in this prototype."
    >
      <ul className="divide-y divide-slate-100">
        {signals.map((e) => (
          <li key={e.id} className="flex items-center gap-2 py-1.5 text-xs first:pt-0 last:pb-0">
            <span className="min-w-0 flex-1 truncate text-slate-700">{e.summary}</span>
            <span className="shrink-0 text-[11px] text-slate-400">{e.occurredLabel}</span>
          </li>
        ))}
      </ul>
    </DashboardWidget>
  )
}
