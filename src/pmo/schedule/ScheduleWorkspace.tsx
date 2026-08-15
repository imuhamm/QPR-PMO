import { useCallback, useMemo, useRef, useState } from 'react'
import type { UIEvent } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import {
  addActivity,
  addMilestone,
  addPhase,
  cascadeReschedule,
  computeDateRange,
  getPhaseDateRange,
  isPhaseRow,
  moveChildBefore,
  movePhaseBefore,
  removePhase,
  renameMilestone,
  renamePhase,
  updateActivityField,
  updateMilestoneDate,
} from './scheduleData'
import type { ActivityRow, DerivedRange, DisplayRow, ScheduleRow } from './scheduleData'
import { ScheduleGrid } from './ScheduleGrid'
import { GanttChart } from './GanttChart'
import type { Granularity } from './GanttChart'
import { ScheduleToolbar } from './ScheduleToolbar'
import { ActivityInspector } from './ActivityInspector'
import type { ActivityPatch } from './ActivityInspector'

const ROW_HEIGHT = 26
const MIN_GRID_WIDTH = 400
const MAX_GRID_WIDTH = 760
const SIMULATED_DELAY = 350

const PX_PER_DAY: Record<Granularity, number> = {
  week: 20,
  month: 8,
  quarter: 3,
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// rows/selectedId are lifted to the shell — Resources reads the same
// Activities, and "navigate to Schedule" needs a target to select — plus it
// means Schedule's edits now survive switching to another view and back.
export function ScheduleWorkspace({
  rows,
  setRows,
  selectedId,
  setSelectedId,
  onSaveStart,
  onSaveEnd,
}: {
  rows: ScheduleRow[]
  setRows: Dispatch<SetStateAction<ScheduleRow[]>>
  selectedId: string | null
  setSelectedId: Dispatch<SetStateAction<string | null>>
  onSaveStart: () => void
  onSaveEnd: (success: boolean) => void
}) {
  const [gridWidth, setGridWidth] = useState(520)
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set())
  const [granularity, setGranularity] = useState<Granularity>('month')
  const [inspectorActivityId, setInspectorActivityId] = useState<string | null>(null)
  const [justRescheduledIds, setJustRescheduledIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{
    message: string
    variant: 'success' | 'error'
    onUndo?: () => void
  } | null>(null)
  const toastTimeoutRef = useRef<number | null>(null)

  // Owner's / a Milestone's / the Inspector's first-ever save attempt in the
  // session fails once, to demonstrate the save-error/retry state without
  // disrupting rapid entry.
  const ownerFailedOnce = useRef(false)
  const milestoneDateFailedOnce = useRef(false)
  const inspectorSaveFailedOnce = useRef(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const gridScrollRef = useRef<HTMLDivElement>(null)
  const ganttScrollRef = useRef<HTMLDivElement>(null)
  const syncingRef = useRef(false)
  const draggingRef = useRef(false)

  const dateRange = useMemo(() => computeDateRange(rows), [rows])

  const phaseDates = useMemo(() => {
    const map: Record<string, DerivedRange | null> = {}
    for (const row of rows) {
      if (isPhaseRow(row)) map[row.id] = getPhaseDateRange(row.id, rows)
    }
    return map
  }, [rows])

  const childCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const row of rows) {
      if (row.parentId) map[row.parentId] = (map[row.parentId] ?? 0) + 1
    }
    return map
  }, [rows])

  // Same array both panes render from, so the grid row and Gantt lane can
  // never drift out of sync — collapse/empty-state/add-row logic lives here once.
  const visibleRows = useMemo<DisplayRow[]>(() => {
    const result: DisplayRow[] = []
    for (const row of rows) {
      if (!isPhaseRow(row)) continue
      result.push(row)
      if (collapsedPhases.has(row.id)) continue
      const children = rows.filter((r) => r.parentId === row.id)
      result.push(...children)
      result.push({ kind: 'add-row', id: `${row.id}-add`, level: 1, parentId: row.id, isEmpty: children.length === 0 })
    }
    return result
  }, [rows, collapsedPhases])

  const mutate = useCallback(
    async (updater: (rows: ScheduleRow[]) => ScheduleRow[]) => {
      onSaveStart()
      await delay(SIMULATED_DELAY)
      setRows((prev) => updater(prev))
      onSaveEnd(true)
    },
    [onSaveStart, onSaveEnd],
  )

  const handleAddPhase = useCallback(() => {
    void mutate((prev) => {
      const { rows: next, newId } = addPhase(prev)
      setSelectedId(newId)
      return next
    })
  }, [mutate])

  const handleRenamePhase = useCallback(
    (id: string, name: string) => {
      void mutate((prev) => renamePhase(prev, id, name))
    },
    [mutate],
  )

  const handleRemovePhase = useCallback(
    (id: string) => {
      void mutate((prev) => removePhase(prev, id))
      setSelectedId((prev) => (prev === id ? null : prev))
    },
    [mutate],
  )

  const handleReorderPhase = useCallback(
    (draggedId: string, targetId: string) => {
      void mutate((prev) => movePhaseBefore(prev, draggedId, targetId))
    },
    [mutate],
  )

  // Fire-and-forget by design: creation must not block the next keystroke,
  // so rapid sequential Activity entry stays fluid.
  const handleCreateActivity = useCallback(
    (phaseId: string, name: string) => {
      void mutate((prev) => addActivity(prev, phaseId, name))
    },
    [mutate],
  )

  const showToast = useCallback((message: string, onUndo: () => void) => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current)
    setToast({ message, variant: 'success', onUndo })
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 5000)
  }, [])

  const showErrorToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current)
    setToast({ message, variant: 'error' })
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 6000)
  }, [])

  const flashSaved = useCallback((ids: string[]) => {
    const idSet = new Set(ids)
    setJustRescheduledIds(idSet)
    window.setTimeout(() => setJustRescheduledIds((cur) => (cur === idSet ? new Set() : cur)), 1000)
  }, [])

  // Central path for any Activity date change (grid Finish cell, Inspector
  // Save, or Gantt drag) — reused so a Finish move always gets the same
  // Finish-to-Start cascade check regardless of which surface triggered it.
  // Only a change to `end` can push a dependent out of compliance, so a
  // patch that doesn't touch it skips cascade entirely. Returns false if the
  // whole transaction (including the initiating change) was rejected.
  const applyActivityChangeWithCascade = useCallback(
    (
      id: string,
      patch: Partial<Pick<ActivityRow, 'name' | 'owner' | 'start' | 'end' | 'predecessorId'>>,
      successMessage: string,
    ): boolean => {
      const current = rows.find((r) => r.id === id)
      if (!current || current.kind !== 'activity') return true

      const previousForInitiator = { start: current.start, end: current.end }
      const patchedRows = updateActivityField(rows, id, patch)
      const endChanged = 'end' in patch && patch.end !== current.end

      if (!endChanged) {
        setRows(patchedRows)
        flashSaved([id])
        showToast(successMessage, () => {
          void mutate((prev) => updateActivityField(prev, id, previousForInitiator))
        })
        return true
      }

      const outcome = cascadeReschedule(patchedRows, id)
      if (!outcome.ok) {
        showErrorToast(outcome.reason)
        return false
      }

      const allChangedIds = [id, ...outcome.changedIds]
      const allPrevious: Record<string, { start?: string; end?: string }> = {
        [id]: previousForInitiator,
        ...outcome.previousDates,
      }

      setRows(outcome.rows)
      flashSaved(allChangedIds)

      if (outcome.changedIds.length > 0) {
        showToast(`${allChangedIds.length} activities rescheduled due to dependency changes`, () => {
          void mutate((prev) => {
            let next = prev
            for (const changedId of allChangedIds) next = updateActivityField(next, changedId, allPrevious[changedId])
            return next
          })
        })
      } else {
        showToast(successMessage, () => {
          void mutate((prev) => updateActivityField(prev, id, previousForInitiator))
        })
      }
      return true
    },
    [rows, mutate, flashSaved, showToast, showErrorToast],
  )

  const handleCommitActivityField = useCallback(
    (id: string, key: 'owner' | 'start' | 'end' | 'predecessorId') => async (value: string) => {
      onSaveStart()
      try {
        if (key === 'owner' && !ownerFailedOnce.current) {
          ownerFailedOnce.current = true
          await delay(SIMULATED_DELAY)
          onSaveEnd(false)
          throw new Error('Save failed')
        }
        await delay(SIMULATED_DELAY)
        if (key === 'end') {
          const ok = applyActivityChangeWithCascade(id, { end: value || undefined }, 'Activity rescheduled')
          onSaveEnd(ok)
          if (!ok) throw new Error('Cascade rejected')
        } else {
          setRows((prev) => updateActivityField(prev, id, { [key]: value || undefined } as Partial<ActivityRow>))
          onSaveEnd(true)
        }
      } catch (err) {
        onSaveEnd(false)
        throw err
      }
    },
    [onSaveStart, onSaveEnd, applyActivityChangeWithCascade],
  )

  const handleCreateMilestone = useCallback(
    (phaseId: string, name: string) => {
      void mutate((prev) => addMilestone(prev, phaseId, name))
    },
    [mutate],
  )

  const handleRenameMilestone = useCallback(
    (id: string, name: string) => {
      void mutate((prev) => renameMilestone(prev, id, name))
    },
    [mutate],
  )

  const handleCommitMilestoneDate = useCallback(
    (id: string) => async (value: string) => {
      onSaveStart()
      try {
        if (!milestoneDateFailedOnce.current) {
          milestoneDateFailedOnce.current = true
          await delay(SIMULATED_DELAY)
          onSaveEnd(false)
          throw new Error('Save failed')
        }
        await delay(SIMULATED_DELAY)
        setRows((prev) => updateMilestoneDate(prev, id, value))
        onSaveEnd(true)
      } catch (err) {
        onSaveEnd(false)
        throw err
      }
    },
    [onSaveStart, onSaveEnd],
  )

  const handleReorderChild = useCallback(
    (draggedId: string, targetId: string) => {
      void mutate((prev) => moveChildBefore(prev, draggedId, targetId))
    },
    [mutate],
  )

  // Drag-to-reschedule from the Gantt goes through the same cascade-aware
  // path as the grid/Inspector — dragging is just another way to produce a
  // date patch, so it must trigger cascade the same way they do. The
  // "previous" snapshot from the drag itself isn't needed here — the
  // cascade path reads its own pre-change snapshot from current state.
  const handleRescheduleActivity = useCallback(
    (id: string, _previous: { start?: string; end?: string }, next: { start: string; end: string }) => {
      applyActivityChangeWithCascade(id, next, 'Activity rescheduled')
    },
    [applyActivityChangeWithCascade],
  )

  const handleRescheduleMilestone = useCallback(
    (id: string, previousDate: string | undefined, nextDate: string) => {
      void mutate((prev) => updateMilestoneDate(prev, id, nextDate))
      flashSaved([id])
      showToast('Milestone rescheduled', () => {
        void mutate((prev) => updateMilestoneDate(prev, id, previousDate ?? ''))
      })
    },
    [mutate, flashSaved, showToast],
  )

  // Gantt connectors reuse the same commit path as the grid's Predecessor
  // cell — same validation, same mutation, just triggered from the chart.
  const handleSetPredecessorFromGantt = useCallback(
    (dependentId: string, predecessorId: string) => {
      void handleCommitActivityField(dependentId, 'predecessorId')(predecessorId)
    },
    [handleCommitActivityField],
  )
  const handleRemovePredecessorFromGantt = useCallback(
    (dependentId: string) => {
      void handleCommitActivityField(dependentId, 'predecessorId')('')
    },
    [handleCommitActivityField],
  )

  const handleRenameActivity = useCallback(
    (id: string, name: string) => {
      void mutate((prev) => updateActivityField(prev, id, { name }))
    },
    [mutate],
  )

  const handleOpenInspector = useCallback((id: string) => setInspectorActivityId(id), [])
  const handleCloseInspector = useCallback(() => setInspectorActivityId(null), [])

  // The Inspector is a single atomic transaction — one Saving/Saved/Error
  // cycle for the whole panel, not per field. If the Finish it sent triggers
  // a cascade, that cascade rides along inside the same transaction.
  const handleInspectorSave = useCallback(
    async (id: string, patch: ActivityPatch) => {
      onSaveStart()
      try {
        if (!inspectorSaveFailedOnce.current) {
          inspectorSaveFailedOnce.current = true
          await delay(SIMULATED_DELAY)
          onSaveEnd(false)
          throw new Error('Save failed')
        }
        await delay(SIMULATED_DELAY)
        const ok = applyActivityChangeWithCascade(id, patch, 'Activity updated')
        onSaveEnd(ok)
        if (!ok) throw new Error('Cascade rejected')
      } catch (err) {
        onSaveEnd(false)
        throw err
      }
    },
    [onSaveStart, onSaveEnd, applyActivityChangeWithCascade],
  )

  const handleGridScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    if (syncingRef.current) {
      syncingRef.current = false
      return
    }
    syncingRef.current = true
    if (ganttScrollRef.current) ganttScrollRef.current.scrollTop = e.currentTarget.scrollTop
  }, [])

  const handleGanttScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    if (syncingRef.current) {
      syncingRef.current = false
      return
    }
    syncingRef.current = true
    if (gridScrollRef.current) gridScrollRef.current.scrollTop = e.currentTarget.scrollTop
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingRef.current || !containerRef.current) return
    const left = containerRef.current.getBoundingClientRect().left
    const next = e.clientX - left
    setGridWidth(Math.min(MAX_GRID_WIDTH, Math.max(MIN_GRID_WIDTH, next)))
  }, [])

  const handleMouseUp = useCallback(() => {
    draggingRef.current = false
    document.body.style.removeProperty('cursor')
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove])

  const handleMouseDown = useCallback(() => {
    draggingRef.current = true
    document.body.style.cursor = 'col-resize'
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove, handleMouseUp])

  const togglePhase = useCallback((id: string) => {
    setCollapsedPhases((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const expandAll = useCallback(() => setCollapsedPhases(new Set()), [])
  const collapseAll = useCallback(
    () => setCollapsedPhases(new Set(rows.filter(isPhaseRow).map((r) => r.id))),
    [rows],
  )

  const inspectorActivity = rows.find(
    (r): r is ActivityRow => r.id === inspectorActivityId && r.kind === 'activity',
  )
  const inspectorPhaseName = inspectorActivity
    ? (rows.find((r) => r.id === inspectorActivity.parentId)?.name ?? '—')
    : ''

  return (
    <div className="flex h-full flex-col">
      <ScheduleToolbar
        granularity={granularity}
        onGranularityChange={setGranularity}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        onAddPhase={handleAddPhase}
      />

      <div ref={containerRef} className="relative flex min-h-0 flex-1">
        <ScheduleGrid
          rows={visibleRows}
          allRows={rows}
          rowHeight={ROW_HEIGHT}
          width={gridWidth}
          scrollRef={gridScrollRef}
          onScroll={handleGridScroll}
          selectedId={selectedId}
          onSelectRow={setSelectedId}
          collapsedPhases={collapsedPhases}
          onTogglePhase={togglePhase}
          phaseDates={phaseDates}
          childCounts={childCounts}
          onRenamePhase={handleRenamePhase}
          onRemovePhase={handleRemovePhase}
          onReorderPhase={handleReorderPhase}
          onReorderChild={handleReorderChild}
          onCreateActivity={handleCreateActivity}
          onCommitActivityField={handleCommitActivityField}
          onCreateMilestone={handleCreateMilestone}
          onRenameMilestone={handleRenameMilestone}
          onCommitMilestoneDate={handleCommitMilestoneDate}
          onRenameActivity={handleRenameActivity}
          onOpenInspector={handleOpenInspector}
          justRescheduledIds={justRescheduledIds}
        />

        <div
          onMouseDown={handleMouseDown}
          role="separator"
          aria-orientation="vertical"
          title="Drag to resize"
          className="w-1 shrink-0 cursor-col-resize bg-slate-200 transition-colors hover:bg-blue-400 active:bg-blue-500"
        />

        <GanttChart
          rows={visibleRows}
          allRows={rows}
          minDate={dateRange.min}
          maxDate={dateRange.max}
          rowHeight={ROW_HEIGHT}
          pxPerDay={PX_PER_DAY[granularity]}
          granularity={granularity}
          scrollRef={ganttScrollRef}
          onScroll={handleGanttScroll}
          selectedId={selectedId}
          onSelectRow={setSelectedId}
          phaseDates={phaseDates}
          onSetPredecessor={handleSetPredecessorFromGantt}
          onRemovePredecessor={handleRemovePredecessorFromGantt}
          onRescheduleActivity={handleRescheduleActivity}
          onRescheduleMilestone={handleRescheduleMilestone}
          justRescheduledIds={justRescheduledIds}
        />

        {inspectorActivity && (
          <>
            <div className="absolute inset-0 z-20" onClick={handleCloseInspector} />
            <div className="absolute inset-y-0 right-0 z-30">
              <ActivityInspector
                key={inspectorActivity.id}
                activity={inspectorActivity}
                rows={rows}
                phaseName={inspectorPhaseName}
                onClose={handleCloseInspector}
                onSave={(patch) => handleInspectorSave(inspectorActivity.id, patch)}
              />
            </div>
          </>
        )}

        {toast && (
          <div
            className={`absolute bottom-3 right-3 z-40 flex items-center gap-3 rounded-md border px-3 py-2 text-xs shadow-lg ${
              toast.variant === 'error' ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'
            }`}
          >
            <span className={toast.variant === 'error' ? 'text-rose-700' : 'text-slate-700'}>{toast.message}</span>
            {toast.onUndo && (
              <button
                type="button"
                onClick={() => {
                  toast.onUndo?.()
                  setToast(null)
                }}
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                Undo
              </button>
            )}
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss"
              className={toast.variant === 'error' ? 'text-rose-400 hover:text-rose-600' : 'text-slate-400 hover:text-slate-600'}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
