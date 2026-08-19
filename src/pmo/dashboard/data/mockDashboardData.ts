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
    escalatedTo: 'pmo-office',
  },
  {
    id: 'att-reporting-frequency',
    type: 'configuration',
    severity: 'low',
    title: 'Reporting Frequency not confirmed for Q3',
    actionLabel: 'Review Settings',
    destination: 'overview',
    escalatedTo: 'pmo-office',
  },
  {
    id: 'att-issues-blocked',
    type: 'issue',
    severity: 'high',
    title: '2 Issues blocked pending vendor input',
    actionLabel: 'Open Issues',
  },

  // --- PMO Office governance exceptions — same AttentionItem model as
  // every other role's inbox, escalated here because these are process/
  // compliance gaps rather than delivery decisions a Project or Program
  // Manager would resolve themselves.
  {
    id: 'att-reporting-overdue',
    type: 'reporting',
    severity: 'high',
    title: 'Quarterly Governance Report is 5 days overdue',
    description: 'Last submitted for the period ending Mar 18 2026.',
    dueDate: '2026-05-15',
    actionLabel: 'Submit Report',
    escalatedTo: 'pmo-office',
  },
  {
    id: 'att-status-stale',
    type: 'governance',
    severity: 'medium',
    title: 'Project status still shows Draft despite active execution',
    description: 'Schedule, Budget, and Risk data all reflect a project already in delivery.',
    actionLabel: 'Update Status',
    destination: 'overview',
    escalatedTo: 'pmo-office',
  },
  {
    id: 'att-data-quality-schedule',
    type: 'data-quality',
    severity: 'medium',
    title: '1 Activity is missing planned dates',
    description: 'Schedule data-quality gap flagged during governance review.',
    actionLabel: 'Review Schedule',
    destination: 'schedule',
    escalatedTo: 'pmo-office',
  },
  {
    id: 'att-risk-no-owner',
    type: 'risk',
    severity: 'high',
    title: '"Scope creep" risk has no assigned owner',
    description: 'Governance requires every open risk to carry an owner.',
    actionLabel: 'Assign Owner',
    destination: 'risks',
    escalatedTo: 'pmo-office',
  },
  {
    id: 'att-cr-governance-exception',
    type: 'change-request',
    severity: 'medium',
    title: 'CR-011 approved without recorded budget sign-off',
    description: 'Vendor contract extension — exception flagged during change control review.',
    actionLabel: 'Review Change Control',
    escalatedTo: 'pmo-office',
  },

  // --- Executive attention — only items that genuinely need executive
  // intervention (funding, major scope, escalated risk, major schedule
  // impact), each tracing to the same 17-day slip / vendor risk / $18,000
  // CR narrative already established above rather than inventing new facts.
  {
    id: 'att-exec-funding-decision',
    type: 'approval',
    severity: 'high',
    title: 'Approve $18,000 budget increase for vendor contract extension',
    description: 'Additional funding required to keep the vendor engagement in place through Go-Live.',
    actionLabel: 'Review Funding Request',
    destination: 'budget-planned-dates',
    escalatedTo: 'executive',
  },
  {
    id: 'att-exec-schedule-impact',
    type: 'milestone',
    severity: 'critical',
    title: 'Go-Live at risk — 17-day schedule slip needs sign-off on the recovery plan',
    description: 'Recovery plan affects the shared SSO dependency timeline with Core Banking Platform Migration.',
    dueDate: '2026-07-18',
    actionLabel: 'Review Recovery Plan',
    destination: 'schedule',
    escalatedTo: 'executive',
  },
  {
    id: 'att-exec-vendor-risk-escalation',
    type: 'risk',
    severity: 'critical',
    title: 'Key vendor delivery delay risk now affects two active projects',
    description: 'Unmitigated — the same vendor also feeds Core Banking Platform Migration.',
    actionLabel: 'Review Risk',
    destination: 'risks',
    escalatedTo: 'executive',
  },
  {
    id: 'att-exec-scope-decision',
    type: 'change-request',
    severity: 'medium',
    title: 'Decide whether to descope Advanced Reporting to protect the Go-Live date',
    description: 'Would recover an estimated 10 of the 17 slipped days but requires sponsor sign-off on reduced scope.',
    actionLabel: 'Review Scope Decision',
    escalatedTo: 'executive',
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
    // Kept in sync with the detailed `governance` breakdown below (4 of 9
    // checks failing) rather than restated independently — this is the
    // one-line rollup, that's the explained version.
    governance: { level: 'red', note: '4 of 9 governance checks failing — see Governance Health.' },
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
    // "Key vendor delivery delay" is unmitigated (see att-risk-vendor-delay).
    withoutResponsePlan: 1,
    // Not reviewed within the required cadence — a separate risk from the
    // one that's unowned (withoutOwner is "Scope creep").
    stale: 1,
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
    // CR-014 (pending review, see att-cr-014) has been open longest.
    oldestPendingAgeDays: 12,
    // The recovery-plan CR (att-decision-recovery-plan) is the one pending
    // CR whose schedule/cost impact clears the materiality threshold.
    materialImpact: 1,
    governanceExceptions: ['CR-011 (vendor contract extension) was approved without a recorded budget sign-off.'],
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

  // PMO Office governance lens. Every non-pass check names the exact
  // exception (never a bare fail) — the two "fail" checks that reference
  // Schedule/Budget completeness are the same two gaps ReadinessPanel's
  // mockSectionReadiness already flags (2 Phases have no Activities, Total
  // Budget missing), read through a governance rather than a submission lens.
  governance: {
    overall: 'red',
    checks: [
      { id: 'gc-pm-assigned', label: 'Project Manager assigned', status: 'pass' },
      { id: 'gc-sponsor-assigned', label: 'Sponsor / Owner assigned', status: 'pass' },
      { id: 'gc-baseline-approved', label: 'Approved baseline exists', status: 'pass' },
      {
        id: 'gc-plan-complete',
        label: 'Project plan sufficiently complete',
        status: 'fail',
        detail: 'Schedule: 2 Phases have no Activities.',
      },
      {
        id: 'gc-reporting-current',
        label: 'Reporting period current',
        status: 'fail',
        detail: 'Quarterly Governance Report is 5 days overdue (due May 15, last submitted Mar 18).',
      },
      {
        id: 'gc-risks-reviewed',
        label: 'Risks recently reviewed',
        status: 'warning',
        detail: '1 of 4 open risks has not been reviewed within the required cadence.',
      },
      {
        id: 'gc-required-fields',
        label: 'Required project fields complete',
        status: 'fail',
        detail: 'Budget & Planned Dates: Total Budget not set.',
      },
      {
        id: 'gc-approvals-complete',
        label: 'Required approvals complete',
        status: 'fail',
        detail: 'Business Case not yet finalized or approved.',
      },
      {
        id: 'gc-status-current',
        label: 'Project status current',
        status: 'warning',
        detail: 'Status still shows Draft while Schedule, Budget, and Risk data reflect active execution.',
      },
    ],
  },

  // Formal PMO-tracked cadence — distinct from the ad-hoc "Monthly status
  // report" reminder in attentionItems (att-monthly-report), which is a
  // Project Manager data-refresh nudge, not this governance-tracked report.
  reportingCompliance: {
    latestUpdate: '2026-03-18',
    nextDue: '2026-05-15',
    status: 'late',
    missedPeriods: 0,
    daysOverdue: 5,
  },

  baseline: {
    startDate: { baseline: '2026-01-05', current: '2026-01-05', varianceDays: 0 },
    // Matches forecast.baselineFinish / forecast.varianceDays above.
    finishDate: { baseline: '2026-05-29', current: '2026-06-15', varianceDays: 17 },
    // baseline (232,000) + accumulatedApprovedChange (18,000, matching
    // changeRequests.costImpact) = current (250,000), matching
    // budgetPerformance.totalBudget above.
    budget: { baseline: 232_000, current: 250_000, variancePct: 7.8 },
    accumulatedApprovedChange: 18_000,
  },

  dataQuality: {
    milestonesWithoutBaseline: 0,
    incompleteMetadataFields: ['Total Budget (Budget & Planned Dates)'],
    unclassifiedRisks: 1,
    staleDataDays: 11,
  },

  // Project Member persona — S. Ali, who owns the UX Design activity/
  // milestone in scheduleData.ts and dashboard milestones above, and is
  // moving into UAT/Go-Live-adjacent work as Phase 2 continues. "Today" is
  // the same 2026-05-20 anchor as health.lastUpdated and reportingCompliance
  // above, so overdue/due-soon framing here stays consistent with the rest
  // of the dashboard.
  memberWorkspace: {
    memberName: 'S. Ali',
    summary: {
      activeAssignments: 6,
      overdue: 2,
      dueSoon: 2,
      blocked: 1,
      completedThisPeriod: 2,
    },
    assignments: [
      {
        id: 'my-accessibility-review',
        name: 'UX Design — Accessibility review sign-off',
        bucket: 'overdue',
        dueDate: '2026-05-15',
        status: 'in-progress',
        progressPct: 60,
        priority: 'high',
        destination: 'schedule',
      },
      {
        id: 'my-uat-scripts',
        name: 'Finalize UAT test scripts',
        bucket: 'overdue',
        dueDate: '2026-05-18',
        status: 'blocked',
        progressPct: 20,
        priority: 'medium',
        blockedReason: 'Waiting on Development Complete',
        destination: 'schedule',
      },
      {
        id: 'my-steering-approval',
        name: 'UX Design Sign-off — Steering approval',
        bucket: 'due-soon',
        dueDate: '2026-05-23',
        status: 'in-progress',
        progressPct: 90,
        priority: 'high',
        destination: 'schedule',
      },
      {
        id: 'my-build-review',
        name: 'Review Development build for UAT readiness',
        bucket: 'due-soon',
        dueDate: '2026-05-27',
        status: 'not-started',
        progressPct: 0,
        priority: 'medium',
        destination: 'schedule',
      },
      {
        id: 'my-uat-cycle-1',
        name: 'UAT execution — Cycle 1',
        bucket: 'later',
        dueDate: '2026-06-05',
        status: 'not-started',
        progressPct: 0,
        priority: 'medium',
        destination: 'schedule',
      },
      {
        id: 'my-golive-checklist',
        name: 'Go-Live readiness checklist',
        bucket: 'later',
        dueDate: '2026-07-10',
        status: 'not-started',
        progressPct: 0,
        priority: 'low',
        destination: 'schedule',
      },
    ],
    // Distinct from the overdue/blocked assignments above — these are
    // about the update itself being stale or explicitly requested.
    updatesRequired: [
      {
        id: 'ur-steering-approval',
        activityName: 'UX Design Sign-off — Steering approval',
        reason: 'Progress update overdue — last updated 9 days ago (weekly cadence expected).',
        destination: 'schedule',
      },
      {
        id: 'ur-uat-scripts',
        activityName: 'Finalize UAT test scripts',
        reason: 'M. Hesham requested a status update on blocked UAT prep.',
        destination: 'schedule',
      },
      {
        id: 'ur-accessibility-review',
        activityName: 'UX Design — Accessibility review sign-off',
        reason: 'Status has shown "In Progress" for 15 days with no change.',
        destination: 'schedule',
      },
    ],
    // "UAT Sign-off" is a new milestone this member owns; "Go-Live" reuses
    // the same date/status as the dashboard's own milestones list above —
    // relevant here because this member's UAT work gates it, not because
    // they own it.
    milestones: [
      { id: 'mm-uat-signoff', name: 'UAT Sign-off', dueDate: '2026-06-10', status: 'not-started', relevance: 'owned' },
      { id: 'mm-go-live', name: 'Go-Live', dueDate: '2026-07-18', status: 'at-risk', relevance: 'feeds-into' },
    ],
    dependencies: [
      {
        id: 'mydep-dev-complete',
        direction: 'waiting-on',
        description: 'Development Complete',
        counterpart: 'Dev Team',
        dueDate: '2026-06-15',
        impact: 'Blocks Finalize UAT Test Scripts until the build is ready to test.',
      },
      {
        id: 'mydep-uat-execution',
        direction: 'blocking',
        description: 'UAT execution readiness',
        counterpart: 'QA Team',
        impact: 'QA Team is waiting on my UAT test scripts before Cycle 1 can start.',
      },
    ],
    issues: [
      {
        id: 'myissue-vendor-component-lib',
        title: 'Vendor-supplied UI component library incomplete',
        description: 'Blocking Accessibility review sign-off.',
        severity: 'high',
        ageDays: 8,
      },
    ],
    // status/currentPhase/projectManager mirror mockProjectMeta and
    // scheduleData.ts's Phase 2 name exactly — not restated independently.
    context: {
      status: 'Draft',
      currentPhase: 'Phase 2 — Delivery',
      projectManager: 'M. Hesham',
    },
  },

  // Executive lens. objective reuses Overview's own real Description text;
  // linkedProgramObjective/intendedOutcome reuse real reference-catalog
  // entries from strategicAlignmentData.ts (SO-201, KPI-031) — but the
  // linkage itself is mocked here for presentation, since the real
  // Strategic Alignment section has nothing saved for this Project yet
  // (see the StrategicContribution type's own comment in dashboardModels.ts).
  strategicContribution: {
    objective: 'Redesign the client-facing portal for better self-service, reducing support ticket volume and improving customer satisfaction.',
    linkedProgramObjective: 'SO-201 — Accelerate Digital Transformation (Digital Experience Program)',
    intendedOutcome: 'Lift Digital Adoption Rate (KPI-031) and reduce support ticket volume.',
  },

  // Same three risks already narrated through attentionItems and
  // RiskSummary above (exposure scores, escalation, no-owner exception) —
  // re-surfaced here as the Executive's curated top-3, not a fourth
  // disconnected risk list.
  topRisks: [
    {
      id: 'tr-vendor-delay',
      name: 'Key vendor delivery delay',
      severity: 'critical',
      impact: 'Exposure 12/25 — same vendor also feeds Core Banking Platform Migration.',
      mitigationStatus: 'unmitigated',
    },
    {
      id: 'tr-resource-attrition',
      name: 'Key resource attrition',
      severity: 'high',
      impact: 'Exposure 10/25 — draws from a resource pool shared across the program.',
      mitigationStatus: 'in-progress',
    },
    {
      id: 'tr-scope-creep',
      name: 'Scope creep from stakeholder requests',
      severity: 'medium',
      impact: 'No assigned owner — flagged as a governance exception.',
      mitigationStatus: 'overdue',
    },
  ],
}

// Synchronous today (this *is* the mock); the function boundary is what a
// real fetch will replace later without changing any caller.
export function getProjectDashboardData(): ProjectDashboardData {
  return mockProjectDashboard
}
