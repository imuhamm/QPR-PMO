import type { Granularity } from './GanttChart'

const ZOOM_LEVELS: { id: Granularity; label: string }[] = [
  { id: 'week', label: 'Weeks' },
  { id: 'month', label: 'Months' },
  { id: 'quarter', label: 'Quarters' },
]

export function ScheduleToolbar({
  granularity,
  onGranularityChange,
  onExpandAll,
  onCollapseAll,
  onAddPhase,
}: {
  granularity: Granularity
  onGranularityChange: (g: Granularity) => void
  onExpandAll: () => void
  onCollapseAll: () => void
  onAddPhase: () => void
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
  )
}
