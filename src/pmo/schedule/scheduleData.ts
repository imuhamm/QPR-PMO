export type ScheduleRowKind = 'phase' | 'activity' | 'milestone'

// Execution-tracking state, only meaningful once a Project is Active —
// still stored unconditionally on every ActivityRow (this prototype has no
// per-Project data store, see App.tsx) rather than branched by lifecycle
// status.
export type ActivityStatus = 'not-started' | 'in-progress' | 'complete' | 'at-risk' | 'delayed'

export const ACTIVITY_STATUS_OPTIONS: { id: ActivityStatus; label: string; dot: string }[] = [
  { id: 'not-started', label: 'Not Started', dot: 'bg-slate-300' },
  { id: 'in-progress', label: 'In Progress', dot: 'bg-blue-500' },
  { id: 'at-risk', label: 'At Risk', dot: 'bg-amber-500' },
  { id: 'delayed', label: 'Delayed', dot: 'bg-rose-500' },
  { id: 'complete', label: 'Complete', dot: 'bg-emerald-500' },
]

// Grid columns lower-priority enough to stay hidden until turned on from the
// toolbar's Columns control (see ScheduleToolbar's ColumnsMenu).
export type OptionalColumnKey = 'remaining' | 'predecessor' | 'critical' | 'float'
export const OPTIONAL_COLUMNS: { id: OptionalColumnKey; label: string }[] = [
  { id: 'remaining', label: 'Remaining Duration' },
  { id: 'predecessor', label: 'Predecessor' },
  { id: 'critical', label: 'Critical' },
  { id: 'float', label: 'Float' },
]

export interface PhaseRow {
  id: string
  wbs: string
  level: 0
  kind: 'phase'
  parentId: null
  name: string
}

// Activities may exist before they have dates — "unscheduled" is a valid,
// visible state to support rapid sequential planning.
//
// predecessorId is a real reference to another Activity's id — V1 supports
// only Finish-to-Start (no lag/lead, no other relationship types).
// `start`/`end` remain the Activity's current working schedule — the dates
// the Gantt bar is drawn from, the Finish-to-Start cascade reacts to, and
// drag/resize edits. Post-approval, `end` reads in the grid as "Forecast
// Finish": still the same field, just relabeled now that a separate,
// protected `baselineStart`/`baselineFinish` exists to compare it against.
export interface ActivityRow {
  id: string
  wbs: string
  level: 1
  kind: 'activity'
  parentId: string
  name: string
  owner?: string
  start?: string
  end?: string
  durationDays?: number
  predecessorId?: string
  // Approved plan — set once at Project approval, never edited afterward in
  // this prototype (no rebaselining flow yet).
  baselineStart?: string
  baselineFinish?: string
  // Execution fields — independent of the forecast; set as work actually happens.
  actualStart?: string
  actualFinish?: string
  percentComplete?: number
  status?: ActivityStatus
  // Update Notes — captured alongside a progress update from the Activity
  // Details panel; lastUpdatedBy/lastUpdatedDate are system-stamped on save,
  // never directly editable.
  progressNote?: string
  attachments?: string[]
  lastUpdatedBy?: string
  lastUpdatedDate?: string
}

// A Milestone is a single point in time, not a span — Duration doesn't apply
// to it, and it may exist before it has a Completion Date ("unscheduled").
export interface MilestoneRow {
  id: string
  wbs: string
  level: 1
  kind: 'milestone'
  parentId: string
  name: string
  date?: string
  predecessor?: string
}

export type ChildRow = ActivityRow | MilestoneRow
export type ScheduleRow = PhaseRow | ChildRow

export interface AddRowPlaceholder {
  id: string
  kind: 'add-row'
  level: 1
  parentId: string
  isEmpty: boolean
}

export type DisplayRow = ScheduleRow | AddRowPlaceholder

export function isPhaseRow(row: ScheduleRow): row is PhaseRow {
  return row.kind === 'phase'
}

const MS_PER_DAY = 86_400_000

