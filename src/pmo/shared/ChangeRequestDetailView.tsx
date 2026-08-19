import { useState } from 'react'
import type { ReactNode } from 'react'
import type { ChangeRequestActivityType, ChangeRequestStatus, SubmittedChangeRequest } from './changeRequestStore'
import { RequiredMark } from './validation/InlineMessage'

// This prototype's mock clock (MOCK_TODAY) has no time-of-day, only a date
// — every timestamp here is date-only too, rather than fabricating a
// precision the underlying data doesn't have.
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function dateDiffDays(aISO: string, bISO: string): number {
  return Math.round((new Date(bISO).getTime() - new Date(aISO).getTime()) / 86_400_000)
}

const STATUS_STYLES: Record<ChangeRequestStatus, string> = {
  'Awaiting Approval': 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
  Approved: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  Rejected: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
  'Returned for Information': 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  Applied: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
}

function StatusPill({ status }: { status: ChangeRequestStatus }) {
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium leading-none ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      {children}
    </section>
  )
}

function ImpactStat({ label, children, warn }: { label: string; children: ReactNode; warn?: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${warn ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50/60'}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold ${warn ? 'text-amber-800' : 'text-slate-800'}`}>{children}</div>
    </div>
  )
}

const ACTIVITY_LABEL: Record<ChangeRequestActivityType, string> = {
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  returned: 'Returned for Information',
  applied: 'Applied to Project',
}
const ACTIVITY_DOT: Record<ChangeRequestActivityType, string> = {
  submitted: 'bg-slate-400',
  approved: 'bg-emerald-500',
  rejected: 'bg-rose-500',
  returned: 'bg-amber-500',
  applied: 'bg-blue-500',
}

type Decision = 'approved' | 'rejected' | 'returned'
const DECISION_LABEL: Record<Decision, string> = {
  approved: 'Approve this request',
  rejected: 'Reject this request',
  returned: 'Return for more information',
}
const DECISION_PLACEHOLDER: Record<Decision, string> = {
  approved: 'Optional note for the record…',
  rejected: 'Explain why this is being rejected…',
  returned: 'Explain what information is needed…',
}

// The one screen a reviewer/approver actually uses — everything here is
// read-only history and calculated fact except the Decision rail on the
// right, which is deliberately its own independently-scrolling column so
// Approve/Reject/Return stay reachable no matter how long the CR's history
// or Impact section grows (see the task's "visible without scrolling
// excessively"). Full-screen, not a side panel like the intake wizard —
// this needs the width for a real side-by-side comparison, not a 384px
// drawer.
export function ChangeRequestDetailView({
  cr,
  onClose,
  onDecision,
  onApply,
}: {
  cr: SubmittedChangeRequest
  onClose: () => void
  onDecision: (decision: Decision, comment: string) => void
  /** Approved → Applied — the separate, deliberate step that actually moves the approved value. See changeRequestStore's applyChangeRequest. */
  onApply: (reference: string) => void
}) {
  const [pendingDecision, setPendingDecision] = useState<Decision | null>(null)
  const [comment, setComment] = useState('')
  const [confirmingApply, setConfirmingApply] = useState(false)

  const variance = cr.currentApprovedISO ? dateDiffDays(cr.currentApprovedISO, cr.proposedISO) : null
  const later = variance != null && variance > 0
  const earlier = variance != null && variance < 0
  const criticalPathChanged = !!cr.scheduleImpact?.onCriticalChain && variance !== 0

  const awaitingDecision = cr.status === 'Awaiting Approval' || cr.status === 'Returned for Information'
  const readyToApply = cr.status === 'Approved'

  const confirmDecision = () => {
    if (!pendingDecision) return
    onDecision(pendingDecision, comment.trim())
    setPendingDecision(null)
    setComment('')
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white text-slate-900">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onClose} className="shrink-0 text-xs font-medium text-slate-500 hover:text-slate-800">
            ← Back
          </button>
          <span className="h-3.5 w-px shrink-0 bg-slate-200" />
          <h1 className="min-w-0 truncate text-sm font-semibold text-slate-900">
            {cr.reference} · {cr.title}
          </h1>
          <StatusPill status={cr.status} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 pl-[calc(2.75rem+1px)] text-xs text-slate-500">
          <span>
            Project: <span className="font-medium text-slate-700">{cr.project}</span>
          </span>
          <span>
            Requester: <span className="font-medium text-slate-700">{cr.requestedBy}</span>
          </span>
          <span>
            Submitted: <span className="font-medium text-slate-700">{fmtDate(cr.submittedDate)}</span>
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="mx-auto max-w-3xl space-y-7">
            <Section title="Current vs Proposed">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="min-w-0 border-r border-slate-100 pr-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Current Approved</div>
                    <div className="mt-1 text-xs text-slate-500">{cr.affectedField}</div>
                    <div className="mt-1 truncate text-xl font-semibold text-slate-500 line-through decoration-slate-300">
                      {cr.currentApproved}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-500">Proposed</div>
                    <div className="mt-1 text-xs text-slate-500">{cr.affectedField}</div>
                    <div
                      className={`mt-1 truncate text-xl font-semibold ${later ? 'text-rose-700' : earlier ? 'text-emerald-700' : 'text-blue-700'}`}
                    >
                      {cr.proposedDisplay}
                    </div>
                  </div>
                </div>
                {variance !== null && (
                  <div
                    className={`mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs font-medium ${
                      later ? 'text-rose-700' : earlier ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  >
                    {variance === 0 ? (
                      'No variance from the approved value'
                    ) : (
                      <>
                        <span aria-hidden="true">{later ? '▲' : '▼'}</span>
                        <span>
                          {later ? '+' : ''}
                          {variance} days {later ? 'later' : 'earlier'} · Affects{' '}
                          <span className="font-semibold">{cr.affectedEntity}</span>
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </Section>

            <Section title="Impact">
              {cr.scheduleImpact ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <ImpactStat label="Schedule Variance">
                    {variance === null || variance === 0 ? 'None' : `${later ? '+' : ''}${variance}d`}
                  </ImpactStat>
                  <ImpactStat label="Milestones">{cr.scheduleImpact.affectedMilestones}</ImpactStat>
                  <ImpactStat label="Dependencies">{cr.scheduleImpact.dependenciesAffected}</ImpactStat>
                  <ImpactStat label="Critical Path" warn={criticalPathChanged}>
                    {criticalPathChanged ? 'Changed' : 'No impact'}
                  </ImpactStat>
                </div>
              ) : (
                <p className="text-xs text-slate-400">No schedule impact was calculated for this request.</p>
              )}

              {/* Budget / Risks / Deliverables impact sections are intentionally
                  omitted rather than shown empty — nothing in this prototype's
                  Budget or Risks data links a record to a Schedule entity (see
                  changeRequestImpact.ts), so there's no real figure to show
                  under those headings, only a fabricated one. Resource Impact
                  is the one extra section that IS grounded in real data
                  (Activity.owner), so it's the only one shown below. */}
              {cr.scheduleImpact && cr.scheduleImpact.affectedOwners.length > 0 && (
                <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Resource Impact</div>
                  <p className="mt-1 text-xs text-slate-500">
                    {cr.scheduleImpact.affectedOwners.length}{' '}
                    {cr.scheduleImpact.affectedOwners.length === 1 ? 'owner has' : 'owners have'} Activities in the affected
                    range:
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {cr.scheduleImpact.affectedOwners.map((owner) => (
                      <span key={owner} className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                        {owner}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            <Section title="Justification">
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <p className="whitespace-pre-wrap text-sm text-slate-700">{cr.reason}</p>
                {(cr.category || cr.priority || cr.effectiveDate || cr.businessImpact) && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                    {cr.category && (
                      <span>
                        Category: <span className="font-medium text-slate-700">{cr.category}</span>
                      </span>
                    )}
                    {cr.priority && (
                      <span>
                        Priority: <span className="font-medium text-slate-700">{cr.priority}</span>
                      </span>
                    )}
                    {cr.effectiveDate && (
                      <span>
                        Effective: <span className="font-medium text-slate-700">{fmtDate(cr.effectiveDate)}</span>
                      </span>
                    )}
                    {cr.businessImpact && (
                      <span className="basis-full text-slate-600">
                        Business impact: <span className="text-slate-700">{cr.businessImpact}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Section>

            {cr.attachments.length > 0 && (
              <Section title="Evidence">
                <ul className="space-y-1">
                  {cr.attachments.map((name) => (
                    <li
                      key={name}
                      className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600"
                    >
                      <span aria-hidden="true">📎</span>
                      <span className="truncate">{name}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="Workflow / Activity">
              <ol className="space-y-3">
                {cr.activity.map((entry) => (
                  <li key={entry.id} className="flex gap-2.5">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${ACTIVITY_DOT[entry.type]}`} />
                    <div className="min-w-0 flex-1 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                      <div className="flex flex-wrap items-baseline gap-x-1.5 text-xs">
                        <span className="font-medium text-slate-800">{ACTIVITY_LABEL[entry.type]}</span>
                        <span className="text-slate-400">by {entry.actor}</span>
                        <span className="text-slate-400">· {fmtDate(entry.timestamp)}</span>
                      </div>
                      {entry.comment && <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{entry.comment}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          </div>
        </main>

        <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-slate-50/50">
          <div className="space-y-4 p-4">
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Decision</h2>
              <p className="mt-1 text-[11px] leading-snug text-slate-500">
                {awaitingDecision
                  ? 'Choose an action for this Change Request.'
                  : readyToApply
                    ? "Approved — the Project's approved value hasn't changed yet."
                    : 'This request has been resolved.'}
              </p>
            </div>

            {!awaitingDecision && !readyToApply ? (
              <div className="rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600">
                Status: <span className="font-medium text-slate-800">{cr.status}</span>
              </div>
            ) : readyToApply ? (
              !confirmingApply ? (
                <button
                  type="button"
                  onClick={() => setConfirmingApply(true)}
                  className="w-full rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Apply to Project
                </button>
              ) : (
                <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
                  <div className="text-xs font-semibold text-slate-800">Apply this change?</div>
                  <p className="text-[11px] leading-snug text-slate-500">
                    <span className="font-medium text-slate-700">{cr.affectedField}</span> for{' '}
                    <span className="font-medium text-slate-700">{cr.affectedEntity}</span> moves to{' '}
                    <span className="font-medium text-slate-700">{cr.proposedDisplay}</span>. The current approved value is
                    kept in Baseline History, not overwritten.
                  </p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setConfirmingApply(false)}
                      className="flex-1 rounded border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onApply(cr.reference)
                        setConfirmingApply(false)
                      }}
                      className="flex-1 rounded bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      Confirm Apply
                    </button>
                  </div>
                </div>
              )
            ) : pendingDecision === null ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setPendingDecision('approved')}
                  className="w-full rounded bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDecision('rejected')}
                  className="w-full rounded border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDecision('returned')}
                  className="w-full rounded border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                >
                  Return for Information
                </button>
              </div>
            ) : (
              <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
                <div className="text-xs font-semibold text-slate-800">{DECISION_LABEL[pendingDecision]}</div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500" htmlFor="cr-decision-comment">
                    Comment
                    {pendingDecision !== 'approved' && <RequiredMark />}
                  </label>
                  <textarea
                    id="cr-decision-comment"
                    autoFocus
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={DECISION_PLACEHOLDER[pendingDecision]}
                    className="w-full resize-none rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                  />
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingDecision(null)
                      setComment('')
                    }}
                    className="flex-1 rounded border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDecision}
                    disabled={pendingDecision !== 'approved' && comment.trim() === ''}
                    className="flex-1 rounded bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
