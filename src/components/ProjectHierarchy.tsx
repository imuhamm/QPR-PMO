import { useState } from 'react'
import type { Project } from '../types'
import { StatusBadge } from './StatusBadge'

function Chevron({ open }: { open: boolean }) {
  return (
    <span className={`inline-block transition-transform ${open ? 'rotate-90' : ''} text-gray-400`}>
      ▶
    </span>
  )
}

export function ProjectHierarchy({ project }: { project: Project }) {
  const [openPhases, setOpenPhases] = useState<Set<string>>(new Set(project.phases.map((p) => p.id)))
  const [openMilestones, setOpenMilestones] = useState<Set<string>>(new Set())

  const togglePhase = (id: string) =>
    setOpenPhases((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleMilestone = (id: string) =>
    setOpenMilestones((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">{project.name}</h2>
          <p className="text-sm text-gray-500">{project.description}</p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="divide-y divide-gray-100">
        {project.phases.map((phase) => (
          <div key={phase.id}>
            <button
              type="button"
              onClick={() => togglePhase(phase.id)}
              className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-left"
            >
              <Chevron open={openPhases.has(phase.id)} />
              <span className="font-medium text-gray-800 flex-1">Phase: {phase.name}</span>
              <span className="text-xs text-gray-400">{phase.startDate} → {phase.endDate}</span>
              <StatusBadge status={phase.status} />
            </button>

            {openPhases.has(phase.id) && (
              <div className="pl-8 pb-1">
                {phase.milestones.map((milestone) => (
                  <div key={milestone.id}>
                    <button
                      type="button"
                      onClick={() => toggleMilestone(milestone.id)}
                      className="w-full flex items-center gap-2 px-2 py-2 hover:bg-gray-50 text-left"
                    >
                      <Chevron open={openMilestones.has(milestone.id)} />
                      <span className="text-sm text-gray-700 flex-1">Milestone: {milestone.name}</span>
                      <span className="text-xs text-gray-400">due {milestone.dueDate}</span>
                      <StatusBadge status={milestone.status} />
                    </button>

                    {openMilestones.has(milestone.id) && (
                      <ul className="pl-8 pb-2 space-y-1">
                        {milestone.activities.map((activity) => (
                          <li
                            key={activity.id}
                            className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-600 rounded hover:bg-gray-50"
                          >
                            <span className="text-gray-300">•</span>
                            <span className="flex-1">{activity.name}</span>
                            {activity.owner && <span className="text-xs text-gray-400">{activity.owner}</span>}
                            <span className="text-xs text-gray-400">{activity.startDate} → {activity.endDate}</span>
                            <StatusBadge status={activity.status} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