export function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function daysBetween(startISO: string, endISO: string): number {
  const start = new Date(startISO).getTime()
  const end = new Date(endISO).getTime()
  return Math.round((end - start) / MS_PER_DAY) + 1
}

// Warning, not a Field Error: an Activity's own Start being earlier than its
// predecessor's Finish violates the confirmed Finish-to-Start rule, but
// nothing here blocks saving or auto-corrects it — cascade only ever fires
// forward from a predecessor's own move (see cascadeReschedule). This just
// surfaces the mismatch for attention.
export function getPredecessorMismatch(row: ActivityRow, rows: ScheduleRow[]): string | null {
  if (!row.predecessorId || !row.start) return null
  const predecessor = rows.find((r) => r.id === row.predecessorId)
  if (!predecessor || predecessor.kind !== 'activity' || !predecessor.end) return null
  const minStart = addCalendarDays(predecessor.end, 1)
  if (row.start < minStart) {
    return `Starts before predecessor "${predecessor.name}" finishes`
  }
  return null
}

export function addCalendarDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * MS_PER_DAY).toISOString().slice(0, 10)
}

// Signed day count, unlike daysBetween's inclusive span — for comparing two
// dates against each other (e.g. Variance), not measuring a duration.
export function dateDiffDays(fromISO: string, toISO: string): number {
  return Math.round((new Date(toISO).getTime() - new Date(fromISO).getTime()) / MS_PER_DAY)
}

// Positive = forecast finishing later than approved baseline. Null when
// either side isn't known yet (unscheduled, or no baseline set).
export function varianceDays(row: ActivityRow): number | null {
  if (!row.baselineFinish || !row.end) return null
  return dateDiffDays(row.baselineFinish, row.end)
}

// How much of the current Forecast span is left, given % Complete — a
// display convenience, not a re-derivation of `durationDays` itself.
export function remainingDurationDays(row: ActivityRow): number | null {
  if (row.durationDays == null) return null
  if (row.actualFinish) return 0
  const pct = row.percentComplete ?? 0
  return Math.max(0, Math.round(row.durationDays * (1 - pct / 100)))
}

// Simplified stand-in for a real Critical Path Method pass (no parallel
// branches exist in this prototype's data to make slack meaningful yet):
// an Activity counts as "critical" if it sits on a dependency chain — either
// waiting on a predecessor or blocking a dependent. Float is reported as 0
// for those, "—" (undefined) otherwise, rather than a fabricated slack number.
export function isOnCriticalChain(row: ActivityRow, rows: ScheduleRow[]): boolean {
  if (row.predecessorId) return true
  return rows.some((r) => r.kind === 'activity' && r.predecessorId === row.id)
}

export function floatDays(row: ActivityRow, rows: ScheduleRow[]): number | undefined {
  return isOnCriticalChain(row, rows) ? 0 : undefined
}

export interface DerivedRange {
  start: string
  end: string
  durationDays: number
}

// Phase dates are always derived from dated child Activities — never stored
// directly. Milestones don't extend the span; unscheduled Activities don't either.
function derivePhaseRange(
  phaseId: string,
  rows: ScheduleRow[],
  startKey: 'start' | 'baselineStart' | 'actualStart',
  endKey: 'end' | 'baselineFinish' | 'actualFinish',
): DerivedRange | null {
  const children = rows.filter(
    (r): r is ActivityRow => r.kind === 'activity' && r.parentId === phaseId && !!r[startKey] && !!r[endKey],
  )
  if (children.length === 0) return null

  const starts = children.map((c) => new Date(c[startKey]!).getTime())
  const ends = children.map((c) => new Date(c[endKey]!).getTime())
  const start = new Date(Math.min(...starts)).toISOString().slice(0, 10)
  const end = new Date(Math.max(...ends)).toISOString().slice(0, 10)
  return { start, end, durationDays: daysBetween(start, end) }
}

export function getPhaseDateRange(phaseId: string, rows: ScheduleRow[]): DerivedRange | null {
  return derivePhaseRange(phaseId, rows, 'start', 'end')
}

