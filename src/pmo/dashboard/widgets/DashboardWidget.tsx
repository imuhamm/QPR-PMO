import type { ReactNode } from 'react'

// The only four health states a widget's status is ever expressed in.
// Neutral covers "not available" (e.g. a metric with no data yet), not a
// 5th color — nothing here invents a status beyond these four.
export type WidgetHealthLevel = 'green' | 'amber' | 'red' | 'neutral'

export interface WidgetKpi {
  value: string
  label?: string
}

export interface WidgetTrend {
  direction: 'up' | 'down' | 'flat'
  label: string
  /** Direction alone doesn't mean good/bad (rising risk exposure is bad, rising % complete is good) — caller decides tone. */
  tone: 'positive' | 'negative' | 'neutral'
}

export interface WidgetStatus {
  level: WidgetHealthLevel
  /** Defaults to the level's standard label (On Track/At Risk/Critical/Not Available) if omitted. */
  label?: string
}

export interface WidgetAction {
  /** Defaults to "View details". */
  label?: string
  onClick: () => void
}

export type WidgetLoadState = 'idle' | 'loading' | 'empty' | 'error'

const STATUS_STYLES: Record<WidgetHealthLevel, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
  neutral: 'bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200',
}

// Color is never the only signal — each level also gets its own glyph and
// a text label (StatusChip in ReadinessPanel established this ✓ / ! / –
// convention already; red reuses ✕ so Amber and Red don't share a glyph).
const STATUS_GLYPH: Record<WidgetHealthLevel, string> = { green: '✓', amber: '!', red: '✕', neutral: '–' }
const DEFAULT_STATUS_LABEL: Record<WidgetHealthLevel, string> = {
  green: 'On Track',
  amber: 'At Risk',
  red: 'Critical',
  neutral: 'Not Available',
}

// Exported so widgets that need more than one badge in their own body
// (DashboardWidget's own `status` prop only renders one, in the header)
// can reuse the exact same visual without redefining it.
export function WidgetStatusBadge({ value }: { value: WidgetStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${STATUS_STYLES[value.level]}`}
    >
      <span aria-hidden="true">{STATUS_GLYPH[value.level]}</span>
      {value.label ?? DEFAULT_STATUS_LABEL[value.level]}
    </span>
  )
}

const TREND_GLYPH: Record<WidgetTrend['direction'], string> = { up: '▲', down: '▼', flat: '–' }
const TREND_TONE: Record<WidgetTrend['tone'], string> = {
  positive: 'text-emerald-600',
  negative: 'text-rose-600',
  neutral: 'text-slate-400',
}

function WidgetSkeleton() {
  return (
    <div className="animate-pulse space-y-2" aria-hidden="true">
      <div className="h-6 w-14 rounded bg-slate-100" />
      <div className="h-2.5 w-2/3 rounded bg-slate-100" />
      <div className="h-2.5 w-full rounded bg-slate-100" />
      <div className="h-2.5 w-5/6 rounded bg-slate-100" />
    </div>
  )
}

export interface DashboardWidgetProps {
  title: string
  /** Short context line under the title (e.g. what the number measures). */
  description?: string
  /** Native-title tooltip on a small (i) glyph — same lightweight pattern as other hover hints in this app. */
  tooltip?: string
  kpi?: WidgetKpi
  trend?: WidgetTrend
  status?: WidgetStatus
  footer?: ReactNode
  action?: WidgetAction
  loadState?: WidgetLoadState
  errorMessage?: string
  emptyMessage?: string
  children?: ReactNode
}

// The single shell every dashboard widget renders through — owns all
// chrome (header, KPI/trend row, loading/empty/error states, footer/action)
// so an individual widget only ever supplies its own content via `children`
// or the kpi/trend shorthand. Visual language matches the rest of Project
// Details: thin border, no shadow, dense uppercase label header (same
// treatment ReadinessPanel already uses for its own section header).
export function DashboardWidget({
  title,
  description,
  tooltip,
  kpi,
  trend,
  status,
  footer,
  action,
  loadState = 'idle',
  errorMessage = "Couldn't load this data.",
  emptyMessage = 'Nothing to show yet.',
  children,
}: DashboardWidgetProps) {
  return (
    <div className="flex h-full flex-col rounded border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <h3 className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
            {tooltip && (
              <span
                title={tooltip}
                aria-label={tooltip}
                className="flex h-3 w-3 shrink-0 cursor-help items-center justify-center rounded-full text-[9px] font-semibold leading-none text-slate-300 hover:text-slate-500"
              >
                ⓘ
              </span>
            )}
          </div>
          {description && <p className="mt-0.5 truncate text-[11px] text-slate-500">{description}</p>}
        </div>
        {status && loadState !== 'loading' && loadState !== 'error' && <WidgetStatusBadge value={status} />}
      </div>

      <div className="min-h-0 flex-1">
        {loadState === 'loading' ? (
          <WidgetSkeleton />
        ) : loadState === 'error' ? (
          <div className="flex h-full flex-col items-center justify-center gap-0.5 text-center">
            <span className="text-[11px] font-semibold text-rose-600">Couldn't load</span>
            <span className="text-[11px] text-slate-500">{errorMessage}</span>
          </div>
        ) : loadState === 'empty' ? (
          <div className="flex h-full items-center justify-center text-center text-xs text-slate-400">{emptyMessage}</div>
        ) : (
          <>
            {(kpi || trend) && (
              <div className="mb-1.5">
                {kpi && <div className="text-2xl font-semibold text-slate-900">{kpi.value}</div>}
                {(kpi?.label || trend) && (
                  <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                    {trend && (
                      <span className={`font-semibold ${TREND_TONE[trend.tone]}`}>
                        {TREND_GLYPH[trend.direction]} {trend.label}
                      </span>
                    )}
                    {kpi?.label && <span className="text-slate-500">{kpi.label}</span>}
                  </div>
                )}
              </div>
            )}
            {children}
          </>
        )}
      </div>

      {(footer || action) && loadState !== 'loading' && loadState !== 'error' && (
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
          <div className="min-w-0 truncate text-[11px] text-slate-500">{footer}</div>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="shrink-0 whitespace-nowrap text-[11px] font-medium text-blue-600 hover:text-blue-700"
            >
              {action.label ?? 'View details'} →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
