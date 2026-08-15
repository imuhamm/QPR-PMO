import { useEffect, useRef, useState } from 'react'

// Generic searchable popover select — same interaction shape used across
// this app (predecessor picker, person picker, source-data picker), just
// parameterized over a plain string option list instead of being tied to
// one specific list.
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  emptyOptionLabel,
}: {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  /** If provided, shows a clearable option (e.g. "Unassigned", "Not set") at the top of the list. */
  emptyOptionLabel?: string
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

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))

  const select = (next: string) => {
    onChange(next)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded border border-slate-300 bg-white px-2 py-1.5 text-left text-xs text-slate-800 hover:bg-slate-50"
      >
        <span className="min-w-0 truncate">
          {value || <span className="italic text-slate-400">{placeholder}</span>}
        </span>
        <span className="ml-1 shrink-0 text-slate-400">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-full min-w-[200px] rounded-md border border-slate-200 bg-white shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full border-b border-slate-200 px-2 py-1.5 text-xs outline-none"
          />
          <ul className="max-h-40 overflow-y-auto py-1">
            {emptyOptionLabel && (
              <li>
                <button
                  type="button"
                  onClick={() => select('')}
                  className="block w-full px-2 py-1.5 text-left text-xs italic text-slate-400 hover:bg-blue-50"
                >
                  {emptyOptionLabel}
                </button>
              </li>
            )}
            {filtered.length === 0 && <li className="px-2 py-1.5 text-xs text-slate-400">No matches</li>}
            {filtered.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => select(opt)}
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
