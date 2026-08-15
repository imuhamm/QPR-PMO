import { useEffect, useRef, useState } from 'react'
import type { ActivityRow, ScheduleRow } from './scheduleData'
import { wouldCreateCycle } from './scheduleData'

// Shared by the grid's Predecessor cell and the Gantt connector click —
// same picker, same validation, same Remove/Replace actions either way.
export function PredecessorEditor({
  rows,
  activity,
  onSelect,
  onRemove,
  onClose,
}: {
  rows: ScheduleRow[]
  activity: ActivityRow
  onSelect: (predecessorId: string) => void
  onRemove: () => void
  onClose: () => void
}) {
  const currentPredecessor = activity.predecessorId
    ? (rows.find((r) => r.id === activity.predecessorId) as ActivityRow | undefined)
    : undefined
  const [mode, setMode] = useState<'view' | 'pick'>(currentPredecessor ? 'view' : 'pick')
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  if (mode === 'view' && currentPredecessor) {
    return (
      <div ref={rootRef} className="w-64 rounded-md border border-slate-200 bg-white p-2.5 text-xs shadow-lg">
        <div className="mb-2 space-y-1">
          <div>
            <span className="text-slate-400">Predecessor:</span>{' '}
            <span className="font-medium text-slate-800">
              {currentPredecessor.wbs} {currentPredecessor.name}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Dependent:</span>{' '}
            <span className="font-medium text-slate-800">
              {activity.wbs} {activity.name}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Relationship:</span>{' '}
            <span className="font-medium text-slate-800">Finish-to-Start</span>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onRemove}
            className="rounded border border-slate-300 px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50"
          >
            Remove
          </button>
          <button
            type="button"
            onClick={() => setMode('pick')}
            className="rounded border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Replace
          </button>
        </div>
      </div>
    )
  }

  const activities = rows.filter((r): r is ActivityRow => r.kind === 'activity')
  const filtered = activities.filter(
    (a) => a.name.toLowerCase().includes(query.toLowerCase()) || a.wbs.includes(query),
  )

  return (
    <div ref={rootRef} className="w-64 rounded-md border border-slate-200 bg-white shadow-lg">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search activities…"
        className="w-full border-b border-slate-200 px-2 py-1.5 text-xs outline-none"
      />
      <ul className="max-h-48 overflow-y-auto py-1">
        {filtered.length === 0 && <li className="px-2 py-1.5 text-xs text-slate-400">No matches</li>}
        {filtered.map((a) => {
          const isSelf = a.id === activity.id
          const cyclic = !isSelf && wouldCreateCycle(rows, activity.id, a.id)
          const disabled = isSelf || cyclic
          return (
            <li key={a.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && onSelect(a.id)}
                className={`flex w-full flex-col items-start px-2 py-1.5 text-left text-xs ${
                  disabled ? 'cursor-not-allowed text-slate-300' : 'text-slate-700 hover:bg-blue-50'
                }`}
              >
                <span className="truncate">
                  {a.wbs} {a.name}
                </span>
                {isSelf && <span className="text-[10px] text-rose-400">Can't depend on itself</span>}
                {cyclic && <span className="text-[10px] text-rose-400">Would create a circular dependency</span>}
              </button>
            </li>
          )
        })}
      </ul>
      {currentPredecessor && (
        <div className="border-t border-slate-100 px-2 py-1.5">
          <button
            type="button"
            onClick={() => setMode('view')}
            className="text-[11px] font-medium text-slate-500 hover:text-slate-700"
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  )
}
