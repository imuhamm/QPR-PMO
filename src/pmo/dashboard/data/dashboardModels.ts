import type { SectionId } from '../../types'
import type { HistoricalMetric } from './historicalMetric'

// --- Health --------------------------------------------------------------

// Same four states the widget layer's WidgetHealthLevel uses (see
// widgets/DashboardWidget.tsx) — declared independently here so the data
// layer has zero dependency on any UI/component module. The string values
// are identical on purpose: a widget can consume a DomainHealth directly
// without a conversion step.
export type HealthLevel = 'green' | 'amber' | 'red' | 'neutral'

export interface DomainHealth {
  level: HealthLevel
  /** Short explanatory line — e.g. "2 Phases have no Activities". Optional: a domain can be a bare level with no elaboration. */
  note?: string
}

const HEALTH_RANK: Record<HealthLevel, number> = { green: 0, amber: 1, red: 2, neutral: -1 }
const HEALTH_LABEL: Record<HealthLevel, string> = { green: 'Green', amber: 'Amber', red: 'Red', neutral: 'Not Available' }

// Health-specific counterpart to historicalMetric.ts's numeric/date
// builders — kept here (not there) so historicalMetric.ts stays fully
// generic and this module owns the one place HealthLevel's ordering is
// defined.
export function buildHealthMetric(current: HealthLevel, previous: HealthLevel): HistoricalMetric<HealthLevel> {
  const delta = HEALTH_RANK[current] - HEALTH_RANK[previous]
  return {
    current,
    previous,
    delta,
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    changeLabel: current === previous ? `Unchanged (${HEALTH_LABEL[current]})` : `${HEALTH_LABEL[previous]} → ${HEALTH_LABEL[current]}`,
  }
}

export interface ProjectHealthSnapshot {
  /** Overall carries its own trend since it's the one health value this dashboard narrates changing over time ("health changed Green → Amber"). */
  overall: HistoricalMetric<HealthLevel>
  schedule: DomainHealth
  budget: DomainHealth
  scope: DomainHealth
  risk: DomainHealth
  resource?: DomainHealth
  governance?: DomainHealth
  lastUpdated: string
}

// --- Progress --------------------------------------------------------------

export interface ProjectProgress {
  /** current = actual % complete, previous = actual % as of the prior reporting period. */
  actualPct: HistoricalMetric<number>
  plannedPct: number
  /** actualPct.current − plannedPct. Negative = behind plan. */
  variancePct: number
  /** e.g. "Period ending May 2026" — whatever period actualPct.current was measured as of. */
  reportingPeriod: string
}

// --- Forecast --------------------------------------------------------------

export interface ProjectForecast {
  baselineFinish: string
  /** current = latest forecast finish date, previous = the prior forecast finish (before it moved). */
  forecastFinish: HistoricalMetric<string>
  /** forecastFinish.current − baselineFinish, in days. Positive = forecast to finish late. */
  varianceDays: number
}

// --- Milestones --------------------------------------------------------------

export type MilestoneStatus = 'completed' | 'on-track' | 'at-risk' | 'delayed' | 'not-started'

export interface DashboardMilestone {
  id: string
  name: string
  baselineDate: string
  forecastDate: string
  /** forecastDate − baselineDate, in days. Positive = late. */
  varianceDays: number
  status: MilestoneStatus
  owner?: string
  /** Free-text downstream/program impact — only set when this milestone's slip actually affects something else. */
  dependencyImpact?: string
}

// --- Risks --------------------------------------------------------------

export interface RiskSummary {
  totalOpen: number
  highCritical: number
  new: number
  closed: number
  escalated: number
  mitigationOverdue: number
  withoutOwner: number
  /** Aggregate impact×likelihood across open risks — matches the scoring already used in risksData.ts. Optional since not every deployment will compute it. */
  exposure?: number
}

// --- Issues --------------------------------------------------------------

export interface IssueSummary {
  open: number
  critical: number
  blocked: number
  overdue: number
  unassigned: number
  /** Age of the single oldest still-open issue, in days — the number that typically drives escalation. */
  oldestAgeDays: number
}

// --- Change Requests --------------------------------------------------------------

export interface ChangeRequestSummary {
  pending: number
  approved: number
  rejected: number
  awaitingCurrentUserAction: number
  /** Net schedule impact of approved CRs, in days. */
  scheduleImpactDays?: number
  /** Net cost impact of approved CRs — optional, not every CR carries a costed estimate. */
  costImpact?: number
}

// --- Tasks / Activities --------------------------------------------------------------

export type ActivityStatusBucket = 'not-started' | 'in-progress' | 'completed' | 'delayed'

export interface TaskActivitySummary {
  overdue: number
  dueSoon: number
  blocked: number
  behindSchedule: number
  unassigned: number
  missingDates: number
  statusDistribution: Record<ActivityStatusBucket, number>
}

// --- Attention Items --------------------------------------------------------------

