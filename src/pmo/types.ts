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

// Only populated once a Project has moved into execution (Active) — a
// Draft/Pending/Submitted Project has no baseline to report progress
// against yet, so ProjectHeader treats this as the signal to render the
// execution status row instead of extending ProjectMeta's own shape.
export interface ProjectExecutionSnapshot {
  progressPct: number
  health: 'green' | 'amber' | 'red'
  baselineEndDate: string
  forecastEndDate: string
  /** forecastEndDate − baselineEndDate, in days. Positive = forecast to finish late. */
  varianceDays: number
  lastUpdated: string
  pendingChangeRequests: number
}

export interface ProjectMeta {
  name: string
  status: ProjectLifecycleStatus
  program: string
  projectManager: string
  projectOwner?: string
  execution?: ProjectExecutionSnapshot
}

export interface SectionReadiness {
  id: SectionId
  completion: SectionCompletion
  /** Short blocker reason, shown when completion is 'incomplete'. */
  reason?: string
}
