import { buildDateMetric, buildNumericMetric } from './historicalMetric'
import { buildHealthMetric } from './dashboardModels'
import type { AttentionItem, DashboardMilestone, ProjectDashboardData, ProjectDependency } from './dashboardModels'

// Single, internally-consistent mock dataset for the one Project this
// prototype has a real workspace for (proj-client-portal-revamp — same id
// as registry/projectsRegisterData.ts). All six role perspectives read
// this same object; nothing here is per-role. Deliberately not
// all-green: schedule has slipped, one milestone is delayed as a direct
// consequence, risk exposure is high, and that slip is *why* the forecast
// moved — so a reader can trace one number to another instead of the
// scenario feeling like six unrelated random values.
//
// Note: these are lifetime/dashboard-level rollups, not required to equal
// risksData.ts's/scheduleData.ts's individual current row counts exactly
// (a dashboard summarizes more history than a single in-session register
// does) — but every number below was chosen to stay plausible next to them.

const milestones: DashboardMilestone[] = [
  {
    id: 'ms-requirements-approved',
    name: 'Requirements Approved',
    baselineDate: '2026-02-13',
    forecastDate: '2026-02-13',
    varianceDays: 0,
    status: 'completed',
    owner: 'A. Farouk',
  },
  {
    id: 'ms-ux-design-signoff',
    name: 'UX Design Sign-off',
    baselineDate: '2026-03-20',
    forecastDate: '2026-03-20',
    varianceDays: 0,
    status: 'completed',
    owner: 'S. Ali',
  },
  {
    id: 'ms-development-complete',
    name: 'Development Complete',
    baselineDate: '2026-05-29',
    forecastDate: '2026-06-15',
    varianceDays: 17,
    status: 'delayed',
    owner: 'Dev Team',
    dependencyImpact: 'Pushes downstream UAT and Go-Live by the same 17 days.',
  },
  {
    id: 'ms-go-live',
    name: 'Go-Live',
    baselineDate: '2026-07-01',
    forecastDate: '2026-07-18',
    varianceDays: 17,
    status: 'at-risk',
    owner: 'M. Hesham',
    dependencyImpact: 'Program-level launch date at risk pending Development recovery.',
  },
]

const attentionItems: AttentionItem[] = [
  {
    id: 'att-milestone-delay',
    type: 'milestone',
    severity: 'high',
    title: 'Development Complete milestone delayed 17 days',
    description: 'Forecast finish moved from Jun 6 to Jun 15.',
    dueDate: '2026-06-15',
    owner: 'Dev Team',
    impact: 'Delays UAT and Go-Live by the same margin.',
    actionLabel: 'Review Schedule',
    destination: 'schedule',
  },
  {
    id: 'att-overdue-activities',
    type: 'overdue-task',
    severity: 'medium',
    title: '2 Activities are overdue',
    dueDate: '2026-05-20',
    actionLabel: 'Open Schedule',
    destination: 'schedule',
  },
  {
    id: 'att-risk-vendor-delay',
    type: 'risk',
    severity: 'critical',
    title: 'Key vendor delivery delay is unmitigated',
    owner: 'A. Farouk',
    impact: 'Exposure score 12 of 25 — the same vendor also feeds Core Banking Platform Migration.',
    actionLabel: 'Review Risk',
    destination: 'risks',
    escalatedTo: 'program-manager',
  },
  {
    id: 'att-risk-resource-attrition',
    type: 'risk',
    severity: 'high',
    title: 'Key resource attrition risk escalated',
    owner: 'S. Ali',
    impact: 'Exposure score 10 of 25 — draws from a resource pool shared across the program.',
    actionLabel: 'Review Risk',
    destination: 'risks',
    escalatedTo: 'program-manager',
  },
  {
    id: 'att-dependency-go-live',
    type: 'dependency',
    severity: 'high',
    title: 'Go-Live blocked on Development Complete',
    description: 'Downstream dependency inherits the 17-day slip.',
    actionLabel: 'View Dependency',
    destination: 'schedule',
  },
  {
    id: 'att-approval-crs',
    type: 'approval',
    severity: 'medium',
    title: '2 Change Requests awaiting your approval',
    actionLabel: 'Review Approvals',
    escalatedTo: 'program-manager',
  },
  {
    id: 'att-decision-recovery-plan',
    type: 'approval',
    severity: 'high',
    title: 'Approve recovery plan for 17-day schedule slip',
    impact: 'Recovery plan affects the shared SSO dependency timeline for Core Banking Platform Migration.',
    actionLabel: 'Review Plan',
    destination: 'schedule',
    escalatedTo: 'program-manager',
  },
  {
    id: 'att-cr-014',
    type: 'change-request',
    severity: 'low',
    title: 'CR-014 pending review',
    dueDate: '2026-05-27',
    actionLabel: 'Review CR',
  },
  {
    id: 'att-monthly-report',
    type: 'reporting',
    severity: 'low',
    title: 'Monthly status report due in 3 days',
    dueDate: '2026-05-23',
    actionLabel: 'Prepare Report',
  },
  {
    id: 'att-business-case',
    type: 'governance',
    severity: 'medium',
    title: 'Business Case not yet finalized',
    actionLabel: 'Open Business Case',
    destination: 'business-case',
  },
  {
    id: 'att-reporting-frequency',
    type: 'configuration',
    severity: 'low',
    title: 'Reporting Frequency not confirmed for Q3',
    actionLabel: 'Review Settings',
    destination: 'overview',
  },
  {
    id: 'att-issues-blocked',
    type: 'issue',
    severity: 'high',
    title: '2 Issues blocked pending vendor input',
    actionLabel: 'Open Issues',
  },
]

