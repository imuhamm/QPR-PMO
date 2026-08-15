import { useMemo, useState } from 'react'
import type { ActivityRow, ScheduleRow } from '../schedule/scheduleData'

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface ResourceGroup {
  name: string
  activities: ActivityRow[]
}

// Resources has no data of its own — it's a read-only aggregation over the
// same Activity.owner field Schedule already owns. No new resource entity,
// no capacity/utilization/allocation fields.
export function ResourcesView({
  rows,
  onNavigateToActivity,
  onNavigateToSchedule,
}: {
  rows: ScheduleRow[]
  onNavigateToActivity: (activityId: string) => void
  onNavigateToSchedule: () => void
}) {
  const [expandedResource, setExpandedResource] = useState<string | null>(null)

  const activities = useMemo(() => rows.filter((r): r is ActivityRow => r.kind === 'activity'), [rows])

  const phaseNameById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const r of rows) if (r.kind === 'phase') map[r.id] = r.name
    return map
  }, [rows])

  const resourceGroups = useMemo<ResourceGroup[]>(() => {
    const map = new Map<string, ActivityRow[]>()
    for (const a of activities) {
      if (!a.owner) continue
      const list = map.get(a.owner)
      if (list) list.push(a)
      else map.set(a.owner, [a])
    }
    return Array.from(map.entries())
      .map(([name, acts]) => ({ name, activities: acts }))
      .sort((a, b) => b.activities.length - a.activities.length || a.name.localeCompare(b.name))
  }, [activities])

  const unassignedActivities = useMemo(() => activities.filter((a) => !a.owner), [activities])

  if (resourceGroups.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <h2 className="text-sm font-semibold text-slate-700">No resources assigned</h2>
        <p className="max-w-sm text-xs text-slate-500">
          Resources here are derived from Activity owners in Schedule. Assign an Owner to at least one
          Activity to see them listed.
        </p>
        <button
          type="button"
          onClick={onNavigateToSchedule}
          className="mt-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          Go to Schedule
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex h-8 shrink-0 items-center border-b border-slate-200 px-3 text-[11px] text-slate-500">
        {resourceGroups.length} resource{resourceGroups.length !== 1 ? 's' : ''} ·{' '}
        {activities.length - unassignedActivities.length} of {activities.length} activities assigned
      </div>

      {unassignedActivities.length > 0 && (
        <div className="flex shrink-0 items-center justify-between border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800">
          <span>
            {unassignedActivities.length} {unassignedActivities.length !== 1 ? 'activities have' : 'activity has'} no
            owner assigned
          </span>
          <button
            type="button"
            onClick={onNavigateToSchedule}
            className="font-medium underline underline-offset-2 hover:text-amber-900"
          >
            Go to Schedule
          </button>
        </div>
      )}

      <div className="sticky top-0 z-10 flex items-center border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
        <div className="w-48 shrink-0">Resource</div>
        <div className="min-w-0 flex-1">Assigned Activities</div>
        <div className="w-24 shrink-0 text-right">Activities</div>
      </div>

      <div>
        {resourceGroups.map((group) => {
          const isExpanded = expandedResource === group.name
          const previewNames = group.activities.slice(0, 2).map((a) => a.name).join(', ')
          const preview =
            group.activities.length > 2 ? `${previewNames} +${group.activities.length - 2} more` : previewNames

          return (
            <div key={group.name}>
              <button
                type="button"
                onClick={() => setExpandedResource(isExpanded ? null : group.name)}
                aria-expanded={isExpanded}
                className={`flex w-full items-center border-b border-slate-100 px-3 py-1.5 text-left text-xs transition-colors ${
                  isExpanded ? 'bg-blue-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex w-48 shrink-0 items-center gap-1.5 font-medium text-slate-800">
                  <span className={`inline-block text-[9px] text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                  <span className="truncate">{group.name}</span>
                </div>
                <div className="min-w-0 flex-1 truncate text-slate-500">{preview}</div>
                <div className="w-24 shrink-0 text-right text-slate-600">{group.activities.length}</div>
              </button>

              {isExpanded && (
                <div className="border-b border-slate-100 bg-slate-50/60 py-1 pl-10 pr-3">
                  {group.activities.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 py-1 text-[11px]">
                      <span className="min-w-0 flex-1 truncate text-slate-700">{a.name}</span>
                      <span className="w-32 shrink-0 truncate text-slate-400">
                        {phaseNameById[a.parentId] ?? '—'}
                      </span>
                      <span className="w-36 shrink-0 text-slate-400">
                        {a.start && a.end ? `${fmtDate(a.start)} → ${fmtDate(a.end)}` : 'Unscheduled'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onNavigateToActivity(a.id)}
                        className="shrink-0 font-medium text-blue-600 hover:text-blue-700"
                      >
                        → Schedule
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
