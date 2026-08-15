import { useState } from 'react'
import type { FieldStatus } from '../shared/FieldStatus'
import { FieldStatusLine } from '../shared/FieldStatus'

export function TextAreaField({
  value,
  onCommit,
  placeholder = 'Not set — click to add',
}: {
  value: string
  onCommit: (value: string) => Promise<void>
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

  const commit = () => {
    const trimmed = draft.trim()
    setEditing(false)
    if (trimmed === value) {
      setStatus('idle')
      return
    }
    void attemptCommit(trimmed)
  }

  if (editing) {
    return (
      <textarea
        autoFocus
        rows={3}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setEditing(false)
            setStatus('idle')
          }
        }}
        className="w-full resize-none rounded-sm border border-blue-400 bg-white px-1.5 py-1 text-xs leading-relaxed text-slate-800 outline-none ring-1 ring-blue-200"
      />
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setDraft(value)
          setEditing(true)
        }}
        className="block w-full rounded-sm px-1.5 py-0.5 text-left text-xs leading-relaxed text-slate-700 hover:bg-slate-50"
      >
        {value || <span className="italic text-slate-400">{placeholder}</span>}
      </button>
      <FieldStatusLine status={status} onRetry={() => lastAttempt !== null && attemptCommit(lastAttempt)} />
    </div>
  )
}
