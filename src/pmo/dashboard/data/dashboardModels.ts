import type { ProjectLifecycleStatus, SectionId } from '../../types'
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
  /** Governance-lens counts (PMO Office) — optional since only that perspective reads them; every other role's RiskSummary usage ignores these. */
  withoutResponsePlan?: number
  /** Not reviewed within the required review cadence. */
  stale?: number
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
  /** Governance-lens fields (PMO Office) — age of the oldest still-pending CR, in days. */
  oldestPendingAgeDays?: number
  /** Count of CRs whose schedule/cost impact exceeds materiality — a governance concern distinct from the raw pending/approved/rejected counts. */
  materialImpact?: number
  /** Detected process exceptions, e.g. a CR approved without recorded sign-off. Empty/omitted when none detected. */
  governanceExceptions?: string[]
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
  | 'data-quality'

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

// --- Governance (PMO Office) --------------------------------------------------------------
//
// The PMO's mental model splits into two questions this dashboard keeps
// visibly separate: is the project performing well (schedule/budget/scope/
// risk/resource — the ProjectHealthSnapshot domains above), and is it being
// run the way it's supposed to be (this section). A governance check is
// never a bare score — every non-pass check below carries the specific
// exception that produced it, so a widget reading this never has to invent
// an explanation.

export type GovernanceCheckStatus = 'pass' | 'fail' | 'warning'

export interface GovernanceCheck {
  id: string
  label: string
  status: GovernanceCheckStatus
  /** The specific exception. Required whenever status isn't 'pass'. */
  detail?: string
}

export interface GovernanceSummary {
  overall: HealthLevel
  checks: GovernanceCheck[]
}

// --- Reporting Compliance --------------------------------------------------------------

export type ReportingComplianceStatus = 'on-time' | 'late'

export interface ReportingCompliance {
  latestUpdate: string
  nextDue: string
  status: ReportingComplianceStatus
  /** Fully skipped reporting periods — distinct from merely being late on the current one. */
  missedPeriods: number
  /** Only set when status is 'late'. */
  daysOverdue?: number
}

// --- Baseline vs Current --------------------------------------------------------------

export interface BaselineVariance<T> {
  baseline: T
  current: T
}

export interface BaselineComparison {
  /** varianceDays = current − baseline, in days. */
  startDate: BaselineVariance<string> & { varianceDays: number }
  finishDate: BaselineVariance<string> & { varianceDays: number }
  /** variancePct = (current − baseline) / baseline × 100. */
  budget: BaselineVariance<number> & { variancePct: number }
  /** Cumulative $ value of approved change requests against the original baseline budget — the figure that should explain most or all of the budget variance above. */
  accumulatedApprovedChange: number
}

// --- Data Quality / Completeness --------------------------------------------------------------
//
// Deliberately does not duplicate TaskActivitySummary's own unassigned/
// missingDates counts (DataQualityWidget reads those directly) — this type
// only holds the governance-lens facts that have nowhere else to live.
export interface DataQualitySummary {
  milestonesWithoutBaseline: number
  /** Required project metadata left blank, e.g. "Total Budget". Empty when none. */
  incompleteMetadataFields: string[]
  unclassifiedRisks: number
  /** Days since any project data (schedule, risks, budget, etc.) was last touched. */
  staleDataDays: number
}

// --- Executive --------------------------------------------------------------
//
// Compressed, decision-oriented lens — "are we executing the strategy, will
// this project deliver, and where should I intervene." Reuses the same
// health/progress/forecast/budget/milestones/attentionItems data every
// other role reads; only the two types below are new.

// The real Strategic Alignment section (strategicAlignmentData.ts) starts
// with no Objective/KPI linked for this Project — StrategicAlignmentView's
// own `alignments` state is an empty array until a user picks one. This is
// a presentation-only mock of what that linkage would show once set,
// isolated here rather than faked as if StrategicAlignmentView already
// stores it.
export interface StrategicContribution {
  objective: string
  linkedProgramObjective: string
  intendedOutcome: string
}

