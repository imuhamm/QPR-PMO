export type SectionId =
  | 'dashboard'
  | 'overview'
  | 'strategic-alignment'
  | 'business-case'
  | 'schedule'
  | 'resources'
  | 'budget-planned-dates'
  | 'risks'

export interface SectionDef {
  id: SectionId
  label: string
}

export const PROJECT_SECTIONS: SectionDef[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'overview', label: 'Overview' },
  { id: 'strategic-alignment', label: 'Strategic Alignment' },
  { id: 'business-case', label: 'Business Case' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'resources', label: 'Resources' },
  { id: 'budget-planned-dates', label: 'Budget & Planned Dates' },
  { id: 'risks', label: 'Risks' },
]

export type SectionCompletion = 'complete' | 'incomplete' | 'optional'

export type SaveState = 'saved' | 'saving' | 'unsaved'

// Ordered roughly by lifecycle progression. Adding a later status (e.g. one
// between Pending Approval and Active) means adding one map entry in
// ProjectStatusBadge — never restructuring the Register table itself.
export type ProjectLifecycleStatus = 'Draft' | 'Pending Approval' | 'Submitted' | 'Active' | 'On Hold' | 'Closed'

export interface ProjectMeta {
  name: string
  status: ProjectLifecycleStatus
  program: string
  projectManager: string
  projectOwner?: string
}

export interface SectionReadiness {
  id: SectionId
  completion: SectionCompletion
  /** Short blocker reason, shown when completion is 'incomplete'. */
  reason?: string
}
