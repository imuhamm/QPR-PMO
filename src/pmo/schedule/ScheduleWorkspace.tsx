import { useCallback, useMemo, useRef, useState } from 'react'
import type { UIEvent } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import {
  addActivity,
  addMilestone,
  addPhase,
  cascadeReschedule,
  computeDateRange,
  getPhaseActualRange,
  getPhaseBaselineRange,
  getPhaseDateRange,
  isPhaseRow,
  MOCK_CURRENT_USER,
  MOCK_TODAY,
  moveChildBefore,
  movePhaseBefore,
  removePhase,
  renameMilestone,
  renamePhase,
  updateActivityField,
  updateMilestoneDate,
} from './scheduleData'
import type {
  ActivityRow,
  DerivedRange,
  DisplayRow,
  OptionalColumnKey,
  PendingActivityPatch,
  ScheduleRow,
} from './scheduleData'
import { ScheduleGrid } from './ScheduleGrid'
import { GanttChart } from './GanttChart'
import type { Granularity } from './GanttChart'
import { ScheduleToolbar } from './ScheduleToolbar'
import { ActivityDetailsPanel } from './ActivityDetailsPanel'
import { UpdateProgressMode } from './UpdateProgressMode'
import type { ChangeRequestDraft } from '../shared/ChangeRequestPanel'
import type { SubmittedChangeRequest } from '../shared/changeRequestStore'
import { diffActivityPatch } from './activityHistory'
import type { ActivityHistoryEntry } from './activityHistory'

