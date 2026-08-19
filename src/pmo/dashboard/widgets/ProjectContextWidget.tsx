import type { DashboardMilestone, ProjectContextSummary } from '../data/dashboardModels'
import { ProjectStatusBadge } from '../../shared/ProjectStatusBadge'
import { DashboardWidget } from './DashboardWidget'
import { fmtDate } from './formatters'

// Deliberately compact — status, phase, next milestone, PM, nothing more.
// Repeats a handful of facts ProjectHeader already owns so a Project
// Member never has to leave their own dashboard to answer "where are we."
export function ProjectContextWidget({ context, milestones }: { context: ProjectContextSummary; milestones: DashboardMilestone[] }) {
  const nextMilestone = milestones.find((m) => m.status !== 'completed')

  return (
    <DashboardWidget title="Project Context">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Status</div>
          <div className="mt-1">
            <ProjectStatusBadge status={context.status} />
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Current Phase</div>
          <div className="mt-1 truncate text-sm font-semibold text-slate-800">{context.currentPhase}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Next Major Milestone</div>
          <div className="mt-1 truncate text-sm font-semibold text-slate-800">{nextMilestone ? nextMilestone.name : '—'}</div>
          {nextMilestone && <div className="mt-0.5 text-[11px] text-slate-400">{fmtDate(nextMilestone.forecastDate)}</div>}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Project Manager</div>
          <div className="mt-1 truncate text-sm font-semibold text-slate-800">{context.projectManager}</div>
        </div>
      </div>
    </DashboardWidget>
  )
}
