export type ScheduleRowKind = 'phase' | 'activity' | 'milestone'

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

export interface DerivedRange {
  start: string
  end: string
  durationDays: number
}

// Phase dates are always derived from dated child Activities — never stored
// directly. Milestones don't extend the span; unscheduled Activities don't either.
export function getPhaseDateRange(phaseId: string, rows: ScheduleRow[]): DerivedRange | null {
  const children = rows.filter(
    (r): r is ActivityRow => r.kind === 'activity' && r.parentId === phaseId && !!r.start && !!r.end,
  )
  if (children.length === 0) return null

  const starts = children.map((c) => new Date(c.start!).getTime())
  const ends = children.map((c) => new Date(c.end!).getTime())
  const start = new Date(Math.min(...starts)).toISOString().slice(0, 10)
  const end = new Date(Math.max(...ends)).toISOString().slice(0, 10)
  return { start, end, durationDays: daysBetween(start, end) }
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

// Placeholder structure for interaction testing only — not wired to real
// milestone creation or dependency evaluation yet.
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
    end: '2026-05-29',
    durationDays: daysBetween('2026-03-23', '2026-05-29'),
    predecessorId: 'p2-ux-design',
  },
  // Demonstrates the empty-phase state: no child Activities yet.
  { id: 'phase-3', wbs: '3', level: 0, kind: 'phase', parentId: null, name: 'Phase 3 — Closeout' },
]

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
  patch: Partial<Pick<ActivityRow, 'name' | 'owner' | 'start' | 'end' | 'predecessorId'>>,
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
