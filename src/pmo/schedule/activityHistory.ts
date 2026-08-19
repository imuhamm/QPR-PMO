import type { ActivityRow, PendingActivityPatch } from './scheduleData'
import { ACTIVITY_STATUS_OPTIONS, fmtDate } from './scheduleData'

// Deliberately separate from the Change Request system (changeRequestStore
// et al.) — this logs the routine fields a PM edits every reporting cycle
// (Status, % Complete, Forecast Finish, Actual Start/Finish, Progress
// Note), none of which are protected/baseline fields. A Change Request
// exists to get approval *before* a controlled value moves; this exists to
// show what already happened to an uncontrolled one. Conflating the two
// would misrepresent routine progress tracking as something that needed
// governance sign-off.
export type ActivityHistoryField = 'Status' | '% Complete' | 'Forecast Finish' | 'Actual Start' | 'Actual Finish' | 'Progress Note'

export interface ActivityHistoryEntry {
  id: string
  activityId: string
  field: ActivityHistoryField
  /** Empty for a Progress-Note-only entry — see `note` instead. */
  oldValue: string
  newValue: string
  actor: string
  timestamp: string
  /** A note captured in the same save as this field change — shown as extra context on the entry, not as a separate one, unless nothing else changed (see diffActivityPatch). */
  note?: string
  /** Attachments added in the same save — the "evidence indicator" the task asks for. */
  attachmentsAdded?: string[]
}

function statusLabel(status: ActivityRow['status']): string {
  return ACTIVITY_STATUS_OPTIONS.find((o) => o.id === status)?.label ?? '—'
}

function pctLabel(pct: number | undefined): string {
  return pct != null ? `${pct}%` : '—'
}

function dateLabel(iso: string | undefined): string {
  return iso ? fmtDate(iso) : '—'
}

// Runs once per Activity per save, from the same batch commit every save
// path already goes through (grid inline edits, the Activity Details
// panel's Save Update, Update Progress Mode) — see ScheduleWorkspace's
// saveEdits. `current` must be the row's state *before* the patch is
// applied, or every diff would compare a value against itself.
export function diffActivityPatch(
  activityId: string,
  current: ActivityRow,
  patch: PendingActivityPatch,
  actor: string,
  timestamp: string,
): ActivityHistoryEntry[] {
  const base: Omit<ActivityHistoryEntry, 'note' | 'attachmentsAdded'>[] = []
  let seq = 0
  const push = (field: ActivityHistoryField, oldValue: string, newValue: string) => {
    seq += 1
    base.push({ id: `${activityId}-${timestamp}-${seq}`, activityId, field, oldValue, newValue, actor, timestamp })
  }

  if (patch.status !== undefined && patch.status !== current.status) {
    push('Status', statusLabel(current.status), statusLabel(patch.status))
  }
  if (patch.percentComplete !== undefined && patch.percentComplete !== current.percentComplete) {
    push('% Complete', pctLabel(current.percentComplete), pctLabel(patch.percentComplete))
  }
  if (patch.end !== undefined && patch.end !== current.end) {
    push('Forecast Finish', dateLabel(current.end), dateLabel(patch.end))
  }
  if (patch.actualStart !== undefined && patch.actualStart !== current.actualStart) {
    push('Actual Start', dateLabel(current.actualStart), dateLabel(patch.actualStart))
  }
  if (patch.actualFinish !== undefined && patch.actualFinish !== current.actualFinish) {
    push('Actual Finish', dateLabel(current.actualFinish), dateLabel(patch.actualFinish))
  }

  const noteChanged = !!patch.progressNote && patch.progressNote !== current.progressNote
  const priorAttachments = current.attachments ?? []
  const attachmentsAdded = (patch.attachments ?? []).filter((a) => !priorAttachments.includes(a))

  // A note/attachment added alongside another field change rides along on
  // those entries as context — it doesn't need its own line. Only when
  // nothing else changed does the note become the update, with its own entry.
  if (base.length === 0) {
    if (noteChanged || attachmentsAdded.length > 0) {
      push('Progress Note', '', '')
    } else {
      return []
    }
  }

  return base.map((entry) => ({
    ...entry,
    note: noteChanged ? patch.progressNote : undefined,
    attachmentsAdded: attachmentsAdded.length > 0 ? attachmentsAdded : undefined,
  }))
}
