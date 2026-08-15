import type { ActivityStatusBucket, TaskActivitySummary } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { BarList } from './charts/BarList'
import type { BarListItem } from './charts/BarList'

const BUCKET_LABEL: Record<ActivityStatusBucket, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  completed: 'Completed',
  delayed: 'Delayed',
}
const BUCKET_TONE: Record<ActivityStatusBucket, BarListItem['tone']> = {
  'not-started': 'neutral',
  'in-progress': 'positive',
  completed: 'positive',
  delayed: 'danger',
}

export function TaskStatusDistributionWidget({ activities }: { activities: TaskActivitySummary }) {
  const items: BarListItem[] = (Object.keys(activities.statusDistribution) as ActivityStatusBucket[]).map((bucket) => ({
    id: bucket,
    label: BUCKET_LABEL[bucket],
    value: activities.statusDistribution[bucket],
    tone: BUCKET_TONE[bucket],
  }))

  return (
    <DashboardWidget title="Task Status Distribution">
      <BarList items={items} />
    </DashboardWidget>
  )
}
