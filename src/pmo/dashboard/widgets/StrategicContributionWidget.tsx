import type { StrategicContribution } from '../data/dashboardModels'
import { DashboardWidget } from './DashboardWidget'

export function StrategicContributionWidget({ contribution }: { contribution: StrategicContribution }) {
  return (
    <DashboardWidget
      title="Strategic Contribution"
      description="Presentation mock — Strategic Alignment has no linkage saved yet for this Project"
    >
      <dl className="space-y-2.5 text-xs">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-slate-400">Project Objective</dt>
          <dd className="mt-0.5 text-slate-700">{contribution.objective}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-slate-400">Linked Program / Strategic Objective</dt>
          <dd className="mt-0.5 text-slate-700">{contribution.linkedProgramObjective}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-slate-400">Intended Outcome / Benefit</dt>
          <dd className="mt-0.5 text-slate-700">{contribution.intendedOutcome}</dd>
        </div>
      </dl>
    </DashboardWidget>
  )
}
