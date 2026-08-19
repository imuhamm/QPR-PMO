import type { RiskSummary } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { StatGrid } from './StatGrid'
import type { StatGridItem } from './StatGrid'

// Governance lens over the same RiskSummary Risks & Issues (Project
// Manager) and Risk Exposure / Trend (Program Manager) already read — this
// one leads with process gaps (ownerless, no response plan, stale review)
// rather than raw counts or exposure.
export function RiskGovernanceWidget({ risks }: { risks: RiskSummary }) {
  const withoutResponsePlan = risks.withoutResponsePlan ?? 0
  const stale = risks.stale ?? 0

  const items: StatGridItem[] = [
    { id: 'high-critical', label: 'High/Critical', value: risks.highCritical, tone: risks.highCritical > 0 ? 'danger' : 'neutral' },
    { id: 'without-owner', label: 'Without Owner', value: risks.withoutOwner, tone: risks.withoutOwner > 0 ? 'danger' : 'neutral' },
    { id: 'without-response-plan', label: 'No Response Plan', value: withoutResponsePlan, tone: withoutResponsePlan > 0 ? 'danger' : 'neutral' },
    {
      id: 'mitigation-overdue',
      label: 'Mitigation Overdue',
      value: risks.mitigationOverdue,
      tone: risks.mitigationOverdue > 0 ? 'danger' : 'neutral',
    },
    { id: 'stale', label: 'Stale Reviews', value: stale, tone: stale > 0 ? 'warning' : 'neutral' },
    { id: 'escalated', label: 'Escalated', value: risks.escalated, tone: risks.escalated > 0 ? 'warning' : 'neutral' },
  ]

  return (
    <DashboardWidget title="Risk Governance" description="Process exceptions across open risks — see Risks for the full register">
      <StatGrid items={items} />
    </DashboardWidget>
  )
}
