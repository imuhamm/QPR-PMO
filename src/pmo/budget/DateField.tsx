import { useState } from 'react'
import type { FieldStatus } from '../shared/FieldStatus'
import { FieldStatusLine } from '../shared/FieldStatus'
import { InlineMessage } from '../shared/validation/InlineMessage'

function fmtDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function DateField({
  value,
  onCommit,
  locked,
  validate,
}: {
  value?: string
  onCommit: (value: string) => Promise<void>
  locked?: boolean
  validate?: (next: string) => string | null
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [invalidMsg, setInvalidMsg] = useState<string | null>(null)
  const [status, setStatus] = useState<FieldStatus>('idle')
  const [lastAttempt, setLastAttempt] = useState<string | null>(null)

  const attemptCommit = async (next: string) => {
    setStatus('saving')
    try {
      await onCommit(next)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 1500)
    } catch {
      setLastAttempt(next)
      setStatus('error')
    }
  }

  if (locked) {
    return (
      <div className="flex items-center gap-1.5">
        <span
          title="Locked — Planned Dates cannot be changed once locked"
          className="cursor-default text-xs italic text-slate-400"
        >
          {value ? fmtDateLong(value) : 'Not set'}
        </span>
        <span className="rounded bg-slate-100 px-1 py-0.5 text-[10px] text-slate-400">Locked</span>
      </div>
    )
  }

  const startEdit = () => {
    setDraft(value ?? '')
    setInvalidMsg(null)
    setEditing(true)
  }

  const commitOrValidate = () => {
    const trimmed = draft.trim()
    if (trimmed === value) {
      setEditing(false)
      setInvalidMsg(null)
      return
    }
    if (trimmed && validate) {
      const err = validate(trimmed)
      if (err) {
        setInvalidMsg(err)
        return
      }
    }
    setInvalidMsg(null)
    setEditing(false)
    void attemptCommit(trimmed)
  }

  if (editing) {
    return (
      <div>
        <input
          type="date"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitOrValidate}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitOrValidate()
            if (e.key === 'Escape') {
              setInvalidMsg(null)
              setEditing(false)
            }
          }}
          className={`rounded-sm border bg-white px-1.5 py-0.5 text-xs text-slate-800 outline-none ${
            invalidMsg ? 'border-rose-400 ring-1 ring-rose-300' : 'border-blue-400 ring-1 ring-blue-200'
          }`}
        />
        {invalidMsg && (
          <span className="ml-1.5 inline-block">
            <InlineMessage severity="field-error">{invalidMsg}</InlineMessage>
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={startEdit}
        className="min-w-0 flex-1 truncate rounded-sm px-1.5 py-0.5 text-left text-xs text-slate-800 hover:bg-slate-50"
      >
        {value ? fmtDateLong(value) : <span className="italic text-slate-400">Not set</span>}
      </button>
      <FieldStatusLine status={status} onRetry={() => lastAttempt !== null && attemptCommit(lastAttempt)} />
    </div>
  )
}