export type AttentionItemType =
  | 'overdue-task'
  | 'milestone'
  | 'risk'
  | 'issue'
  | 'dependency'
  | 'approval'
  | 'change-request'
  | 'reporting'
  | 'governance'
  | 'configuration'

export type AttentionSeverity = 'critical' | 'high' | 'medium' | 'low'

// Which perspective an item is actually actionable by — e.g. a risk or
// approval escalated beyond the Project Manager's own authority. A
// deliberately small, separate vocabulary from roleConfig.ts's
// DemoDashboardRole: that type is the presentation-only "view as" preview
// switcher and must never be load-bearing for real data modeling: this is
// the data layer's own concept of who an item is routed to.
export type ResponsibleRole = 'project-manager' | 'program-manager' | 'pmo-office' | 'executive'

// Normalized shape for "things that need a look," regardless of which
// module they come from — the one model every role's exception/action list
// widget reads from, instead of each widget reaching into Risks/Schedule/CR
// data separately and re-deciding what counts as actionable.
export interface AttentionItem {
  id: string
  type: AttentionItemType
  severity: AttentionSeverity
  title: string
  description?: string
  dueDate?: string
  owner?: string
  impact?: string
  /** Defaults to a type-appropriate verb (e.g. "Review") if a widget wants one and this is omitted. */
  actionLabel?: string
  /** Which Project Details tab opening this item should land on — reuses the app's real navigable unit (SectionId), not a bespoke routing concept. Omitted when there's no corresponding tab yet (e.g. Change Requests, Issues). */
  destination?: SectionId
  /** Set only when this item has been escalated beyond Project Manager authority — omitted for ordinary PM-level items. */
  escalatedTo?: ResponsibleRole
}

// --- Cross-Project Dependencies --------------------------------------------------------------

export type DependencyDirection = 'incoming' | 'outgoing'

// Incoming = what this Project needs FROM another project; Outgoing =
// what another project needs FROM this one. `status` reuses HealthLevel
// (green/amber/red) so a dependency's risk reads the same way every other
// health signal in this dashboard does.
export interface ProjectDependency {
  id: string
  direction: DependencyDirection
  /** The other project (or program-level party) on the other end. */
  counterpart: string
  description: string
  status: HealthLevel
  dueDate?: string
  /** Free text — only set when this dependency's state actually affects something else (a late predecessor, a downstream milestone). */
  impact?: string
}

// --- Team / Workload --------------------------------------------------------------

// "Overloaded member" capacity data doesn't exist anywhere in this app
// (ResourcesView's own doc comment rules out inventing a capacity/
// utilization/allocation model) — this stays scoped to what's real:
// headcount and the two real exception counts.
export interface TeamSummary {
  memberCount: number
  overdueAssignments: number
  unassignedWork: number
}

// --- Recent Activity --------------------------------------------------------------

export type ActivityFeedEventType =
  | 'progress-update'
  | 'milestone-rescheduled'
  | 'risk-raised'
  | 'risk-updated'
  | 'change-approved'
  | 'member-assigned'
  | 'field-updated'

export interface ActivityFeedEvent {
  id: string
  type: ActivityFeedEventType
  summary: string
  actor?: string
  /** Ready-to-render relative label (e.g. "2h ago") — this is a curated rollup feed, not the full audit log, so an exact timestamp isn't needed. */
  occurredLabel: string
}

// --- Trend series (Analytical mode) --------------------------------------------------------------

export interface ProgressTrendPoint {
  period: string
  actualPct: number
  plannedPct: number
}

export interface RiskTrendPoint {
  period: string
  openRisks: number
  exposure: number
}

export interface IssueAgingBucket {
  bucket: string
  count: number
}

export interface BudgetPerformance {
  totalBudget: number
  actualSpend: number
  forecastAtCompletion: number
  /** (forecastAtCompletion − totalBudget) / totalBudget, as a percentage. Negative = under budget. */
  variancePct: number
}

// --- Aggregate --------------------------------------------------------------

// One dataset per Project — the six role perspectives all read from this
// same object and select/format different slices of it; there is
// deliberately no per-role copy of this data.
export interface ProjectDashboardData {
  projectId: string
  health: ProjectHealthSnapshot
  progress: ProjectProgress
  forecast: ProjectForecast
  milestones: DashboardMilestone[]
  risks: RiskSummary
  issues: IssueSummary
  changeRequests: ChangeRequestSummary
  activities: TaskActivitySummary
  attentionItems: AttentionItem[]
  dependencies: ProjectDependency[]
  team: TeamSummary
  activityFeed: ActivityFeedEvent[]
  progressTrend: ProgressTrendPoint[]
  riskTrend: RiskTrendPoint[]
  issueAging: IssueAgingBucket[]
  /** Omitted (not just zeroed) when no budget has actually been configured — mirrors Budget & Planned Dates' own "Total Budget missing" state. */
  budgetPerformance?: BudgetPerformance
}
