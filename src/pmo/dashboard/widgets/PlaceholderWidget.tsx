import { DashboardWidget } from './DashboardWidget'

// For widgets whose real data source doesn't exist in this app yet (e.g.
// cross-project rollups — there's only one Project with a built-out
// workspace today). Modeled as DashboardWidget's own empty state so it's
// visually identical to "genuinely no data yet," which is what it is.
export function PlaceholderWidget({ title, note }: { title: string; note: string }) {
  return <DashboardWidget title={title} loadState="empty" emptyMessage={note} />
}