export function getPhaseBaselineRange(phaseId: string, rows: ScheduleRow[]): DerivedRange | null {
  return derivePhaseRange(phaseId, rows, 'baselineStart', 'baselineFinish')
}

export function getPhaseActualRange(phaseId: string, rows: ScheduleRow[]): DerivedRange | null {
  return derivePhaseRange(phaseId, rows, 'actualStart', 'actualFinish')
}

const FALLBACK_RANGE = { min: new Date('2026-01-15'), max: new Date('2026-05-29') }

// Project schedule boundaries — recalculated from whatever is currently dated.
// Unlike a Phase's own bracket, the overall Project range does include
// Milestone dates (a milestone can legitimately fall outside every Activity span).
export function computeDateRange(rows: ScheduleRow[]): { min: Date; max: Date } {
  const points: number[] = []
  for (const r of rows) {
    if (r.kind === 'activity' && r.start && r.end) {
      points.push(new Date(r.start).getTime(), new Date(r.end).getTime())
    } else if (r.kind === 'milestone' && r.date) {
      points.push(new Date(r.date).getTime())
    }
  }
  if (points.length === 0) return FALLBACK_RANGE
  return { min: new Date(Math.min(...points)), max: new Date(Math.max(...points)) }
}

// Execution snapshot for interaction testing — Phase 1 finished on baseline,
// UX Design finished on baseline, and Development is the one Activity
// that's slipped (baseline finish May 29 → forecast Jun 15, +17d), matching
// the "Development Complete" milestone slip already told in the Dashboard
// tab's mock data (dashboard/data/mockDashboardData.ts) so the two tabs
// narrate the same schedule story.
export const initialScheduleRows: ScheduleRow[] = [
  { id: 'phase-1', wbs: '1', level: 0, kind: 'phase', parentId: null, name: 'Phase 1 — Initiation' },
  {
    id: 'p1-define-scope',
    wbs: '1.1',
    level: 1,
    kind: 'activity',
    parentId: 'phase-1',
    name: 'Define scope',
    owner: 'A. Farouk',
    start: '2026-01-15',
    end: '2026-01-21',
    durationDays: daysBetween('2026-01-15', '2026-01-21'),
    baselineStart: '2026-01-15',
    baselineFinish: '2026-01-21',
    actualStart: '2026-01-15',
    actualFinish: '2026-01-21',
    percentComplete: 100,
    status: 'complete',
  },
  {
    id: 'p1-stakeholder-workshop',
    wbs: '1.2',
    level: 1,
    kind: 'activity',
    parentId: 'phase-1',
    name: 'Stakeholder workshop',
    owner: 'A. Farouk',
    start: '2026-01-22',
    end: '2026-01-28',
    durationDays: daysBetween('2026-01-22', '2026-01-28'),
    predecessorId: 'p1-define-scope',
    baselineStart: '2026-01-22',
    baselineFinish: '2026-01-28',
    actualStart: '2026-01-22',
    actualFinish: '2026-01-28',
    percentComplete: 100,
    status: 'complete',
  },
  {
    id: 'p1-requirements-approved',
    wbs: '1.3',
    level: 1,
    kind: 'milestone',
    parentId: 'phase-1',
    name: 'Requirements approved',
    date: '2026-02-13',
    predecessor: '1.2FS',
  },
  { id: 'phase-2', wbs: '2', level: 0, kind: 'phase', parentId: null, name: 'Phase 2 — Delivery' },
  {
    id: 'p2-ux-design',
    wbs: '2.1',
    level: 1,
    kind: 'activity',
    parentId: 'phase-2',
    name: 'UX Design',
    owner: 'S. Ali',
    start: '2026-02-16',
    end: '2026-03-20',
    durationDays: daysBetween('2026-02-16', '2026-03-20'),
    // Reassigned from the milestone (V1 dependencies are Activity-to-Activity only).
    predecessorId: 'p1-stakeholder-workshop',
    baselineStart: '2026-02-16',
    baselineFinish: '2026-03-20',
    actualStart: '2026-02-16',
    actualFinish: '2026-03-20',
    percentComplete: 100,
    status: 'complete',
  },
  {
    id: 'p2-development',
    wbs: '2.2',
    level: 1,
    kind: 'activity',
    parentId: 'phase-2',
    name: 'Development',
    owner: 'Dev Team',
    start: '2026-03-23',
    // Forecast Finish has slipped 17d past baseline — end/durationDays
    // reflect the current (forecast) schedule, same as before this task;
    // baselineFinish below is what stays fixed for comparison.
    end: '2026-06-15',
    durationDays: daysBetween('2026-03-23', '2026-06-15'),
    predecessorId: 'p2-ux-design',
    baselineStart: '2026-03-23',
    baselineFinish: '2026-05-29',
    actualStart: '2026-03-23',
    percentComplete: 70,
    status: 'delayed',
  },
  // Demonstrates the empty-phase state: no child Activities yet.
  { id: 'phase-3', wbs: '3', level: 0, kind: 'phase', parentId: null, name: 'Phase 3 — Closeout' },
]

