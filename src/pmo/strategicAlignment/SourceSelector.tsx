import { useEffect, useRef, useState } from 'react'
import type { MetricsItem } from './strategicAlignmentData'
import type { SourceListStatus } from './useSourceList'

// Multi-select popover: picking an item toggles it in `value` and the
// popover stays open (unlike a single-select combobox, which closes and
// commits on the first click) — Strategic Objectives and KPIs are both
// confirmed many-per-Project. Selected items surface twice: as chips under
// the trigger (visible without reopening the popover) and as a check mark
// inside the list itself.
export function SourceSelector({
  status,
  items,
  error,
  onRetry,
  value,
  onChange,
  placeholder,
}: {
  status: SourceListStatus
  items: MetricsItem[]
  error: string | null
  onRetry: () => void
  value: string[]
  onChange: (ids: string[]) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
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

  const selected = items.filter((i) => value.includes(i.id))
  const filtered = items.filter(
    (i) => i.name.toLowerCase().includes(query.toLowerCase()) || i.code.toLowerCase().includes(query.toLowerCase()),
  )

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  }
  const remove = (id: string) => onChange(value.filter((v) => v !== id))

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded border border-slate-300 bg-white px-2 py-1 text-left text-xs text-slate-800 hover:bg-slate-50"
      >
        {selected.length > 0 ? (
          <span className="min-w-0 truncate">{selected.length} selected</span>
        ) : (
          <span className="italic text-slate-400">{placeholder}</span>
        )}
        <span className="ml-1 shrink-0 text-slate-400">▾</span>
      </button>

      {selected.length > 0 && (
        <ul className="mt-1.5 flex flex-wrap gap-1">
          {selected.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-1 rounded bg-blue-50 py-0.5 pl-1.5 pr-1 text-[11px] text-blue-700"
            >
              <span className="font-medium">{item.code}</span>
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label={`Remove ${item.code}`}
                className="rounded-sm px-0.5 text-blue-400 hover:bg-blue-100 hover:text-blue-700"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-72 rounded-md border border-slate-200 bg-white shadow-lg">
          {status === 'loading' && (
            <div className="px-3 py-4 text-center text-xs text-slate-400">Loading…</div>
          )}

          {status === 'error' && (
            <div className="flex items-center justify-between px-3 py-3 text-xs text-rose-600">
              <span>{error ?? 'Failed to load'}</span>
              <button type="button" onClick={onRetry} className="font-medium underline underline-offset-2 hover:text-rose-700">
                Retry
              </button>
            </div>
          )}

          {status === 'ready' && (
            <>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-full border-b border-slate-200 px-2 py-1.5 text-xs outline-none"
              />
              <ul className="max-h-48 overflow-y-auto py-1">
                {filtered.length === 0 && <li className="px-2 py-1.5 text-xs text-slate-400">No matches</li>}
                {filtered.map((item) => {
                  const isSelected = value.includes(item.id)
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => toggle(item.id)}
                        aria-pressed={isSelected}
                        className={`flex w-full items-start gap-1.5 px-2 py-1.5 text-left text-xs hover:bg-blue-50 ${
                          isSelected ? 'bg-blue-50/60' : ''
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-3 w-3 shrink-0 items-center justify-center rounded-sm border text-[9px] leading-none ${
                            isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-transparent'
                          }`}
                          aria-hidden="true"
                        >
                          ✓
                        </span>
                        <span className="flex min-w-0 flex-col items-start">
                          <span className={isSelected ? 'font-medium text-blue-700' : 'text-slate-700'}>
                            {item.code} · {item.name}
                          </span>
                          {item.context && <span className="text-[10px] text-slate-400">{item.context}</span>}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <div className="flex justify-end border-t border-slate-100 px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-700"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
