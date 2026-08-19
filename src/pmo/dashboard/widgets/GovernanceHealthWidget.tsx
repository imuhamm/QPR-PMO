import type { GovernanceCheckStatus, GovernanceSummary } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'

const STATUS_DOT: Record<GovernanceCheckStatus, string> = {
  pass: 'bg-emerald-500',
  fail: 'bg-rose-600',
  warning: 'bg-amber-500',
}
const STATUS_LABEL: Record<GovernanceCheckStatus, string> = { pass: 'Pass', fail: 'Fail', warning: 'Warning' }
const STATUS_TEXT: Record<GovernanceCheckStatus, string> = {
  pass: 'text-emerald-600',
  fail: 'text-rose-600',
  warning: 'text-amber-600',
}

// Never a bare score. Every check renders with its own pass/fail/warning
// state, and every non-pass check shows the specific exception that
// produced it (GovernanceCheck.detail) — a reader never has to trust an
// unexplained rollup number, and can trace "why is this Red" to a line item.
export function GovernanceHealthWidget({ governance }: { governance: GovernanceSummary }) {
  const passing = governance.checks.filter((c) => c.status === 'pass').length

  return (
    <DashboardWidget
      title="Governance Health"
      description={`${passing} of ${governance.checks.length} checks passing`}
      status={{ level: governance.overall }}
    >
      <ul className="divide-y divide-slate-100">
        {governance.checks.map((check) => (
          <li key={check.id} className="flex items-start gap-2 py-1.5 first:pt-0 last:pb-0">
            <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[check.status]}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-slate-800">{check.label}</div>
              {check.detail && <div className="mt-0.5 text-[11px] text-slate-500">{check.detail}</div>}
            </div>
            <span className={`shrink-0 pt-0.5 text-[10px] font-medium ${STATUS_TEXT[check.status]}`}>{STATUS_LABEL[check.status]}</span>
          </li>
        ))}
      </ul>
    </DashboardWidget>
  )
}
