import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { ActivityStatus, PendingActivityPatch, ScheduleRow } from './scheduleData'
import type { ActivityRow } from './scheduleData'
import {
  ACTIVITY_STATUS_OPTIONS,
  daysBetween,
  dateDiffDays,
  floatDays,
  isOnCriticalChain,
  MOCK_CURRENT_USER,
} from './scheduleData'
import { BaselineValue, PendingChangeNotice } from '../shared/BaselineValue'
import type { PendingChangeRequestInfo } from '../shared/BaselineValue'
import type { ChangeRequestDraft } from '../shared/ChangeRequestPanel'
import { canWithdrawStatus, findPendingChangeRequest, pendingStatusLabel } from '../shared/changeRequestStore'
import type { SubmittedChangeRequest } from '../shared/changeRequestStore'
import { computeScheduleImpact } from '../shared/changeRequestImpact'
import type { ActivityHistoryEntry } from './activityHistory'

// A simplified governance rule for this prototype: an edit that both sits
// on the critical chain AND would move the Project's overall finish by more
// than this many days needs approval before it can be saved directly. A
// real system would likely make this configurable per Project/org — the
// point demonstrated here is that *some* system rule decides this, not
// that the user has to know or check it themselves before editing.
const SIGNIFICANT_IMPACT_THRESHOLD_DAYS = 10

function fmtDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtHistoryDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function toPendingInfo(cr: SubmittedChangeRequest): PendingChangeRequestInfo {
  return {
    reference: cr.reference,
    proposedDisplay: cr.proposedDisplay,
    statusLabel: pendingStatusLabel(cr.status),
    canWithdraw: cr.requestedBy === MOCK_CURRENT_USER && canWithdrawStatus(cr.status),
  }
}

// Section header + body — a thin top divider and an uppercase label is the
// only chrome; no card, no shadow, matching the grid's own dense language
// rather than introducing a heavier "form panel" look.
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5 border-t border-slate-200 px-3 py-2.5 first:border-t-0 first:pt-3">
      <h4 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{title}</h4>
      {children}
    </div>
  )
}

// A read-only "label ⟷ value" row — the density workhorse for every
// non-editable field in the panel (Activity/Baseline/Performance/audit).
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-slate-800">{children}</span>
    </div>
  )
}

function VarianceValue({ days }: { days: number | null }) {
  if (days === null) return <span className="text-slate-400">—</span>
  if (days === 0) return <span className="text-slate-600">On time</span>
  const late = days > 0
  return (
    <span className={late ? 'text-rose-600' : 'text-emerald-600'}>
      {late ? '▲' : '▼'} {Math.abs(days)}d {late ? 'behind' : 'ahead'}
    </span>
  )
}

function ImpactRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      {children}
    </div>
  )
}

export interface ScheduleImpact {
  varianceDays: number
  downstreamCount: number
  milestonesAffected: number
  criticalPathAffected: boolean
  projectEndDeltaDays: number
}

