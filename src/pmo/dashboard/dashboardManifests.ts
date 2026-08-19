import type { DashboardMode, DemoDashboardRole } from './roleConfig'

// Column span out of the dashboard's 12-column grid, per breakpoint tier —
// `desktop` (lg and up), `tablet` (md up to lg), `mobile` (below md, always
// stacked full-width in practice). This is the ONLY place widget width is
// decided: DashboardGrid just reads `span` and lays the tile out, and no
// widget component hard-codes its own width.
export interface WidgetSpan {
  desktop: number
  tablet: number
  mobile: number
}

export interface DashboardManifestEntry {
  widgetId: string
  span: WidgetSpan
}

// Named presets instead of ad-hoc numbers, so every entry below reads as
// "how important is this / how much content does it carry" rather than a
// bare 8 or 4 that means nothing on its own. Values are the same six spans
// called out in the design brief:
//   12 = full width · 9 = dominant · 8 = primary · 6 = half · 4 = supporting · 3 = compact
//
// Default to an asymmetric DOMINANT/PRIMARY + COMPACT/SUPPORTING pairing
// for any row with a clear "most important thing" — that's most rows.
// HALF+HALF is reserved for pairs that are genuinely co-equal in weight;
// reach for it deliberately, not as the default way to fill a row.
const SPAN = {
  FULL: { desktop: 12, tablet: 12, mobile: 12 },
  DOMINANT: { desktop: 9, tablet: 12, mobile: 12 },
  PRIMARY: { desktop: 8, tablet: 12, mobile: 12 },
  HALF: { desktop: 6, tablet: 6, mobile: 12 },
  SUPPORTING: { desktop: 4, tablet: 6, mobile: 12 },
  COMPACT: { desktop: 3, tablet: 6, mobile: 12 },
} satisfies Record<string, WidgetSpan>

type ManifestsByMode = Partial<Record<DashboardMode, DashboardManifestEntry[]>>

function w(widgetId: string, span: WidgetSpan): DashboardManifestEntry {
  return { widgetId, span }
}

