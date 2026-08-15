import { DashboardWidget } from './DashboardWidget'
import type { WidgetAction, WidgetLoadState, WidgetStatus, WidgetTrend } from './DashboardWidget'

// Convenience preset over DashboardWidget for the "single big number" shape
// (counts, percentages, currency snapshots) — the most common dashboard tile.
export function MetricWidget({
  title,
  description,
  tooltip,
  value,
  subtitle,
  trend,
  status,
  footer,
  action,
  loadState,
  emptyMessage,
}: {
  title: string
  description?: string
  tooltip?: string
  value: string
  subtitle?: string
  trend?: WidgetTrend
  status?: WidgetStatus
  footer?: string
  action?: WidgetAction
  loadState?: WidgetLoadState
  emptyMessage?: string
}) {
  return (
    <DashboardWidget
      title={title}
      description={description}
      tooltip={tooltip}
      kpi={{ value, label: subtitle }}
      trend={trend}
      status={status}
      footer={footer}
      action={action}
      loadState={loadState}
      emptyMessage={emptyMessage}
    />
  )
}
