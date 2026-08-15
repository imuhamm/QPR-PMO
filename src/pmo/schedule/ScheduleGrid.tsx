import { useState } from 'react'
import type { UIEvent } from 'react'
import type { ActivityRow, DerivedRange, DisplayRow, ScheduleRow } from './scheduleData'
import { getPredecessorMismatch } from './scheduleData'
import type { CellSaveStatus } from './useInlineCellSave'
import { useInlineCellSave } from './useInlineCellSave'
import { PredecessorEditor } from './PredecessorEditor'
import { InlineMessage } from '../shared/validation/InlineMessage'

const COL = { owner: 84, start: 68, finish: 68, duration: 58, predecessor: 72 }

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function StatusDot({ status, onRetry }: { status: CellSaveStatus; onRetry: () => void }) {
  if (status === 'idle') return null
  if (status === 'saving') return <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-500" />
  if (status === 'saved') return <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onRetry()
      }}
      title="Couldn't save — click to retry"
      className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500"
    />
  )
}

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

function DerivedDateCells({ range }: { range: DerivedRange | null }) {
  if (!range) {
    return (
      <>
        <div style={{ width: COL.start }} className="shrink-0 truncate px-2 text-slate-300">—</div>
        <div style={{ width: COL.finish }} className="shrink-0 truncate px-2 text-slate-300">—</div>
        <div style={{ width: COL.duration }} className="shrink-0 truncate px-2 text-slate-300">—</div>
      </>
    )
  }
  return (
    <>
      <div style={{ width: COL.start }} title="Derived from child Activities" className="shrink-0 cursor-default truncate px-2 italic text-slate-400">
        {fmtDate(range.start)}
      </div>
      <div style={{ width: COL.finish }} title="Derived from child Activities" className="shrink-0 cursor-default truncate px-2 italic text-slate-400">
        {fmtDate(range.end)}
      </div>
      <div style={{ width: COL.duration }} title="Derived from child Activities" className="shrink-0 cursor-default truncate px-2 italic text-slate-400">
        {range.durationDays}d
      </div>
    </>
  )
}

function InlineEditCell({
  value,
  width,
  type = 'text',
  onCommit,
  validate,
}: {
  value?: string
  width: number
  type?: 'text' | 'date'
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
        {value ? (type === 'date' ? fmtDate(value) : value) : '—'}
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
  onCreateActivity,
  onCreateMilestone,
}: {
  isEmpty: boolean
  level: number
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
        style={{ paddingLeft: 8 + level * 14 }}
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
    <div style={{ paddingLeft: 8 + level * 14 }} className="flex items-center gap-2 border-b border-slate-100 text-[11px] text-slate-400">
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
  childCounts,
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
  onOpenInspector,
  justRescheduledIds,
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
  childCounts: Record<string, number>
  onRenamePhase: (id: string, name: string) => void
  onRemovePhase: (id: string) => void
  onReorderPhase: (draggedId: string, targetId: string) => void
  onReorderChild: (draggedId: string, targetId: string) => void
  onCreateActivity: (phaseId: string, name: string) => void
  onCommitActivityField: (
    id: string,
    key: 'owner' | 'start' | 'end' | 'predecessorId',
  ) => (value: string) => Promise<void>
  onCreateMilestone: (phaseId: string, name: string) => void
  onRenameMilestone: (id: string, name: string) => void
  onCommitMilestoneDate: (id: string) => (value: string) => Promise<void>
  onRenameActivity: (id: string, name: string) => void
  onOpenInspector: (id: string) => void
  justRescheduledIds: Set<string>
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const draggedRow = rows.find((r) => r.id === draggingId)

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
      className="h-full shrink-0 overflow-y-auto overflow-x-hidden border-r border-slate-200"
    >
      <div
        style={{ height: rowHeight }}
        className="sticky top-0 z-10 flex items-center border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500"
      >
        <div className="min-w-0 flex-1 truncate px-2">Name</div>
        <div style={{ width: COL.owner }} className="shrink-0 truncate px-2">Owner</div>
        <div style={{ width: COL.start }} className="shrink-0 truncate px-2">Start</div>
        <div style={{ width: COL.finish }} className="shrink-0 truncate px-2">Finish</div>
        <div style={{ width: COL.duration }} className="shrink-0 truncate px-2">Duration</div>
        <div style={{ width: COL.predecessor }} className="shrink-0 truncate px-2">Pred.</div>
      </div>

      <div>
        {rows.map((row) => {
          if (row.kind === 'add-row') {
            return (
              <div key={row.id} style={{ height: rowHeight }}>
                <AddRow
                  isEmpty={row.isEmpty}
                  level={row.level}
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
              onDoubleClick={
                isActivity
                  ? () => {
                      onSelectRow(row.id)
                      onOpenInspector(row.id)
                    }
                  : undefined
              }
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
              }`}
            >
              <div
                className="flex min-w-0 flex-1 items-center gap-1 truncate px-2"
                style={{ paddingLeft: 8 + row.level * 14 }}
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

                {isActivity && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectRow(row.id)
                      onOpenInspector(row.id)
                    }}
                    title="Open activity details"
                    className="ml-1 hidden shrink-0 text-slate-400 hover:text-blue-600 group-hover:inline"
                  >
                    ⤢
                  </button>
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
                <DerivedDateCells range={phaseDates[row.id] ?? null} />
              ) : isActivity ? (
                <>
                  <InlineEditCell
                    value={row.start}
                    width={COL.start}
                    type="date"
                    onCommit={onCommitActivityField(row.id, 'start')}
                    validate={(next) => (next && row.end && next > row.end ? 'Start must be on or before Finish' : null)}
                  />
                  <InlineEditCell
                    value={row.end}
                    width={COL.finish}
                    type="date"
                    onCommit={onCommitActivityField(row.id, 'end')}
                    validate={(next) => (next && row.start && next < row.start ? 'Finish must be on or after Start' : null)}
                  />
                  <div style={{ width: COL.duration }} className="shrink-0 truncate px-2 text-slate-500">
                    {row.durationDays ? `${row.durationDays}d` : '—'}
                  </div>
                </>
              ) : (
                <>
                  {/* Milestone: a single Completion Date, mirrored into both columns
                      like MS Project's zero-duration convention. Editing either commits the same field. */}
                  <InlineEditCell
                    value={row.date}
                    width={COL.start}
                    type="date"
                    onCommit={onCommitMilestoneDate(row.id)}
                  />
                  <InlineEditCell
                    value={row.date}
                    width={COL.finish}
                    type="date"
                    onCommit={onCommitMilestoneDate(row.id)}
                  />
                  <div style={{ width: COL.duration }} className="shrink-0 truncate px-2 text-slate-400">—</div>
                </>
              )}

              {isActivity ? (
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
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
