import { useEffect, useRef, useState } from 'react'
import type { Granularity } from './GanttChart'
import { OPTIONAL_COLUMNS } from './scheduleData'
import type { OptionalColumnKey } from './scheduleData'

const ZOOM_LEVELS: { id: Granularity; label: string }[] = [
  { id: 'week', label: 'Weeks' },
  { id: 'month', label: 'Months' },
  { id: 'quarter', label: 'Quarters' },
]

function ColumnsMenu({
  visibleColumns,
  onToggleColumn,
}: {
  visibleColumns: Set<OptionalColumnKey>
  onToggleColumn: (key: OptionalColumnKey) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-pressed={open}
        className="rounded border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
      >
        Columns
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-48 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Optional columns
          </div>
          {OPTIONAL_COLUMNS.map((col) => (
            <label
              key={col.id}
              className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={visibleColumns.has(col.id)}
                onChange={() => onToggleColumn(col.id)}
                className="h-3 w-3"
              />
              {col.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export function ScheduleToolbar({
  granularity,
  onGranularityChange,
  onExpandAll,
  onCollapseAll,
  onAddPhase,
  locked,
  visibleColumns,
  onToggleColumn,
}: {
  granularity: Granularity
  onGranularityChange: (g: Granularity) => void
  onExpandAll: () => void
  onCollapseAll: () => void
  onAddPhase: () => void
  /** Draft's grid has a fixed column set (Name/Owner/Start/End/Duration/Predecessor) — nothing optional to toggle, so the Columns menu only makes sense once locked. */
  locked: boolean
  visibleColumns: Set<OptionalColumnKey>
  onToggleColumn: (key: OptionalColumnKey) => void
}) {
  return (
    <div className="flex h-8 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onAddPhase}
          className="rounded border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
        >
          + Add Phase
        </button>

        <div className="mx-1 h-3.5 w-px bg-slate-200" />

        <button
          type="button"
          onClick={onExpandAll}
          className="rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
        >
          Expand All
        </button>
        <button
          type="button"
          onClick={onCollapseAll}
          className="rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
        >
          Collapse All
        </button>
      </div>

      <div className="flex items-center gap-2">
        {locked && <ColumnsMenu visibleColumns={visibleColumns} onToggleColumn={onToggleColumn} />}

        <div className="flex items-center overflow-hidden rounded border border-slate-200">
          {ZOOM_LEVELS.map((zoom) => (
            <button
              key={zoom.id}
              type="button"
              onClick={() => onGranularityChange(zoom.id)}
              aria-pressed={granularity === zoom.id}
              className={`px-2 py-0.5 text-[11px] font-medium transition-colors ${
                granularity === zoom.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {zoom.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
