import { useEffect, useRef, useState } from 'react'
import type { FieldStatus } from '../shared/FieldStatus'
import { FieldStatusLine } from '../shared/FieldStatus'

export function SelectField({
  value,
  options,
  onCommit,
  disabled,
  disabledReason,
}: {
  value: string
  options: string[]
  onCommit: (value: string) => Promise<void>
  disabled?: boolean
  disabledReason?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<FieldStatus>('idle')
  const [lastAttempt, setLastAttempt] = useState<string | null>(null)
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

  const handleSelect = (opt: string) => {
    setOpen(false)
    setQuery('')
    if (opt === value) return
    void attemptCommit(opt)
  }

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))

  if (disabled) {
    return (
      <div className="flex items-center gap-2">
        <span className="truncate px-1.5 py-0.5 text-xs text-slate-600">{value}</span>
        <span
          className="shrink-0 rounded bg-slate-100 px-1 py-0.5 text-[10px] text-slate-400"
          title={disabledReason}
        >
          Locked
        </span>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="min-w-0 flex-1 truncate rounded-sm px-1.5 py-0.5 text-left text-xs text-slate-800 hover:bg-slate-50"
      >
        {value || <span className="italic text-slate-400">Not set</span>}
      </button>
      <FieldStatusLine status={status} onRetry={() => lastAttempt !== null && attemptCommit(lastAttempt)} />

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-56 rounded-md border border-slate-200 bg-white shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full border-b border-slate-200 px-2 py-1.5 text-xs outline-none"
          />
          <ul className="max-h-40 overflow-y-auto py-1">
            {filtered.length === 0 && <li className="px-2 py-1.5 text-xs text-slate-400">No matches</li>}
            {filtered.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`block w-full px-2 py-1.5 text-left text-xs hover:bg-blue-50 ${
                    opt === value ? 'font-medium text-blue-700' : 'text-slate-700'
                  }`}
                >
                  {opt}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