// Which widgets appear for a given role/mode pair, AND how much of the
// 12-column grid each one gets. A role only has entries for the modes it
// actually supports (see DASHBOARD_ROLES in roleConfig.ts) — this is the
// single place that decides both "what does this dashboard show" and "how
// is it composed," so a new widget, a new role/mode combo, or a layout
// tweak is a change here only, never in the grid or the widgets themselves.
const DASHBOARD_MANIFESTS: Record<DemoDashboardRole, ManifestsByMode> = {
  'project-manager': {
    // Reference implementation — priority order matches the PM mental
    // model ("what do I need to maintain, submit, fix, or act on"), not
    // just visual balance. Health leads full-width. Needs My Attention is
    // THE primary operational widget — it gets the full DOMINANT column,
    // with Milestone Outlook beside it as a compact glance, not a
    // same-weight companion. The two exception rows are each led by the
    // widget with the richer/more urgent content (Schedule Exceptions'
    // six categories over Change Requests' four; Risks & Issues' two
    // sections over Team/Workload's three plain stats). Recent Activity
    // closes full-width so it never sits next to empty leftover space.
    operational: [
      w('project-health-summary', SPAN.FULL),
      w('needs-attention', SPAN.DOMINANT),
      w('milestone-timeline', SPAN.COMPACT),
      w('schedule-exceptions', SPAN.PRIMARY),
      w('change-requests-summary', SPAN.SUPPORTING),
      w('risks-issues-summary', SPAN.PRIMARY),
      w('team-workload-summary', SPAN.SUPPORTING),
      w('recent-activity', SPAN.FULL),
    ],
    analytical: [
      w('progress-vs-plan', SPAN.DOMINANT),
      w('schedule-variance', SPAN.COMPACT),
      w('milestone-performance', SPAN.PRIMARY),
      w('task-status-distribution', SPAN.SUPPORTING),
      w('risk-exposure-trend', SPAN.PRIMARY),
      w('issue-aging', SPAN.SUPPORTING),
      w('budget-performance', SPAN.HALF),
    ],
  },
  'program-manager': {
    // "How is this particular project affecting my wider program" — reuses
    // several Project Manager widgets as-is where the underlying question
    // is identical (health, plan-vs-actual, forecast movement) and adds
    // the specialized cross-project/escalation widgets for the rest.
    // Progress vs Plan gets DOMINANT width so the trend line is actually
    // readable, with Schedule Variance as its compact interpretation card.
    // Cross-Project Dependencies is one of this role's most important
    // widgets — its rows carry name, status, related project, impact, and
    // dates, so it gets PRIMARY width rather than being squeezed; Change
    // Impact sits beside it as supporting context. Risks Requiring Program
    // Intervention also needs room for readable risk descriptions, so it
    // leads over Decisions Required, which is the smaller, action-oriented
    // companion here (not the dominant item, unlike the Operational view).
    // Program-Relevant Milestones closes full-width so its own multi-column
    // rows (name/date/variance/status) aren't cramped and it never sits
    // next to empty leftover space.
    analytical: [
      w('project-health-summary', SPAN.FULL),
      w('progress-vs-plan', SPAN.DOMINANT),
      w('schedule-variance', SPAN.COMPACT),
      w('cross-project-dependencies', SPAN.PRIMARY),
      w('change-impact', SPAN.SUPPORTING),
      w('risks-program-intervention', SPAN.PRIMARY),
      w('decisions-required', SPAN.SUPPORTING),
      w('program-milestones', SPAN.FULL),
    ],
    // Exception-oriented — deliberately excludes PM-level task
    // administration (Schedule Exceptions, Team/Workload, Recent Activity).
    // Dependency Problems (active cross-project blockers) leads over Change
    // Impact's informational summary.
    operational: [
      w('decisions-required', SPAN.PRIMARY),
      w('risks-program-intervention', SPAN.SUPPORTING),
      w('dependency-problems', SPAN.PRIMARY),
      w('change-impact', SPAN.SUPPORTING),
      w('program-milestones', SPAN.FULL),
    ],
  },
  'pmo-office': {
    // "Is this project healthy, current, aligned, governed and compliant?"
    // — performance health leads full-width. Governance Health/Exceptions,
    // Baseline vs Current, and Risk Governance are this role's three
    // PRIMARY widgets (the things a PMO reviewer actually reads row by
    // row); Reporting Compliance, Data Quality, Change Control, and Audit
    // Signals are secondary supporting context, each paired beside its
    // related primary rather than competing for equal weight. Audit
    // Signals closes full-width so it never sits next to empty space.
    analytical: [
      w('pmo-project-health', SPAN.FULL),
      w('governance-health', SPAN.PRIMARY),
      w('reporting-compliance', SPAN.SUPPORTING),
      w('baseline-vs-current', SPAN.PRIMARY),
      w('change-control', SPAN.SUPPORTING),
      w('risk-governance', SPAN.PRIMARY),
      w('data-quality', SPAN.SUPPORTING),
      w('audit-signals', SPAN.FULL),
    ],
    // Exception-oriented — what needs PMO action right now, plus the
    // Primary/Secondary ranking carried over from the Analytical view
    // (Risk Governance leads, Change Control is supporting context).
    operational: [
      w('pmo-governance-exceptions', SPAN.PRIMARY),
      w('reporting-compliance', SPAN.SUPPORTING),
      w('risk-governance', SPAN.PRIMARY),
      w('change-control', SPAN.SUPPORTING),
    ],
  },
  'project-member': {
    // "What am I responsible for, and what do I need to update?" — a
    // personal workspace, operational only (see DASHBOARD_ROLES in
    // roleConfig.ts). Deliberately NOT a scaled-down management dashboard:
    // just the four things an individual contributor actually needs — My
    // Work is the one primary widget, with Updates Required as its compact
    // companion; My Blockers/Issues (standing in for "blockers" — the more
    // urgent of the two blocker/dependency widgets) and My Work Summary
    // pair below. My Upcoming Milestones, Dependencies, and Project Context
    // are dropped from this view entirely rather than padded in as extra
    // secondary tiles — they'd add back the complexity this dashboard is
    // meant to avoid.
    operational: [
      w('my-work', SPAN.DOMINANT),
      w('updates-required', SPAN.COMPACT),
      w('my-issues', SPAN.PRIMARY),
      w('my-work-summary', SPAN.SUPPORTING),
    ],
  },
  admin: {
    // Configuration Health/Exceptions and Data Integrity are this role's
    // primary widgets — the two things an admin actually reviews row by
    // row — each paired with a smaller supporting status widget. "Access &
    // Ownership" has no real data behind it anywhere in this prototype (no
    // permissions/ownership model exists yet) and is deliberately left out
    // rather than faked with a mismatched widget.
    operational: [
      w('admin-configuration-health', SPAN.PRIMARY),
      w('admin-workflow-status', SPAN.SUPPORTING),
      w('admin-data-integrity', SPAN.PRIMARY),
      w('admin-recent-changes', SPAN.SUPPORTING),
    ],
  },
  executive: {
    // "Are we executing the strategy, will this project deliver, and where
    // should I intervene?" — Analytical only (see DASHBOARD_ROLES in
    // roleConfig.ts). The simplest, most compressed dashboard in the app on
    // purpose: no task-level operational detail anywhere in it. Health
    // leads full-width, Progress & Forecast is THE primary widget (delivery
    // outlook is what an executive actually reads first), with Executive
    // Attention Required as its compact companion. Every remaining row
    // pairs a primary decision-support widget with a smaller supporting
    // one: Milestone Outlook + Financial Outlook, then Top Strategic Risks
    // + Health Trend. Strategic Contribution is dropped from this view — a
    // presentation-mock placeholder, not decision-critical delivery/risk
    // information.
    analytical: [
      w('exec-health', SPAN.FULL),
      w('exec-progress-forecast', SPAN.DOMINANT),
      w('exec-attention-required', SPAN.COMPACT),
      w('exec-milestone-outlook', SPAN.PRIMARY),
      w('exec-financial-outlook', SPAN.SUPPORTING),
      w('exec-top-risks', SPAN.PRIMARY),
      w('exec-trend', SPAN.SUPPORTING),
    ],
  },
}

export function getDashboardManifest(role: DemoDashboardRole, mode: DashboardMode): DashboardManifestEntry[] {
  return DASHBOARD_MANIFESTS[role][mode] ?? []
}
