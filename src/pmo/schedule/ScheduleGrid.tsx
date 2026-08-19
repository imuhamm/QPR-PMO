import { useMemo, useState } from 'react'
import type { UIEvent } from 'react'
import type { ActivityRow, DerivedRange, DisplayRow, OptionalColumnKey, PendingActivityPatch, ScheduleRow } from './scheduleData'
import {
  dateDiffDays,
  floatDays,
  fmtDate,
  getPredecessorMismatch,
  isOnCriticalChain,
  MOCK_CURRENT_USER,
  remainingDurationDays,
} from './scheduleData'
import { useInlineCellSave } from './useInlineCellSave'
import { ActivityStatusCell, DraftEditCell, StatusDot, VarianceCell } from './cells'
import { PredecessorEditor } from './PredecessorEditor'
import { InlineMessage } from '../shared/validation/InlineMessage'
import { BaselineValue } from '../shared/BaselineValue'
import type { ChangeRequestDraft } from '../shared/ChangeRequestPanel'
import type { ScheduleImpactScope } from '../shared/changeRequestImpact'
import { canWithdrawStatus, findPendingChangeRequest, pendingStatusLabel } from '../shared/changeRequestStore'
import type { SubmittedChangeRequest } from '../shared/changeRequestStore'

const NAME_MIN_WIDTH = 160
const COL = {
  owner: 70,
  status: 96,
  pct: 46,
  baselineStart: 62,
  baselineFinish: 62,
  forecastFinish: 66,
  actualStart: 62,
  actualFinish: 62,
  variance: 56,
  remaining: 64,
  predecessor: 56,
  critical: 44,
  float: 44,
}
const DEFAULT_COLUMNS_WIDTH =
  COL.owner +
  COL.status +
  COL.pct +
  COL.baselineStart +
  COL.baselineFinish +
  COL.forecastFinish +
  COL.actualStart +
  COL.actualFinish +
  COL.variance

function RenameCell({ name, bold, onRename }: { name: string; bold?: boolean; onRename: (name: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)

  const commit = () => {
    const trimmed = draft.trim()
    setEditing(false)
    if (trimmed && trimmed !== name) onRename(trimmed)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setDraft(name)
            setEditing(false)
          }
        }}
        className={`w-full rounded-sm border border-blue-400 bg-white px-1 py-0.5 text-[11px] text-slate-800 outline-none ring-1 ring-blue-200 ${bold ? 'font-semibold' : ''}`}
      />
    )
  }

  return (
    <span
      onDoubleClick={(e) => {
        e.stopPropagation()
        setDraft(name)
        setEditing(true)
      }}
      className="truncate"
      title="Double-click to rename"
    >
      {name}
    </span>
  )
}

// Baseline is the approved plan — read-only reference data, styled to read
// as protected rather than an empty/editable cell: subtle tint + italic,
// same convention DerivedDateCells already used for phase roll-ups. Clicking
// or focusing the value (not just hovering it) discloses why it's locked
// and where to go next — see BaselineValue.
// The grid's own fmtDate drops the year (space is tight in a 62px column) —
// fine for the cell itself, but the Change Request panel reads as a
// standalone record, so its "Current Approved" needs the full date.
function fmtFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ProtectedDateCell({
  value,
  width,
  entity,
  field,
  scope,
  onRequestChange,
  submittedCRs,
  onWithdrawCR,
  onViewCR,
}: {
  value?: string
  width: number
  entity: string
  field: string
  scope: ScheduleImpactScope
  onRequestChange: (draft: ChangeRequestDraft) => void
  submittedCRs: SubmittedChangeRequest[]
  onWithdrawCR: (reference: string) => void
  onViewCR: (reference: string) => void
}) {
  const pendingCR = findPendingChangeRequest(submittedCRs, scope, field)
  return (
    <BaselineValue
      style={{ width }}
      triggerClassName="w-full bg-slate-50/80 px-2 py-1 italic text-slate-500"
      onRequestChange={() =>
        onRequestChange({
          affectedEntity: entity,
          affectedField: field,
          currentApproved: value ? fmtFullDate(value) : 'Not set',
          currentApprovedISO: value,
          scope,
        })
      }
      pending={
        pendingCR
          ? {
              reference: pendingCR.reference,
              proposedDisplay: pendingCR.proposedDisplay,
              statusLabel: pendingStatusLabel(pendingCR.status),
              canWithdraw: pendingCR.requestedBy === MOCK_CURRENT_USER && canWithdrawStatus(pendingCR.status),
            }
          : undefined
      }
      onWithdraw={() => pendingCR && onWithdrawCR(pendingCR.reference)}
      onViewCR={() => pendingCR && onViewCR(pendingCR.reference)}
    >
      {value ? fmtDate(value) : '—'}
    </BaselineValue>
  )
}

