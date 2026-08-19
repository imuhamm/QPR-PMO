import { useEffect, useMemo, useRef, useState } from 'react'
import type { ActivityRow, PendingActivityPatch, ScheduleRow } from './scheduleData'
import { MOCK_CURRENT_USER, MOCK_TODAY, dateDiffDays, isPhaseRow, remainingDurationDays } from './scheduleData'
import { ActivityStatusCell, DraftEditCell, VarianceCell } from './cells'

type ActivityFilter = 'mine' | 'all'

// "18 Aug 2026" — distinct from the grid's own fmtDate (which drops the
// year for density) because a Status Date is a standalone report anchor,
// read outside the context of any single row, so the year can't be implied.
function fmtStatusDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const NAME_MIN_WIDTH = 220
const COL = {
  owner: 76,
  status: 100,
  pct: 50,
  actualStart: 70,
  actualFinish: 70,
  remaining: 76,
  forecastFinish: 76,
  variance: 62,
  note: 34,
}

// The one field this dense table exposes that isn't a stored ActivityRow
// field — editing it solves back for % Complete against the row's current
// total Duration, same rule the Activity Details panel already uses.
function RemainingDurationCell({
  totalDuration,
  days,
  width,
  onChangeDays,
}: {
  totalDuration: number | undefined
  days: number | null
  width: number
  onChangeDays: (n: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(days != null ? String(days) : '')

  if (totalDuration == null) {
    return (
      <div style={{ width }} className="shrink-0 truncate px-2 text-slate-300">
        —
      </div>
    )
  }

  const commit = () => {
    setEditing(false)
    const n = Number(draft)
    if (draft === '' || Number.isNaN(n) || n < 0) {
      setDraft(days != null ? String(days) : '')
      return
    }
    onChangeDays(n)
  }

  if (editing) {
    return (
      <div style={{ width }} className="flex shrink-0 items-center gap-1 px-1" onClick={(e) => e.stopPropagation()}>
        <input
          type="number"
          min={0}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setDraft(days != null ? String(days) : '')
              setEditing(false)
            }
          }}
          className="w-full min-w-0 rounded-sm border border-blue-400 bg-white px-1 py-0.5 text-[11px] text-slate-800 outline-none ring-1 ring-blue-200"
        />
      </div>
    )
  }

  return (
    <div
      style={{ width }}
      onClick={(e) => {
        e.stopPropagation()
        setDraft(days != null ? String(days) : '')
        setEditing(true)
      }}
      title="Click to edit — recalculates % Complete"
      className="shrink-0 cursor-text truncate px-2 text-slate-600"
    >
      {days != null ? `${days}d` : '—'}
    </div>
  )
}

