import { DashboardWidget } from './DashboardWidget'
import type { WidgetAction, WidgetLoadState, WidgetStatus } from './DashboardWidget'

export interface ListWidgetItem {
  id: string
  label: string
  meta?: string
  /** Optional right-aligned tag (e.g. a risk score, a status word). */
  tag?: string
  tagTone?: 'neutral' | 'warning' | 'danger'
}

const TAG_STYLES: Record<NonNullable<ListWidgetItem['tagTone']>, string> = {
  neutral: 'bg-slate-100 text-slate-600',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-rose-50 text-rose-700',
}

// Convenience preset over DashboardWidget for the "short scannable row
// list" shape (upcoming milestones, top risks, recent activity). An empty
// item list defers to DashboardWidget's own empty state rather than
// rendering a second, competing empty message.
export function ListWidget({
  title,
  description,
  tooltip,
  items,
  emptyMessage = 'Nothing to show yet.',
  status,
  footer,
  action,
  loadState,
}: {
  title: string
  description?: string
  tooltip?: string
  items: ListWidgetItem[]
  emptyMessage?: string
  status?: WidgetStatus
  footer?: string
  action?: WidgetAction
  loadState?: WidgetLoadState
}) {
  const resolvedLoadState = loadState ?? (items.length === 0 ? 'empty' : 'idle')

  return (
    <DashboardWidget
      title={title}
      description={description}
      tooltip={tooltip}
      status={status}
      footer={footer}
      action={action}
      loadState={resolvedLoadState}
      emptyMessage={emptyMessage}
    >
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-xs">
            <span className="min-w-0 flex-1 truncate text-slate-700">{item.label}</span>
            {item.meta && <span className="shrink-0 text-[11px] text-slate-400">{item.meta}</span>}
            {item.tag && (
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${TAG_STYLES[item.tagTone ?? 'neutral']}`}>
                {item.tag}
              </span>
            )}
          </li>
        ))}
      </ul>
    </DashboardWidget>
  )
}
