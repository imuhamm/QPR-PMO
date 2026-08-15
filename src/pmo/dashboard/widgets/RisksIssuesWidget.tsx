import type { SectionId } from '../../types'
import type { IssueSummary, RiskSummary } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { StatGrid } from './StatGrid'
import type { StatGridItem } from './StatGrid'

// Operational emphasis: what's high/critical and overdue right now, not
// the full register breakdown (that's Risks itself, and this dashboard's
// Analytical "Risk Exposure / Risk Trend" widget).
export function RisksIssuesWidget({
  risks,
  issues,
  onNavigateToSection,
}: {
  risks: RiskSummary
  issues: IssueSummary
  onNavigateToSection: (id: SectionId) => void
}) {
  const riskItems: StatGridItem[] = [
    { id: 'high-critical', label: 'High/Critical Risks', value: risks.highCritical, tone: risks.highCritical > 0 ? 'danger' : 'neutral' },
    {
      id: 'mitigation-overdue',
      label: 'Mitigation Overdue',
      value: risks.mitigationOverdue,
      tone: risks.mitigationOverdue > 0 ? 'danger' : 'neutral',
    },
  ]
  const issueItems: StatGridItem[] = [
    { id: 'critical-issues', label: 'Critical Issues', value: issues.critical, tone: issues.critical > 0 ? 'danger' : 'neutral' },
    { id: 'blocked-issues', label: 'Blocked Issues', value: issues.blocked, tone: issues.blocked > 0 ? 'warning' : 'neutral' },
    { id: 'oldest-open', label: 'Oldest Open', value: `${issues.oldestAgeDays}d`, tone: issues.oldestAgeDays > 21 ? 'warning' : 'neutral' },
  ]

  return (
    <DashboardWidget title="Risks & Issues" action={{ label: 'Open Risks', onClick: () => onNavigateToSection('risks') }}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Risks</div>
      <div className="mt-1.5">
        <StatGrid items={riskItems} columns={2} />
      </div>
      <div className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Issues</div>
      <div className="mt-1.5">
        <StatGrid items={issueItems} />
      </div>
    </DashboardWidget>
  )
}
