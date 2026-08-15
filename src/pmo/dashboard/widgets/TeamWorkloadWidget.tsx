import type { SectionId } from '../../types'
import type { TeamSummary } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { StatGrid } from './StatGrid'
import type { StatGridItem } from './StatGrid'

// Exceptions lead, headcount trails — "Project Members" is deliberately
// the last, plainest cell here, not the widget's headline.
export function TeamWorkloadWidget({ team, onNavigateToSection }: { team: TeamSummary; onNavigateToSection: (id: SectionId) => void }) {
  const items: StatGridItem[] = [
    { id: 'overdue', label: 'Overdue Assignments', value: team.overdueAssignments, tone: team.overdueAssignments > 0 ? 'danger' : 'neutral' },
    { id: 'unassigned', label: 'Unassigned Work', value: team.unassignedWork, tone: team.unassignedWork > 0 ? 'warning' : 'neutral' },
    { id: 'members', label: 'Project Members', value: team.memberCount, tone: 'neutral' },
  ]

  return (
    <DashboardWidget title="Team / Workload" action={{ label: 'Open Resources', onClick: () => onNavigateToSection('resources') }}>
      <StatGrid items={items} />
    </DashboardWidget>
  )
}
