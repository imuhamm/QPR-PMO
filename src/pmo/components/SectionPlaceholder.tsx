import type { SectionDef } from '../types'

export function SectionPlaceholder({ section }: { section: SectionDef }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-8 shrink-0 items-center border-b border-slate-200 px-3">
        <h2 className="text-xs font-semibold text-slate-700">{section.label}</h2>
      </div>
      <div className="flex flex-1 items-center px-3 text-xs text-slate-400">
        {section.label} content not yet implemented.
      </div>
    </div>
  )
}
