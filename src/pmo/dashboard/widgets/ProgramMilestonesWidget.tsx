import type { DashboardMilestone } from '../data/dashboardModels'
import { MilestoneTimelineWidget } from './MilestoneTimelineWidget'

// Program Manager only cares about milestones that actually touch the
// program: late ones, or ones already flagged with a downstream/program
// dependencyImpact — not the full list PM's own Milestones widget shows.
// Reuses MilestoneTimelineWidget's row rendering rather than duplicating it.
export function ProgramMilestonesWidget({ milestones }: { milestones: DashboardMilestone[] }) {
  const programRelevant = milestones.filter((m) => m.varianceDays > 0 || m.dependencyImpact)

  return (
    <MilestoneTimelineWidget
      milestones={programRelevant}
      title="Program-Relevant Milestones"
      emptyMessage="No milestones currently affect the wider program."
    />
  )
}
