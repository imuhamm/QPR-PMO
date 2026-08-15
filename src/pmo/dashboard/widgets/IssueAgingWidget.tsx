import type { IssueAgingBucket } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { BarList } from './charts/BarList'
import type { BarListItem } from './charts/BarList'

export function IssueAgingWidget({ aging }: { aging: IssueAgingBucket[] }) {
  const items: BarListItem[] = aging.map((bucket, i) => ({
    id: bucket.bucket,
    label: bucket.bucket,
    value: bucket.count,
    // Oldest bucket (last in the array) reads danger, everything younger reads neutral.
    tone: i === aging.length - 1 && bucket.count > 0 ? 'danger' : 'neutral',
  }))

  return (
    <DashboardWidget title="Issue Aging">
      <BarList items={items} />
    </DashboardWidget>
  )
}
