import { useState } from 'react'
import type { RiskRow, RiskPatch } from './risksData'
import { OwnerPicker } from '../shared/OwnerPicker'
import { InlineMessage, RequiredMark } from '../shared/validation/InlineMessage'
import { SaveErrorNotice } from '../shared/validation/SaveErrorNotice'

function ScorePicker({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (v: number) => void
  label: string
}) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-pressed={value === n}
          className={`flex h-6 w-6 items-center justify-center rounded text-xs font-medium transition-colors ${
            value === n ? 'bg-blue-600 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

// A deliberate multi-field transaction, same shape as Schedule's Activity
// Inspector: nothing commits until Save. Risk Value is never an input — it's
// always Impact × Likelihood, computed live from the draft as you pick.
export function RiskInspector({
  risk,
  onSave,
  onClose,
}: {
  risk: RiskRow | null
  onSave: (patch: RiskPatch) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(risk?.name ?? '')
  const [description, setDescription] = useState(risk?.description ?? '')
  const [owner, setOwner] = useState(risk?.owner ?? '')
  const [impact, setImpact] = useState(risk?.impact ?? 1)
  const [likelihood, setLikelihood] = useState(risk?.likelihood ?? 1)
  const [mitigation, setMitigation] = useState(risk?.mitigation ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = risk !== null
  const nameInvalid = name.trim() === ''
  const riskValueLive = impact * likelihood

  const handleSave = async () => {
    if (nameInvalid) return
    setSaving(true)
    setError(null)
    try {
      await onSave({
        name: name.trim(),
        description: description || undefined,
        owner: owner || undefined,
        impact,
        likelihood,
        mitigation: mitigation || undefined,
      })
      onClose()
    } catch {
      setError("Couldn't save changes")
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {isEditing ? 'Edit Risk' : 'Add Risk'}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-3 p-3">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-500">
            Risk Name<RequiredMark />
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full rounded border bg-white px-2 py-1 text-xs text-slate-800 outline-none ${
              nameInvalid ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-200'
            }`}
          />
          {nameInvalid && <InlineMessage severity="field-error">Required</InlineMessage>}
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-500">Description</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full resize-none rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-500">Owner</label>
          <OwnerPicker value={owner} onChange={setOwner} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Impact</label>
            <ScorePicker value={impact} onChange={setImpact} label="Impact" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Likelihood</label>
            <ScorePicker value={likelihood} onChange={setLikelihood} label="Likelihood" />
          </div>
        </div>

        <div className="rounded border border-slate-100 bg-slate-50 px-2 py-1.5">
          <div className="text-[11px] text-slate-500">Risk Value</div>
          <div className="flex items-baseline gap-2">
            <span
              title="Calculated as Impact × Likelihood — not directly editable"
              className="cursor-default text-sm font-semibold italic text-slate-500"
            >
              {riskValueLive}
            </span>
            <span className="text-[10px] text-slate-400">
              = {impact} × {likelihood}
            </span>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-500">Mitigation Plan</label>
          <textarea
            rows={3}
            value={mitigation}
            onChange={(e) => setMitigation(e.target.value)}
            className="w-full resize-none rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
          />
        </div>

        {error && <SaveErrorNotice message={error} onRetry={handleSave} />}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 px-3 py-2">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || nameInvalid}
          className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </aside>
  )
}