function NoteCell({
  committedNote,
  draftNote,
  width,
  onChange,
}: {
  committedNote?: string
  draftNote?: string
  width: number
  onChange: (note: string) => void
}) {
  const [open, setOpen] = useState(false)
  const effective = draftNote ?? committedNote
  const hasNote = !!effective && effective.trim() !== ''
  const [draft, setDraft] = useState(effective ?? '')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={rootRef} style={{ width }} className="relative flex shrink-0 items-center justify-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setDraft(effective ?? '')
          setOpen((v) => !v)
        }}
        title={hasNote ? 'View / edit progress note' : 'Add a progress note'}
        className={`text-sm leading-none ${hasNote ? 'text-blue-600' : 'text-slate-300 hover:text-slate-400'}`}
      >
        {hasNote ? '📝' : '📄'}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-30 mt-1 w-56 rounded-md border border-slate-200 bg-white p-2 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            autoFocus
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What changed since the last update?"
            className="w-full resize-none rounded border border-slate-300 bg-white px-1.5 py-1 text-[11px] text-slate-800 outline-none placeholder:text-slate-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
          />
          <div className="mt-1 flex justify-end">
            <button
              type="button"
              onClick={() => {
                onChange(draft)
                setOpen(false)
              }}
              className="text-[11px] font-medium text-blue-600 hover:text-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ActivityRowLine({
  activity,
  draft,
  onUpdateDraft,
}: {
  activity: ActivityRow
  draft: PendingActivityPatch | undefined
  onUpdateDraft: (patch: PendingActivityPatch) => void
}) {
  const isDirty = !!draft && Object.keys(draft).length > 0
  const effectivePct = draft?.percentComplete ?? activity.percentComplete
  const effectiveEnd = draft?.end ?? activity.end
  const remainingDays = remainingDurationDays({
    ...activity,
    percentComplete: effectivePct,
    actualFinish: draft?.actualFinish ?? activity.actualFinish,
  })
  const variance = activity.baselineFinish && effectiveEnd ? dateDiffDays(activity.baselineFinish, effectiveEnd) : null

  return (
    <div
      style={{ minWidth: NAME_MIN_WIDTH + Object.values(COL).reduce((a, b) => a + b, 0) }}
      className={`group flex items-center border-b border-slate-100 text-[11px] text-slate-600 transition-colors hover:bg-blue-50/40 ${
        isDirty ? 'border-l-2 border-l-amber-400' : 'border-l-2 border-l-transparent'
      }`}
    >
      <div
        className="flex min-w-0 flex-1 items-center gap-1.5 truncate px-2 py-1"
        style={{ paddingLeft: 20, minWidth: NAME_MIN_WIDTH }}
      >
        <span className="truncate">{activity.name}</span>
        {isDirty && (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
            title="Unsaved changes — Save Updates or Discard"
          />
        )}
      </div>

      <div style={{ width: COL.owner }} className="shrink-0 truncate px-2">
        {activity.owner ?? '—'}
      </div>

      <ActivityStatusCell
        committedStatus={activity.status}
        draftStatus={draft?.status}
        width={COL.status}
        onChange={(value) => onUpdateDraft({ status: value })}
      />

      <DraftEditCell
        committedValue={activity.percentComplete != null ? String(activity.percentComplete) : undefined}
        draftValue={draft?.percentComplete != null ? String(draft.percentComplete) : undefined}
        width={COL.pct}
        type="number"
        suffix="%"
        onChange={(value) =>
          onUpdateDraft({ percentComplete: value === '' ? undefined : Math.max(0, Math.min(100, Number(value))) })
        }
        validate={(next) => {
          const n = Number(next)
          return next && (Number.isNaN(n) || n < 0 || n > 100) ? '0–100 only' : null
        }}
      />

      <DraftEditCell
        committedValue={activity.actualStart}
        draftValue={draft?.actualStart}
        width={COL.actualStart}
        type="date"
        onChange={(value) => onUpdateDraft({ actualStart: value || undefined })}
        validate={(next) => {
          const finish = draft?.actualFinish ?? activity.actualFinish
          return next && finish && next > finish ? 'After Actual Finish' : null
        }}
      />
      <DraftEditCell
        committedValue={activity.actualFinish}
        draftValue={draft?.actualFinish}
        width={COL.actualFinish}
        type="date"
        onChange={(value) => onUpdateDraft({ actualFinish: value || undefined })}
        validate={(next) => {
          const start = draft?.actualStart ?? activity.actualStart
          return next && start && next < start ? 'Before Actual Start' : null
        }}
      />

      <RemainingDurationCell
        totalDuration={activity.durationDays}
        days={remainingDays}
        width={COL.remaining}
        onChangeDays={(n) => {
          if (!activity.durationDays) return
          const pct = Math.max(0, Math.min(100, Math.round(100 * (1 - n / activity.durationDays))))
          onUpdateDraft({ percentComplete: pct })
        }}
      />

      <DraftEditCell
        committedValue={activity.end}
        draftValue={draft?.end}
        width={COL.forecastFinish}
        type="date"
        onChange={(value) => onUpdateDraft({ end: value || undefined })}
        validate={(next) => (next && activity.start && next < activity.start ? 'Finish must be on or after Start' : null)}
      />

      <VarianceCell days={variance} width={COL.variance} />

      <NoteCell
        committedNote={activity.progressNote}
        draftNote={draft?.progressNote}
        width={COL.note}
        onChange={(note) => onUpdateDraft({ progressNote: note || undefined })}
      />
    </div>
  )
}

