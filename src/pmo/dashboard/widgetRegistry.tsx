import type { ReactElement } from 'react'
import type { SectionId } from '../types'
import type { DashboardMode, DemoDashboardRole } from './roleConfig'
import type { WidgetSize } from './widgets/DashboardWidget'
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

export type { WidgetSize }

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
  size: WidgetSize
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
    size: 'small',
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
    size: 'medium',
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
    size: 'small',
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
    id: 'readiness-checklist',
    title: 'Section Readiness',
    size: 'medium',
    render: () => (
      <ListWidget
        title="Section Readiness"
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
    size: 'medium',
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
    id: 'pending-approvals',
    title: 'Pending Approvals',
    size: 'small',
    render: () => <MetricWidget title="Pending Approvals" value="2" subtitle="Awaiting sign-off" status={{ level: 'amber' }} />,
  },
  {
    id: 'my-assigned-risks',
    title: 'My Assigned Risks',
    size: 'medium',
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
    size: 'medium',
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
    size: 'medium',
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
    size: 'small',
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
    size: 'small',
    render: () => <MetricWidget title="Strategic Alignment" value="1 of 1" subtitle="Objective linked with a KPI" status={{ level: 'green' }} />,
  },
  {
    id: 'portfolio-health',
    title: 'Portfolio Health',
    size: 'large',
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
    size: 'large',
    render: () => (
      <PlaceholderWidget title="KPI Trend" note="Historical KPI series — needs time-series data, not yet available." />
    ),
  },
  {
    id: 'project-rag-summary',
    title: 'Overall Status',
    size: 'small',
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
    size: 'full',
    render: ({ data }) => <ProjectHealthSummaryWidget data={data} />,
  },
  {
    id: 'needs-attention',
    title: 'Needs My Attention',
    size: 'large',
    render: ({ data, onNavigateToSection }) => (
      <NeedsAttentionWidget items={data.attentionItems} onNavigateToSection={onNavigateToSection} />
    ),
  },
  {
    id: 'milestone-timeline',
    title: 'Upcoming / Critical Milestones',
    size: 'medium',
    render: ({ data }) => <MilestoneTimelineWidget milestones={data.milestones} />,
  },
  {
    id: 'schedule-exceptions',
    title: 'Schedule Exceptions',
    size: 'medium',
    render: ({ data, onNavigateToSection }) => (
      <ScheduleExceptionsWidget activities={data.activities} onNavigateToSection={onNavigateToSection} />
    ),
  },
  {
    id: 'team-workload-summary',
    title: 'Team / Workload',
    size: 'small',
    render: ({ data, onNavigateToSection }) => <TeamWorkloadWidget team={data.team} onNavigateToSection={onNavigateToSection} />,
  },
  {
    id: 'risks-issues-summary',
    title: 'Risks & Issues',
    size: 'medium',
    render: ({ data, onNavigateToSection }) => (
      <RisksIssuesWidget risks={data.risks} issues={data.issues} onNavigateToSection={onNavigateToSection} />
    ),
  },
  {
    id: 'change-requests-summary',
    title: 'Change Requests',
    size: 'small',
    render: ({ data }) => <ChangeRequestsWidget changeRequests={data.changeRequests} />,
  },
  {
    id: 'recent-activity',
    title: 'Recent Activity',
    size: 'medium',
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
    size: 'large',
    render: ({ data }) => (
      <ProgressVsPlanWidget trend={data.progressTrend} actualPct={data.progress.actualPct} plannedPct={data.progress.plannedPct} />
    ),
  },
  {
    id: 'schedule-variance',
    title: 'Schedule Variance',
    size: 'small',
    render: ({ data }) => <ScheduleVarianceWidget forecast={data.forecast} />,
  },
  {
    id: 'milestone-performance',
    title: 'Milestone Performance',
    size: 'large',
    render: ({ data }) => <MilestonePerformanceWidget milestones={data.milestones} />,
  },
  {
    id: 'task-status-distribution',
    title: 'Task Status Distribution',
    size: 'medium',
    render: ({ data }) => <TaskStatusDistributionWidget activities={data.activities} />,
  },
  {
    id: 'risk-exposure-trend',
    title: 'Risk Exposure / Risk Trend',
    size: 'large',
    render: ({ data }) => <RiskExposureTrendWidget risks={data.risks} trend={data.riskTrend} />,
  },
  {
    id: 'issue-aging',
    title: 'Issue Aging',
    size: 'medium',
    render: ({ data }) => <IssueAgingWidget aging={data.issueAging} />,
  },
  {
    id: 'budget-performance',
    title: 'Budget Performance',
    size: 'small',
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
    size: 'medium',
    render: ({ data }) => <ProgramMilestonesWidget milestones={data.milestones} />,
  },
  {
    id: 'cross-project-dependencies',
    title: 'Cross-Project Dependencies',
    size: 'large',
    render: ({ data }) => <DependenciesWidget dependencies={data.dependencies} />,
  },
  {
    id: 'dependency-problems',
    title: 'Dependency Problems',
    size: 'medium',
    render: ({ data }) => <DependenciesWidget dependencies={data.dependencies} onlyProblems />,
  },
  {
    id: 'risks-program-intervention',
    title: 'Risks Requiring Program Intervention',
    size: 'medium',
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
    size: 'small',
    render: ({ data }) => <ChangeImpactWidget changeRequests={data.changeRequests} />,
  },
  {
    id: 'decisions-required',
    title: 'Decisions Required',
    size: 'large',
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
]

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = Object.fromEntries(
  WIDGET_DEFINITIONS.map((w) => [w.id, w]),
)

export function getWidgetDefinition(widgetId: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY[widgetId]
}