// Real project names from projectsRegisterData.ts's Digital Experience
// Program (Employee Self-Service Portal, Mobile Banking App Redesign) plus
// two plausible cross-program partners — not invented projects, borrowed
// from the app's own register so the scenario is traceable there too.
const dependencies: ProjectDependency[] = [
  {
    id: 'dep-in-sso',
    direction: 'incoming',
    counterpart: 'Core Banking Platform Migration',
    description: 'Shared SSO integration endpoint',
    status: 'red',
    dueDate: '2026-05-15',
    impact: 'Late delivery is the primary driver of the 17-day Development Complete slip.',
  },
  {
    id: 'dep-in-design-system',
    direction: 'incoming',
    counterpart: 'Employee Self-Service Portal',
    description: 'Shared design system component library v2',
    status: 'green',
    dueDate: '2026-03-01',
  },
  {
    id: 'dep-out-auth-component',
    direction: 'outgoing',
    counterpart: 'Mobile Banking App Redesign',
    description: 'Shared authentication component',
    status: 'amber',
    dueDate: '2026-06-01',
    impact: "Mobile Banking App Redesign's own integration milestone is at risk if this slips further.",
  },
  {
    id: 'dep-out-reporting-api',
    direction: 'outgoing',
    counterpart: 'Regulatory Reporting Automation',
    description: 'Customer data API for compliance reporting',
    status: 'green',
    dueDate: '2026-05-01',
  },
]

