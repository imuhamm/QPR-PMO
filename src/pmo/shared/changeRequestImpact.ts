import type { ActivityRow, ScheduleRow } from '../schedule/scheduleData'
import { cascadeReschedule, computeDateRange, isOnCriticalChain, updateActivityField } from '../schedule/scheduleData'

// What a Change Request's proposed value is scoped to — determines how the
// Impact Analysis step reads the schedule. Only an Activity has a real
// dependency graph to walk (Finish-to-Start cascade); Project/Phase-level
// fields don't rebaseline through a cascade at all, so their impact is read
// across everything within that boundary instead. A Milestone has no
// downstream edges in this data model (V1 dependencies are
// Activity-to-Activity only — see scheduleData.ts), so it only ever affects
// itself.
export type ScheduleImpactScope =
  | { kind: 'project' }
  | { kind: 'phase'; id: string }
  | { kind: 'activity'; id: string }
  | { kind: 'milestone'; id: string }

export interface ScheduleImpactSummary {
  affectedActivities: number
  affectedMilestones: number
  /** Raw critical-chain membership — the panel combines this with the variance itself to decide "Changed" vs "No impact". */
  onCriticalChain: boolean
  dependenciesAffected: number
  /** Distinct Activity owners among the affected set — grounds Resource Impact in data the schedule actually has, rather than a fabricated headcount. */
  affectedOwners: string[]
  /**
   * How far the Project's overall finish (computeDateRange's max) moves as
   * a result of this specific edit — only computed for 'activity' scope,
   * where there's an actual before/after schedule to diff. null for
   * project/phase/milestone scope: a project-level field IS the project
   * finish, so "how much does the project finish move" is just the
   * request's own variance, already shown without this; a phase/milestone
   * edit doesn't cascade through computeDateRange the same deterministic way.
   */
  projectFinishDeltaDays: number | null
}

const EMPTY_IMPACT: ScheduleImpactSummary = {
  affectedActivities: 0,
  affectedMilestones: 0,
  onCriticalChain: false,
  dependenciesAffected: 0,
  affectedOwners: [],
  projectFinishDeltaDays: null,
}

function activitiesOf(rows: ScheduleRow[]): ActivityRow[] {
  return rows.filter((r): r is ActivityRow => r.kind === 'activity')
}

function distinctOwners(activities: ActivityRow[]): string[] {
  return [...new Set(activities.map((a) => a.owner).filter((o): o is string => !!o))]
}

// Automatically generated from the current schedule — never asks the
// requester to re-describe what a proposed date would touch.
export function computeScheduleImpact(
  rows: ScheduleRow[],
  scope: ScheduleImpactScope,
  proposedISO: string,
): ScheduleImpactSummary {
  if (scope.kind === 'project' || scope.kind === 'phase') {
    const inScope = scope.kind === 'project' ? rows : rows.filter((r) => r.id === scope.id || r.parentId === scope.id)
    const activities = activitiesOf(inScope)
    return {
      affectedActivities: activities.length,
      affectedMilestones: inScope.filter((r) => r.kind === 'milestone').length,
      onCriticalChain: activities.some((a) => isOnCriticalChain(a, rows)),
      dependenciesAffected: activities.filter((a) => !!a.predecessorId).length,
      affectedOwners: distinctOwners(activities),
      projectFinishDeltaDays: null,
    }
  }

  if (scope.kind === 'milestone') {
    const exists = rows.some((r) => r.id === scope.id)
    return { ...EMPTY_IMPACT, affectedMilestones: exists ? 1 : 0 }
  }

  // 'activity' — the one scope with a real dependency graph: reuse the same
  // Finish-to-Start cascade the Schedule grid itself runs for a Forecast
  // Finish edit, so "who's affected" is never a guess. Simplification: this
  // always simulates the proposed value landing on `end`, even for a
  // Baseline Start request — only Finish drives the FS cascade in this
  // model, so that's the only simulation that can produce a real downstream
  // answer.
  const activity = rows.find((r): r is ActivityRow => r.id === scope.id && r.kind === 'activity')
  if (!activity) return EMPTY_IMPACT

  const patched = updateActivityField(rows, activity.id, { end: proposedISO })
  const outcome = cascadeReschedule(patched, activity.id)
  const finalRows = outcome.ok ? outcome.rows : patched
  const downstream = (outcome.ok ? outcome.changedIds : [])
    .map((id) => rows.find((r) => r.id === id))
    .filter((r): r is ActivityRow => !!r && r.kind === 'activity')

  const affectedPhaseIds = new Set([activity.parentId, ...downstream.map((a) => a.parentId)])
  const affectedMilestones = rows.filter((r) => r.kind === 'milestone' && affectedPhaseIds.has(r.parentId)).length

  const beforeEnd = computeDateRange(rows).max.getTime()
  const afterEnd = computeDateRange(finalRows).max.getTime()
  const projectFinishDeltaDays = Math.round((afterEnd - beforeEnd) / 86_400_000)

  return {
    affectedActivities: 1 + downstream.length,
    affectedMilestones,
    onCriticalChain: isOnCriticalChain(activity, rows),
    dependenciesAffected: downstream.length,
    affectedOwners: distinctOwners([activity, ...downstream]),
    projectFinishDeltaDays,
  }
}
