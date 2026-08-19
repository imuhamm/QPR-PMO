import type { DataQualitySummary, TaskActivitySummary } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'
import { StatGrid } from './StatGrid'
import type { StatGridItem } from './StatGrid'

// Combines TaskActivitySummary's own unassigned/missingDates counts (also
// read by ScheduleExceptionsWidget) with the governance-only completeness
// facts in DataQualitySummary, rather than duplicating those counts into a
// second activities structure.
export function DataQualityWidget({
  activities,
  dataQuality,
  title = 'Data Quality / Completeness',
}: {
  activities: TaskActivitySummary
  dataQuality: DataQualitySummary
  title?: string
}) {
  const items: StatGridItem[] = [
    {
      id: 'activities-no-owner',
      label: 'Activities w/o Owner',
      value: activities.unassigned,
      tone: activities.unassigned > 0 ? 'warning' : 'neutral',
    },
    {
      id: 'activities-no-dates',
      label: 'Activities w/o Dates',
      value: activities.missingDates,
      tone: activities.missingDates > 0 ? 'warning' : 'neutral',
    },
    {
      id: 'milestones-no-baseline',
      label: 'Milestones w/o Baseline',
      value: dataQuality.milestonesWithoutBaseline,
      tone: dataQuality.milestonesWithoutBaseline > 0 ? 'warning' : 'neutral',
    },
    {
      id: 'unclassified-risks',
      label: 'Unclassified Risks',
      value: dataQuality.unclassifiedRisks,
      tone: dataQuality.unclassifiedRisks > 0 ? 'warning' : 'neutral',
    },
  ]

  return (
    <DashboardWidget
      title={title}
      footer={`Stalest data ${dataQuality.staleDataDays}d old${
        dataQuality.incompleteMetadataFields.length > 0 ? ` · ${dataQuality.incompleteMetadataFields.length} field(s) incomplete` : ''
      }`}
    >
      <StatGrid items={items} />
      {dataQuality.incompleteMetadataFields.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
          Incomplete: {dataQuality.incompleteMetadataFields.join(', ')}
        </div>
      )}
    </DashboardWidget>
  )
}