const ROW_HEIGHT = 26
const MIN_GRID_WIDTH = 400
const MAX_GRID_WIDTH = 900
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
  updateProgressMode,
  setUpdateProgressMode,
  previousStatusDate,
  onProgressSaved,
  locked,
  onRequestChange,
  submittedCRs,
  onWithdrawCR,
  onViewCR,
  activityHistory,
  onRecordHistory,
  onSaveStart,
  onSaveEnd,
}: {
  rows: ScheduleRow[]
  setRows: Dispatch<SetStateAction<ScheduleRow[]>>
  selectedId: string | null
  setSelectedId: Dispatch<SetStateAction<string | null>>
  updateProgressMode: boolean
  setUpdateProgressMode: Dispatch<SetStateAction<boolean>>
  /** The Project's current "Last Progress Update" — passed through to Update Progress Mode for display only. */
  previousStatusDate?: string
  /** Fired once the batch save commits, so the Project's "Last Progress Update" can move to the confirmed Status Date. */
  onProgressSaved?: (statusDate: string) => void
  /** No baseline exists until a Project is approved — Baseline Start/Finish/Milestone Date cells render as a plain, non-interactive placeholder instead of a Change-Request-protected value while this is false. */
  locked: boolean
  /** A protected baseline cell's "Request Change" trigger — opens the Change Request panel one level up, in ProjectWorkspace. */
  onRequestChange: (draft: ChangeRequestDraft) => void
  /** Every submitted CR — forwarded to the grid and Activity Details panel so each protected cell can look up its own pending state. */
  submittedCRs: SubmittedChangeRequest[]
  onWithdrawCR: (reference: string) => void
  onViewCR: (reference: string) => void
  /** Every Activity's operational-field history — lifted to ProjectWorkspace (like `rows`) so it survives switching away from Schedule and back. */
  activityHistory: ActivityHistoryEntry[]
  onRecordHistory: (entries: ActivityHistoryEntry[]) => void
  onSaveStart: () => void
  onSaveEnd: (success: boolean) => void
}) {
  const [gridWidth, setGridWidth] = useState(520)
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set())
  const [granularity, setGranularity] = useState<Granularity>('month')
  const [visibleColumns, setVisibleColumns] = useState<Set<OptionalColumnKey>>(new Set())
  // Routine progress edits (Status, % Complete, Actual Start/Finish, Forecast
  // Finish) stage here instead of committing per-keystroke — a PM working
  // through several Activities shouldn't get a save round-trip per field.
  // Nothing here is a Change Request; it's just an unsaved draft over `rows`.
  const [pendingEdits, setPendingEdits] = useState<Record<string, PendingActivityPatch>>({})
  const [savingEdits, setSavingEdits] = useState(false)
  const [justRescheduledIds, setJustRescheduledIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{
    message: string
    variant: 'success' | 'error'
    onUndo?: () => void
  } | null>(null)
  const toastTimeoutRef = useRef<number | null>(null)

  // Owner's / a Milestone's first-ever save attempt in the session fails
  // once, to demonstrate the save-error/retry state without disrupting
  // rapid entry.
  const ownerFailedOnce = useRef(false)
  const milestoneDateFailedOnce = useRef(false)

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

  const phaseBaselineDates = useMemo(() => {
    const map: Record<string, DerivedRange | null> = {}
    for (const row of rows) {
      if (isPhaseRow(row)) map[row.id] = getPhaseBaselineRange(row.id, rows)
    }
    return map
  }, [rows])

  const phaseActualDates = useMemo(() => {
    const map: Record<string, DerivedRange | null> = {}
    for (const row of rows) {
      if (isPhaseRow(row)) map[row.id] = getPhaseActualRange(row.id, rows)
    }
    return map
  }, [rows])

  const toggleColumn = useCallback((key: OptionalColumnKey) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

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

  // Central path for a Gantt drag's date change — the grid/panel's Forecast
  // Finish edits go through the batched pendingEdits flow below instead
  // (see saveEdits), but a bar drag is a single deliberate real-time action,
  // so it still commits immediately and still needs the same
  // Finish-to-Start cascade check a Forecast Finish edit would trigger. Only
  // a change to `end` can push a dependent out of compliance, so a patch
  // that doesn't touch it skips cascade entirely. Returns false if the whole
  // transaction (including the initiating change) was rejected.
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

  // Owner and Predecessor stay on the existing immediate-commit path — only
  // the routine progress-tracking fields (Status, % Complete, Actual
  // Start/Finish, Forecast Finish) moved to the batched pendingEdits flow
  // below. Forecast Finish's cascade-on-drag from the Gantt is also
  // untouched — see handleRescheduleActivity, which calls
  // applyActivityChangeWithCascade directly.
  const handleCommitActivityField = useCallback(
    (id: string, key: 'owner' | 'predecessorId') => async (value: string) => {
      onSaveStart()
      try {
        if (key === 'owner' && !ownerFailedOnce.current) {
          ownerFailedOnce.current = true
          await delay(SIMULATED_DELAY)
          onSaveEnd(false)
          throw new Error('Save failed')
        }
        await delay(SIMULATED_DELAY)
        setRows((prev) => updateActivityField(prev, id, { [key]: value || undefined } as Partial<ActivityRow>))
        onSaveEnd(true)
      } catch (err) {
        onSaveEnd(false)
        throw err
      }
    },
    [onSaveStart, onSaveEnd],
  )

  const updateDraft = useCallback((id: string, patch: PendingActivityPatch) => {
    setPendingEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }, [])

  // No id = discard everything (the grid bar's "Discard"); an id scopes it
  // to one Activity (the details panel's "Cancel").
  const discardEdits = useCallback((id?: string) => {
    setPendingEdits((prev) => {
      if (!id) return {}
      if (!(id in prev)) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  // Single-pass batch commit: applies every targeted row's patch to one
  // snapshot of `rows`, running the same Finish-to-Start cascade a direct
  // Forecast Finish edit would trigger for each Activity whose `end`
  // actually changed — so committing several edits together can still
  // ripple to a dependent exactly like a single Forecast Finish edit would.
  // No ids = commit everything pending (the grid bar's "Save Updates"); a
  // one-item list scopes it to a single Activity (the panel's "Save
  // Update"). Every committed Activity gets its audit fields stamped, even
  // if the patch only touched Update Notes. statusDate lets Update Progress
  // Mode's confirmed Status Date stand in for "today" as the stamped
  // lastUpdatedDate — every other caller keeps defaulting to MOCK_TODAY.
  const saveEdits = useCallback(
    (ids?: string[], statusDate?: string) => {
      const targetIds = ids ?? Object.keys(pendingEdits)
      if (targetIds.length === 0) return
      const edits = pendingEdits
      const previousRows = rows
      setSavingEdits(true)
      onSaveStart()
      void (async () => {
        await delay(SIMULATED_DELAY)
        let next = rows
        const touchedIds = new Set<string>()
        const timestamp = statusDate ?? MOCK_TODAY
        const newHistoryEntries: ActivityHistoryEntry[] = []
        for (const id of targetIds) {
          const patch = edits[id]
          const current = next.find((r) => r.id === id)
          if (!patch || !current || current.kind !== 'activity') continue
          // Diffed against the pre-commit row — has to run before
          // updateActivityField below overwrites it, or every field would
          // compare against its own new value.
          newHistoryEntries.push(...diffActivityPatch(id, current, patch, MOCK_CURRENT_USER, timestamp))
          const endChanged = 'end' in patch && patch.end !== current.end
          next = updateActivityField(next, id, {
            ...patch,
            lastUpdatedBy: MOCK_CURRENT_USER,
            lastUpdatedDate: timestamp,
          })
          touchedIds.add(id)
          if (endChanged) {
            const outcome = cascadeReschedule(next, id)
            if (outcome.ok) {
              next = outcome.rows
              outcome.changedIds.forEach((changedId) => touchedIds.add(changedId))
            }
          }
        }
        setRows(next)
        if (newHistoryEntries.length > 0) onRecordHistory(newHistoryEntries)
        setPendingEdits((prev) => {
          const rest = { ...prev }
          targetIds.forEach((id) => delete rest[id])
          return rest
        })
        setSavingEdits(false)
        flashSaved([...touchedIds])
        onSaveEnd(true)
        showToast(`${targetIds.length} ${targetIds.length === 1 ? 'activity' : 'activities'} updated`, () => {
          void mutate(() => previousRows)
        })
      })()
    },
    [pendingEdits, rows, onSaveStart, onSaveEnd, flashSaved, showToast, mutate, onRecordHistory],
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

  // The Activity Details panel is just another surface writing into the
  // same pendingEdits draft as the grid (see updateDraft/saveEdits/
  // discardEdits) — its own Save Update / Cancel just scope those same
  // functions to the one selected Activity, then deselect to close.
  const handlePanelSave = useCallback(
    (id: string) => {
      saveEdits([id])
      setSelectedId(null)
    },
    [saveEdits],
  )
  const handlePanelCancel = useCallback(
    (id: string) => {
      discardEdits(id)
      setSelectedId(null)
    },
    [discardEdits],
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

  // The panel is driven purely by grid/Gantt row selection — no separate
  // open/close state. Selecting a Phase, a Milestone, or nothing hides it;
  // selecting an Activity (in either pane) shows/retargets it.
  const selectedActivity = rows.find((r): r is ActivityRow => r.id === selectedId && r.kind === 'activity')
  const selectedPhaseName = selectedActivity
    ? (rows.find((r) => r.id === selectedActivity.parentId)?.name ?? '—')
    : ''

  const pendingCount = Object.keys(pendingEdits).length

  const handleProgressSave = useCallback(
    (statusDate: string) => {
      saveEdits(undefined, statusDate)
      setUpdateProgressMode(false)
      onProgressSaved?.(statusDate)
    },
    [saveEdits, setUpdateProgressMode, onProgressSaved],
  )

  // A focused, single-pane alternative to the grid+Gantt below — entered via
  // the Project header's "Update Progress" button — so it fully replaces
  // this canvas rather than overlaying it. It reads/writes the exact same
  // pendingEdits draft as the grid and the Activity Details panel.
  if (updateProgressMode) {
    return (
      <UpdateProgressMode
        rows={rows}
        pendingEdits={pendingEdits}
        onUpdateDraft={updateDraft}
        onCancel={() => setUpdateProgressMode(false)}
        onSave={handleProgressSave}
        saving={savingEdits}
        previousStatusDate={previousStatusDate}
      />
    )
  }

  return (
    <div className="flex h-full flex-col">
      <ScheduleToolbar
        granularity={granularity}
        onGranularityChange={setGranularity}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        onAddPhase={handleAddPhase}
        locked={locked}
        visibleColumns={visibleColumns}
        onToggleColumn={toggleColumn}
      />

      {pendingCount > 0 && (
        <div className="flex h-7 shrink-0 items-center justify-between border-b border-amber-200 bg-amber-50 px-2.5 text-[11px]">
          <span className="font-medium text-amber-800">
            {pendingCount} {pendingCount === 1 ? 'activity' : 'activities'} with unsaved changes
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => discardEdits()}
              disabled={savingEdits}
              className="font-medium text-slate-600 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => saveEdits()}
              disabled={savingEdits}
              className="rounded bg-blue-600 px-2.5 py-0.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingEdits ? 'Saving…' : 'Save Updates'}
            </button>
          </div>
        </div>
      )}

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
          phaseBaselineDates={phaseBaselineDates}
          phaseActualDates={phaseActualDates}
          childCounts={childCounts}
          visibleColumns={visibleColumns}
          pendingEdits={pendingEdits}
          onUpdateDraft={updateDraft}
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
          justRescheduledIds={justRescheduledIds}
          locked={locked}
          onRequestChange={onRequestChange}
          submittedCRs={submittedCRs}
          onWithdrawCR={onWithdrawCR}
          onViewCR={onViewCR}
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

        {selectedActivity && (
          // No backdrop here on purpose — unlike the old Inspector, this
          // panel is driven by selection, so the grid/Gantt underneath must
          // stay clickable (selecting a different Activity should just
          // retarget the panel, not require closing it first).
          <div className="absolute inset-y-0 right-0 z-30">
            <ActivityDetailsPanel
              key={selectedActivity.id}
              activity={selectedActivity}
              rows={rows}
              phaseName={selectedPhaseName}
              draft={pendingEdits[selectedActivity.id]}
              onUpdateDraft={(patch) => updateDraft(selectedActivity.id, patch)}
              onSave={() => handlePanelSave(selectedActivity.id)}
              onCancel={() => handlePanelCancel(selectedActivity.id)}
              saving={savingEdits}
              locked={locked}
              onRequestChange={onRequestChange}
              submittedCRs={submittedCRs}
              onWithdrawCR={onWithdrawCR}
              onViewCR={onViewCR}
              history={activityHistory.filter((h) => h.activityId === selectedActivity.id)}
            />
          </div>
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
