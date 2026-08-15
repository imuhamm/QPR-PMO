import { useRef, useState } from 'react'
import type { ScheduleRow } from '../schedule/scheduleData'
import { computeDateRange, daysBetween } from '../schedule/scheduleData'
import { PropertyRow, SectionHeading } from '../overview/PropertyRow'
import { CurrencyField } from './CurrencyField'
import { DateField } from './DateField'
import { PeriodBudgetTable } from './PeriodBudgetTable'
import {
  addPeriod,
  initialBudgetFields,
  initialPeriodBudgets,
  removePeriod,
  renamePeriod,
  setPeriodAmount,
} from './budgetData'
import type { BudgetFields, PeriodBudgetEntry } from './budgetData'

const SIMULATED_DELAY = 500

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function fmtDateLong(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Calculated dates are never stored here — they're read live from Schedule's
// Activities/Milestones each render, the same rule Schedule itself already
// uses for a Phase's derived span.
export function BudgetView({
  scheduleRows,
  onSaveStart,
  onSaveEnd,
}: {
  scheduleRows: ScheduleRow[]
  onSaveStart: () => void
  onSaveEnd: (success: boolean) => void
}) {
  const [fields, setFields] = useState<BudgetFields>(initialBudgetFields)
  const [periods, setPeriods] = useState<PeriodBudgetEntry[]>(initialPeriodBudgets)
  const [allowNegativePeriodAmounts, setAllowNegativePeriodAmounts] = useState(false)
  // The business hasn't settled when Planned Dates should lock — this toggle
  // exists to review both states, not to model real end-user behavior.
  const [plannedDatesLocked, setPlannedDatesLocked] = useState(false)
  const totalBudgetFailedOnce = useRef(false)

  const hasDatedSchedule = scheduleRows.some(
    (r) => (r.kind === 'activity' && r.start && r.end) || (r.kind === 'milestone' && r.date),
  )
  const calculatedRange = hasDatedSchedule ? computeDateRange(scheduleRows) : null
  const calculatedDurationDays = calculatedRange
    ? daysBetween(calculatedRange.min.toISOString().slice(0, 10), calculatedRange.max.toISOString().slice(0, 10))
    : null

  const commit = <K extends keyof BudgetFields>(key: K) =>
    async (value: BudgetFields[K]) => {
      onSaveStart()
      try {
        if (key === 'totalBudget' && !totalBudgetFailedOnce.current) {
          totalBudgetFailedOnce.current = true
          await delay(SIMULATED_DELAY)
          onSaveEnd(false)
          throw new Error('Save failed')
        }
        await delay(SIMULATED_DELAY)
        setFields((prev) => ({ ...prev, [key]: value }))
        onSaveEnd(true)
      } catch (err) {
        onSaveEnd(false)
        throw err
      }
    }

  const mutatePeriods = async (updater: (prev: PeriodBudgetEntry[]) => PeriodBudgetEntry[]) => {
    onSaveStart()
    await delay(SIMULATED_DELAY)
    setPeriods((prev) => updater(prev))
    onSaveEnd(true)
  }

  return (
    <div className="grid h-full grid-cols-2 gap-x-10 overflow-y-auto px-4 py-3">
      <div>
        <SectionHeading title="Budget" />
        <PropertyRow label="Total Budget">
          <CurrencyField value={fields.totalBudget} onCommit={commit('totalBudget')} />
        </PropertyRow>

        <div className="mt-4">
          <PeriodBudgetTable
            periods={periods}
            allowNegative={allowNegativePeriodAmounts}
            onToggleAllowNegative={setAllowNegativePeriodAmounts}
            onAddPeriod={() => void mutatePeriods(addPeriod)}
            onRenamePeriod={(id, label) => void mutatePeriods((prev) => renamePeriod(prev, id, label))}
            onSetAmount={(id, amount) => void mutatePeriods((prev) => setPeriodAmount(prev, id, amount))}
            onRemovePeriod={(id) => void mutatePeriods((prev) => removePeriod(prev, id))}
          />
        </div>
      </div>

      <div className="border-l border-slate-200 pl-10">
        <SectionHeading title="Schedule Dates" />

        {/* Planned Schedule — user-entered, editable subject to the lock state below. */}
        <div className="mb-3 rounded border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-2 py-1.5">
            <span className="text-[11px] font-semibold text-slate-600">Planned Schedule</span>
            <div className="flex items-center overflow-hidden rounded border border-slate-200">
              <button
                type="button"
                onClick={() => setPlannedDatesLocked(false)}
                aria-pressed={!plannedDatesLocked}
                className={`px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                  !plannedDatesLocked ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                Editable
              </button>
              <button
                type="button"
                onClick={() => setPlannedDatesLocked(true)}
                aria-pressed={plannedDatesLocked}
                className={`px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                  plannedDatesLocked ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                Locked
              </button>
            </div>
          </div>

          <div className="px-2">
            <PropertyRow label="Planned Start">
              <DateField
                value={fields.plannedStart}
                locked={plannedDatesLocked}
                onCommit={commit('plannedStart')}
                validate={(next) =>
                  fields.plannedEnd && next > fields.plannedEnd ? 'Planned Start must be on or before Planned End' : null
                }
              />
            </PropertyRow>
            <PropertyRow label="Planned End">
              <DateField
                value={fields.plannedEnd}
                locked={plannedDatesLocked}
                onCommit={commit('plannedEnd')}
                validate={(next) =>
                  fields.plannedStart && next < fields.plannedStart ? 'Planned End must be on or after Planned Start' : null
                }
              />
            </PropertyRow>
          </div>

          <p className="border-t border-slate-100 px-2 py-1.5 text-[10px] italic leading-relaxed text-slate-400">
            When Planned Dates should lock is still a pending business decision. This toggle exists to review
            both states — it is not final product behavior.
          </p>
        </div>

        {/* Current Calculated Schedule — read-only, derived from Schedule. Never directly editable. */}
        <div className="rounded border border-slate-200">
          <div className="border-b border-slate-100 bg-slate-50 px-2 py-1.5">
            <span className="text-[11px] font-semibold text-slate-600">Current Calculated Schedule</span>
          </div>

          <div className="px-2">
            <PropertyRow label="Project Start">
              {calculatedRange ? (
                <span
                  title="Derived from Activity and Milestone dates in Schedule"
                  className="cursor-default text-xs italic text-slate-400"
                >
                  {fmtDateLong(calculatedRange.min)}
                </span>
              ) : (
                <span className="text-xs italic text-slate-300">Not yet calculated</span>
              )}
            </PropertyRow>
            <PropertyRow label="Project End">
              {calculatedRange ? (
                <span
                  title="Derived from Activity and Milestone dates in Schedule"
                  className="cursor-default text-xs italic text-slate-400"
                >
                  {fmtDateLong(calculatedRange.max)}
                </span>
              ) : (
                <span className="text-xs italic text-slate-300">Not yet calculated</span>
              )}
            </PropertyRow>
            <PropertyRow label="Duration">
              {calculatedDurationDays !== null ? (
                <span
                  title="Derived from Activity and Milestone dates in Schedule"
                  className="cursor-default text-xs italic text-slate-400"
                >
                  {calculatedDurationDays} days
                </span>
              ) : (
                <span className="text-xs italic text-slate-300">—</span>
              )}
            </PropertyRow>
          </div>
        </div>
      </div>
    </div>
  )
}
