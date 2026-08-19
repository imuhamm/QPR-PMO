import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { ScheduleRow } from '../schedule/scheduleData'
import { MOCK_CURRENT_USER } from '../schedule/scheduleData'
import type { ScheduleImpactScope, ScheduleImpactSummary } from './changeRequestImpact'
import { computeScheduleImpact } from './changeRequestImpact'
import { RequiredMark } from './validation/InlineMessage'
import { CHANGE_CATEGORIES, CHANGE_PRIORITIES } from './changeRequestStore'
import type { ChangeCategory, ChangePriority } from './changeRequestStore'

// What a "Request Change" click from BaselineValue hands off — everything
// the panel needs to render without asking the user to re-pick a Project or
// field. currentApprovedISO is optional because a baseline can be unset
// ("No baseline set" cells are still protected/clickable); the mocked delta
// simply doesn't render without a date to diff against. scope is optional
// for the same forward-compatibility reason as currentApprovedISO — every
// trigger today is schedule-related, but a future non-schedule protected
// field (e.g. a locked Budget total) can omit it and the Impact Analysis
// step will simply skip the Schedule Impact section.
export interface ChangeRequestDraft {
  affectedEntity: string
  affectedField: string
  currentApproved: string
  currentApprovedISO?: string
  scope?: ScheduleImpactScope
  /**
   * Set only when the flow was triggered from an edit the user already
   * made, not from a "Request Change" click on a read-only field (e.g. the
   * significant-schedule-impact gate on a Forecast Finish edit) — the
   * requester has already told the system what they want; asking them to
   * re-enter it on step one would be pointless. When set, the panel starts
   * pre-filled and on the Impact Analysis step instead of Details.
   */
  initialProposed?: string
  /**
   * Governs the Proposed input and its Review formatting. 'date' (the
   * default, and every existing Schedule-sourced trigger) keeps the native
   * date picker and day-delta badge; 'text' is for governed fields with no
   * real date to propose (Overview's Project Manager, Strategic Alignment,
   * ...) — a plain text input, no Impact step (no `scope` either, so it
   * would have nothing to show), and no date-formatted Review value.
   */
  fieldType?: 'date' | 'text'
}

// The only things this flow still needs from a human — everything else
// (Project, field, current/proposed value, calculated impact) is already
// known by the time this step is reached. Only title and reason are
// required; the rest exists for the requester to add context if they have
// it, not because a reviewer can't proceed without it.
export interface ChangeRequestJustification {
  title: string
  reason: string
  effectiveDate?: string
  category?: ChangeCategory
  priority?: ChangePriority
  businessImpact?: string
  attachments: string[]
}

function dateDiffDays(aISO: string, bISO: string): number {
  return Math.round((new Date(bISO).getTime() - new Date(aISO).getTime()) / 86_400_000)
}

function fmtProposedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const fieldClass =
  'w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200'
const labelClass = 'mb-1 block text-[11px] font-medium text-slate-500'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2 border-t border-slate-200 pt-3 first:border-t-0 first:pt-0">
      <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      {children}
    </div>
  )
}

function ImpactStat({ label, children, warn }: { label: string; children: ReactNode; warn?: boolean }) {
  return (
    <div className={`rounded-md border p-2.5 ${warn ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50/60'}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-0.5 text-base font-semibold ${warn ? 'text-amber-800' : 'text-slate-800'}`}>{children}</div>
    </div>
  )
}

// The strong before/after the task calls for — Current Approved and
// Proposed read side by side with a connecting arrow, plus a signed,
// color-coded variance line, rather than two more stacked label/value rows
// that would read the same as everything above them.
function BeforeAfterCard({ before, after, varianceDays }: { before: string; after: string; varianceDays: number }) {
  const later = varianceDays > 0
  const earlier = varianceDays < 0
  const valueClass = later ? 'text-rose-700' : earlier ? 'text-emerald-700' : 'text-slate-800'
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Current Approved</div>
          <div className="mt-0.5 truncate text-sm font-semibold text-slate-500 line-through decoration-slate-300">{before}</div>
        </div>
        <span aria-hidden="true" className="shrink-0 text-slate-300">
          →
        </span>
        <div className="min-w-0 text-right">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Proposed</div>
          <div className={`mt-0.5 truncate text-sm font-semibold ${valueClass}`}>{after}</div>
        </div>
      </div>
      <div className={`mt-2 flex items-center gap-1 border-t border-slate-100 pt-2 text-[11px] font-medium ${valueClass}`}>
        {varianceDays === 0 ? (
          <span className="text-slate-500">No schedule variance</span>
        ) : (
          <>
            <span aria-hidden="true">{later ? '▲' : '▼'}</span>
            <span>
              {later ? '+' : ''}
              {varianceDays} days
            </span>
          </>
        )}
      </div>
    </div>
  )
}

