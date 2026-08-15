import { useState } from 'react'
import type { ActivityRow, ScheduleRow } from './scheduleData'
import { daysBetween } from './scheduleData'
import { PredecessorEditor } from './PredecessorEditor'
import { OwnerPicker } from '../shared/OwnerPicker'
import { InlineMessage, RequiredMark } from '../shared/validation/InlineMessage'
import { SaveErrorNotice } from '../shared/validation/SaveErrorNotice'

export interface ActivityPatch {
  name: string
  owner?: string
  start?: string
  end?: string
  predecessorId?: string
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// A deliberate multi-field transaction: nothing here commits until Save is
// pressed, unlike the grid's per-field auto-commit-on-blur.
export function ActivityInspector({
  activity,
  rows,
  phaseName,
  onSave,
  onClose,
}: {
  activity: ActivityRow
  rows: ScheduleRow[]
  phaseName: string
  onSave: (patch: ActivityPatch) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(activity.name)
  const [owner, setOwner] = useState(activity.owner ?? '')
  const [start, setStart] = useState(activity.start ?? '')
  const [end, setEnd] = useState(activity.end ?? '')
  const [predecessorId, setPredecessorId] = useState(activity.predecessorId ?? '')
  const [predecessorPickerOpen, setPredecessorPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateError, setDateError] = useState<string | null>(null)

  const predecessorRow = predecessorId
    ? (rows.find((r) => r.id === predecessorId) as ActivityRow | undefined)
    : undefined
  // Reflects the current draft, not the original row, so the picker's
  // view/pick mode matches what's actually selected right now.
  const draftActivity: ActivityRow = { ...activity, predecessorId: predecessorId || undefined }

  const duration = start && end ? daysBetween(start, end) : null
  const nameInvalid = name.trim() === ''

  const handleClearDates = () => {
    setStart('')
    setEnd('')
    setDateError(null)
  }

  const handleSave = async () => {
    if (nameInvalid) return
    if (start && end && end < start) {
      setDateError('Finish must be on or after Start')
      return
    }
    setDateError(null)
    setSaving(true)
    setError(null)
    try {
      await onSave({
        name: name.trim(),
        owner: owner || undefined,
        start: start || undefined,
        end: end || undefined,
        predecessorId: predecessorId || undefined,
      })
      onClose()
    } catch {
      setError("Couldn't save changes")
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Activity Details</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close activity details"
          className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-3 p-3">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-500">
            Activity Name<RequiredMark />
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full rounded border bg-white px-2 py-1 text-xs text-slate-800 outline-none ${
              nameInvalid ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-200'
            }`}
          />
          {nameInvalid && <InlineMessage severity="field-error">Required</InlineMessage>}
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-500">Phase</label>
          <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500">{phaseName}</div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-500">Owner</label>
          <OwnerPicker value={owner} onChange={setOwner} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Start</label>
            <input
              type="date"
              value={start}
              onChange={(e) => {
                setStart(e.target.value)
                setDateError(null)
              }}
              className={`w-full rounded border bg-white px-2 py-1 text-xs text-slate-800 outline-none ${
                dateError ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-200'
              }`}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Finish</label>
            <input
              type="date"
              value={end}
              onChange={(e) => {
                setEnd(e.target.value)
                setDateError(null)
              }}
              className={`w-full rounded border bg-white px-2 py-1 text-xs text-slate-800 outline-none ${
                dateError ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-200'
              }`}
            />
          </div>
        </div>
        {dateError && <InlineMessage severity="field-error">{dateError}</InlineMessage>}
        {(start || end) && (
          <button type="button" onClick={handleClearDates} className="text-[11px] font-medium text-blue-600 hover:text-blue-700">
            Clear dates
          </button>
        )}

        <div className="rounded border border-slate-100 bg-slate-50 px-2 py-1.5">
          <div className="text-[11px] text-slate-500">Resulting schedule position</div>
          <div className="text-xs italic text-slate-500">
            {duration ? (
              <>
                {duration}d <span className="text-slate-400">· {fmtDate(start)} → {fmtDate(end)}</span>
              </>
            ) : (
              'Unscheduled'
            )}
          </div>
        </div>

        <div className="relative">
          <label className="mb-1 block text-[11px] font-medium text-slate-500">Predecessor</label>
          <button
            type="button"
            onClick={() => setPredecessorPickerOpen((v) => !v)}
            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-left text-xs text-slate-800 hover:bg-slate-50"
          >
            {predecessorRow ? (
              `${predecessorRow.wbs} ${predecessorRow.name}`
            ) : (
              <span className="italic text-slate-400">None</span>
            )}
          </button>
          {predecessorPickerOpen && (
            <div className="absolute left-0 top-full z-30 mt-1">
              <PredecessorEditor
                rows={rows}
                activity={draftActivity}
                onSelect={(id) => {
                  setPredecessorId(id)
                  setPredecessorPickerOpen(false)
                }}
                onRemove={() => {
                  setPredecessorId('')
                  setPredecessorPickerOpen(false)
                }}
                onClose={() => setPredecessorPickerOpen(false)}
              />
            </div>
          )}
        </div>

        {error && <SaveErrorNotice message={error} onRetry={handleSave} />}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 px-3 py-2">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || nameInvalid}
          className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </aside>
  )
}
