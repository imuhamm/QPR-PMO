import { PROJECT_SECTIONS } from '../types'
import type { SectionCompletion, SectionId, SectionReadiness } from '../types'

const CHIP_STYLES: Record<SectionCompletion, string> = {
  complete: 'bg-emerald-500 text-white',
  incomplete: 'bg-rose-500 text-white',
  optional: 'border border-slate-300 text-slate-400',
}

const CHIP_GLYPH: Record<SectionCompletion, string> = {
  complete: '✓',
  incomplete: '!',
  optional: '–',
}

function StatusChip({ completion }: { completion: SectionCompletion }) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] leading-none ${CHIP_STYLES[completion]}`}
    >
      {CHIP_GLYPH[completion]}
    </span>
  )
}

export function ReadinessPanel({
  readiness,
  activeSection,
  onNavigate,
  onClose,
}: {
  readiness: SectionReadiness[]
  activeSection: SectionId
  onNavigate: (id: SectionId) => void
  onClose: () => void
}) {
  const required = readiness.filter((r) => r.completion !== 'optional')
  const completeCount = required.filter((r) => r.completion === 'complete').length
  const pct = required.length ? Math.round((completeCount / required.length) * 100) : 100
  const blockers = readiness.filter((r) => r.completion === 'incomplete')

  const labelFor = (id: SectionId) => PROJECT_SECTIONS.find((s) => s.id === id)?.label ?? id

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Project Readiness
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close project readiness panel"
          title="Close"
          className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          ✕
        </button>
      </div>

      <div className="border-b border-slate-200 px-3 py-3">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-xs text-slate-500">Overall completeness</span>
          <span className="text-sm font-semibold text-slate-900">{pct}%</span>
        </div>
        <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-[11px] text-slate-400">
          {completeCount} of {required.length} required sections complete
        </div>

        {blockers.length > 0 ? (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-rose-600">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            {blockers.length} blocker{blockers.length > 1 ? 's' : ''} need attention
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            All required sections complete
          </div>
        )}
      </div>

      <ul className="flex-1 py-1">
        {readiness.map((r) => {
          const isActive = r.id === activeSection
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onNavigate(r.id)}
                className={`flex w-full items-start gap-2 px-3 py-1.5 text-left transition-colors ${
                  isActive ? 'bg-blue-50' : 'hover:bg-slate-50'
                }`}
              >
                <span className="pt-0.5">
                  <StatusChip completion={r.completion} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-xs ${isActive ? 'font-medium text-blue-700' : 'text-slate-700'}`}
                  >
                    {labelFor(r.id)}
                  </span>
                  {r.completion === 'incomplete' && r.reason && (
                    <span className="block truncate text-[11px] text-rose-500">{r.reason}</span>
                  )}
                  {r.completion === 'optional' && (
                    <span className="block truncate text-[11px] text-slate-400">Optional</span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