// Dense "label left, value right" row — the review step's own convention
// for anything that's just a fact to confirm, not something to compare.
// Same density as ActivityDetailsPanel's Field.
function ReviewRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-slate-800">{children}</span>
    </div>
  )
}

// The literal side-by-side comparison the task calls for — two equal
// columns, each reading "Field: Value", rather than the arrow-transition
// BeforeAfterCard above (that one's for exploring a delta; this one's for
// confirming exactly what's on record before submitting).
function CurrentVsProposedCard({ field, current, proposed }: { field: string; current: string; proposed: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-md border border-slate-200 bg-slate-50/60 p-2.5">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Current Approved</div>
        <div className="mt-1 text-xs text-slate-600">
          {field}:{' '}
          <span className="font-semibold text-slate-700 line-through decoration-slate-300">{current}</span>
        </div>
      </div>
      <div className="rounded-md border border-blue-200 bg-blue-50/60 p-2.5">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-500">Proposed</div>
        <div className="mt-1 text-xs text-slate-600">
          {field}: <span className="font-semibold text-blue-800">{proposed}</span>
        </div>
      </div>
    </div>
  )
}

const STEP_LABEL = {
  details: 'New Change Request',
  impact: 'Impact Analysis',
  justification: 'Justification',
  review: 'Review Request',
  confirmation: 'Request Submitted',
} as const