export type RiskMitigationStatus = 'unmitigated' | 'in-progress' | 'mitigated' | 'overdue'

// A curated top-3-to-5 slice for the Executive lens — distinct from the
// full register (risksData.ts) and from RiskSummary's own aggregate counts
// above; names/severities here are chosen to match the same risks already
// narrated through attentionItems and RiskSummary elsewhere in this file.
export interface TopRisk {
  id: string
  name: string
  severity: AttentionSeverity
  impact: string
  mitigationStatus: RiskMitigationStatus
}

// --- Project Member workspace --------------------------------------------------------------
//
// "What am I responsible for, and what do I need to update?" — a single
// named individual's own slice of the project, not a rollup. Nothing here
// is read by any other role's widgets. The real Schedule data model
// (ActivityRow in scheduleData.ts) has no status/progress/priority
// fields — the same divergence already accepted for budgetPerformance
// above (a richer narrative than the literal per-section data models
// support) applies here too.

export type AssignmentBucket = 'overdue' | 'due-soon' | 'later'
export type AssignmentStatus = 'not-started' | 'in-progress' | 'blocked'
export type AssignmentPriority = 'high' | 'medium' | 'low'

export interface MyAssignment {
  id: string
  name: string
  bucket: AssignmentBucket
  dueDate: string
  status: AssignmentStatus
  progressPct: number
  priority?: AssignmentPriority
  /** Set only when status is 'blocked'. */
  blockedReason?: string
  destination?: SectionId
}

export interface MyWorkSummary {
  activeAssignments: number
  overdue: number
  dueSoon: number
  blocked: number
  completedThisPeriod: number
}

// Deliberately separate from MyAssignment's own overdue/blocked buckets —
// this is about the *update itself* being stale or requested, not the
// underlying task's due date.
export interface UpdateRequiredItem {
  id: string
  activityName: string
  reason: string
  destination?: SectionId
}

export interface MyMilestone {
  id: string
  name: string
  dueDate: string
  status: MilestoneStatus
  /** 'owned' = this member is the milestone's owner; 'feeds-into' = their own work gates it without owning it. */
  relevance: 'owned' | 'feeds-into'
}

// Plain-language framing on purpose — "Waiting On" / "Blocking" instead of
// exposing the underlying dependency graph a Project Member has no reason
// to navigate.
export interface MyDependencyItem {
  id: string
  direction: 'waiting-on' | 'blocking'
  description: string
  counterpart: string
  dueDate?: string
  impact?: string
}

export interface MyIssue {
  id: string
  title: string
  description?: string
  severity: AttentionSeverity
  ageDays: number
  destination?: SectionId
}

// Compact orientation strip only — deliberately not the full ProjectMeta
// (ProjectHeader already owns that); this repeats just the four facts a
// Project Member needs without leaving their own dashboard.
export interface ProjectContextSummary {
  status: ProjectLifecycleStatus
  currentPhase: string
  projectManager: string
}

export interface ProjectMemberWorkspace {
  memberName: string
  summary: MyWorkSummary
  assignments: MyAssignment[]
  updatesRequired: UpdateRequiredItem[]
  milestones: MyMilestone[]
  dependencies: MyDependencyItem[]
  issues: MyIssue[]
  context: ProjectContextSummary
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
  /** PMO Office governance lens — see the "Governance (PMO Office)" section above for why this stays separate from `health`. */
  governance: GovernanceSummary
  reportingCompliance: ReportingCompliance
  baseline: BaselineComparison
  dataQuality: DataQualitySummary
  /** Project Member's own personal slice — see the "Project Member workspace" section above. */
  memberWorkspace: ProjectMemberWorkspace
  /** Executive lens — see the "Executive" section above; both mocked/curated per that section's own comments. */
  strategicContribution: StrategicContribution
  topRisks: TopRisk[]
}
