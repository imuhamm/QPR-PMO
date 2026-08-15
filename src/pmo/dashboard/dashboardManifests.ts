import type { DashboardMode, DemoDashboardRole } from './roleConfig'

export interface DashboardManifestEntry {
  widgetId: string
}

type ManifestsByMode = Partial<Record<DashboardMode, DashboardManifestEntry[]>>

function widgets(...ids: string[]): DashboardManifestEntry[] {
  return ids.map((widgetId) => ({ widgetId }))
}

// Which widgets appear for a given role/mode pair. A role only has entries
// for the modes it actually supports (see DASHBOARD_ROLES in roleConfig.ts)
// — this is the single place that decides "what does this dashboard show,"
// so a new widget or a new role/mode combo is a change here only, never in
// the grid or the widgets themselves.
const DASHBOARD_MANIFESTS: Record<DemoDashboardRole, ManifestsByMode> = {
  'project-manager': {
    // Reference implementation — priority order matches the PM mental
    // model ("what do I need to maintain, submit, fix, or act on"), not
    // just visual balance.
    operational: widgets(
      'project-health-summary',
      'needs-attention',
      'milestone-timeline',
      'schedule-exceptions',
      'team-workload-summary',
      'risks-issues-summary',
      'change-requests-summary',
      'recent-activity',
    ),
    analytical: widgets(
      'progress-vs-plan',
      'schedule-variance',
      'milestone-performance',
      'task-status-distribution',
      'risk-exposure-trend',
      'issue-aging',
      'budget-performance',
    ),
  },
  'program-manager': {
    // "How is this particular project affecting my wider program" — reuses
    // several Project Manager widgets as-is where the underlying question
    // is identical (health, plan-vs-actual, forecast movement) and adds
    // the specialized cross-project/escalation widgets for the rest.
    analytical: widgets(
      'project-health-summary',
      'progress-vs-plan',
      'program-milestones',
      'cross-project-dependencies',
      'risks-program-intervention',
      'change-impact',
      'decisions-required',
      'schedule-variance',
    ),
    // Exception-oriented — deliberately excludes PM-level task
    // administration (Schedule Exceptions, Team/Workload, Recent Activity).
    operational: widgets(
      'decisions-required',
      'risks-program-intervention',
      'dependency-problems',
      'change-impact',
      'program-milestones',
    ),
  },
  'pmo-office': {
    analytical: widgets('portfolio-health', 'kpi-trend', 'risk-exposure', 'strategic-alignment-summary'),
    operational: widgets('pending-approvals', 'readiness-checklist', 'upcoming-milestones'),
  },
  'project-member': {
    operational: widgets('my-open-activities', 'my-assigned-risks', 'recent-activity-feed', 'upcoming-milestones'),
  },
  admin: {
    operational: widgets('pending-approvals', 'readiness-checklist', 'recent-activity-feed', 'team-workload'),
  },
  executive: {
    analytical: widgets('project-rag-summary', 'portfolio-health', 'budget-variance', 'kpi-trend'),
  },
}

export function getDashboardManifest(role: DemoDashboardRole, mode: DashboardMode): DashboardManifestEntry[] {
  return DASHBOARD_MANIFESTS[role][mode] ?? []
}