function RemainingCell({ days, width }: { days: number | null; width: number }) {
  return (
    <div style={{ width }} className="shrink-0 truncate px-2 text-slate-500">
      {days != null ? `${days}d` : '—'}
    </div>
  )
}

function CriticalCell({ critical, width }: { critical: boolean; width: number }) {
  return (
    <div
      style={{ width }}
      title={critical ? 'On the critical dependency chain' : undefined}
      className="shrink-0 truncate px-2 text-center"
    >
      {critical ? <span className="text-rose-500">●</span> : <span className="text-slate-300">—</span>}
    </div>
  )
}

function FloatCell({ days, width }: { days: number | undefined; width: number }) {
  return (
    <div style={{ width }} className="shrink-0 truncate px-2 text-slate-500">
      {days != null ? `${days}d` : '—'}
    </div>
  )
}

function DerivedDateCells({
  phaseName,
  phaseId,
  baseline,
  forecast,
  actual,
  onRequestChange,
  submittedCRs,
  onWithdrawCR,
  onViewCR,
}: {
  phaseName: string
  phaseId: string
  baseline: DerivedRange | null
  forecast: DerivedRange | null
  actual: DerivedRange | null
  onRequestChange: (draft: ChangeRequestDraft) => void
  submittedCRs: SubmittedChangeRequest[]
  onWithdrawCR: (reference: string) => void
  onViewCR: (reference: string) => void
}) {
  const variance = baseline && forecast ? Math.round((new Date(forecast.end).getTime() - new Date(baseline.end).getTime()) / 86_400_000) : null
  const phaseScope: ScheduleImpactScope = { kind: 'phase', id: phaseId }
  return (
    <>
      <div style={{ width: COL.owner }} className="shrink-0 truncate px-2 text-slate-300">—</div>
      <div style={{ width: COL.status }} className="shrink-0 truncate px-2 text-slate-300">—</div>
      <div style={{ width: COL.pct }} className="shrink-0 truncate px-2 text-slate-300">—</div>
      <ProtectedDateCell
        value={baseline?.start}
        width={COL.baselineStart}
        entity={phaseName}
        field="Baseline Start"
        scope={phaseScope}
        onRequestChange={onRequestChange}
        submittedCRs={submittedCRs}
        onWithdrawCR={onWithdrawCR}
        onViewCR={onViewCR}
      />
      <ProtectedDateCell
        value={baseline?.end}
        width={COL.baselineFinish}
        entity={phaseName}
        field="Baseline Finish"
        scope={phaseScope}
        onRequestChange={onRequestChange}
        submittedCRs={submittedCRs}
        onWithdrawCR={onWithdrawCR}
        onViewCR={onViewCR}
      />
      <div
        style={{ width: COL.forecastFinish }}
        title={forecast ? `Derived from child Activities: ${forecast.start} → ${forecast.end}` : undefined}
        className="shrink-0 cursor-default truncate px-2 italic text-slate-400"
      >
        {forecast ? fmtDate(forecast.end) : '—'}
      </div>
      <div
        style={{ width: COL.actualStart }}
        title={actual ? `Derived from child Activities: ${actual.start} → ${actual.end}` : undefined}
        className="shrink-0 cursor-default truncate px-2 italic text-slate-400"
      >
        {actual ? fmtDate(actual.start) : '—'}
      </div>
      <div
        style={{ width: COL.actualFinish }}
        title={actual ? `Derived from child Activities: ${actual.start} → ${actual.end}` : undefined}
        className="shrink-0 cursor-default truncate px-2 italic text-slate-400"
      >
        {actual ? fmtDate(actual.end) : '—'}
      </div>
      <VarianceCell days={variance} width={COL.variance} />
    </>
  )
}

