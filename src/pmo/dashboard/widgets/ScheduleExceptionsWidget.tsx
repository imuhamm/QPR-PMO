import type { SectionId } from '../../types'
import type { TaskActivitySummary } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { StatGrid } from './StatGrid'
import type { StatGridItem } from './StatGrid'

export function ScheduleExceptionsWidget({
  activities,
  onNavigateToSection,
}: {
  activities: TaskActivitySummary
  onNavigateToSection: (id: SectionId) => void
}) {
  const goToSchedule = () => onNavigateToSection('schedule')
  const items: StatGridItem[] = [
    { id: 'overdue', label: 'Overdue', value: activities.overdue, tone: activities.overdue > 0 ? 'danger' : 'neutral', onClick: goToSchedule },
    { id: 'due-soon', label: 'Due Soon', value: activities.dueSoon, tone: activities.dueSoon > 0 ? 'warning' : 'neutral', onClick: goToSchedule },
    {
      id: 'behind',
      label: 'Behind Schedule',
      value: activities.behindSchedule,
      tone: activities.behindSchedule > 0 ? 'danger' : 'neutral',
      onClick: goToSchedule,
    },
    { id: 'blocked', label: 'Blocked', value: activities.blocked, tone: activities.blocked > 0 ? 'danger' : 'neutral', onClick: goToSchedule },
    {
      id: 'unassigned',
      label: 'Unassigned',
      value: activities.unassigned,
      tone: activities.unassigned > 0 ? 'warning' : 'neutral',
      onClick: goToSchedule,
    },
    {
      id: 'missing-dates',
      label: 'Missing Dates',
      value: activities.missingDates,
      tone: activities.missingDates > 0 ? 'warning' : 'neutral',
      onClick: goToSchedule,
    },
  ]

  return (
    <DashboardWidget title="Schedule Exceptions" description="Click a count to open Schedule">
      <StatGrid items={items} />
    </DashboardWidget>
  )
}