// Informational, not a gate — this never blocks Save Update on its own, it
// just tells the PM what a Forecast Finish edit ripples into before they
// commit it. No approval framing (no "requires review", no rose/red alarm
// styling): this is still a normal forecast update, same as any other cell
// edit. Once the same numbers cross SIGNIFICANT_IMPACT_THRESHOLD_DAYS,
// SignificantImpactGate below takes over instead of this.
function ScheduleImpactPreview({ impact }: { impact: ScheduleImpact }) {
  const { varianceDays, downstreamCount, milestonesAffected, criticalPathAffected, projectEndDeltaDays } = impact
  return (
    <div className="mt-1.5 space-y-1 rounded border border-blue-100 bg-blue-50/50 px-2 py-1.5 text-[11px]">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">Schedule Impact</div>
      <ImpactRow label="Forecast variance">
        <span className={`font-medium ${varianceDays > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
          {varianceDays > 0 ? '+' : ''}
          {varianceDays}d
        </span>
      </ImpactRow>
      <ImpactRow label="Downstream activities affected">
        <span className={downstreamCount > 0 ? 'font-medium text-slate-800' : 'text-slate-400'}>{downstreamCount}</span>
      </ImpactRow>
      <ImpactRow label="Milestones affected">
        <span className={milestonesAffected > 0 ? 'font-medium text-slate-800' : 'text-slate-400'}>{milestonesAffected}</span>
      </ImpactRow>
      <ImpactRow label="Critical path">
        <span className={criticalPathAffected ? 'font-medium text-amber-700' : 'text-slate-400'}>
          {criticalPathAffected ? 'May be affected' : 'No impact'}
        </span>
      </ImpactRow>
      <ImpactRow label="Project completion">
        <span className={projectEndDeltaDays !== 0 ? 'font-medium text-rose-600' : 'text-slate-400'}>
          {projectEndDeltaDays === 0
            ? 'No change'
            : `${projectEndDeltaDays > 0 ? '+' : ''}${projectEndDeltaDays}d`}
        </span>
      </ImpactRow>
    </div>
  )
}

// The gate the task asks for: once ScheduleImpactPreview's own numbers
// cross the threshold, this replaces it — same underlying impact, framed
// as a blocker instead of a preview. Discard/Request Change replace Save
// Update in the footer while this is showing (see the isGated branch
// below), so there's no direct path to committing this edit to the working
// schedule at all.
function SignificantImpactGate({ impact }: { impact: ScheduleImpact }) {
  return (
    <div className="mt-1.5 space-y-2 rounded-md border border-rose-200 bg-rose-50 p-2.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-800">
        <span aria-hidden="true">⚠</span> Significant schedule impact
      </div>
      <p className="text-[11px] leading-snug text-rose-700">
        This update exceeds the permitted change threshold and cannot be applied directly.
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded border border-rose-200 bg-white px-2 py-1.5">
          <div className="text-[9px] font-semibold uppercase tracking-wide text-rose-400">Downstream Activities</div>
          <div className="text-sm font-semibold text-slate-800">{impact.downstreamCount}</div>
        </div>
        <div className="rounded border border-rose-200 bg-white px-2 py-1.5">
          <div className="text-[9px] font-semibold uppercase tracking-wide text-rose-400">Milestones Affected</div>
          <div className="text-sm font-semibold text-slate-800">{impact.milestonesAffected}</div>
        </div>
        <div className="rounded border border-rose-200 bg-white px-2 py-1.5">
          <div className="text-[9px] font-semibold uppercase tracking-wide text-rose-400">Critical Path</div>
          <div className="text-sm font-semibold text-amber-700">Changed</div>
        </div>
        <div className="rounded border border-rose-200 bg-white px-2 py-1.5">
          <div className="text-[9px] font-semibold uppercase tracking-wide text-rose-400">Project Finish</div>
          <div className="text-sm font-semibold text-rose-700">
            {impact.projectEndDeltaDays > 0 ? '+' : ''}
            {impact.projectEndDeltaDays}d
          </div>
        </div>
      </div>
    </div>
  )
}

// Deliberately separate from the CR system's own history displays
// (ChangeRequestDetailView's Workflow/Activity feed, BaselineHistoryPanel)
// — this is routine operational tracking (Status/% Complete/Forecast
// Finish/Actuals/Notes), not a governance record, so it never mentions a CR
// and never appears anywhere the CR flow does. Read-only: there's no action
// on any of these rows, on purpose.
function HistoryEntryCard({ entry }: { entry: ActivityHistoryEntry }) {
  return (
    <div className="border-b border-slate-100 pb-2.5 last:border-b-0 last:pb-0">
      <div className="text-[11px] font-medium text-slate-500">{fmtHistoryDate(entry.timestamp)}</div>
      <div className="mt-0.5 text-xs font-semibold text-slate-800">{entry.field}</div>
      {entry.field === 'Progress Note' ? (
        <p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-600">{entry.note}</p>
      ) : (
        <div className="mt-0.5 text-xs">
          <span className="text-slate-400 line-through decoration-slate-300">{entry.oldValue}</span>
          <span aria-hidden="true" className="mx-1 text-slate-300">
            →
          </span>
          <span className="font-medium text-slate-800">{entry.newValue}</span>
        </div>
      )}
      {entry.note && entry.field !== 'Progress Note' && (
        <p className="mt-1 flex items-start gap-1 text-[11px] italic text-slate-500">
          <span aria-hidden="true">📝</span>
          <span>{entry.note}</span>
        </p>
      )}
      {entry.attachmentsAdded && entry.attachmentsAdded.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {entry.attachmentsAdded.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
            >
              📎 {name}
            </span>
          ))}
        </div>
      )}
      <div className="mt-1 text-[11px] text-slate-400">{entry.actor}</div>
    </div>
  )
}

function StatusPicker({
  value,
  onChange,
}: {
  value?: ActivityStatus
  onChange: (value: ActivityStatus) => void
}) {
  const [open, setOpen] = useState(false)
  const current = ACTIVITY_STATUS_OPTIONS.find((o) => o.id === value)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded border border-slate-300 bg-white px-2 py-1 text-left text-xs hover:bg-slate-50"
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${current?.dot ?? 'bg-slate-200'}`} />
        <span className={current ? 'text-slate-800' : 'text-slate-400'}>{current?.label ?? 'Not set'}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-md border border-slate-200 bg-white py-1 shadow-lg">
            {ACTIVITY_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setOpen(false)
                  onChange(opt.id)
                }}
                className={`flex w-full items-center gap-1.5 px-2 py-1 text-left text-xs hover:bg-blue-50 ${
                  opt.id === value ? 'font-medium text-blue-700' : 'text-slate-700'
                }`}
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${opt.dot}`} />
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Every editable field in this panel writes into the same pendingEdits
// draft the grid's cells read from — editing % Complete here and editing it
// in the grid are the same action from two surfaces, not two competing
// save paths.
export function ActivityDetailsPanel({
  activity,
  rows,
  phaseName,
  draft,
  onUpdateDraft,
  onSave,
  onCancel,
  saving,
  locked,
  onRequestChange,
  submittedCRs,
  onWithdrawCR,
  onViewCR,
  history,
}: {
  activity: ActivityRow
  rows: ScheduleRow[]
  phaseName: string
  draft: PendingActivityPatch | undefined
  onUpdateDraft: (patch: PendingActivityPatch) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  /** No baseline exists until a Project is approved — Baseline Start/Finish render as a plain, non-interactive placeholder instead of a Change-Request-protected value while this is false. */
  locked: boolean
  onRequestChange: (draft: ChangeRequestDraft) => void
  submittedCRs: SubmittedChangeRequest[]
  onWithdrawCR: (reference: string) => void
  onViewCR: (reference: string) => void
  /** This Activity's own operational-field history — already filtered to it by ScheduleWorkspace. */
  history: ActivityHistoryEntry[]
}) {
  const [view, setView] = useState<'details' | 'history'>('details')
  const [noteDraft, setNoteDraft] = useState(draft?.progressNote ?? activity.progressNote ?? '')
  const [attachmentDraft, setAttachmentDraft] = useState(draft?.attachments ?? activity.attachments ?? [])
  const [addingAttachment, setAddingAttachment] = useState(false)
  const [attachmentName, setAttachmentName] = useState('')

  const isDirty = !!draft && Object.keys(draft).length > 0
  const critical = isOnCriticalChain(activity, rows)
  const float = floatDays(activity, rows)

  const effectiveStart = draft?.start ?? activity.start
  const effectiveEnd = draft?.end ?? activity.end
  const effectivePct = draft?.percentComplete ?? activity.percentComplete
  const effectiveActualStart = draft?.actualStart ?? activity.actualStart
  const effectiveActualFinish = draft?.actualFinish ?? activity.actualFinish

  const baselineDuration =
    activity.baselineStart && activity.baselineFinish ? daysBetween(activity.baselineStart, activity.baselineFinish) : null
  const variance = activity.baselineFinish && effectiveEnd ? dateDiffDays(activity.baselineFinish, effectiveEnd) : null

  const activityScope = { kind: 'activity' as const, id: activity.id }
  const baselineStartCR = findPendingChangeRequest(submittedCRs, activityScope, 'Baseline Start')
  const baselineFinishCR = findPendingChangeRequest(submittedCRs, activityScope, 'Baseline Finish')

  // Progressive disclosure: only compute/show impact once the draft Forecast
  // Finish actually differs from what's currently saved — reselecting the
  // same date, or not touching the field at all, shows nothing. This is a
  // preview of a normal forecast edit, not a gate — it never blocks Save
  // Update, and the Baseline itself is never touched by any of this.
  // Reuses the exact same computeScheduleImpact the CR flow's own Impact
  // Analysis step runs — this preview (and the gate it can turn into) shows
  // the requester the identical numbers a reviewer would eventually see,
  // rather than a separately-maintained approximation that could drift.
  const scheduleImpact = useMemo<ScheduleImpact | null>(() => {
    if (!activity.end || !effectiveEnd) return null
    const varianceDays = dateDiffDays(activity.end, effectiveEnd)
    if (varianceDays === 0) return null

    const summary = computeScheduleImpact(rows, { kind: 'activity', id: activity.id }, effectiveEnd)
    return {
      varianceDays,
      downstreamCount: summary.affectedActivities - 1,
      milestonesAffected: summary.affectedMilestones,
      criticalPathAffected: summary.onCriticalChain,
      projectEndDeltaDays: summary.projectFinishDeltaDays ?? 0,
    }
  }, [activity, effectiveEnd, rows])

  // The significant-impact escalation is a governance concern tied to the
  // approved baseline (see ProtectedDateCell's own `locked` gate) — nothing
  // is approved yet in the creation state, so a Draft edit always saves
  // directly, however large.
  const isGated =
    locked &&
    !!scheduleImpact &&
    scheduleImpact.criticalPathAffected &&
    Math.abs(scheduleImpact.projectEndDeltaDays) > SIGNIFICANT_IMPACT_THRESHOLD_DAYS

  // Discard and Request Change both route through the same full onCancel
  // the normal Cancel button uses (discards this Activity's whole pending
  // draft and closes the panel) rather than resetting just the `end` field
  // in place — a reset still leaves an `end` key sitting in the draft with
  // its old value, which the toolbar's "N activities with unsaved changes"
  // banner and this panel's own dirty dot can't tell apart from a real
  // pending edit, so it would never clear. A gated edit is significant
  // enough that starting the session over clean is the right call anyway —
  // there's no path from here to still having an ordinary in-flight edit on
  // this same Activity.
  const requestChangeForGatedForecast = () => {
    if (!effectiveEnd) return
    onRequestChange({
      affectedEntity: activity.name,
      affectedField: 'Forecast Finish',
      currentApproved: fmtDate(activity.end),
      currentApprovedISO: activity.end,
      scope: activityScope,
      initialProposed: effectiveEnd,
    })
    onCancel()
  }

  // Remaining Duration is Duration's inverse of % Complete — editing it here
  // solves back for % Complete rather than storing a second, potentially
  // inconsistent number: "9 days left" is often how a PM thinks about
  // progress, but there's only one underlying fact (% Complete) to update.
  const totalDuration = activity.durationDays
  const remainingDays =
    totalDuration != null && effectivePct != null ? Math.max(0, Math.round(totalDuration * (1 - effectivePct / 100))) : null
  const [remainingDraft, setRemainingDraft] = useState(remainingDays != null ? String(remainingDays) : '')
  const [remainingEditing, setRemainingEditing] = useState(false)

  const commitRemaining = () => {
    setRemainingEditing(false)
    if (totalDuration == null) return
    const n = Number(remainingDraft)
    if (remainingDraft === '' || Number.isNaN(n) || n < 0) {
      setRemainingDraft(remainingDays != null ? String(remainingDays) : '')
      return
    }
    const pct = Math.max(0, Math.min(100, Math.round(100 * (1 - n / totalDuration))))
    onUpdateDraft({ percentComplete: pct })
  }

  const addAttachment = () => {
    const trimmed = attachmentName.trim()
    if (!trimmed) {
      setAddingAttachment(false)
      return
    }
    const next = [...attachmentDraft, trimmed]
    setAttachmentDraft(next)
    onUpdateDraft({ attachments: next })
    setAttachmentName('')
    setAddingAttachment(false)
  }

  const removeAttachment = (name: string) => {
    const next = attachmentDraft.filter((a) => a !== name)
    setAttachmentDraft(next)
    onUpdateDraft({ attachments: next })
  }

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Activity Details</span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close activity details"
          className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          ✕
        </button>
      </div>

      {/* No update history exists yet in the creation state — nothing has
          been saved for this Activity to have a history of, so there's
          nothing to switch to and no tab bar to switch with. */}
      {locked && (
        <div className="flex shrink-0 border-b border-slate-200 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setView('details')}
            className={`flex-1 px-3 py-1.5 ${view === 'details' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => setView('history')}
            className={`flex-1 px-3 py-1.5 ${view === 'history' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            History{history.length > 0 ? ` (${history.length})` : ''}
          </button>
        </div>
      )}

      {locked && view === 'history' ? (
        <div className="flex-1 space-y-3 px-3 py-3">
          {history.length === 0 ? (
            <p className="text-xs text-slate-400">No updates recorded yet.</p>
          ) : (
            [...history].reverse().map((entry) => <HistoryEntryCard key={entry.id} entry={entry} />)
          )}
        </div>
      ) : (
      <div className="flex-1">
        <Section title="Activity">
          <div className="truncate text-sm font-semibold text-slate-900">{activity.name}</div>
          <Field label="WBS / Phase">
            {activity.wbs} · {phaseName}
          </Field>
          <Field label="Owner">{activity.owner ?? '—'}</Field>
          {critical && (
            <span className="mt-0.5 inline-flex items-center gap-1 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-600 ring-1 ring-inset ring-rose-200">
              ● Critical Path
            </span>
          )}
        </Section>

        {/* Status/Baseline/Forecast/Actuals/Performance/Update Notes are all
            execution- or approval-tracking concepts — none of them exist yet
            in the creation state (see the `!locked` branch below instead:
            just Start/End, the two dates a Draft Activity actually has). */}
        {locked && (
          <>
        <Section title="Progress">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Status</label>
            <StatusPicker value={draft?.status ?? activity.status} onChange={(v) => onUpdateDraft({ status: v })} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">% Complete</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                value={effectivePct ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  onUpdateDraft({ percentComplete: v === '' ? undefined : Math.max(0, Math.min(100, Number(v))) })
                }}
                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
              />
              <span className="text-xs text-slate-400">%</span>
            </div>
          </div>
        </Section>

        <Section title="Baseline">
          <div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="shrink-0 text-slate-500">Baseline Start</span>
              {locked ? (
                <BaselineValue
                  panelAlign="right"
                  triggerClassName="rounded-sm px-1 py-0.5 font-medium text-slate-800"
                  onRequestChange={() =>
                    onRequestChange({
                      affectedEntity: activity.name,
                      affectedField: 'Baseline Start',
                      currentApproved: fmtDate(activity.baselineStart),
                      currentApprovedISO: activity.baselineStart,
                      scope: activityScope,
                    })
                  }
                  pending={baselineStartCR ? toPendingInfo(baselineStartCR) : undefined}
                  onWithdraw={() => baselineStartCR && onWithdrawCR(baselineStartCR.reference)}
                  onViewCR={() => baselineStartCR && onViewCR(baselineStartCR.reference)}
                >
                  {fmtDate(activity.baselineStart)}
                </BaselineValue>
              ) : (
                <span title="No baseline yet — set once this Project is approved" className="italic text-slate-300">
                  Not yet baselined
                </span>
              )}
            </div>
            {/* Roomy context — the pending block stays visible here, not just
                inside the popover (the Schedule grid's cells are too narrow
                for that; this panel isn't). */}
            {locked && baselineStartCR && (
              <div className="mt-1">
                <PendingChangeNotice
                  compact
                  pending={toPendingInfo(baselineStartCR)}
                  onWithdraw={() => onWithdrawCR(baselineStartCR.reference)}
                  onViewCR={() => onViewCR(baselineStartCR.reference)}
                />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="shrink-0 text-slate-500">Baseline Finish</span>
              {locked ? (
                <BaselineValue
                  panelAlign="right"
                  triggerClassName="rounded-sm px-1 py-0.5 font-medium text-slate-800"
                  onRequestChange={() =>
                    onRequestChange({
                      affectedEntity: activity.name,
                      affectedField: 'Baseline Finish',
                      currentApproved: fmtDate(activity.baselineFinish),
                      currentApprovedISO: activity.baselineFinish,
                      scope: activityScope,
                    })
                  }
                  pending={baselineFinishCR ? toPendingInfo(baselineFinishCR) : undefined}
                  onWithdraw={() => baselineFinishCR && onWithdrawCR(baselineFinishCR.reference)}
                  onViewCR={() => baselineFinishCR && onViewCR(baselineFinishCR.reference)}
                >
                  {fmtDate(activity.baselineFinish)}
                </BaselineValue>
              ) : (
                <span title="No baseline yet — set once this Project is approved" className="italic text-slate-300">
                  Not yet baselined
                </span>
              )}
            </div>
            {locked && baselineFinishCR && (
              <div className="mt-1">
                <PendingChangeNotice
                  compact
                  pending={toPendingInfo(baselineFinishCR)}
                  onWithdraw={() => onWithdrawCR(baselineFinishCR.reference)}
                  onViewCR={() => onViewCR(baselineFinishCR.reference)}
                />
              </div>
            )}
          </div>
          <Field label="Baseline Duration">{baselineDuration != null ? `${baselineDuration}d` : '—'}</Field>
        </Section>

        <Section title="Current Forecast">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Forecast Finish</label>
            <input
              type="date"
              value={effectiveEnd ?? ''}
              onChange={(e) => onUpdateDraft({ end: e.target.value || undefined })}
              className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
            {scheduleImpact &&
              (isGated ? <SignificantImpactGate impact={scheduleImpact} /> : <ScheduleImpactPreview impact={scheduleImpact} />)}
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Remaining Duration</label>
            {totalDuration == null ? (
              <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-400">Unscheduled</div>
            ) : remainingEditing ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  autoFocus
                  value={remainingDraft}
                  onChange={(e) => setRemainingDraft(e.target.value)}
                  onBlur={commitRemaining}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRemaining()
                    if (e.key === 'Escape') {
                      setRemainingDraft(remainingDays != null ? String(remainingDays) : '')
                      setRemainingEditing(false)
                    }
                  }}
                  className="w-full rounded border border-blue-400 bg-white px-2 py-1 text-xs text-slate-800 outline-none ring-1 ring-blue-200"
                />
                <span className="text-xs text-slate-400">d</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setRemainingDraft(remainingDays != null ? String(remainingDays) : '')
                  setRemainingEditing(true)
                }}
                title="Click to edit — recalculates % Complete"
                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-left text-xs text-slate-800 hover:bg-slate-50"
              >
                {remainingDays != null ? `${remainingDays}d` : '—'}
              </button>
            )}
          </div>
        </Section>

        <Section title="Actuals">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Actual Start</label>
            <input
              type="date"
              value={effectiveActualStart ?? ''}
              onChange={(e) => onUpdateDraft({ actualStart: e.target.value || undefined })}
              className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Actual Finish</label>
            <input
              type="date"
              value={effectiveActualFinish ?? ''}
              onChange={(e) => onUpdateDraft({ actualFinish: e.target.value || undefined })}
              className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
          </div>
        </Section>

        <Section title="Performance">
          <Field label="Schedule Variance">
            <VarianceValue days={variance} />
          </Field>
          {float != null && <Field label="Float">{float}d</Field>}
          <Field label="Critical Path">{critical ? 'On critical chain' : 'Not on critical chain'}</Field>
        </Section>

        <Section title="Update Notes">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Progress Note</label>
            <textarea
              rows={3}
              value={noteDraft}
              onChange={(e) => {
                setNoteDraft(e.target.value)
                onUpdateDraft({ progressNote: e.target.value || undefined })
              }}
              placeholder="What changed since the last update?"
              className="w-full resize-none rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none placeholder:text-slate-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Attachments / Evidence</label>
            {attachmentDraft.length > 0 && (
              <ul className="mb-1 space-y-1">
                {attachmentDraft.map((name) => (
                  <li
                    key={name}
                    className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-[11px] text-slate-600"
                  >
                    <span className="min-w-0 truncate">📎 {name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(name)}
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

          <Field label="Last Updated By">{activity.lastUpdatedBy ?? '—'}</Field>
          <Field label="Last Updated">{fmtDate(activity.lastUpdatedDate)}</Field>
        </Section>
          </>
        )}

        {!locked && (
          <Section title="Schedule">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-500">Start</label>
              <input
                type="date"
                value={effectiveStart ?? ''}
                onChange={(e) => onUpdateDraft({ start: e.target.value || undefined })}
                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-500">End</label>
              <input
                type="date"
                value={effectiveEnd ?? ''}
                onChange={(e) => onUpdateDraft({ end: e.target.value || undefined })}
                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
              />
            </div>
            <Field label="Duration">
              {effectiveStart && effectiveEnd ? `${daysBetween(effectiveStart, effectiveEnd)}d` : '—'}
            </Field>
          </Section>
        )}
      </div>
      )}

      {isGated ? (
        // No path to Save Update while gated — Discard/Request Change are
        // the only two ways forward, per the task's "cannot be applied
        // directly." Both neutralize the attempted edit; only Request
        // Change also hands it off to the CR flow first.
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-rose-200 bg-rose-50/50 px-3 py-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Discard Change
          </button>
          <button
            type="button"
            onClick={requestChangeForGatedForecast}
            className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
          >
            Request Change
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 px-3 py-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !isDirty}
            className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {saving ? 'Saving…' : 'Save Update'}
          </button>
        </div>
      )}
    </aside>
  )
}