export const mockProjectDashboard: ProjectDashboardData = {
  projectId: 'proj-client-portal-revamp',

  health: {
    // Recent deterioration, not a permanent state — pairs with the
    // schedule slip below.
    overall: buildHealthMetric('amber', 'green'),
    schedule: { level: 'amber', note: 'Development forecast to finish 17 days late.' },
    budget: { level: 'green', note: 'No variance flagged.' },
    scope: { level: 'amber', note: 'Scope creep risk being actively tracked.' },
    risk: { level: 'red', note: '2 high-exposure risks open.' },
    resource: { level: 'green', note: '3 resources actively assigned, no unfilled roles.' },
    governance: { level: 'amber', note: 'Submit for Review blocked — 2 required sections incomplete.' },
    lastUpdated: '2026-05-20',
  },

  progress: {
    // +6 points since last update — matches the improving side of the
    // scenario even while the forecast (below) is slipping.
    actualPct: buildNumericMetric(55, 49, (delta) => `${delta > 0 ? '+' : ''}${delta} pts since last update`),
    plannedPct: 62,
    variancePct: 55 - 62,
    reportingPeriod: 'Period ending May 2026',
  },

  forecast: {
    baselineFinish: '2026-05-29',
    forecastFinish: buildDateMetric('2026-06-15', '2026-06-06', (deltaDays) => `Slipped another ${deltaDays} days`),
    varianceDays: 17,
  },

  milestones,

  risks: {
    totalOpen: 4,
    highCritical: 2,
    new: 1,
    closed: 2,
    escalated: 1,
    mitigationOverdue: 1,
    withoutOwner: 1,
    exposure: 34,
  },

  issues: {
    open: 7,
    critical: 2,
    blocked: 1,
    overdue: 3,
    unassigned: 2,
    oldestAgeDays: 34,
  },

  changeRequests: {
    pending: 2,
    approved: 5,
    rejected: 1,
    awaitingCurrentUserAction: 1,
    // Same 9-day figure as the forecast's last move — one of the pending
    // CRs is part of why the forecast slipped again.
    scheduleImpactDays: 9,
    costImpact: 18_000,
  },

  activities: {
    overdue: 2,
    dueSoon: 3,
    blocked: 1,
    behindSchedule: 2,
    unassigned: 0,
    missingDates: 1,
    statusDistribution: { 'not-started': 3, 'in-progress': 2, completed: 4, delayed: 1 },
  },

  attentionItems,
  dependencies,

  team: { memberCount: 3, overdueAssignments: 2, unassignedWork: 0 },

  activityFeed: [
    { id: 'act-1', type: 'progress-update', summary: 'Progress updated to 55% complete', actor: 'M. Hesham', occurredLabel: '3h ago' },
    { id: 'act-2', type: 'milestone-rescheduled', summary: 'Development Complete moved from Jun 6 to Jun 15', actor: 'S. Ali', occurredLabel: '1d ago' },
    { id: 'act-3', type: 'risk-raised', summary: 'Risk "Key resource attrition" raised', actor: 'S. Ali', occurredLabel: '2d ago' },
    { id: 'act-4', type: 'change-approved', summary: 'CR-011 approved — vendor contract extension', actor: 'S. Al-Rashid', occurredLabel: '3d ago' },
    { id: 'act-5', type: 'member-assigned', summary: 'R. Nasser assigned to Backend API build', actor: 'M. Hesham', occurredLabel: '4d ago' },
    { id: 'act-6', type: 'risk-updated', summary: 'Mitigation updated on "Key vendor delivery delay"', actor: 'A. Farouk', occurredLabel: '5d ago' },
    { id: 'act-7', type: 'field-updated', summary: 'Department corrected on Overview', actor: 'M. Hesham', occurredLabel: '6d ago' },
  ],

  // Widening actual-vs-planned gap toward the most recent period — the
  // "where is performance deteriorating" story a trend chart should show,
  // not just a flat mixed snapshot. Last point matches progress.actualPct/plannedPct above.
  progressTrend: [
    { period: 'Jan', actualPct: 5, plannedPct: 8 },
    { period: 'Feb', actualPct: 18, plannedPct: 22 },
    { period: 'Mar', actualPct: 31, plannedPct: 38 },
    { period: 'Apr', actualPct: 49, plannedPct: 50 },
    { period: 'May', actualPct: 55, plannedPct: 62 },
  ],

  // Last point matches risks.totalOpen/exposure above.
  riskTrend: [
    { period: 'Jan', openRisks: 2, exposure: 14 },
    { period: 'Feb', openRisks: 2, exposure: 16 },
    { period: 'Mar', openRisks: 3, exposure: 22 },
    { period: 'Apr', openRisks: 3, exposure: 28 },
    { period: 'May', openRisks: 4, exposure: 34 },
  ],

  // Bucket counts sum to issues.open (7); the oldest bucket holds issues.oldestAgeDays (34).
  issueAging: [
    { bucket: '0–7d', count: 3 },
    { bucket: '8–14d', count: 2 },
    { bucket: '15–30d', count: 1 },
    { bucket: '30d+', count: 1 },
  ],

  // Exists (unlike BudgetView's own still-empty Total Budget field) because
  // this dashboard's mock scenario calls for Budget health to read Green —
  // this is the data that backs that reading.
  budgetPerformance: {
    totalBudget: 250_000,
    actualSpend: 128_000,
    forecastAtCompletion: 245_000,
    variancePct: -2,
  },
}

// Synchronous today (this *is* the mock); the function boundary is what a
// real fetch will replace later without changing any caller.
export function getProjectDashboardData(): ProjectDashboardData {
  return mockProjectDashboard
}