function InlineEditCell({
  value,
  width,
  type = 'text',
  suffix,
  onCommit,
  validate,
}: {
  value?: string
  width: number
  type?: 'text' | 'date' | 'number'
  suffix?: string
  onCommit: (value: string) => Promise<void>
  validate?: (next: string) => string | null
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [invalidMsg, setInvalidMsg] = useState<string | null>(null)
  const { status, run, retry } = useInlineCellSave(onCommit)

  const startEdit = () => {
    setDraft(value ?? '')
    setInvalidMsg(null)
    setEditing(true)
  }

  const attemptCommit = () => {
    const trimmed = draft.trim()
    if (trimmed === (value ?? '')) {
      setEditing(false)
      setInvalidMsg(null)
      return
    }
    if (validate) {
      const err = validate(trimmed)
      if (err) {
        setInvalidMsg(err)
        return
      }
    }
    setInvalidMsg(null)
    setEditing(false)
    void run(trimmed)
  }

  if (editing) {
    return (
      <div style={{ width }} className="flex shrink-0 items-center gap-1 px-1">
        <input
          type={type}
          autoFocus
          value={draft}
          min={type === 'number' ? 0 : undefined}
          max={type === 'number' ? 100 : undefined}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={attemptCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') attemptCommit()
            if (e.key === 'Escape') {
              setInvalidMsg(null)
              setEditing(false)
            }
          }}
          className={`w-full min-w-0 rounded-sm border bg-white px-1 py-0.5 text-[11px] text-slate-800 outline-none ${
            invalidMsg ? 'border-rose-400 ring-1 ring-rose-300' : 'border-blue-400 ring-1 ring-blue-200'
          }`}
        />
        {invalidMsg && (
          <InlineMessage severity="field-error" compact>
            {invalidMsg}
          </InlineMessage>
        )}
      </div>
    )
  }

  return (
    <div
      style={{ width }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        startEdit()
      }}
      className="flex shrink-0 cursor-default items-center gap-1 truncate px-2"
    >
      <span className={`truncate ${value ? 'text-slate-600' : 'text-slate-300'}`}>
        {value ? (type === 'date' ? fmtDate(value) : `${value}${suffix ?? ''}`) : '—'}
      </span>
      <StatusDot status={status} onRetry={retry} />
    </div>
  )
}

