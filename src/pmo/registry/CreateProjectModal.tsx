import { useEffect, useState } from 'react'
import { PEOPLE_OPTIONS, PROGRAM_OPTIONS, PROJECT_TYPE_OPTIONS, REPORTING_FREQUENCY_OPTIONS } from '../overview/overviewData'
import { RequiredMark } from '../shared/validation/InlineMessage'
import { SearchableSelect } from '../shared/SearchableSelect'
import { mockKPIs, mockObjectives } from '../strategicAlignment/strategicAlignmentData'
import { SourceSelector } from '../strategicAlignment/SourceSelector'

export interface CreateProjectFields {
  name: string
  description: string
  projectManager: string
  projectOwner: string
  program: string
  projectType: string
  reportingFrequency: string
  strategicObjectiveIds: string[]
  kpiIds: string[]
}

const initialFields: CreateProjectFields = {
  name: '',
  description: '',
  projectManager: '',
  projectOwner: '',
  program: '',
  projectType: '',
  reportingFrequency: '',
  strategicObjectiveIds: [],
  kpiIds: [],
}

const selectClass =
  'w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200'
const labelClass = 'mb-1 block text-[11px] font-medium text-slate-500'

// Single dialog, no stepper — establishes the minimum record only.
// Manager/Owner/Program/Project Type use the searchable popover selector;
// Reporting Frequency stays a plain select (small fixed configured list,
// not asked to be searchable). Strategic Alignment mirrors the full
// section's shape — Strategic Objectives and KPIs are both required,
// same as StrategicAlignmentView's own Save gate — and is the only
// mandatory gate on Create; everything else is still unvalidated.
export function CreateProjectModal({
  onCancel,
  onCreate,
}: {
  onCancel: () => void
  onCreate: (fields: CreateProjectFields) => void
}) {
  const [fields, setFields] = useState<CreateProjectFields>(initialFields)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onCancel])

  const set = <K extends keyof CreateProjectFields>(key: K, value: CreateProjectFields[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-2xl"
      >
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 id="create-project-title" className="text-sm font-semibold text-slate-900">
            Create Project
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Enter the core project information. You can complete the detailed plan after the project is created.
          </p>
        </div>

        <div className="space-y-3 px-4 py-4">
          <div>
            <label className={labelClass}>
              Project Name<RequiredMark />
            </label>
            <input
              autoFocus
              value={fields.name}
              onChange={(e) => set('name', e.target.value)}
              className={selectClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Project Description<RequiredMark />
            </label>
            <textarea
              rows={2}
              value={fields.description}
              onChange={(e) => set('description', e.target.value)}
              className={`${selectClass} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                Project Manager<RequiredMark />
              </label>
              <SearchableSelect
                value={fields.projectManager}
                onChange={(v) => set('projectManager', v)}
                options={PEOPLE_OPTIONS}
                emptyOptionLabel="Unassigned"
              />
            </div>
            <div>
              <label className={labelClass}>
                Project Owner<RequiredMark />
              </label>
              <SearchableSelect
                value={fields.projectOwner}
                onChange={(v) => set('projectOwner', v)}
                options={PEOPLE_OPTIONS}
                emptyOptionLabel="Unassigned"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                Program<RequiredMark />
              </label>
              <SearchableSelect
                value={fields.program}
                onChange={(v) => set('program', v)}
                options={PROGRAM_OPTIONS}
                emptyOptionLabel="Not set"
              />
            </div>
            <div>
              <label className={labelClass}>Project Type</label>
              <SearchableSelect
                value={fields.projectType}
                onChange={(v) => set('projectType', v)}
                options={PROJECT_TYPE_OPTIONS}
                emptyOptionLabel="Not set"
              />
            </div>
          </div>

          <div>
            <span className={labelClass}>
              Strategic Alignment<RequiredMark />
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10px] text-slate-400">Strategic Objectives</label>
                <SourceSelector
                  status="ready"
                  items={mockObjectives}
                  error={null}
                  onRetry={() => {}}
                  value={fields.strategicObjectiveIds}
                  onChange={(v) => set('strategicObjectiveIds', v)}
                  placeholder="Select Strategic Objectives…"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-slate-400">KPIs</label>
                <SourceSelector
                  status="ready"
                  items={mockKPIs}
                  error={null}
                  onRetry={() => {}}
                  value={fields.kpiIds}
                  onChange={(v) => set('kpiIds', v)}
                  placeholder="Select KPIs…"
                />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Reporting Frequency<RequiredMark />
            </label>
            <select
              value={fields.reportingFrequency}
              onChange={(e) => set('reportingFrequency', e.target.value)}
              className={selectClass}
            >
              <option value="">Select…</option>
              {REPORTING_FREQUENCY_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onCreate(fields)}
            disabled={fields.strategicObjectiveIds.length === 0 || fields.kpiIds.length === 0}
            title={
              fields.strategicObjectiveIds.length === 0 || fields.kpiIds.length === 0
                ? 'Select at least one Strategic Objective and one KPI to continue'
                : undefined
            }
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  )
}
