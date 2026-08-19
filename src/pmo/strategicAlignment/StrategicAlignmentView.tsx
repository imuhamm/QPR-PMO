import { useCallback, useEffect, useRef, useState } from 'react'
import { mockKPIs, mockObjectives } from './strategicAlignmentData'
import type { StrategicAlignmentEntry } from './strategicAlignmentData'
import { useSourceList } from './useSourceList'
import { SourceSelector } from './SourceSelector'
import { SectionHeading, PropertyRow } from '../overview/PropertyRow'
import { SaveErrorNotice } from '../shared/validation/SaveErrorNotice'
import { BaselineValue } from '../shared/BaselineValue'
import type { ChangeRequestDraft } from '../shared/ChangeRequestPanel'
import { canWithdrawStatus, findPendingChangeRequest, pendingStatusLabel } from '../shared/changeRequestStore'
import type { SubmittedChangeRequest } from '../shared/changeRequestStore'
import { MOCK_CURRENT_USER } from '../schedule/scheduleData'

const AFFECTED_FIELD = 'Strategic Alignment'

const SOURCE_LOAD_DELAY = 700
const SAVE_DELAY = 500

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Held as a list capped at one entry by this prototype's UI, not by the data
// shape — whether multiple Objectives/KPIs are ever supported, and whether
// KPI options should filter by the chosen Objective, are both explicitly
// unconfirmed, so neither is assumed here.
export function StrategicAlignmentView({
  initialAlignments,
  locked,
  onRequestChange,
  submittedCRs,
  onWithdrawCR,
  onViewCR,
  onSaveStart,
  onSaveEnd,
}: {
  /** Supplied by the page (ProjectDetailsShell/DraftProjectShell via ProjectWorkspace) — Draft's demo starts with a real entry (Strategic Alignment is mandatory at creation, see CreateProjectModal), Approved's stays empty exactly as it always was. */
  initialAlignments: StrategicAlignmentEntry[]
  locked: boolean
  onRequestChange: (draft: ChangeRequestDraft) => void
  submittedCRs: SubmittedChangeRequest[]
  onWithdrawCR: (reference: string) => void
  onViewCR: (reference: string) => void
  onSaveStart: () => void
  onSaveEnd: (success: boolean) => void
}) {
  const [alignments, setAlignments] = useState<StrategicAlignmentEntry[]>(initialAlignments)
  const [formOpen, setFormOpen] = useState(false)
  const [draftObjectiveIds, setDraftObjectiveIds] = useState<string[]>([])
  const [draftKpiIds, setDraftKpiIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const objectivesFailedOnce = useRef(false)
  const kpisFailedOnce = useRef(false)
  const saveFailedOnce = useRef(false)

  const loadObjectives = useCallback(async () => {
    await delay(SOURCE_LOAD_DELAY)
    if (!objectivesFailedOnce.current) {
      objectivesFailedOnce.current = true
      throw new Error("Couldn't load Strategic Objectives from QPR Metrics")
    }
    return mockObjectives
  }, [])

  const loadKPIs = useCallback(async () => {
    await delay(SOURCE_LOAD_DELAY)
    if (!kpisFailedOnce.current) {
      kpisFailedOnce.current = true
      throw new Error("Couldn't load KPIs from QPR Metrics")
    }
    return mockKPIs
  }, [])

  const objectivesList = useSourceList(loadObjectives)
  const kpisList = useSourceList(loadKPIs)

  useEffect(() => {
    objectivesList.load()
    kpisList.load()
    // Fire once on mount — both loaders are stable (useCallback with no deps).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentEntry = alignments[0] ?? null
  const objectives = currentEntry ? objectivesList.items.filter((i) => currentEntry.objectiveIds.includes(i.id)) : []
  const kpis = currentEntry ? kpisList.items.filter((i) => currentEntry.kpiIds.includes(i.id)) : []

  // Objectives and KPIs are edited together as one record (see
  // StrategicAlignmentEntry) — locking treats them as the single mandatory
  // field they already are, rather than splitting into two independent
  // Change Requests for what's always one Edit action.
  const currentApprovedSummary = currentEntry
    ? `Objectives: ${objectives.map((o) => o.code).join(', ') || '—'} · KPIs: ${kpis.map((k) => k.code).join(', ') || '—'}`
    : 'Not set'
  const pendingCR = findPendingChangeRequest(submittedCRs, undefined, AFFECTED_FIELD)
  const pendingInfo = pendingCR
    ? {
        reference: pendingCR.reference,
        proposedDisplay: pendingCR.proposedDisplay,
        statusLabel: pendingStatusLabel(pendingCR.status),
        canWithdraw: pendingCR.requestedBy === MOCK_CURRENT_USER && canWithdrawStatus(pendingCR.status),
      }
    : undefined
  const requestAlignmentChange = () =>
    onRequestChange({
      affectedEntity: 'Project Details',
      affectedField: AFFECTED_FIELD,
      currentApproved: currentApprovedSummary,
      fieldType: 'text',
    })

  const openAdd = () => {
    setDraftObjectiveIds([])
    setDraftKpiIds([])
    setSaveError(null)
    setFormOpen(true)
  }

  const openEdit = () => {
    setDraftObjectiveIds(currentEntry?.objectiveIds ?? [])
    setDraftKpiIds(currentEntry?.kpiIds ?? [])
    setSaveError(null)
    setFormOpen(true)
  }

  const closeForm = () => setFormOpen(false)

  const handleSave = async () => {
    if (draftObjectiveIds.length === 0 || draftKpiIds.length === 0) return
    setSaving(true)
    setSaveError(null)
    onSaveStart()
    try {
      if (!saveFailedOnce.current) {
        saveFailedOnce.current = true
        await delay(SAVE_DELAY)
        onSaveEnd(false)
        throw new Error("Couldn't save Strategic Alignment")
      }
      await delay(SAVE_DELAY)
      setAlignments([
        { id: currentEntry?.id ?? `alignment-${Date.now()}`, objectiveIds: draftObjectiveIds, kpiIds: draftKpiIds },
      ])
      onSaveEnd(true)
      setFormOpen(false)
    } catch (err) {
      onSaveEnd(false)
      setSaveError(err instanceof Error ? err.message : "Couldn't save changes")
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    onSaveStart()
    await delay(SAVE_DELAY)
    setAlignments([])
    onSaveEnd(true)
  }

  const sourceDataLoading =
    objectivesList.status === 'idle' ||
    objectivesList.status === 'loading' ||
    kpisList.status === 'idle' ||
    kpisList.status === 'loading'
  const sourceDataError = objectivesList.status === 'error' || kpisList.status === 'error'

  if (sourceDataLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
        <span className="text-xs text-slate-400">Loading Strategic Objectives and KPIs from QPR Metrics…</span>
      </div>
    )
  }

  if (sourceDataError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <h2 className="text-sm font-semibold text-rose-700">Couldn't load source data</h2>
        <p className="max-w-sm text-xs text-slate-500">
          {objectivesList.error ?? kpisList.error ?? 'Something went wrong loading data from QPR Metrics.'}
        </p>
        <button
          type="button"
          onClick={() => {
            if (objectivesList.status === 'error') objectivesList.load()
            if (kpisList.status === 'error') kpisList.load()
          }}
          className="mt-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (formOpen) {
    return (
      <div className="h-full overflow-y-auto px-4 py-3">
        <SectionHeading title="Strategic Alignment" />
        <div className="rounded border border-blue-300 ring-1 ring-blue-100">
          <div className="border-b border-slate-100 bg-blue-50/50 px-2 py-1.5 text-[11px] font-semibold text-slate-600">
            {currentEntry ? 'Edit Strategic Alignment' : 'Add Strategic Alignment'}
          </div>
          <div className="space-y-2 px-2 py-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-500">Strategic Objectives</label>
              <SourceSelector
                status={objectivesList.status}
                items={objectivesList.items}
                error={objectivesList.error}
                onRetry={objectivesList.load}
                value={draftObjectiveIds}
                onChange={setDraftObjectiveIds}
                placeholder="Select Strategic Objectives…"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-500">KPIs</label>
              <SourceSelector
                status={kpisList.status}
                items={kpisList.items}
                error={kpisList.error}
                onRetry={kpisList.load}
                value={draftKpiIds}
                onChange={setDraftKpiIds}
                placeholder="Select KPIs…"
              />
            </div>
          </div>

          {saveError && (
            <div className="mx-2 mb-2">
              <SaveErrorNotice message={saveError} onRetry={handleSave} />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-2 py-1.5">
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || draftObjectiveIds.length === 0 || draftKpiIds.length === 0}
              className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!currentEntry) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <h2 className="text-sm font-semibold text-slate-700">No Strategic Alignment configured</h2>
        <p className="max-w-sm text-xs text-slate-500">
          Connect this Project to an organizational Strategic Objective and the KPI used to measure it, sourced
          from QPR Metrics.
        </p>
        {locked ? (
          <div className="mt-1">
            <BaselineValue
              triggerClassName="rounded border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
              onRequestChange={requestAlignmentChange}
              pending={pendingInfo}
              onWithdraw={() => pendingCR && onWithdrawCR(pendingCR.reference)}
              onViewCR={() => pendingCR && onViewCR(pendingCR.reference)}
            >
              Add Strategic Alignment
            </BaselineValue>
          </div>
        ) : (
          <button
            type="button"
            onClick={openAdd}
            className="mt-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            + Add Strategic Alignment
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-3">
      <SectionHeading title="Strategic Alignment" />
      <div className="rounded border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-2 py-1.5">
          <span className="text-[11px] font-semibold text-slate-600">Strategic Alignment</span>
          {locked ? (
            <BaselineValue
              triggerClassName="text-[11px] font-medium text-slate-500"
              panelAlign="right"
              onRequestChange={requestAlignmentChange}
              pending={pendingInfo}
              onWithdraw={() => pendingCR && onWithdrawCR(pendingCR.reference)}
              onViewCR={() => pendingCR && onViewCR(pendingCR.reference)}
            >
              Locked
            </BaselineValue>
          ) : (
            <div className="flex items-center gap-3 text-[11px] font-medium">
              <button type="button" onClick={openEdit} className="text-blue-600 hover:text-blue-700">
                Edit
              </button>
              <button type="button" onClick={handleRemove} className="text-rose-600 hover:text-rose-700">
                Remove
              </button>
            </div>
          )}
        </div>
        <div className="px-2">
          <PropertyRow label={`Strategic Objective${objectives.length === 1 ? '' : 's'}`}>
            <div className="space-y-1.5">
              {objectives.map((o) => (
                <div key={o.id}>
                  <div className="text-xs text-slate-800">
                    <span className="font-medium">{o.code}</span> · {o.name}
                  </div>
                  {o.context && <div className="text-[11px] text-slate-400">{o.context}</div>}
                </div>
              ))}
            </div>
          </PropertyRow>
          <PropertyRow label={`KPI${kpis.length === 1 ? '' : 's'}`}>
            <div className="space-y-1.5">
              {kpis.map((k) => (
                <div key={k.id}>
                  <div className="text-xs text-slate-800">
                    <span className="font-medium">{k.code}</span> · {k.name}
                  </div>
                  {k.context && <div className="text-[11px] text-slate-400">{k.context}</div>}
                </div>
              ))}
            </div>
          </PropertyRow>
        </div>
      </div>
    </div>
  )
}
