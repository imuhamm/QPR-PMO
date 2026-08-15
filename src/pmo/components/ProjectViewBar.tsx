import { PROJECT_SECTIONS } from '../types'
import type { SectionId, SectionReadiness } from '../types'

export function ProjectViewBar({
  active,
  onSelect,
  readiness,
  readinessOpen,
  onToggleReadiness,
}: {
  active: SectionId
  onSelect: (id: SectionId) => void
  readiness: SectionReadiness[]
  readinessOpen: boolean
  onToggleReadiness: () => void
}) {
  const required = readiness.filter((r) => r.completion !== 'optional')
  const completeCount = required.filter((r) => r.completion === 'complete').length
  const pct = required.length ? Math.round((completeCount / required.length) * 100) : 100
  const blockerCount = readiness.filter((r) => r.completion === 'incomplete').length

  return (
    <div className="flex h-8 shrink-0 items-stretch justify-between border-b border-slate-200 bg-white">
      <div className="flex flex-1 items-stretch overflow-x-auto">
        {PROJECT_SECTIONS.map((section) => {
          const isActive = section.id === active
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelect(section.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 text-xs transition-colors ${
                isActive
                  ? 'border-blue-600 font-medium text-blue-700'
                  : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              {section.label}
            </button>
          )
        })}
      </div>

      <div className="flex shrink-0 items-center pr-2">
        <button
          type="button"
          onClick={onToggleReadiness}
          aria-pressed={readinessOpen}
          className={`flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-medium transition-colors ${
            readinessOpen
              ? 'border-blue-300 bg-blue-50 text-blue-700'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${blockerCount > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
          Readiness
          <span className="text-slate-400">·</span>
          {blockerCount > 0 ? `${blockerCount} blocker${blockerCount > 1 ? 's' : ''}` : `${pct}%`}
        </button>
      </div>
    </div>
  )
}
