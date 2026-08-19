import { useEffect, useRef, useState } from 'react'
import type { ActivityStatus } from './scheduleData'
import { ACTIVITY_STATUS_OPTIONS, fmtDate } from './scheduleData'
import type { CellSaveStatus } from './useInlineCellSave'
import { InlineMessage } from '../shared/validation/InlineMessage'

// Shared dense-grid cell primitives — used by both the full Schedule grid
// (ScheduleGrid.tsx) and the Update Progress table (UpdateProgressMode.tsx),
// so a Status dropdown or a draft-aware date cell looks and behaves
// identically no matter which surface it's rendered in.

export function StatusDot({ status, onRetry }: { status: CellSaveStatus; onRetry: () => void }) {
  if (status === 'idle') return null
  if (status === 'saving') return <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-500" />
  if (status === 'saved') return <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onRetry()
      }}
      title="Couldn't save — click to retry"
      className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500"
    />
  )
}

export function VarianceCell({ days, width }: { days: number | null; width: number }) {
  if (days === null) {
    return (
      <div style={{ width }} className="shrink-0 truncate px-2 text-slate-300">
        —
      </div>
    )
  }
  if (days === 0) {
    return (
      <div style={{ width }} className="shrink-0 truncate px-2 text-slate-500">
        On time
      </div>
    )
  }
  const late = days > 0
  return (
    <div
      style={{ width }}
      title={late ? `${days}d behind approved baseline` : `${Math.abs(days)}d ahead of approved baseline`}
      className={`shrink-0 truncate px-2 font-medium ${late ? 'text-rose-600' : 'text-emerald-600'}`}
    >
      <span aria-hidden="true">{late ? '▲' : '▼'}</span> {Math.abs(days)}d
    </div>
  )
}

// Status is one of the routine progress fields staged as a pending, unsaved
// edit — clicking it opens the dropdown directly (no separate edit mode to
// enter first, unlike the text/date cells) and picking an option updates the
// row's draft immediately; nothing commits to `rows` until "Save Updates".
export function ActivityStatusCell({
  committedStatus,
  draftStatus,
  width,
  onChange,
}: {
  committedStatus?: ActivityStatus
  draftStatus?: ActivityStatus
  width: number
  onChange: (value: ActivityStatus) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const isDirty = draftStatus !== undefined && draftStatus !== committedStatus
  const effective = draftStatus ?? committedStatus
  const current = ACTIVITY_STATUS_OPTIONS.find((o) => o.id === effective)

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
    <div ref={rootRef} style={{ width }} className={`relative shrink-0 px-1 ${isDirty ? 'bg-amber-50' : ''}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="flex w-full items-center gap-1.5 truncate rounded-sm px-1 py-0.5 text-left hover:bg-slate-50"
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${current?.dot ?? 'bg-slate-200'}`} />
        <span className={`truncate ${current ? 'text-slate-600' : 'text-slate-300'}`}>{current?.label ?? '—'}</span>
        {isDirty && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title="Unsaved change" />}
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-30 mt-1 w-36 rounded-md border border-slate-200 bg-white py-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {ACTIVITY_STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setOpen(false)
                onChange(opt.id)
              }}
              className={`flex w-full items-center gap-1.5 px-2 py-1 text-left text-[11px] hover:bg-blue-50 ${
                opt.id === effective ? 'font-medium text-blue-700' : 'text-slate-700'
              }`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${opt.dot}`} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// The routine date/number fields (% Complete, Forecast Finish, Actual
// Start/Finish) — a single click opens compact inline editing (unlike the
// full grid's double-click-to-rename convention, since these are meant for
// fast repeated entry), and committing a value updates the row's draft
// rather than saving immediately. Baseline Start/Finish never use this cell
// — those stay on ScheduleGrid's own ProtectedDateCell.
export function DraftEditCell({
  committedValue,
  draftValue,
  width,
  type = 'text',
  suffix,
  onChange,
  validate,
}: {
  committedValue?: string
  draftValue?: string
  width: number
  type?: 'text' | 'date' | 'number'
  suffix?: string
  onChange: (value: string) => void
  validate?: (next: string) => string | null
}) {
  const displayValue = draftValue ?? committedValue
  const isDirty = draftValue !== undefined && draftValue !== (committedValue ?? '')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(displayValue ?? '')
  const [invalidMsg, setInvalidMsg] = useState<string | null>(null)

  const startEdit = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    setDraft(displayValue ?? '')
    setInvalidMsg(null)
    setEditing(true)
  }

  const attemptCommit = () => {
    const trimmed = draft.trim()
    if (trimmed === (displayValue ?? '')) {
      setEditing(false)
      setInvalidMsg(null)
      return
    }
    if (validate) {
      const err = validate(trimmed)
      if (err) {
        setInvalidMsg(err)
        return
      }
    }
    setInvalidMsg(null)
    setEditing(false)
    onChange(trimmed)
  }

  if (editing) {
    return (
      <div style={{ width }} className="flex shrink-0 items-center gap-1 px-1" onClick={(e) => e.stopPropagation()}>
        <input
          type={type}
          autoFocus
          value={draft}
          min={type === 'number' ? 0 : undefined}
          max={type === 'number' ? 100 : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={attemptCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') attemptCommit()
            if (e.key === 'Escape') {
              setInvalidMsg(null)
              setEditing(false)
            }
          }}
          className={`w-full min-w-0 rounded-sm border bg-white px-1 py-0.5 text-[11px] text-slate-800 outline-none ${
            invalidMsg ? 'border-rose-400 ring-1 ring-rose-300' : 'border-blue-400 ring-1 ring-blue-200'
          }`}
        />
        {invalidMsg && (
          <InlineMessage severity="field-error" compact>
            {invalidMsg}
          </InlineMessage>
        )}
      </div>
    )
  }

  return (
    <div
      style={{ width }}
      onClick={startEdit}
      title="Click to edit"
      className={`flex shrink-0 cursor-text items-center gap-1 truncate px-2 ${isDirty ? 'bg-amber-50' : ''}`}
    >
      <span className={`truncate ${displayValue ? 'text-slate-600' : 'text-slate-300'}`}>
        {displayValue ? (type === 'date' ? fmtDate(displayValue) : `${displayValue}${suffix ?? ''}`) : '—'}
      </span>
      {isDirty && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title="Unsaved change" />}
    </div>
  )
}
