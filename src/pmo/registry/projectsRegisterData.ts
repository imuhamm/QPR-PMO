import type { ProjectLifecycleStatus } from '../types'

export interface ProjectRegisterEntry {
  id: string
  name: string
  program: string
  projectManager: string
  projectOwner?: string
  status: ProjectLifecycleStatus
  // Optional per the confirmed Project Type business requirement — a newly
  // registered Project can genuinely have none set yet.
  projectType?: string
}

// One optional value per known attribute — a filter is "active" when set.
export interface ProjectFilters {
  status?: ProjectLifecycleStatus
  program?: string
  projectManager?: string
  projectOwner?: string
  projectType?: string
}

export const EMPTY_FILTERS: ProjectFilters = {}

export function countActiveFilters(filters: ProjectFilters): number {
  return Object.values(filters).filter(Boolean).length
}

export type SortColumn = 'name' | 'program' | 'status'
export type SortDirection = 'asc' | 'desc'
export interface SortState {
  column: SortColumn
  direction: SortDirection
}

// Search is scoped to Project Name only — nothing else is a confirmed
// searchable field, so nothing else is promised.
export function filterProjects(
  projects: ProjectRegisterEntry[],
  query: string,
  filters: ProjectFilters,
): ProjectRegisterEntry[] {
  const q = query.trim().toLowerCase()
  return projects.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q)) return false
    if (filters.status && p.status !== filters.status) return false
    if (filters.program && p.program !== filters.program) return false
    if (filters.projectManager && p.projectManager !== filters.projectManager) return false
    if (filters.projectOwner && p.projectOwner !== filters.projectOwner) return false
    if (filters.projectType && p.projectType !== filters.projectType) return false
    return true
  })
}

// Status sorts by lifecycle order (matches ProjectLifecycleStatus's declared
// order), not alphabetically — more useful for scanning where a Project sits.
const STATUS_ORDER: Record<ProjectLifecycleStatus, number> = {
  Draft: 0,
  'Pending Approval': 1,
  Submitted: 2,
  Active: 3,
  'On Hold': 4,
  Closed: 5,
}

export function sortProjects(projects: ProjectRegisterEntry[], sort: SortState | null): ProjectRegisterEntry[] {
  if (!sort) return projects
  const dir = sort.direction === 'asc' ? 1 : -1
  return [...projects].sort((a, b) => {
    if (sort.column === 'status') return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) * dir
    return a[sort.column].localeCompare(b[sort.column]) * dir
  })
}

export interface FilterOptions {
  statuses: ProjectLifecycleStatus[]
  programs: string[]
  projectManagers: string[]
  projectOwners: string[]
  projectTypes: string[]
}

// Filter options are derived from the actual Register data, never a
// separately maintained list — so a filter can never offer a value that
// doesn't exist in any row.
export function getFilterOptions(projects: ProjectRegisterEntry[]): FilterOptions {
  const uniqSorted = (values: string[]) => Array.from(new Set(values)).sort((a, b) => a.localeCompare(b))
  return {
    statuses: uniqSorted(projects.map((p) => p.status)) as ProjectLifecycleStatus[],
    programs: uniqSorted(projects.map((p) => p.program)),
    projectManagers: uniqSorted(projects.map((p) => p.projectManager)),
    projectOwners: uniqSorted(projects.map((p) => p.projectOwner).filter((v): v is string => !!v)),
    projectTypes: uniqSorted(projects.map((p) => p.projectType).filter((v): v is string => !!v)),
  }
}

// The first row is the only Project with a real, built-out workspace behind
// it (matches ProjectDetailsShell's mockProjectMeta exactly) — the rest are
// register-scanning content only; opening them lands on the same demo
// workspace rather than fabricating ten separate data sets.
export const mockProjectsRegister: ProjectRegisterEntry[] = [
  {
    id: 'proj-client-portal-revamp',
    name: 'Client Portal Revamp',
    program: 'Digital Experience Program',
    projectManager: 'M. Hesham',
    projectOwner: 'S. Al-Rashid',
    status: 'Draft',
    projectType: 'Strategic Initiative',
  },
  {
    id: 'proj-core-banking-migration',
    name: 'Core Banking Platform Migration',
    program: 'Cloud Modernization Program',
    projectManager: 'S. Ali',
    projectOwner: 'R. Nasser',
    status: 'Active',
    projectType: 'Strategic Initiative',
  },
  {
    id: 'proj-employee-self-service',
    name: 'Employee Self-Service Portal',
    program: 'Digital Experience Program',
    projectManager: 'A. Farouk',
    projectOwner: 'M. Hesham',
    status: 'Draft',
    projectType: 'Operational Improvement',
  },
  {
    id: 'proj-regulatory-reporting',
    name: 'Regulatory Reporting Automation',
    program: 'Data & Analytics Program',
    projectManager: 'L. Haddad',
    projectOwner: 'S. Al-Rashid',
    status: 'Pending Approval',
    projectType: 'Compliance',
  },
  {
    id: 'proj-data-warehouse',
    name: 'Data Warehouse Modernization',
    program: 'Cloud Modernization Program',
    projectManager: 'R. Nasser',
    projectOwner: 'S. Ali',
    status: 'Active',
    projectType: 'Innovation / R&D',
  },
  {
    id: 'proj-loyalty-program',
    name: 'Customer Loyalty Program Revamp',
    program: 'Customer Success Program',
    projectManager: 'M. Hesham',
    projectOwner: 'A. Farouk',
    status: 'On Hold',
    projectType: 'Strategic Initiative',
  },
  {
    id: 'proj-vendor-risk',
    name: 'Vendor Risk Management System',
    program: 'Data & Analytics Program',
    projectManager: 'S. Al-Rashid',
    projectOwner: 'L. Haddad',
    status: 'Draft',
    projectType: 'Compliance',
  },
  {
    id: 'proj-branch-optimization',
    name: 'Branch Network Optimization',
    program: 'Cloud Modernization Program',
    projectManager: 'A. Farouk',
    projectOwner: 'R. Nasser',
    status: 'Closed',
    projectType: 'Operational Improvement',
  },
  {
    id: 'proj-mobile-banking-redesign',
    name: 'Mobile Banking App Redesign',
    program: 'Digital Experience Program',
    projectManager: 'S. Ali',
    projectOwner: 'M. Hesham',
    status: 'Pending Approval',
    projectType: 'Strategic Initiative',
  },
  {
    id: 'proj-hr-talent-management',
    name: 'HR Talent Management Upgrade',
    program: 'Customer Success Program',
    projectManager: 'L. Haddad',
    projectOwner: 'S. Ali',
    status: 'Draft',
    projectType: 'Operational Improvement',
  },
]

// Minimum-record creation — no validation yet, so blanks fall back to a
// visible placeholder rather than producing an empty-looking row. Every
// registered Project starts life as Draft.
export function createProjectEntry(fields: {
  name: string
  projectManager: string
  projectOwner: string
  program: string
  projectType: string
}): ProjectRegisterEntry {
  return {
    id: `proj-${Date.now()}`,
    name: fields.name.trim() || 'Untitled Project',
    program: fields.program || 'Unassigned',
    projectManager: fields.projectManager || 'Unassigned',
    projectOwner: fields.projectOwner || undefined,
    status: 'Draft',
    projectType: fields.projectType || undefined,
  }
}
