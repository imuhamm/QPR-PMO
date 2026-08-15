import { useEffect, useRef, useState } from 'react'
import type { MetricsItem } from './strategicAlignmentData'
import type { SourceListStatus } from './useSourceList'

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
  value?: string
  onChange: (id: string) => void
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

  const selected = items.find((i) => i.id === value)
  const filtered = items.filter(
    (i) => i.name.toLowerCase().includes(query.toLowerCase()) || i.code.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded border border-slate-300 bg-white px-2 py-1 text-left text-xs text-slate-800 hover:bg-slate-50"
      >
        {selected ? (
          <span className="min-w-0 truncate">
            <span className="font-medium">{selected.code}</span> · {selected.name}
          </span>
        ) : (
          <span className="italic text-slate-400">{placeholder}</span>
        )}
        <span className="ml-1 shrink-0 text-slate-400">▾</span>
      </button>

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
                {filtered.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(item.id)
                        setOpen(false)
                        setQuery('')
                      }}
                      className={`flex w-full flex-col items-start px-2 py-1.5 text-left text-xs hover:bg-blue-50 ${
                        item.id === value ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <span className={item.id === value ? 'font-medium text-blue-700' : 'text-slate-700'}>
                        {item.code} · {item.name}
                      </span>
                      {item.context && <span className="text-[10px] text-slate-400">{item.context}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
