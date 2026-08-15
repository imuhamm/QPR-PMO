import { useEffect, useRef } from 'react'
import type { FilterOptions, ProjectFilters } from './projectsRegisterData'
import { countActiveFilters } from './projectsRegisterData'

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string | undefined
  options: string[]
  onChange: (value: string | undefined) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-slate-500">{label}</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-blue-400"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

export function FilterPopover({
  filters,
  options,
  onChange,
  onClearAll,
  onClose,
}: {
  filters: ProjectFilters
  options: FilterOptions
  onChange: (patch: Partial<ProjectFilters>) => void
  onClearAll: () => void
  onClose: () => void
}) {
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

  const activeCount = countActiveFilters(filters)

  return (
    <div ref={rootRef} className="absolute left-0 top-full z-30 mt-1 w-64 rounded-md border border-slate-200 bg-white p-3 shadow-lg">
      <div className="space-y-2.5">
        <FilterSelect
          label="Status"
          value={filters.status}
          options={options.statuses}
          onChange={(v) => onChange({ status: v as ProjectFilters['status'] })}
        />
        <FilterSelect label="Program" value={filters.program} options={options.programs} onChange={(v) => onChange({ program: v })} />
        <FilterSelect
          label="Project Manager"
          value={filters.projectManager}
          options={options.projectManagers}
          onChange={(v) => onChange({ projectManager: v })}
        />
        <FilterSelect
          label="Project Owner"
          value={filters.projectOwner}
          options={options.projectOwners}
          onChange={(v) => onChange({ projectOwner: v })}
        />
        <FilterSelect
          label="Project Type"
          value={filters.projectType}
          options={options.projectTypes}
          onChange={(v) => onChange({ projectType: v })}
        />
      </div>

      {activeCount > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="mt-3 text-[11px] font-medium text-blue-600 hover:text-blue-700"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
