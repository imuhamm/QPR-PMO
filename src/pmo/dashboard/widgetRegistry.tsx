import type { ReactElement } from 'react'
import type { SectionId } from '../types'
import type { DashboardMode, DemoDashboardRole } from './roleConfig'
import type { ProjectDashboardData } from './data/dashboardModels'
import { MetricWidget } from './widgets/MetricWidget'
import { ListWidget } from './widgets/ListWidget'
import { PlaceholderWidget } from './widgets/PlaceholderWidget'
import { ProjectHealthSummaryWidget } from './widgets/ProjectHealthSummaryWidget'
import { NeedsAttentionWidget } from './widgets/NeedsAttentionWidget'
import { MilestoneTimelineWidget } from './widgets/MilestoneTimelineWidget'
import { ScheduleExceptionsWidget } from './widgets/ScheduleExceptionsWidget'
import { TeamWorkloadWidget } from './widgets/TeamWorkloadWidget'
import { RisksIssuesWidget } from './widgets/RisksIssuesWidget'
import { ChangeRequestsWidget } from './widgets/ChangeRequestsWidget'
import { ProgressVsPlanWidget } from './widgets/ProgressVsPlanWidget'
import { ScheduleVarianceWidget } from './widgets/ScheduleVarianceWidget'
import { MilestonePerformanceWidget } from './widgets/MilestonePerformanceWidget'
import { TaskStatusDistributionWidget } from './widgets/TaskStatusDistributionWidget'
import { RiskExposureTrendWidget } from './widgets/RiskExposureTrendWidget'
import { IssueAgingWidget } from './widgets/IssueAgingWidget'
import { BudgetPerformanceWidget } from './widgets/BudgetPerformanceWidget'
import { ProgramMilestonesWidget } from './widgets/ProgramMilestonesWidget'
import { DependenciesWidget } from './widgets/DependenciesWidget'
import { ChangeImpactWidget } from './widgets/ChangeImpactWidget'
import { PmoProjectHealthWidget } from './widgets/PmoProjectHealthWidget'
import { GovernanceHealthWidget } from './widgets/GovernanceHealthWidget'
import { ReportingComplianceWidget } from './widgets/ReportingComplianceWidget'
import { BaselineVsCurrentWidget } from './widgets/BaselineVsCurrentWidget'
import { ChangeControlWidget } from './widgets/ChangeControlWidget'
import { RiskGovernanceWidget } from './widgets/RiskGovernanceWidget'
import { DataQualityWidget } from './widgets/DataQualityWidget'
import { AuditSignalsWidget } from './widgets/AuditSignalsWidget'
import { MyWorkSummaryWidget } from './widgets/MyWorkSummaryWidget'
import { MyWorkWidget } from './widgets/MyWorkWidget'
import { UpdatesRequiredWidget } from './widgets/UpdatesRequiredWidget'
import { MyMilestonesWidget } from './widgets/MyMilestonesWidget'
import { MyDependenciesWidget } from './widgets/MyDependenciesWidget'
import { MyIssuesWidget } from './widgets/MyIssuesWidget'
import { ProjectContextWidget } from './widgets/ProjectContextWidget'
import { ExecutiveHealthWidget } from './widgets/ExecutiveHealthWidget'
import { StrategicContributionWidget } from './widgets/StrategicContributionWidget'
import { ExecutiveProgressForecastWidget } from './widgets/ExecutiveProgressForecastWidget'
import { TopRisksWidget } from './widgets/TopRisksWidget'
import { ExecutiveTrendWidget } from './widgets/ExecutiveTrendWidget'

export interface WidgetRenderProps {
  role: DemoDashboardRole
  mode: DashboardMode
  onNavigateToSection: (id: SectionId) => void
  data: ProjectDashboardData
}

export interface WidgetDefinition {
  id: string
  /** Hoisted out of `render` so DashboardGrid can show a titled skeleton without invoking the widget's own content logic. */
  title: string
  render: (props: WidgetRenderProps) => ReactElement
}