// The routine progress-tracking fields a PM edits repeatedly during
// execution — grouped separately from updateActivityField's full patch
// shape because these are exactly what the grid's batch "Save Updates" /
// "Discard" flow (and the Activity Details panel, which stages into this
// same draft so the two surfaces never disagree about what's pending)
// stage as pending, unsaved-row edits before committing.
export type PendingActivityPatch = Partial<
  Pick<
    ActivityRow,
    'status' | 'percentComplete' | 'actualStart' | 'actualFinish' | 'end' | 'progressNote' | 'attachments'
  >
>

// Fixed mock identity/clock — this prototype has no auth session, so every
// commit is stamped as the same "current user" against the same fictional
// "today" the rest of the mock schedule data already lives in (see
// dashboard/data/mockDashboardData.ts's Aug 12 2026 "Last Update"). S. Ali is
// both the Core Banking Migration project's PM (registry/projectsRegisterData.ts)
// and an Activity Owner in this very schedule (UX Design) — chosen deliberately
// so the Update Progress table's "My Activities" filter has something to show.
export const MOCK_CURRENT_USER = 'S. Ali'
export const MOCK_TODAY = '2026-08-19'

// --- Structural mutations --------------------------------------------------

function groupIntoBlocks(rows: ScheduleRow[]): { phase: PhaseRow; children: ChildRow[] }[] {
  const blocks: { phase: PhaseRow; children: ChildRow[] }[] = []
  for (const row of rows) {
    if (isPhaseRow(row)) {
      blocks.push({ phase: row, children: [] })
    } else {
      blocks[blocks.length - 1]?.children.push(row)
    }
  }
  return blocks
}

function flattenBlocks(blocks: { phase: PhaseRow; children: ChildRow[] }[]): ScheduleRow[] {
  return blocks.flatMap((b) => [b.phase, ...b.children])
}

export function renumber(rows: ScheduleRow[]): ScheduleRow[] {
  const blocks = groupIntoBlocks(rows)
  return blocks.flatMap((block, phaseIdx) => {
    const phaseWbs = `${phaseIdx + 1}`
    const phase: PhaseRow = { ...block.phase, wbs: phaseWbs }
    const children = block.children.map((child, childIdx) => ({
      ...child,
      wbs: `${phaseWbs}.${childIdx + 1}`,
    }))
    return [phase, ...children]
  })
}

export function addPhase(rows: ScheduleRow[]): { rows: ScheduleRow[]; newId: string } {
  const newId = `phase-${Date.now()}`
  const newPhase: PhaseRow = { id: newId, wbs: '', level: 0, kind: 'phase', parentId: null, name: 'New Phase' }
  return { rows: renumber([...rows, newPhase]), newId }
}

export function renamePhase(rows: ScheduleRow[], id: string, name: string): ScheduleRow[] {
  return rows.map((r) => (r.id === id ? { ...r, name } : r))
}

