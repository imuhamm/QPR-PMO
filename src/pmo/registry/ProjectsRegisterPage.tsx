import { useMemo, useState } from 'react'
import { countActiveFilters, filterProjects, getFilterOptions, sortProjects } from './projectsRegisterData'
import type { ProjectFilters, ProjectRegisterEntry, SortColumn, SortState } from './projectsRegisterData'
import { ProjectStatusBadge } from '../shared/ProjectStatusBadge'
import { FilterPopover } from './FilterPopover'
import { RowOverflowMenu } from './RowOverflowMenu'
import { CreateProjectModal } from './CreateProjectModal'
import type { CreateProjectFields } from './CreateProjectModal'

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label} filter`} className="text-slate-400 hover:text-slate-700">
        ×
      </button>
    </span>
  )
}

function SortableHeader({
  label,
  column,
  sort,
  onSort,
  className,
}: {
  label: string
  column: SortColumn
  sort: SortState | null
  onSort: (column: SortColumn) => void
  className: string
}) {
  const isActive = sort?.column === column
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={`flex items-center gap-1 py-1.5 text-left hover:text-slate-700 ${className}`}
    >
      {label}
      <span className="w-2.5 text-[9px] text-slate-400">{isActive ? (sort!.direction === 'asc' ? '▲' : '▼') : ''}</span>
    </button>
  )
}

// Enterprise Project Register — scan/find/open, not a filter-heavy reporting
// interface. Search + filters lift their state to App so it survives
// opening and returning from a Project (no router in this app to persist
// it via the URL — this is the equivalent it can actually support).
export function ProjectsRegisterPage({
  projects,
  onOpenProject,
  onCreateProject,
  query,
  onQueryChange,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
}: {
  projects: ProjectRegisterEntry[]
  onOpenProject: (id: string) => void
  onCreateProject: (fields: CreateProjectFields) => void
  query: string
  onQueryChange: (query: string) => void
  filters: ProjectFilters
  onFiltersChange: (filters: ProjectFilters) => void
  sort: SortState | null
  onSortChange: (sort: SortState | null) => void
}) {
  const [filterOpen, setFilterOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const filterOptions = useMemo(() => getFilterOptions(projects), [projects])
  const activeCount = countActiveFilters(filters)

  const visibleProjects = useMemo(() => {
    const filtered = filterProjects(projects, query, filters)
    return sortProjects(filtered, sort)
  }, [projects, query, filters, sort])

  const handleCreate = (fields: CreateProjectFields) => {
    setCreateOpen(false)
    onCreateProject(fields)
  }

  const handleSort = (column: SortColumn) => {
    onSortChange(
      !sort || sort.column !== column
        ? { column, direction: 'asc' }
        : sort.direction === 'asc'
          ? { column, direction: 'desc' }
          : null,
    )
  }

  const handleFilterChange = (patch: Partial<ProjectFilters>) => onFiltersChange({ ...filters, ...patch })
  const handleClearFilters = () => onFiltersChange({})

  return (
    <div className="flex h-screen min-w-[1120px] flex-col bg-white text-slate-900">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 px-4">
        <h1 className="text-base font-semibold text-slate-900">Projects</h1>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          + Create Project
        </button>
      </header>

      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-4 py-2">
        <div className="relative w-64">
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search projects"
            className="w-full rounded border border-slate-300 bg-white py-1.5 pl-2.5 pr-7 text-xs text-slate-800 outline-none focus:border-blue-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              ×
            </button>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            aria-pressed={filterOpen}
            className="flex items-center gap-1.5 rounded border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Filter
            {activeCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">
                {activeCount}
              </span>
            )}
          </button>
          {filterOpen && (
            <FilterPopover
              filters={filters}
              options={filterOptions}
              onChange={handleFilterChange}
              onClearAll={handleClearFilters}
              onClose={() => setFilterOpen(false)}
            />
          )}
        </div>
      </div>

      {activeCount > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-slate-100 px-4 py-1.5">
          {filters.status && <FilterChip label={`Status: ${filters.status}`} onRemove={() => handleFilterChange({ status: undefined })} />}
          {filters.program && <FilterChip label={`Program: ${filters.program}`} onRemove={() => handleFilterChange({ program: undefined })} />}
          {filters.projectManager && (
            <FilterChip label={`Project Manager: ${filters.projectManager}`} onRemove={() => handleFilterChange({ projectManager: undefined })} />
          )}
          {filters.projectOwner && (
            <FilterChip label={`Project Owner: ${filters.projectOwner}`} onRemove={() => handleFilterChange({ projectOwner: undefined })} />
          )}
          {filters.projectType && (
            <FilterChip label={`Project Type: ${filters.projectType}`} onRemove={() => handleFilterChange({ projectType: undefined })} />
          )}
          <button type="button" onClick={handleClearFilters} className="text-[11px] font-medium text-slate-500 underline underline-offset-2 hover:text-slate-800">
            Clear all
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
          <SortableHeader label="Project Name" column="name" sort={sort} onSort={handleSort} className="min-w-0 flex-1 px-3" />
          <SortableHeader label="Program" column="program" sort={sort} onSort={handleSort} className="w-44 shrink-0 px-3" />
          <div className="w-32 shrink-0 px-3 py-1.5">Project Manager</div>
          <div className="w-32 shrink-0 px-3 py-1.5">Project Owner</div>
          <SortableHeader label="Status" column="status" sort={sort} onSort={handleSort} className="w-32 shrink-0 px-3" />
          <div className="w-44 shrink-0 px-3 py-1.5">Project Type</div>
          <div className="w-9 shrink-0" />
        </div>

        {visibleProjects.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <p className="text-xs text-slate-500">No projects match the current search or filters.</p>
            <div className="flex gap-3">
              {query && (
                <button type="button" onClick={() => onQueryChange('')} className="text-[11px] font-medium text-blue-600 hover:text-blue-700">
                  Clear search
                </button>
              )}
              {activeCount > 0 && (
                <button type="button" onClick={handleClearFilters} className="text-[11px] font-medium text-blue-600 hover:text-blue-700">
                  Clear filters
                </button>
              )}
            </div>
          </div>
        ) : (
          visibleProjects.map((project) => (
            // The whole row opens the Project — for a Draft, that's simply
            // continuing it, not a separate "resume" concept. Only the
            // overflow menu (which stops propagation) opts out of this.
            <div
              key={project.id}
              tabIndex={0}
              onClick={() => onOpenProject(project.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onOpenProject(project.id)
              }}
              className="group flex h-9 cursor-pointer items-center border-b border-slate-100 outline-none transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-400"
            >
              <div className="min-w-0 flex-1 truncate px-3 text-[13px] font-medium text-slate-900 group-hover:text-blue-700 group-hover:underline">
                {project.name}
              </div>
              <div className="w-44 shrink-0 truncate px-3 text-xs text-slate-600">{project.program}</div>
              <div className="w-32 shrink-0 truncate px-3 text-xs text-slate-600">{project.projectManager}</div>
              <div className="w-32 shrink-0 truncate px-3 text-xs text-slate-600">{project.projectOwner ?? '—'}</div>
              <div className="w-32 shrink-0 px-3">
                <ProjectStatusBadge status={project.status} />
              </div>
              <div className="w-44 shrink-0 truncate px-3 text-xs text-slate-600">{project.projectType ?? '—'}</div>
              <div className="flex w-9 shrink-0 items-center justify-center">
                <RowOverflowMenu onOpenProject={() => onOpenProject(project.id)} />
              </div>
            </div>
          ))
        )}
      </div>

      {createOpen && <CreateProjectModal onCancel={() => setCreateOpen(false)} onCreate={handleCreate} />}
    </div>
  )
}