// One entry per widget id, each a thin wrapper around a reusable widget
// variant (Metric/List/Placeholder, all built on the shared DashboardWidget
// shell) with its own mock content. This is the extension point: a real
// implementation later replaces the mock values inside one wrapper without
// touching the grid, the manifests, or any other widget.
const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  {
    id: 'my-open-activities',
    title: 'My Open Activities',
    render: () => (
      <MetricWidget
        title="My Open Activities"
        value="6"
        subtitle="2 due this week"
        tooltip="Activities from Schedule where you're the Owner"
      />
    ),
  },
  {
    id: 'upcoming-milestones',
    title: 'Upcoming Milestones',
    render: ({ onNavigateToSection }) => (
      <ListWidget
        title="Upcoming Milestones"
        items={[
          { id: 'm1', label: 'Requirements approved', meta: 'Feb 13' },
          { id: 'm2', label: 'UX design sign-off', meta: 'Mar 20' },
          { id: 'm3', label: 'Development complete', meta: 'May 29' },
        ]}
        footer="3 milestones in the next 90 days"
        action={{ label: 'Open Schedule', onClick: () => onNavigateToSection('schedule') }}
      />
    ),
  },
  {
    id: 'schedule-status',
    title: 'Schedule Health',
    render: () => (
      <MetricWidget
        title="Schedule Health"
        value="0 days"
        subtitle="Variance vs plan"
        status={{ level: 'green' }}
        tooltip="Comparison of planned vs current Activity dates"
      />
    ),
  },
  {
    // Admin's "Configuration Health / Configuration Exceptions" — reuses
    // Project Details' own section-readiness data (which section is
    // incomplete/missing required fields) rather than inventing a separate
    // config-exceptions data source; the danger-tagged rows already ARE the
    // exceptions.
    id: 'admin-configuration-health',
    title: 'Configuration Health',
    render: () => (
      <ListWidget
        title="Configuration Health"
        items={[
          { id: 'r1', label: 'Schedule', tag: '2 Phases missing Activities', tagTone: 'danger' },
          { id: 'r2', label: 'Budget & Planned Dates', tag: 'Total Budget missing', tagTone: 'danger' },
          { id: 'r3', label: 'Overview, Risks, Resources', tag: 'Complete', tagTone: 'neutral' },
        ]}
        footer="2 of 7 sections incomplete"
      />
    ),
  },
  {
    id: 'team-workload',
    title: 'Team Workload',
    render: ({ onNavigateToSection }) => (
      <ListWidget
        title="Team Workload"
        items={[
          { id: 'w1', label: 'A. Farouk', meta: '2 activities' },
          { id: 'w2', label: 'S. Ali', meta: '2 activities' },
          { id: 'w3', label: 'Dev Team', meta: '1 activity' },
        ]}
        footer="3 resources active"
        action={{ label: 'Open Resources', onClick: () => onNavigateToSection('resources') }}
      />
    ),
  },
  {
    // Admin's "Workflow Status" — same approval-queue count Pending
    // Approvals already tracks, just framed as workflow state for this role.
    id: 'admin-workflow-status',
    title: 'Workflow Status',
    render: () => <MetricWidget title="Workflow Status" value="2" subtitle="Approvals awaiting sign-off" status={{ level: 'amber' }} />,
  },
  {
    id: 'my-assigned-risks',
    title: 'My Assigned Risks',
    render: ({ onNavigateToSection }) => (
      <ListWidget
        title="My Assigned Risks"
        items={[{ id: 'rk1', label: 'Key resource attrition', tag: '10', tagTone: 'danger' }]}
        action={{ label: 'Open Risks', onClick: () => onNavigateToSection('risks') }}
      />
    ),
  },
  {
    id: 'recent-activity-feed',
    title: 'Recent Activity',
    render: () => (
      <ListWidget
        title="Recent Activity"
        items={[
          { id: 'a1', label: 'Stakeholder workshop marked complete', meta: '2h ago' },
          { id: 'a2', label: 'Risk "Vendor delivery delay" updated', meta: '1d ago' },
          { id: 'a3', label: 'Budget field edited', meta: '2d ago' },
        ]}
      />
    ),
  },
  {
    id: 'risk-exposure',
    title: 'Top Risk Exposure',
    render: ({ onNavigateToSection }) => (
      <ListWidget
        title="Top Risk Exposure"
        items={[
          { id: 'rk1', label: 'Key resource attrition', tag: '10', tagTone: 'danger' },
          { id: 'rk2', label: 'Key vendor delivery delay', tag: '12', tagTone: 'danger' },
          { id: 'rk3', label: 'Scope creep', tag: '6', tagTone: 'warning' },
        ]}
        status={{ level: 'red', label: '2 high-exposure risks' }}
        action={{ label: 'Open Risks', onClick: () => onNavigateToSection('risks') }}
      />
    ),
  },
  {
    id: 'budget-variance',
    title: 'Budget Variance',
    render: ({ onNavigateToSection }) => (
      <MetricWidget
        title="Budget Variance"
        value="—"
        tooltip="Actual spend vs Total Budget"
        loadState="empty"
        emptyMessage="Total Budget not yet set"
        action={{ label: 'Open Budget', onClick: () => onNavigateToSection('budget-planned-dates') }}
      />
    ),
  },
  {
    id: 'strategic-alignment-summary',
    title: 'Strategic Alignment',
    render: () => <MetricWidget title="Strategic Alignment" value="1 of 1" subtitle="Objective linked with a KPI" status={{ level: 'green' }} />,
  },
  {
    id: 'portfolio-health',
    title: 'Portfolio Health',
    render: () => (
      <PlaceholderWidget
        title="Portfolio Health"
        note="Cross-project rollup — needs a multi-project data set, not yet available."
      />
    ),
  },
  {
    id: 'kpi-trend',
    title: 'KPI Trend',
    render: () => (
      <PlaceholderWidget title="KPI Trend" note="Historical KPI series — needs time-series data, not yet available." />
    ),
  },
  {
    id: 'project-rag-summary',
    title: 'Overall Status',
    render: () => (
      <MetricWidget
        title="Overall Status"
        value="Amber"
        subtitle="2 blockers"
        status={{ level: 'amber' }}
        tooltip="Overall RAG rollup across Schedule, Budget, and Risks"
      />
    ),
  },

  // --- Project Manager reference implementation — reads real mock data via
  // WidgetRenderProps.data instead of hardcoding its own values, unlike the
  // generic placeholders above. Distinct ids from the generic widgets above
  // on purpose: other roles' manifests still point at those and are out of
  // scope for this pass.
  {
    id: 'project-health-summary',
    title: 'Project Health Summary',
    render: ({ data }) => <ProjectHealthSummaryWidget data={data} />,
  },
  {
    id: 'needs-attention',
    title: 'Needs My Attention',
    render: ({ data, onNavigateToSection }) => (
      <NeedsAttentionWidget items={data.attentionItems} onNavigateToSection={onNavigateToSection} />
    ),
  },
  {
    id: 'milestone-timeline',
    title: 'Upcoming / Critical Milestones',
    render: ({ data }) => <MilestoneTimelineWidget milestones={data.milestones} />,
  },
  {
    id: 'schedule-exceptions',
    title: 'Schedule Exceptions',
    render: ({ data, onNavigateToSection }) => (
      <ScheduleExceptionsWidget activities={data.activities} onNavigateToSection={onNavigateToSection} />
    ),
  },
  {
    id: 'team-workload-summary',
    title: 'Team / Workload',
    render: ({ data, onNavigateToSection }) => <TeamWorkloadWidget team={data.team} onNavigateToSection={onNavigateToSection} />,
  },
  {
    id: 'risks-issues-summary',
    title: 'Risks & Issues',
    render: ({ data, onNavigateToSection }) => (
      <RisksIssuesWidget risks={data.risks} issues={data.issues} onNavigateToSection={onNavigateToSection} />
    ),
  },
  {
    id: 'change-requests-summary',
    title: 'Change Requests',
    render: ({ data }) => <ChangeRequestsWidget changeRequests={data.changeRequests} />,
  },
  {
    id: 'recent-activity',
    title: 'Recent Activity',
    render: ({ data }) => (
      <ListWidget
        title="Recent Activity"
        items={data.activityFeed.map((e) => ({ id: e.id, label: e.summary, meta: e.occurredLabel }))}
      />
    ),
  },
  {
    id: 'progress-vs-plan',
    title: 'Progress vs Plan',
    render: ({ data }) => (
      <ProgressVsPlanWidget trend={data.progressTrend} actualPct={data.progress.actualPct} plannedPct={data.progress.plannedPct} />
    ),
  },
  {
    id: 'schedule-variance',
    title: 'Schedule Variance',
    render: ({ data }) => <ScheduleVarianceWidget forecast={data.forecast} />,
  },
  {
    id: 'milestone-performance',
    title: 'Milestone Performance',
    render: ({ data }) => <MilestonePerformanceWidget milestones={data.milestones} />,
  },
  {
    id: 'task-status-distribution',
    title: 'Task Status Distribution',
    render: ({ data }) => <TaskStatusDistributionWidget activities={data.activities} />,
  },
  {
    id: 'risk-exposure-trend',
    title: 'Risk Exposure / Risk Trend',
    render: ({ data }) => <RiskExposureTrendWidget risks={data.risks} trend={data.riskTrend} />,
  },
  {
    id: 'issue-aging',
    title: 'Issue Aging',
    render: ({ data }) => <IssueAgingWidget aging={data.issueAging} />,
  },
  {
    id: 'budget-performance',
    title: 'Budget Performance',
    render: ({ data }) => <BudgetPerformanceWidget budget={data.budgetPerformance} />,
  },

  // --- Program Manager — reuses several PM widgets as-is (Project Health
  // Summary, Progress vs Plan, Schedule Variance answer the same questions
  // for this role) and adds the specialized ones its mental model actually
  // needs: cross-project dependencies, program-filtered milestones,
  // escalated risks, and decisions. NeedsAttentionWidget is reused twice
  // below (risks-program-intervention, decisions-required) over two
  // different pre-filtered slices of the same attentionItems array.
  {
    id: 'program-milestones',
    title: 'Program-Relevant Milestones',
    render: ({ data }) => <ProgramMilestonesWidget milestones={data.milestones} />,
  },
  {
    id: 'cross-project-dependencies',
    title: 'Cross-Project Dependencies',
    render: ({ data }) => <DependenciesWidget dependencies={data.dependencies} />,
  },
  {
    id: 'dependency-problems',
    title: 'Dependency Problems',
    render: ({ data }) => <DependenciesWidget dependencies={data.dependencies} onlyProblems />,
  },
  {
    id: 'risks-program-intervention',
    title: 'Risks Requiring Program Intervention',
    render: ({ data, onNavigateToSection }) => (
      <NeedsAttentionWidget
        title="Risks Requiring Program Intervention"
        description="High/critical risks escalated beyond Project Manager authority"
        emptyMessage="No risks currently require program-level intervention."
        items={data.attentionItems.filter((i) => i.type === 'risk' && (i.severity === 'critical' || i.severity === 'high') && i.escalatedTo)}
        onNavigateToSection={onNavigateToSection}
      />
    ),
  },
  {
    id: 'change-impact',
    title: 'Change Impact',
    render: ({ data }) => <ChangeImpactWidget changeRequests={data.changeRequests} />,
  },
  {
    id: 'decisions-required',
    title: 'Decisions Required',
    render: ({ data, onNavigateToSection }) => (
      <NeedsAttentionWidget
        title="Decisions Required"
        description="Approvals and escalations awaiting Program Manager intervention"
        emptyMessage="No decisions are currently pending."
        items={data.attentionItems.filter((i) => i.escalatedTo === 'program-manager' && i.type !== 'risk')}
        onNavigateToSection={onNavigateToSection}
      />
    ),
  },

  // --- PMO Office — mental model is "is this project healthy, current,
  // aligned, governed and compliant?" which splits into performance health
  // (pmo-project-health, the same domains a Project Manager sees, widened)
  // and governance health (everything else here) — the two stay visibly
  // separate rather than folded into one score.
  {
    id: 'pmo-project-health',
    title: 'Overall Project Health',
    render: ({ data }) => <PmoProjectHealthWidget data={data} />,
  },
  {
    id: 'governance-health',
    title: 'Governance Health',
    render: ({ data }) => <GovernanceHealthWidget governance={data.governance} />,
  },
  {
    id: 'reporting-compliance',
    title: 'Reporting Compliance',
    render: ({ data }) => <ReportingComplianceWidget reporting={data.reportingCompliance} />,
  },
  {
    id: 'baseline-vs-current',
    title: 'Baseline vs Current',
    render: ({ data }) => <BaselineVsCurrentWidget baseline={data.baseline} />,
  },
  {
    id: 'change-control',
    title: 'Change Control',
    render: ({ data }) => <ChangeControlWidget changeRequests={data.changeRequests} />,
  },
  {
    id: 'risk-governance',
    title: 'Risk Governance',
    render: ({ data }) => <RiskGovernanceWidget risks={data.risks} />,
  },
  {
    id: 'data-quality',
    title: 'Data Quality / Completeness',
    render: ({ data }) => <DataQualityWidget activities={data.activities} dataQuality={data.dataQuality} />,
  },
  {
    id: 'audit-signals',
    title: 'Audit Signals',
    render: ({ data }) => <AuditSignalsWidget activityFeed={data.activityFeed} />,
  },
  // Admin reuses the same two governance-record widgets under its own
  // framing — "Data Integrity" and "Recent Admin Changes" are the same
  // underlying data as PMO's Data Quality/Audit Signals, just retitled for
  // this role rather than duplicated with a second data source.
  {
    id: 'admin-data-integrity',
    title: 'Data Integrity',
    render: ({ data }) => <DataQualityWidget activities={data.activities} dataQuality={data.dataQuality} title="Data Integrity" />,
  },
  {
    id: 'admin-recent-changes',
    title: 'Recent Admin Changes',
    render: ({ data }) => <AuditSignalsWidget activityFeed={data.activityFeed} title="Recent Admin Changes" />,
  },
  {
    id: 'pmo-governance-exceptions',
    title: 'Exceptions Requiring PMO Action',
    render: ({ data, onNavigateToSection }) => (
      <NeedsAttentionWidget
        title="Exceptions Requiring PMO Action"
        description="Overdue reporting, governance violations, incomplete data, approval exceptions, and baseline/change irregularities"
        emptyMessage="No governance exceptions currently require PMO action."
        items={data.attentionItems.filter((i) => i.escalatedTo === 'pmo-office')}
        onNavigateToSection={onNavigateToSection}
      />
    ),
  },

  // --- Project Member — "What am I responsible for, and what do I need to
  // update?" A personal workspace, not a management rollup: no portfolio
  // analytics, governance, full budget, full team workload, every risk, or
  // executive analytics. Operational mode only (see roleConfig.ts).
  {
    id: 'my-work-summary',
    title: 'My Work Summary',
    render: ({ data }) => <MyWorkSummaryWidget summary={data.memberWorkspace.summary} />,
  },
  {
    id: 'my-work',
    title: 'My Work',
    render: ({ data, onNavigateToSection }) => (
      <MyWorkWidget assignments={data.memberWorkspace.assignments} onNavigateToSection={onNavigateToSection} />
    ),
  },
  {
    id: 'updates-required',
    title: 'Updates Required',
    render: ({ data, onNavigateToSection }) => (
      <UpdatesRequiredWidget items={data.memberWorkspace.updatesRequired} onNavigateToSection={onNavigateToSection} />
    ),
  },
  {
    id: 'my-upcoming-milestones',
    title: 'My Upcoming Milestones',
    render: ({ data }) => <MyMilestonesWidget milestones={data.memberWorkspace.milestones} />,
  },
  {
    id: 'my-dependencies',
    title: 'Dependencies Affecting My Work',
    render: ({ data }) => <MyDependenciesWidget dependencies={data.memberWorkspace.dependencies} />,
  },
  {
    id: 'my-issues',
    title: 'My Blockers / Issues',
    render: ({ data }) => <MyIssuesWidget issues={data.memberWorkspace.issues} />,
  },
  {
    id: 'project-context',
    title: 'Project Context',
    render: ({ data }) => <ProjectContextWidget context={data.memberWorkspace.context} milestones={data.milestones} />,
  },

  // --- Executive — "Are we executing the strategy, will this project
  // deliver, and where should I intervene?" Compressed and decision-
  // oriented: no task-level detail, no transactional financial tables.
  // Financial Outlook, Key Milestone Outlook, and Executive Attention
  // Required reuse existing widgets/components as-is (BudgetPerformanceWidget,
  // MilestoneTimelineWidget, NeedsAttentionWidget) rather than rebuilding
  // the same shape a third time.
  {
    id: 'exec-health',
    title: 'Executive Project Health',
    render: ({ data }) => <ExecutiveHealthWidget health={data.health} />,
  },
  {
    id: 'exec-strategic-contribution',
    title: 'Strategic Contribution',
    render: ({ data }) => <StrategicContributionWidget contribution={data.strategicContribution} />,
  },
  {
    id: 'exec-progress-forecast',
    title: 'Progress & Forecast',
    render: ({ data }) => <ExecutiveProgressForecastWidget progress={data.progress} forecast={data.forecast} />,
  },
  {
    id: 'exec-financial-outlook',
    title: 'Financial Outlook',
    render: ({ data }) => <BudgetPerformanceWidget budget={data.budgetPerformance} title="Financial Outlook" />,
  },
  {
    id: 'exec-top-risks',
    title: 'Top Risks',
    render: ({ data }) => <TopRisksWidget risks={data.topRisks} />,
  },
  {
    id: 'exec-milestone-outlook',
    title: 'Key Milestone Outlook',
    render: ({ data }) => <MilestoneTimelineWidget milestones={data.milestones} title="Key Milestone Outlook" />,
  },
  {
    id: 'exec-attention-required',
    title: 'Executive Attention Required',
    render: ({ data, onNavigateToSection }) => (
      <NeedsAttentionWidget
        title="Executive Attention Required"
        description="Funding decisions, major scope decisions, escalated risks, and major schedule impacts only"
        emptyMessage="No executive intervention required."
        items={data.attentionItems.filter((i) => i.escalatedTo === 'executive')}
        onNavigateToSection={onNavigateToSection}
      />
    ),
  },
  {
    id: 'exec-trend',
    title: 'Health / Performance Trend',
    render: ({ data }) => (
      <ExecutiveTrendWidget overallHealth={data.health.overall} forecast={data.forecast} riskTrend={data.riskTrend} />
    ),
  },
]

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = Object.fromEntries(
  WIDGET_DEFINITIONS.map((w) => [w.id, w]),
)

export function getWidgetDefinition(widgetId: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY[widgetId]
}
