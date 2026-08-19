import { useState } from 'react'
import { ProjectDetailsShell } from './pmo/ProjectDetailsShell'
import { ProjectsRegisterPage } from './pmo/registry/ProjectsRegisterPage'
import { EMPTY_FILTERS, createProjectEntry, mockProjectsRegister } from './pmo/registry/projectsRegisterData'
import type { ProjectFilters, ProjectRegisterEntry, SortState } from './pmo/registry/projectsRegisterData'
import type { CreateProjectFields } from './pmo/registry/CreateProjectModal'

// Only two Projects have a built-out workspace behind them — the Draft demo
// (proj-client-portal-revamp) and the Active/execution demo
// (proj-core-banking-migration), both matched by id inside
// ProjectDetailsShell (see projectsRegisterData.ts). Opening any other
// register row, including a newly created one, lands on the Draft demo for
// now, rather than fabricating a data set per Project. A created Project's
// Description/Reporting Frequency aren't persisted anywhere for the same
// reason — there's no per-Project store yet.
//
// Search/filter/sort state lives here (not inside ProjectsRegisterPage) so
// it survives opening a Project and returning — this app has no router to
// persist it via the URL, so plain state-lifting is the equivalent it can
// actually support, not a substitute to over-engineer past.
function App() {
  const [projects, setProjects] = useState<ProjectRegisterEntry[]>(mockProjectsRegister)
  const [openProjectId, setOpenProjectId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<ProjectFilters>(EMPTY_FILTERS)
  const [sort, setSort] = useState<SortState | null>(null)

  const handleCreateProject = (fields: CreateProjectFields) => {
    const entry = createProjectEntry(fields)
    setProjects((prev) => [entry, ...prev])
    setOpenProjectId(entry.id)
  }

  if (openProjectId) {
    return <ProjectDetailsShell projectId={openProjectId} onBack={() => setOpenProjectId(null)} />
  }

  return (
    <ProjectsRegisterPage
      projects={projects}
      onOpenProject={setOpenProjectId}
      onCreateProject={handleCreateProject}
      query={query}
      onQueryChange={setQuery}
      filters={filters}
      onFiltersChange={setFilters}
      sort={sort}
      onSortChange={setSort}
    />
  )
}

export default App