function PredecessorCell({
  activity,
  allRows,
  width,
  onCommit,
}: {
  activity: ActivityRow
  allRows: ScheduleRow[]
  width: number
  onCommit: (value: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const { status, run, retry } = useInlineCellSave(onCommit)
  const predecessor = activity.predecessorId
    ? (allRows.find((r) => r.id === activity.predecessorId) as ActivityRow | undefined)
    : undefined

  return (
    <div style={{ width }} className="relative shrink-0 px-1">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        title={predecessor ? `${predecessor.wbs} ${predecessor.name}` : 'No predecessor'}
        className="flex w-full items-center gap-1 truncate rounded-sm px-1 py-0.5 text-left hover:bg-slate-50"
      >
        <span className={`truncate ${predecessor ? 'text-slate-600' : 'text-slate-300'}`}>
          {predecessor ? predecessor.wbs : '—'}
        </span>
        <StatusDot status={status} onRetry={retry} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1" onClick={(e) => e.stopPropagation()}>
          <PredecessorEditor
            rows={allRows}
            activity={activity}
            onSelect={(id) => {
              setOpen(false)
              void run(id)
            }}
            onRemove={() => {
              setOpen(false)
              void run('')
            }}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  )
}

type AddMode = 'activity' | 'milestone' | null

function AddRow({
  isEmpty,
  level,
  minWidth,
  onCreateActivity,
  onCreateMilestone,
}: {
  isEmpty: boolean
  level: number
  minWidth: number
  onCreateActivity: (name: string) => void
  onCreateMilestone: (name: string) => void
}) {
  const [mode, setMode] = useState<AddMode>(null)
  const [draft, setDraft] = useState('')

  const commit = () => {
    const trimmed = draft.trim()
    if (!trimmed || !mode) return
    if (mode === 'activity') onCreateActivity(trimmed)
    else onCreateMilestone(trimmed)
    setDraft('')
    // Stay in the same mode, refocused, for rapid sequential creation.
  }

  if (mode) {
    return (
      <div
        className="flex items-center gap-1 border-b border-slate-100 text-[11px]"
        style={{ paddingLeft: 8 + level * 14, minWidth }}
      >
        {mode === 'milestone' && <span className="shrink-0 text-amber-500">◆</span>}
        <input
          autoFocus
          value={draft}
          placeholder={mode === 'activity' ? 'Activity name…' : 'Milestone name…'}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setDraft('')
              setMode(null)
            }
          }}
          onBlur={() => {
            if (draft.trim()) commit()
            setMode(null)
          }}
          className="min-w-0 flex-1 rounded-sm border border-blue-400 bg-white px-1.5 py-0.5 text-[11px] text-slate-800 outline-none ring-1 ring-blue-200"
        />
      </div>
    )
  }

  return (
    <div
      style={{ paddingLeft: 8 + level * 14, minWidth }}
      className="flex items-center gap-2 border-b border-slate-100 text-[11px] text-slate-400"
    >
      {isEmpty && <span className="italic">No scheduled work</span>}
      <button type="button" onClick={() => setMode('activity')} className="font-medium text-blue-600 hover:text-blue-700">
        + Add Activity
      </button>
      <button type="button" onClick={() => setMode('milestone')} className="font-medium text-blue-600 hover:text-blue-700">
        + Add Milestone
      </button>
    </div>
  )
}