// A focused, single-pane alternative to the full grid+Gantt Schedule view —
// entered via the Project header's "Update Progress" button (or the
// toolbar's own entry point) for periodic reporting sessions where a PM
// works through several Activities' progress fields in one sitting. Reads
// and writes the exact same pendingEdits draft the full grid and the
// Activity Details panel use — this is a different lens on the same data,
// not a separate editing system, and it still stages edits rather than
// saving per keystroke.
export function UpdateProgressMode({
  rows,
  pendingEdits,
  onUpdateDraft,
  onCancel,
  onSave,
  saving,
  previousStatusDate,
}: {
  rows: ScheduleRow[]
  pendingEdits: Record<string, PendingActivityPatch>
  onUpdateDraft: (id: string, patch: PendingActivityPatch) => void
  onCancel: () => void
  onSave: (statusDate: string) => void
  saving: boolean
  /** The Project's current "Last Progress Update" — shown as context, not editable here. */
  previousStatusDate?: string
}) {
  const [statusDate, setStatusDate] = useState(MOCK_TODAY)
  const [filter, setFilter] = useState<ActivityFilter>('all')

  const groups = useMemo(() => {
    const phases = rows.filter(isPhaseRow)
    return phases
      .map((phase) => ({
        phase,
        activities: rows.filter(
          (r): r is ActivityRow =>
            r.kind === 'activity' &&
            r.parentId === phase.id &&
            (filter === 'all' || r.owner === MOCK_CURRENT_USER),
        ),
      }))
      .filter((g) => g.activities.length > 0)
  }, [rows, filter])

  const pendingCount = Object.keys(pendingEdits).length
  const totalWidth = NAME_MIN_WIDTH + Object.values(COL).reduce((a, b) => a + b, 0)

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Update Progress</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Bulk-edit routine progress fields across Activities — the same as editing them in the Schedule grid,
              just focused on periodic reporting.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <div className="flex items-center gap-2 text-xs">
              <label className="text-slate-500" htmlFor="status-date">
                Progress reported as of
              </label>
              <input
                id="status-date"
                type="date"
                value={statusDate}
                onChange={(e) => setStatusDate(e.target.value)}
                className={`rounded border bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 ${
                  statusDate ? 'border-slate-300' : 'border-amber-300'
                }`}
              />
            </div>
            {previousStatusDate && (
              <span className="text-[11px] text-slate-400">Previous update: {fmtStatusDate(previousStatusDate)}</span>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center overflow-hidden rounded border border-slate-200">
            {(['mine', 'all'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  filter === f ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f === 'mine' ? 'My Activities' : 'All Activities'}
              </button>
            ))}
          </div>
          {pendingCount > 0 && (
            <span className="text-[11px] font-medium text-amber-700">
              {pendingCount} {pendingCount === 1 ? 'activity' : 'activities'} with unsaved changes
            </span>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div
          style={{ minWidth: totalWidth }}
          className="sticky top-0 z-10 flex items-center border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500"
        >
          <div style={{ minWidth: NAME_MIN_WIDTH }} className="flex-1 truncate px-2 py-1.5">
            Activity
          </div>
          <div style={{ width: COL.owner }} className="shrink-0 truncate px-2">
            Owner
          </div>
          <div style={{ width: COL.status }} className="shrink-0 truncate px-2">
            Status
          </div>
          <div style={{ width: COL.pct }} className="shrink-0 truncate px-2">
            % Comp
          </div>
          <div style={{ width: COL.actualStart }} className="shrink-0 truncate px-2">
            Act. Start
          </div>
          <div style={{ width: COL.actualFinish }} className="shrink-0 truncate px-2">
            Act. Finish
          </div>
          <div style={{ width: COL.remaining }} className="shrink-0 truncate px-2">
            Remaining
          </div>
          <div style={{ width: COL.forecastFinish }} className="shrink-0 truncate px-2">
            Fcst Finish
          </div>
          <div style={{ width: COL.variance }} className="shrink-0 truncate px-2">
            Var.
          </div>
          <div style={{ width: COL.note }} className="shrink-0 truncate px-1 text-center" title="Progress note">
            Note
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-slate-400">
            {filter === 'mine' ? `No Activities owned by ${MOCK_CURRENT_USER}.` : 'No scheduled Activities yet.'}
          </div>
        ) : (
          groups.map(({ phase, activities }) => (
            <div key={phase.id}>
              <div
                style={{ minWidth: totalWidth }}
                className="flex items-center bg-slate-50/70 px-2 py-1 text-[11px] font-semibold text-slate-700"
              >
                {phase.wbs} {phase.name}
              </div>
              {activities.map((activity) => (
                <ActivityRowLine
                  key={activity.id}
                  activity={activity}
                  draft={pendingEdits[activity.id]}
                  onUpdateDraft={(patch) => onUpdateDraft(activity.id, patch)}
                />
              ))}
            </div>
          ))
        )}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-2.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(statusDate)}
          disabled={saving || pendingCount === 0 || !statusDate}
          title={!statusDate ? 'Select a Status Date to continue' : undefined}
          className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          {saving ? 'Saving…' : 'Save Updates'}
        </button>
      </div>
    </div>
  )
}
