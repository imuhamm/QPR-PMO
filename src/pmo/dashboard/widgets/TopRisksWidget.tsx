import type { AttentionSeverity, RiskMitigationStatus, TopRisk } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'

const SEVERITY_DOT: Record<AttentionSeverity, string> = {
  critical: 'bg-rose-600',
  high: 'bg-rose-400',
  medium: 'bg-amber-500',
  low: 'bg-slate-400',
}
const MITIGATION_STYLES: Record<RiskMitigationStatus, string> = {
  unmitigated: 'bg-rose-50 text-rose-700',
  overdue: 'bg-rose-50 text-rose-700',
  'in-progress': 'bg-amber-50 text-amber-700',
  mitigated: 'bg-emerald-50 text-emerald-700',
}
const MITIGATION_LABEL: Record<RiskMitigationStatus, string> = {
  unmitigated: 'Unmitigated',
  overdue: 'Mitigation Overdue',
  'in-progress': 'Mitigation In Progress',
  mitigated: 'Mitigated',
}

// A curated top-5 Executive slice, not a substitute for the full register
// (risksData.ts) — names/severities here match the same risks already
// narrated through attentionItems and RiskSummary elsewhere in this
// dashboard, not a fourth disconnected risk list.
export function TopRisksWidget({ risks }: { risks: TopRisk[] }) {
  const top = risks.slice(0, 5)

  return (
    <DashboardWidget title="Top Risks" loadState={top.length === 0 ? 'empty' : 'idle'} emptyMessage="No significant risks currently open.">
      <ul className="divide-y divide-slate-100">
        {top.map((risk) => (
          <li key={risk.id} className="flex items-start gap-2 py-1.5 first:pt-0 last:pb-0">
            <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_DOT[risk.severity]}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-medium text-slate-800">{risk.name}</span>
                <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-slate-400">{risk.severity}</span>
              </div>
              <div className="truncate text-[11px] text-slate-500">{risk.impact}</div>
            </div>
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${MITIGATION_STYLES[risk.mitigationStatus]}`}>
              {MITIGATION_LABEL[risk.mitigationStatus]}
            </span>
          </li>
        ))}
      </ul>
    </DashboardWidget>
  )
}
