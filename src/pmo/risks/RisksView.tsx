import { useRef, useState } from 'react'
import type { RiskPatch, RiskRow } from './risksData'
import { MAX_RISK_VALUE, addRisk, initialRisks, removeRisk, riskValue, updateRisk } from './risksData'
import { RiskInspector } from './RiskInspector'

const SIMULATED_DELAY = 350

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Register + Add/Remove are structural row actions; 'new' | id opens the
// Inspector for field-level create/edit, which is what this task adds.
type InspectorTarget = 'new' | string | null

export function RisksView({
  onSaveStart,
  onSaveEnd,
}: {
  onSaveStart: () => void
  onSaveEnd: (success: boolean) => void
}) {
  const [risks, setRisks] = useState<RiskRow[]>(initialRisks)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [inspectorTarget, setInspectorTarget] = useState<InspectorTarget>(null)
  const riskSaveFailedOnce = useRef(false)

  const mutate = async (updater: (prev: RiskRow[]) => RiskRow[]) => {
    onSaveStart()
    await delay(SIMULATED_DELAY)
    setRisks((prev) => updater(prev))
    onSaveEnd(true)
  }

  const handleRemoveRisk = (id: string) => {
    void mutate((prev) => removeRisk(prev, id))
    setSelectedId((prev) => (prev === id ? null : prev))
  }

  const handleOpenAdd = () => setInspectorTarget('new')
  const handleOpenEdit = (id: string) => {
    setSelectedId(id)
    setInspectorTarget(id)
  }
  const handleCloseInspector = () => setInspectorTarget(null)

  // First Risk save in the session fails once — same deterministic
  // save-error/retry pattern used for every other editable surface here.
  const handleSaveRisk = async (patch: RiskPatch) => {
    onSaveStart()
    try {
      if (!riskSaveFailedOnce.current) {
        riskSaveFailedOnce.current = true
        await delay(SIMULATED_DELAY)
        onSaveEnd(false)
        throw new Error('Save failed')
      }
      await delay(SIMULATED_DELAY)
      if (inspectorTarget === 'new') {
        setRisks((prev) => addRisk(prev, patch))
      } else if (inspectorTarget) {
        setRisks((prev) => updateRisk(prev, inspectorTarget, patch))
      }
      onSaveEnd(true)
    } catch (err) {
      onSaveEnd(false)
      throw err
    }
  }

  const editingRisk = typeof inspectorTarget === 'string' ? (risks.find((r) => r.id === inspectorTarget) ?? null) : null

  return (
    <div className="relative flex h-full flex-col">
      {risks.length === 0 ? (
        // Zero Risks is a valid, unremarkable state — whether at least one is
        // mandatory is a business decision this view doesn't presume to make.
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <h2 className="text-sm font-semibold text-slate-700">No risks added</h2>
          <p className="max-w-sm text-xs text-slate-500">Risks recorded for this project will appear here as a register.</p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="mt-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            + Add Risk
          </button>
        </div>
      ) : (
        <>
          <div className="flex h-8 shrink-0 items-center border-b border-slate-200 px-2">
            <button
              type="button"
              onClick={handleOpenAdd}
              className="rounded border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
            >
              + Add Risk
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
              <div className="min-w-0 flex-1 px-2 py-1.5">Risk Name</div>
              <div className="w-28 shrink-0 px-2 py-1.5">Owner</div>
              <div className="w-16 shrink-0 px-2 py-1.5 text-center">Impact</div>
              <div className="w-20 shrink-0 px-2 py-1.5 text-center">Likelihood</div>
              <div className="w-28 shrink-0 px-2 py-1.5">Risk Value</div>
              <div className="w-56 shrink-0 px-2 py-1.5">Mitigation</div>
              <div className="w-10 shrink-0" />
            </div>

            {risks.map((risk) => {
              const value = riskValue(risk)
              const isSelected = risk.id === selectedId
              return (
                <div
                  key={risk.id}
                  onClick={() => setSelectedId(risk.id)}
                  onDoubleClick={() => handleOpenEdit(risk.id)}
                  className={`group flex cursor-default items-center border-b border-slate-100 text-xs transition-colors ${
                    isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-1 px-2 py-1.5">
                    <span className="min-w-0 flex-1 truncate text-slate-800">{risk.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenEdit(risk.id)
                      }}
                      title="Edit Risk"
                      className="hidden shrink-0 text-slate-400 hover:text-blue-600 group-hover:inline"
                    >
                      ⤢
                    </button>
                  </div>
                  <div className="w-28 shrink-0 truncate px-2 py-1.5 text-slate-600">{risk.owner ?? '—'}</div>
                  <div className="w-16 shrink-0 px-2 py-1.5 text-center text-slate-600">{risk.impact}</div>
                  <div className="w-20 shrink-0 px-2 py-1.5 text-center text-slate-600">{risk.likelihood}</div>
                  <div className="w-28 shrink-0 px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 shrink-0 text-right font-semibold text-slate-800">{value}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                        <span
                          className="block h-full rounded-full bg-blue-600"
                          style={{ width: `${(value / MAX_RISK_VALUE) * 100}%` }}
                        />
                      </span>
                    </div>
                  </div>
                  <div className="w-56 shrink-0 truncate px-2 py-1.5 text-slate-500" title={risk.mitigation}>
                    {risk.mitigation ?? <span className="italic text-slate-300">Not set</span>}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveRisk(risk.id)
                    }}
                    title="Remove risk"
                    className="hidden w-10 shrink-0 text-slate-300 hover:text-rose-600 group-hover:inline"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      {inspectorTarget && (
        <>
          <div className="absolute inset-0 z-20" onClick={handleCloseInspector} />
          <div className="absolute inset-y-0 right-0 z-30">
            <RiskInspector
              key={inspectorTarget === 'new' ? 'new' : editingRisk?.id}
              risk={editingRisk}
              onSave={handleSaveRisk}
              onClose={handleCloseInspector}
            />
          </div>
        </>
      )}
    </div>
  )
}