export function removePhase(rows: ScheduleRow[], id: string): ScheduleRow[] {
  const hasChildren = rows.some((r) => r.parentId === id)
  if (hasChildren) return rows
  return renumber(rows.filter((r) => r.id !== id))
}

export function movePhaseBefore(rows: ScheduleRow[], draggedId: string, targetId: string): ScheduleRow[] {
  if (draggedId === targetId) return rows
  const blocks = groupIntoBlocks(rows)
  const fromIdx = blocks.findIndex((b) => b.phase.id === draggedId)
  if (fromIdx === -1) return rows
  const [moved] = blocks.splice(fromIdx, 1)
  const toIdx = blocks.findIndex((b) => b.phase.id === targetId)
  if (toIdx === -1) {
    blocks.push(moved)
  } else {
    blocks.splice(toIdx, 0, moved)
  }
  return renumber(flattenBlocks(blocks))
}

export function createActivityRow(phaseId: string, name: string): ActivityRow {
  return {
    id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    wbs: '',
    level: 1,
    kind: 'activity',
    parentId: phaseId,
    name,
  }
}

export function addActivity(rows: ScheduleRow[], phaseId: string, name: string): ScheduleRow[] {
  const blocks = groupIntoBlocks(rows)
  const block = blocks.find((b) => b.phase.id === phaseId)
  if (!block) return rows
  block.children.push(createActivityRow(phaseId, name))
  return renumber(flattenBlocks(blocks))
}

// Used both for single-field grid commits and for the Inspector's single
// atomic multi-field transaction — same rule either way: Duration always
// re-derives from whatever Start/Finish result from the patch.
export function updateActivityField(
  rows: ScheduleRow[],
  id: string,
  patch: Partial<
    Pick<
      ActivityRow,
      | 'name'
      | 'owner'
      | 'start'
      | 'end'
      | 'predecessorId'
      | 'actualStart'
      | 'actualFinish'
      | 'percentComplete'
      | 'status'
      | 'progressNote'
      | 'attachments'
      | 'lastUpdatedBy'
      | 'lastUpdatedDate'
    >
  >,
): ScheduleRow[] {
  return rows.map((r) => {
    if (r.id !== id || r.kind !== 'activity') return r
    const next: ActivityRow = { ...r, ...patch }
    next.durationDays = next.start && next.end ? daysBetween(next.start, next.end) : undefined
    return next
  })
}

export interface CascadeSuccess {
  ok: true
  rows: ScheduleRow[]
  // Downstream Activities only — the initiating Activity's own change is
  // the caller's concern, not this function's.
  changedIds: string[]
  previousDates: Record<string, { start?: string; end?: string }>
}

export interface CascadeFailure {
  ok: false
  reason: string
}

export type CascadeOutcome = CascadeSuccess | CascadeFailure

