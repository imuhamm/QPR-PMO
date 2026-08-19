import type { ProjectMeta, SectionReadiness } from '../types'

export const mockProjectMeta: ProjectMeta = {
  name: 'Client Portal Revamp',
  status: 'Draft',
  program: 'Digital Experience Program',
  projectManager: 'M. Hesham',
  projectOwner: 'S. Al-Rashid',
}

// The one Project in the Register (proj-core-banking-migration) that's past
// approval and into execution — everything else still opens the Draft
// workspace above via mockProjectMeta. Baseline/forecast/variance are
// internally consistent: forecast finish is 18 days past baseline.
export const mockActiveProjectMeta: ProjectMeta = {
  name: 'Core Banking Platform Migration',
  status: 'Active',
  program: 'Cloud Modernization Program',
  projectManager: 'S. Ali',
  projectOwner: 'R. Nasser',
  execution: {
    progressPct: 62,
    health: 'amber',
    baselineEndDate: '2026-11-30',
    forecastEndDate: '2026-12-18',
    varianceDays: 18,
    lastUpdated: '2026-08-12',
    pendingChangeRequests: 3,
  },
}

export const mockSectionReadiness: SectionReadiness[] = [
  { id: 'overview', completion: 'complete' },
  { id: 'strategic-alignment', completion: 'complete' },
  { id: 'business-case', completion: 'optional' },
  { id: 'schedule', completion: 'incomplete', reason: '2 Phases have no Activities' },
  { id: 'resources', completion: 'complete' },
  { id: 'budget-planned-dates', completion: 'incomplete', reason: 'Total Budget missing' },
  { id: 'risks', completion: 'complete' },
]
