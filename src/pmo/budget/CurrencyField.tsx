import { useState } from 'react'
import type { FieldStatus } from '../shared/FieldStatus'
import { FieldStatusLine } from '../shared/FieldStatus'
import { InlineMessage } from '../shared/validation/InlineMessage'
import { formatCurrency } from './budgetData'

export function CurrencyField({
  value,
  onCommit,
  placeholder = 'Not set',
}: {
  value?: number
  onCommit: (value: number | undefined) => Promise<void>
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value !== undefined ? String(value) : '')
  const [invalidMsg, setInvalidMsg] = useState<string | null>(null)
  const [status, setStatus] = useState<FieldStatus>('idle')
  const [lastAttempt, setLastAttempt] = useState<number | undefined>(undefined)

  const attemptCommit = async (next: number | undefined) => {
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
    setDraft(value !== undefined ? String(value) : '')
    setInvalidMsg(null)
    setEditing(true)
  }

  const commitOrValidate = () => {
    const trimmed = draft.trim()
    if (trimmed === '') {
      setEditing(false)
      setInvalidMsg(null)
      if (value !== undefined) void attemptCommit(undefined)
      return
    }
    const parsed = Number(trimmed.replace(/,/g, ''))
    if (Number.isNaN(parsed) || parsed < 0) {
      setInvalidMsg('Enter a valid amount')
      return
    }
    setInvalidMsg(null)
    setEditing(false)
    if (parsed !== value) void attemptCommit(parsed)
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
              setInvalidMsg(null)
              setEditing(false)
            }
          }}
          placeholder="0"
          className={`w-full rounded-sm border bg-white px-1.5 py-0.5 text-xs text-slate-800 outline-none ${
            invalidMsg ? 'border-rose-400 ring-1 ring-rose-300' : 'border-blue-400 ring-1 ring-blue-200'
          }`}
        />
        {invalidMsg && <InlineMessage severity="field-error">{invalidMsg}</InlineMessage>}
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
        {value !== undefined ? formatCurrency(value) : <span className="italic text-slate-400">{placeholder}</span>}
      </button>
      <FieldStatusLine status={status} onRetry={() => lastAttempt !== undefined && attemptCommit(lastAttempt)} />
    </div>
  )
}