// Finish-to-Start, zero lag, no other relationship type: a dependent must
// start no earlier than the day after its predecessor finishes. Call this
// AFTER the initiating Activity's own new Finish is already applied to
// `rows` — this only walks forward from there, shifting (never resizing)
// any dependent whose Start now falls before that boundary, then continues
// through that dependent's own dependents in turn. Because each Activity
// has at most one predecessor, the dependency graph is a forest — the
// visited-set cycle guard below should be unreachable in practice, since
// cycles are already rejected at predecessor-assignment time.
export function cascadeReschedule(rows: ScheduleRow[], initiatingId: string): CascadeOutcome {
  const byId = new Map(rows.map((r) => [r.id, r]))
  const changedIds: string[] = []
  const previousDates: Record<string, { start?: string; end?: string }> = {}
  const visited = new Set<string>()
  const queue: string[] = [initiatingId]

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (visited.has(currentId)) {
      return { ok: false, reason: "Couldn't reschedule — a circular dependency was detected in the chain" }
    }
    visited.add(currentId)

    const current = byId.get(currentId)
    if (!current || current.kind !== 'activity' || !current.start || !current.end) continue

    const dependents = rows.filter(
      (r): r is ActivityRow => r.kind === 'activity' && r.predecessorId === currentId,
    )

    for (const dep of dependents) {
      const depRow = byId.get(dep.id) as ActivityRow | undefined
      if (!depRow || !depRow.start || !depRow.end) continue // unscheduled dependents aren't cascaded

      const minStart = addCalendarDays(current.end, 1)
      if (depRow.start >= minStart) continue // already compliant

      const deficitDays = Math.round(
        (new Date(minStart).getTime() - new Date(depRow.start).getTime()) / MS_PER_DAY,
      )
      const newStart = addCalendarDays(depRow.start, deficitDays)
      const newEnd = addCalendarDays(depRow.end, deficitDays)

      if (!(dep.id in previousDates)) {
        previousDates[dep.id] = { start: depRow.start, end: depRow.end }
      }
      byId.set(dep.id, { ...depRow, start: newStart, end: newEnd })
      changedIds.push(dep.id)
      queue.push(dep.id)
    }
  }

  const finalRows = rows.map((r) => byId.get(r.id) ?? r)
  return { ok: true, rows: finalRows, changedIds, previousDates }
}

export function createMilestoneRow(phaseId: string, name: string): MilestoneRow {
  return {
    id: `milestone-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    wbs: '',
    level: 1,
    kind: 'milestone',
    parentId: phaseId,
    name,
  }
}

export function addMilestone(rows: ScheduleRow[], phaseId: string, name: string): ScheduleRow[] {
  const blocks = groupIntoBlocks(rows)
  const block = blocks.find((b) => b.phase.id === phaseId)
  if (!block) return rows
  block.children.push(createMilestoneRow(phaseId, name))
  return renumber(flattenBlocks(blocks))
}

export function renameMilestone(rows: ScheduleRow[], id: string, name: string): ScheduleRow[] {
  return rows.map((r) => (r.id === id && r.kind === 'milestone' ? { ...r, name } : r))
}

export function updateMilestoneDate(rows: ScheduleRow[], id: string, date: string): ScheduleRow[] {
  return rows.map((r) => (r.id === id && r.kind === 'milestone' ? { ...r, date: date || undefined } : r))
}

// V1 dependency scope: Finish-to-Start, Activity-to-Activity only.
// Walk the candidate's own predecessor chain — if it ever reaches the
// dependent Activity, linking them would close a loop.
export function wouldCreateCycle(rows: ScheduleRow[], dependentId: string, candidateId: string): boolean {
  let currentId: string | undefined = candidateId
  const visited = new Set<string>()
  while (currentId) {
    if (currentId === dependentId) return true
    if (visited.has(currentId)) break
    visited.add(currentId)
    const row = rows.find((r) => r.id === currentId)
    currentId = row && row.kind === 'activity' ? row.predecessorId : undefined
  }
  return false
}

// Reorders a child (Activity or Milestone) among its siblings within the
// same Phase — moving across phases is out of scope for this task.
export function moveChildBefore(rows: ScheduleRow[], draggedId: string, targetId: string): ScheduleRow[] {
  if (draggedId === targetId) return rows
  const dragged = rows.find((r) => r.id === draggedId)
  const target = rows.find((r) => r.id === targetId)
  if (!dragged || !target || !dragged.parentId || dragged.parentId !== target.parentId) return rows

  const blocks = groupIntoBlocks(rows)
  const block = blocks.find((b) => b.phase.id === dragged.parentId)
  if (!block) return rows

  const fromIdx = block.children.findIndex((c) => c.id === draggedId)
  if (fromIdx === -1) return rows
  const [moved] = block.children.splice(fromIdx, 1)
  const toIdx = block.children.findIndex((c) => c.id === targetId)
  if (toIdx === -1) {
    block.children.push(moved)
  } else {
    block.children.splice(toIdx, 0, moved)
  }
  return renumber(flattenBlocks(blocks))
}