export function ScheduleGrid({
  rows,
  allRows,
  rowHeight,
  width,
  scrollRef,
  onScroll,
  selectedId,
  onSelectRow,
  collapsedPhases,
  onTogglePhase,
  phaseDates,
  phaseBaselineDates,
  phaseActualDates,
  childCounts,
  visibleColumns,
  pendingEdits,
  onUpdateDraft,
  onRenamePhase,
  onRemovePhase,
  onReorderPhase,
  onReorderChild,
  onCreateActivity,
  onCommitActivityField,
  onCreateMilestone,
  onRenameMilestone,
  onCommitMilestoneDate,
  onRenameActivity,
  justRescheduledIds,
  onRequestChange,
  submittedCRs,
  onWithdrawCR,
  onViewCR,
}: {
  rows: DisplayRow[]
  allRows: ScheduleRow[]
  rowHeight: number
  width: number
  scrollRef: React.RefObject<HTMLDivElement | null>
  onScroll: (e: UIEvent<HTMLDivElement>) => void
  selectedId: string | null
  onSelectRow: (id: string) => void
  collapsedPhases: Set<string>
  onTogglePhase: (id: string) => void
  phaseDates: Record<string, DerivedRange | null>
  phaseBaselineDates: Record<string, DerivedRange | null>
  phaseActualDates: Record<string, DerivedRange | null>
  childCounts: Record<string, number>
  visibleColumns: Set<OptionalColumnKey>
  pendingEdits: Record<string, PendingActivityPatch>
  onUpdateDraft: (id: string, patch: PendingActivityPatch) => void
  onRenamePhase: (id: string, name: string) => void
  onRemovePhase: (id: string) => void
  onReorderPhase: (draggedId: string, targetId: string) => void
  onReorderChild: (draggedId: string, targetId: string) => void
  onCreateActivity: (phaseId: string, name: string) => void
  onCommitActivityField: (id: string, key: 'owner' | 'predecessorId') => (value: string) => Promise<void>
  onCreateMilestone: (phaseId: string, name: string) => void
  onRenameMilestone: (id: string, name: string) => void
  onCommitMilestoneDate: (id: string) => (value: string) => Promise<void>
  onRenameActivity: (id: string, name: string) => void
  justRescheduledIds: Set<string>
  onRequestChange: (draft: ChangeRequestDraft) => void
  submittedCRs: SubmittedChangeRequest[]
  onWithdrawCR: (reference: string) => void
  onViewCR: (reference: string) => void
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const draggedRow = rows.find((r) => r.id === draggingId)

  const showRemaining = visibleColumns.has('remaining')
  const showPredecessor = visibleColumns.has('predecessor')
  const showCritical = visibleColumns.has('critical')
  const showFloat = visibleColumns.has('float')

  const contentMinWidth = useMemo(() => {
    let total = NAME_MIN_WIDTH + DEFAULT_COLUMNS_WIDTH
    if (showRemaining) total += COL.remaining
    if (showPredecessor) total += COL.predecessor
    if (showCritical) total += COL.critical
    if (showFloat) total += COL.float
    return total
  }, [showRemaining, showPredecessor, showCritical, showFloat])

  function isValidDropTarget(targetRow: DisplayRow): boolean {
    if (!draggedRow) return false
    if (draggedRow.kind === 'phase') return targetRow.kind === 'phase'
    if (draggedRow.kind === 'activity' || draggedRow.kind === 'milestone') {
      return (
        (targetRow.kind === 'activity' || targetRow.kind === 'milestone') &&
        targetRow.parentId === draggedRow.parentId
      )
    }
    return false
  }

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      style={{ width }}
      className="h-full shrink-0 overflow-auto border-r border-slate-200"
    >
      <div
        style={{ height: rowHeight, minWidth: contentMinWidth }}
        className="sticky top-0 z-10 flex items-center border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500"
      >
        <div style={{ minWidth: NAME_MIN_WIDTH }} className="flex-1 truncate px-2">Activity</div>
        <div style={{ width: COL.owner }} className="shrink-0 truncate px-2">Owner</div>
        <div style={{ width: COL.status }} className="shrink-0 truncate px-2">Status</div>
        <div style={{ width: COL.pct }} className="shrink-0 truncate px-2" title="% Complete">% Comp</div>
        <div
          style={{ width: COL.baselineStart }}
          title="Baseline Start — approved, protected"
          className="shrink-0 truncate border-l border-slate-200 bg-slate-50 px-2"
        >
          🔒 Base. Start
        </div>
        <div
          style={{ width: COL.baselineFinish }}
          title="Baseline Finish — approved, protected"
          className="shrink-0 truncate bg-slate-50 px-2"
        >
          🔒 Base. Finish
        </div>
        <div style={{ width: COL.forecastFinish }} title="Forecast Finish — editable" className="shrink-0 truncate border-l border-slate-200 px-2">
          Fcst Finish
        </div>
        <div style={{ width: COL.actualStart }} title="Actual Start" className="shrink-0 truncate border-l border-slate-200 px-2">
          Act. Start
        </div>
        <div style={{ width: COL.actualFinish }} title="Actual Finish" className="shrink-0 truncate px-2">
          Act. Finish
        </div>
        <div style={{ width: COL.variance }} title="Forecast vs. Baseline Finish" className="shrink-0 truncate border-l border-slate-200 px-2">
          Var.
        </div>
        {showRemaining && (
          <div style={{ width: COL.remaining }} title="Remaining Duration" className="shrink-0 truncate border-l border-slate-200 px-2">
            Remaining
          </div>
        )}
        {showPredecessor && (
          <div style={{ width: COL.predecessor }} className="shrink-0 truncate px-2">Pred.</div>
        )}
        {showCritical && (
          <div style={{ width: COL.critical }} className="shrink-0 truncate px-2 text-center" title="On critical chain">Crit.</div>
        )}
        {showFloat && (
          <div style={{ width: COL.float }} className="shrink-0 truncate px-2">Float</div>
        )}
      </div>

      <div>
        {rows.map((row) => {
          if (row.kind === 'add-row') {
            return (
              <div key={row.id} style={{ height: rowHeight }}>
                <AddRow
                  isEmpty={row.isEmpty}
                  level={row.level}
                  minWidth={contentMinWidth}
                  onCreateActivity={(name) => onCreateActivity(row.parentId, name)}
                  onCreateMilestone={(name) => onCreateMilestone(row.parentId, name)}
                />
              </div>
            )
          }

          const isPhase = row.kind === 'phase'
          const isActivity = row.kind === 'activity'
          const isMilestone = row.kind === 'milestone'
          const isDraggable = isPhase || isMilestone
          const isSelected = row.id === selectedId
          const isCollapsed = isPhase && collapsedPhases.has(row.id)
          const childCount = isPhase ? (childCounts[row.id] ?? 0) : 0
          const canDelete = isPhase && childCount === 0
          const mismatch = isActivity ? getPredecessorMismatch(row, allRows) : null
          const critical = isActivity ? isOnCriticalChain(row, allRows) : false
          const draft = isActivity ? pendingEdits[row.id] : undefined
          const isRowDirty = !!draft && Object.keys(draft).length > 0

          return (
            <div
              key={row.id}
              draggable={isDraggable}
              onDragStart={isDraggable ? () => setDraggingId(row.id) : undefined}
              onDragOver={
                draggingId
                  ? (e) => {
                      e.preventDefault()
                      if (isValidDropTarget(row)) setDragOverId(row.id)
                    }
                  : undefined
              }
              onDrop={
                draggingId
                  ? (e) => {
                      e.preventDefault()
                      if (draggingId && isValidDropTarget(row)) {
                        if (draggedRow?.kind === 'phase') onReorderPhase(draggingId, row.id)
                        else onReorderChild(draggingId, row.id)
                      }
                      setDraggingId(null)
                      setDragOverId(null)
                    }
                  : undefined
              }
              onDragEnd={
                isDraggable
                  ? () => {
                      setDraggingId(null)
                      setDragOverId(null)
                    }
                  : undefined
              }
              onClick={() => onSelectRow(row.id)}
              style={{ minWidth: contentMinWidth }}
              className={`group flex cursor-default items-center border-b border-slate-100 text-[11px] transition-colors ${
                isSelected
                  ? 'bg-blue-50'
                  : isPhase
                    ? 'bg-slate-50/70 hover:bg-slate-100/70'
                    : 'text-slate-600 hover:bg-blue-50/40'
              } ${isPhase ? 'font-semibold text-slate-800' : ''} ${
                draggingId === row.id ? 'opacity-40' : ''
              } ${dragOverId === row.id && draggingId && draggingId !== row.id ? 'border-t-2 border-t-blue-500' : ''} ${
                justRescheduledIds.has(row.id) ? 'ring-1 ring-inset ring-emerald-400' : ''
              } ${isRowDirty ? 'border-l-2 border-l-amber-400' : 'border-l-2 border-l-transparent'}`}
            >
              <div
                className="flex min-w-0 flex-1 items-center gap-1 truncate px-2"
                style={{ paddingLeft: 8 + row.level * 14, minWidth: NAME_MIN_WIDTH }}
              >
                {isPhase ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onTogglePhase(row.id)
                    }}
                    aria-label={isCollapsed ? 'Expand phase' : 'Collapse phase'}
                    className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[9px] text-slate-500 hover:text-slate-800"
                  >
                    {isCollapsed ? '▶' : '▼'}
                  </button>
                ) : (
                  row.kind === 'milestone' && <span className="shrink-0 text-amber-500">◆</span>
                )}

                {isPhase ? (
                  <RenameCell bold name={row.name} onRename={(name) => onRenamePhase(row.id, name)} />
                ) : isMilestone ? (
                  <RenameCell name={row.name} onRename={(name) => onRenameMilestone(row.id, name)} />
                ) : (
                  <RenameCell name={row.name} onRename={(name) => onRenameActivity(row.id, name)} />
                )}

                {mismatch && <InlineMessage severity="warning" compact>{mismatch}</InlineMessage>}

                {isRowDirty && (
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
                    title="Unsaved changes — Save Updates or Discard"
                  />
                )}

                {canDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemovePhase(row.id)
                    }}
                    title="Remove empty phase"
                    className="ml-1 hidden shrink-0 text-slate-400 hover:text-rose-600 group-hover:inline"
                  >
                    ✕
                  </button>
                )}
                {isPhase && !canDelete && (
                  <span
                    title="Only empty phases can be removed"
                    className="ml-1 hidden shrink-0 cursor-not-allowed text-slate-200 group-hover:inline"
                  >
                    ✕
                  </span>
                )}
              </div>

              {isActivity ? (
                <InlineEditCell
                  value={row.owner}
                  width={COL.owner}
                  onCommit={onCommitActivityField(row.id, 'owner')}
                />
              ) : (
                <div style={{ width: COL.owner }} className="shrink-0 truncate px-2">—</div>
              )}

              {isPhase ? (
                <DerivedDateCells
                  phaseName={row.name}
                  phaseId={row.id}
                  baseline={phaseBaselineDates[row.id] ?? null}
                  forecast={phaseDates[row.id] ?? null}
                  actual={phaseActualDates[row.id] ?? null}
                  onRequestChange={onRequestChange}
                  submittedCRs={submittedCRs}
                  onWithdrawCR={onWithdrawCR}
                  onViewCR={onViewCR}
                />
              ) : isActivity ? (
                <>
                  <ActivityStatusCell
                    committedStatus={row.status}
                    draftStatus={draft?.status}
                    width={COL.status}
                    onChange={(value) => onUpdateDraft(row.id, { status: value })}
                  />
                  <DraftEditCell
                    committedValue={row.percentComplete != null ? String(row.percentComplete) : undefined}
                    draftValue={draft?.percentComplete != null ? String(draft.percentComplete) : undefined}
                    width={COL.pct}
                    type="number"
                    suffix="%"
                    onChange={(value) =>
                      onUpdateDraft(row.id, {
                        percentComplete: value === '' ? undefined : Math.max(0, Math.min(100, Number(value))),
                      })
                    }
                    validate={(next) => {
                      const n = Number(next)
                      return next && (Number.isNaN(n) || n < 0 || n > 100) ? '0–100 only' : null
                    }}
                  />
                  <ProtectedDateCell
                    value={row.baselineStart}
                    width={COL.baselineStart}
                    entity={row.name}
                    field="Baseline Start"
                    scope={{ kind: 'activity', id: row.id }}
                    onRequestChange={onRequestChange}
                    submittedCRs={submittedCRs}
                    onWithdrawCR={onWithdrawCR}
                    onViewCR={onViewCR}
                  />
                  <ProtectedDateCell
                    value={row.baselineFinish}
                    width={COL.baselineFinish}
                    entity={row.name}
                    field="Baseline Finish"
                    scope={{ kind: 'activity', id: row.id }}
                    onRequestChange={onRequestChange}
                    submittedCRs={submittedCRs}
                    onWithdrawCR={onWithdrawCR}
                    onViewCR={onViewCR}
                  />
                  <DraftEditCell
                    committedValue={row.end}
                    draftValue={draft?.end}
                    width={COL.forecastFinish}
                    type="date"
                    onChange={(value) => onUpdateDraft(row.id, { end: value || undefined })}
                    validate={(next) => (next && row.start && next < row.start ? 'Finish must be on or after Start' : null)}
                  />
                  <DraftEditCell
                    committedValue={row.actualStart}
                    draftValue={draft?.actualStart}
                    width={COL.actualStart}
                    type="date"
                    onChange={(value) => onUpdateDraft(row.id, { actualStart: value || undefined })}
                    validate={(next) => {
                      const finish = draft?.actualFinish ?? row.actualFinish
                      return next && finish && next > finish ? 'After Actual Finish' : null
                    }}
                  />
                  <DraftEditCell
                    committedValue={row.actualFinish}
                    draftValue={draft?.actualFinish}
                    width={COL.actualFinish}
                    type="date"
                    onChange={(value) => onUpdateDraft(row.id, { actualFinish: value || undefined })}
                    validate={(next) => {
                      const start = draft?.actualStart ?? row.actualStart
                      return next && start && next < start ? 'Before Actual Start' : null
                    }}
                  />
                  <VarianceCell
                    days={
                      row.baselineFinish && (draft?.end ?? row.end)
                        ? dateDiffDays(row.baselineFinish, draft?.end ?? row.end!)
                        : null
                    }
                    width={COL.variance}
                  />
                </>
              ) : (
                <>
                  {/* Milestone: a single Completion Date. Baseline/Forecast mirror
                      it like the old dual-column convention; Actual/Variance don't
                      apply to a point-in-time row. */}
                  <div style={{ width: COL.status }} className="shrink-0 truncate px-2 text-slate-300">—</div>
                  <div style={{ width: COL.pct }} className="shrink-0 truncate px-2 text-slate-300">—</div>
                  <ProtectedDateCell
                    value={row.date}
                    width={COL.baselineStart}
                    entity={row.name}
                    field="Milestone Date"
                    scope={{ kind: 'milestone', id: row.id }}
                    onRequestChange={onRequestChange}
                    submittedCRs={submittedCRs}
                    onWithdrawCR={onWithdrawCR}
                    onViewCR={onViewCR}
                  />
                  <ProtectedDateCell
                    value={row.date}
                    width={COL.baselineFinish}
                    entity={row.name}
                    field="Milestone Date"
                    scope={{ kind: 'milestone', id: row.id }}
                    onRequestChange={onRequestChange}
                    submittedCRs={submittedCRs}
                    onWithdrawCR={onWithdrawCR}
                    onViewCR={onViewCR}
                  />
                  <InlineEditCell
                    value={row.date}
                    width={COL.forecastFinish}
                    type="date"
                    onCommit={onCommitMilestoneDate(row.id)}
                  />
                  <div style={{ width: COL.actualStart }} className="shrink-0 truncate px-2 text-slate-300">—</div>
                  <div style={{ width: COL.actualFinish }} className="shrink-0 truncate px-2 text-slate-300">—</div>
                  <div style={{ width: COL.variance }} className="shrink-0 truncate px-2 text-slate-300">—</div>
                </>
              )}

              {showRemaining && (
                <RemainingCell
                  // Remaining Duration is always derived from % Complete, never
                  // edited on its own — it already reflects a pending %
                  // Complete edit live, before that edit is even saved.
                  days={
                    isActivity
                      ? remainingDurationDays({
                          ...row,
                          percentComplete: draft?.percentComplete ?? row.percentComplete,
                          actualFinish: draft?.actualFinish ?? row.actualFinish,
                        })
                      : null
                  }
                  width={COL.remaining}
                />
              )}
              {showPredecessor &&
                (isActivity ? (
                  <PredecessorCell
                    activity={row}
                    allRows={allRows}
                    width={COL.predecessor}
                    onCommit={onCommitActivityField(row.id, 'predecessorId')}
                  />
                ) : (
                  <div style={{ width: COL.predecessor }} className="shrink-0 truncate px-2 text-slate-400">
                    {isMilestone ? (row.predecessor ?? '—') : '—'}
                  </div>
                ))}
              {showCritical && <CriticalCell critical={critical} width={COL.critical} />}
              {showFloat && (
                <FloatCell days={isActivity ? floatDays(row, allRows) : undefined} width={COL.float} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