// Five steps: capture what's changing (details), show what it touches
// (impact — generated entirely from the current schedule), ask the
// requester for the one thing the system genuinely can't infer (why),
// summarize everything for a final read before it goes anywhere (review —
// no editable fields here; Back is the only way to change something), then
// confirm. Submitting only ever produces a CR record — it never touches
// baselineStart/baselineFinish or any other approved-plan field; those stay
// exactly what they were until a real approval flow (not built yet) changes
// them.
export function ChangeRequestPanel({
  project,
  request,
  rows,
  onCancel,
  onSubmit,
  onViewCR,
}: {
  project: string
  request: ChangeRequestDraft
  /** Current schedule — read-only, used only to generate the Impact Analysis step. */
  rows: ScheduleRow[]
  onCancel: () => void
  /** Fired once, at Submit — lets the parent record the CR (impact snapshot included, so the reviewer detail view never has to recompute it later) and returns the assigned reference. */
  onSubmit: (proposedValue: string, justification: ChangeRequestJustification, impact: ScheduleImpactSummary | null) => string
  /** Confirmation step's "View Change Request" — opens the reviewer detail view for the CR just submitted. */
  onViewCR: (reference: string) => void
}) {
  const [step, setStep] = useState<'details' | 'impact' | 'justification' | 'review' | 'confirmation'>(
    request.initialProposed ? 'impact' : 'details',
  )
  const [proposed, setProposed] = useState(request.initialProposed ?? '')
  const [reference, setReference] = useState('')

  const [title, setTitle] = useState('')
  const [reason, setReason] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [category, setCategory] = useState<ChangeCategory | ''>('')
  const [priority, setPriority] = useState<ChangePriority | ''>('')
  const [businessImpact, setBusinessImpact] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  const [addingAttachment, setAddingAttachment] = useState(false)
  const [attachmentName, setAttachmentName] = useState('')

  const isText = request.fieldType === 'text'
  const delta = request.currentApprovedISO && proposed ? dateDiffDays(request.currentApprovedISO, proposed) : null

  const impact = useMemo(() => {
    if (!request.scope || !proposed) return null
    return computeScheduleImpact(rows, request.scope, proposed)
  }, [rows, request.scope, proposed])

  const criticalPathChanged = !!impact?.onCriticalChain && delta !== 0
  const canReview = title.trim() !== '' && reason.trim() !== ''

  const addAttachment = () => {
    const trimmed = attachmentName.trim()
    if (trimmed) setAttachments((prev) => [...prev, trimmed])
    setAttachmentName('')
    setAddingAttachment(false)
  }

  const buildJustification = (): ChangeRequestJustification => ({
    title: title.trim(),
    reason: reason.trim(),
    effectiveDate: effectiveDate || undefined,
    category: category || undefined,
    priority: priority || undefined,
    businessImpact: businessImpact.trim() || undefined,
    attachments,
  })

  const handleSubmit = () => {
    setReference(onSubmit(proposed, buildJustification(), impact))
    setStep('confirmation')
  }

  return (
    <aside className="flex h-full w-96 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5">
        <div className="min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{STEP_LABEL[step]}</span>
          <div className="truncate text-xs font-medium text-slate-700">{project}</div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          ✕
        </button>
      </div>

      {step === 'details' && (
        <div className="flex-1 space-y-4 px-3 py-3">
          <p className="text-[11px] leading-snug text-slate-500">
            Carried over from the field you were viewing — the Project and field below don't need to be re-selected.
          </p>

          <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50/60 p-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Affected Item</div>
              <div className="text-sm font-medium text-slate-800">{request.affectedEntity}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Field</div>
              <div className="text-sm font-medium text-slate-800">{request.affectedField}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Current Approved</div>
              <div className="text-sm font-medium italic text-slate-600">{request.currentApproved}</div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500" htmlFor="cr-proposed-value">
              Proposed
            </label>
            <input
              id="cr-proposed-value"
              type={isText ? 'text' : 'date'}
              value={proposed}
              onChange={(e) => setProposed(e.target.value)}
              placeholder={isText ? 'Describe the proposed value…' : undefined}
              className={fieldClass}
            />
          </div>

          {proposed && delta !== null && (
            <div
              className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium ${
                delta === 0 ? 'bg-slate-100 text-slate-500' : delta > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {delta === 0 ? (
                'Same as the approved value'
              ) : (
                <>
                  <span aria-hidden="true">{delta > 0 ? '▲' : '▼'}</span>
                  {Math.abs(delta)}d {delta > 0 ? 'later' : 'earlier'} than approved ({fmtProposedDate(proposed)})
                </>
              )}
            </div>
          )}
        </div>
      )}

      {step === 'impact' && impact && (
        <div className="flex-1 space-y-4 px-3 py-3">
          <p className="text-[11px] leading-snug text-slate-500">
            Generated from the current schedule — nothing here needs to be entered by hand.
          </p>

          <Section title="Schedule Impact">
            <BeforeAfterCard before={request.currentApproved} after={fmtProposedDate(proposed)} varianceDays={delta ?? 0} />
            <div className="grid grid-cols-2 gap-2">
              <ImpactStat label="Affected Activities">{impact.affectedActivities}</ImpactStat>
              <ImpactStat label="Affected Milestones">{impact.affectedMilestones}</ImpactStat>
              <ImpactStat label="Critical Path" warn={criticalPathChanged}>
                {criticalPathChanged ? 'Changed' : 'No impact'}
              </ImpactStat>
              <ImpactStat label="Dependencies Affected">{impact.dependenciesAffected}</ImpactStat>
            </div>
          </Section>

          {impact.affectedOwners.length > 0 && (
            <Section title="Resource Impact">
              <p className="text-[11px] text-slate-500">
                {impact.affectedOwners.length} {impact.affectedOwners.length === 1 ? 'owner has' : 'owners have'} Activities in
                the affected range:
              </p>
              <div className="flex flex-wrap gap-1">
                {impact.affectedOwners.map((owner) => (
                  <span key={owner} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    {owner}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {step === 'justification' && (
        <div className="flex-1 space-y-4 px-3 py-3">
          <div>
            <label className={labelClass} htmlFor="cr-title">
              Change Title
              <RequiredMark />
            </label>
            <input
              id="cr-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`${request.affectedField} — ${request.affectedEntity}`}
              className={fieldClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-800" htmlFor="cr-reason">
              Why is this approved commitment being changed?
              <RequiredMark />
            </label>
            <textarea
              id="cr-reason"
              rows={5}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="This is what the reviewer reads first — explain the driver for the change."
              className={`${fieldClass} resize-none`}
            />
          </div>

          <div className="space-y-3 border-t border-slate-200 pt-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Additional Details (Optional)</h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass} htmlFor="cr-effective-date">
                  Effective Date
                </label>
                <input
                  id="cr-effective-date"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="cr-priority">
                  Priority
                </label>
                <select
                  id="cr-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ChangePriority | '')}
                  className={fieldClass}
                >
                  <option value="">—</option>
                  {CHANGE_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="cr-category">
                Change Category
              </label>
              <select
                id="cr-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ChangeCategory | '')}
                className={fieldClass}
              >
                <option value="">—</option>
                {CHANGE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="cr-business-impact">
                Business Impact
              </label>
              <textarea
                id="cr-business-impact"
                rows={2}
                value={businessImpact}
                onChange={(e) => setBusinessImpact(e.target.value)}
                placeholder="What happens if this isn't approved?"
                className={`${fieldClass} resize-none`}
              />
            </div>

            <div>
              <label className={labelClass}>Supporting Attachments</label>
              {attachments.length > 0 && (
                <ul className="mb-1 space-y-1">
                  {attachments.map((name) => (
                    <li
                      key={name}
                      className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-[11px] text-slate-600"
                    >
                      <span className="min-w-0 truncate">📎 {name}</span>
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((a) => a !== name))}
                        aria-label={`Remove ${name}`}
                        className="shrink-0 text-slate-400 hover:text-rose-600"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {addingAttachment ? (
                <input
                  autoFocus
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  onBlur={addAttachment}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addAttachment()
                    if (e.key === 'Escape') {
                      setAttachmentName('')
                      setAddingAttachment(false)
                    }
                  }}
                  placeholder="File or link name…"
                  className="w-full rounded border border-blue-400 bg-white px-2 py-1 text-xs text-slate-800 outline-none ring-1 ring-blue-200"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingAttachment(true)}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-700"
                >
                  + Add attachment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 'details' && (
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 px-3 py-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setStep(isText ? 'justification' : 'impact')}
            disabled={!proposed}
            className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            Continue
          </button>
        </div>
      )}

      {step === 'impact' && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 px-3 py-2">
          <button
            type="button"
            onClick={() => setStep('details')}
            className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setStep('justification')}
            className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
          >
            Continue
          </button>
        </div>
      )}

      {step === 'justification' && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 px-3 py-2">
          <button
            type="button"
            onClick={() => setStep(isText ? 'details' : 'impact')}
            className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setStep('review')}
            disabled={!canReview}
            className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            Review Request
          </button>
        </div>
      )}

      {step === 'review' && (
        <div className="flex-1 space-y-4 px-3 py-3">
          <p className="text-[11px] leading-snug text-slate-500">
            Final check before this goes anywhere — nothing on this screen is editable; use Back to change something.
          </p>

          <Section title="Request">
            <ReviewRow label="Change Title">{title}</ReviewRow>
            <ReviewRow label="Project">{project}</ReviewRow>
            <ReviewRow label="Requester">{MOCK_CURRENT_USER}</ReviewRow>
            {category && <ReviewRow label="Change Category">{category}</ReviewRow>}
          </Section>

          <Section title="Current vs Proposed">
            <CurrentVsProposedCard
              field={request.affectedField}
              current={request.currentApproved}
              proposed={isText ? proposed : fmtProposedDate(proposed)}
            />
          </Section>

          {impact && (
            <Section title="Impact">
              <ImpactStat label="Schedule Variance">
                {delta === 0 ? 'None' : `${delta! > 0 ? '+' : ''}${delta} days`}
              </ImpactStat>
              <div className="grid grid-cols-2 gap-2">
                <ImpactStat label="Activities Affected">{impact.affectedActivities}</ImpactStat>
                <ImpactStat label="Milestones Affected">{impact.affectedMilestones}</ImpactStat>
                <ImpactStat label="Critical Path" warn={criticalPathChanged}>
                  {criticalPathChanged ? 'Changed' : 'No impact'}
                </ImpactStat>
                <ImpactStat label="Dependencies Affected">{impact.dependenciesAffected}</ImpactStat>
              </div>
              {impact.affectedOwners.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {impact.affectedOwners.map((owner) => (
                    <span key={owner} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {owner}
                    </span>
                  ))}
                </div>
              )}
            </Section>
          )}

          <Section title="Justification">
            <p className="whitespace-pre-wrap text-xs text-slate-700">{reason}</p>
          </Section>

          {attachments.length > 0 && (
            <Section title="Attachments">
              <ul className="space-y-1">
                {attachments.map((name) => (
                  <li
                    key={name}
                    className="flex items-center gap-1.5 truncate rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-[11px] text-slate-600"
                  >
                    <span aria-hidden="true">📎</span>
                    <span className="truncate">{name}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}

      {step === 'confirmation' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg text-emerald-600">✓</div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Change Request submitted</div>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">
              The approved baseline is unchanged until this is reviewed.
            </p>
          </div>
          <div className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50/60 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Reference</div>
            <div className="text-sm font-semibold text-slate-800">{reference}</div>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium leading-none text-blue-700 ring-1 ring-inset ring-blue-200">
              Submitted · Awaiting Review
            </div>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 px-3 py-2">
          <button
            type="button"
            onClick={() => setStep('justification')}
            className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
          >
            Submit Request
          </button>
        </div>
      )}

      {step === 'confirmation' && (
        <div className="flex shrink-0 items-center justify-end border-t border-slate-200 px-3 py-2">
          <button
            type="button"
            onClick={() => {
              onCancel()
              onViewCR(reference)
            }}
            className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
          >
            View Change Request
          </button>
        </div>
      )}
    </aside>
  )
}
