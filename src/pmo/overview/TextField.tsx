import { useState } from 'react'
import type { FieldStatus } from '../shared/FieldStatus'
import { FieldStatusLine } from '../shared/FieldStatus'

export function TextField({
  value,
  onCommit,
  required,
  placeholder = 'Not set',
}: {
  value: string
  onCommit: (value: string) => Promise<void>
  required?: boolean
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
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

  const startEdit = () => {
    setDraft(value)
    setEditing(true)
  }

  const commitOrValidate = () => {
    const trimmed = draft.trim()
    if (required && !trimmed) {
      setStatus('required')
      return
    }
    setEditing(false)
    if (trimmed === value) {
      setStatus('idle')
      return
    }
    void attemptCommit(trimmed)
  }

  if (editing) {
    return (
      <div>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitOrValidate}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitOrValidate()
            if (e.key === 'Escape') {
              setEditing(false)
              setStatus('idle')
            }
          }}
          className={`w-full rounded-sm border bg-white px-1.5 py-0.5 text-xs text-slate-800 outline-none ${
            status === 'required' ? 'border-rose-400 ring-1 ring-rose-300' : 'border-blue-400 ring-1 ring-blue-200'
          }`}
        />
        {status === 'required' && <FieldStatusLine status="required" />}
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
        {value || <span className="italic text-slate-400">{placeholder}</span>}
      </button>
      <FieldStatusLine status={status} onRetry={() => lastAttempt !== null && attemptCommit(lastAttempt)} />
    </div>
  )
}
