import type { ProjectMeta, SectionReadiness } from '../types'

export const mockProjectMeta: ProjectMeta = {
  name: 'Client Portal Revamp',
  status: 'Draft',
  program: 'Digital Experience Program',
  projectManager: 'M. Hesham',
  projectOwner: 'S. Al-Rashid',
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
