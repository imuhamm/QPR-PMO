import { useState } from 'react'
import type { PeriodBudgetEntry } from './budgetData'
import { formatAmount } from './budgetData'
import { InlineMessage } from '../shared/validation/InlineMessage'

export function PeriodBudgetTable({
  periods,
  allowNegative,
  onToggleAllowNegative,
  onAddPeriod,
  onSetQuarter,
  onSetYear,
  onSetAmount,
  onRemovePeriod,
}: {
  periods: PeriodBudgetEntry[]
  allowNegative: boolean
  onToggleAllowNegative: (allow: boolean) => void
  onAddPeriod: () => void
  onSetQuarter: (id: string, quarter: string) => void
  onSetYear: (id: string, year: number) => void
  onSetAmount: (id: string, amount: number | undefined) => void
  onRemovePeriod: (id: string) => void
}) {
  const [editingQuarterId, setEditingQuarterId] = useState<string | null>(null)
  const [quarterDraft, setQuarterDraft] = useState('')
  const [editingYearId, setEditingYearId] = useState<string | null>(null)
  const [yearDraft, setYearDraft] = useState('')
  const [yearError, setYearError] = useState<string | null>(null)
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null)
  const [amountDraft, setAmountDraft] = useState('')
  const [amountError, setAmountError] = useState<string | null>(null)

  const startEditQuarter = (p: PeriodBudgetEntry) => {
    setQuarterDraft(p.quarter)
    setEditingQuarterId(p.id)
  }

  const commitQuarter = (id: string, original: string) => {
    const trimmed = quarterDraft.trim()
    setEditingQuarterId(null)
    if (trimmed && trimmed !== original) onSetQuarter(id, trimmed)
  }

  const startEditYear = (p: PeriodBudgetEntry) => {
    setYearDraft(String(p.year))
    setYearError(null)
    setEditingYearId(p.id)
  }

  const commitYear = (id: string, original: number) => {
    const trimmed = yearDraft.trim()
    const parsed = Number(trimmed)
    if (trimmed === '' || Number.isNaN(parsed) || !Number.isInteger(parsed)) {
      setYearError('Enter a valid year')
      return
    }
    setYearError(null)
    setEditingYearId(null)
    if (parsed !== original) onSetYear(id, parsed)
  }

  const startEditAmount = (p: PeriodBudgetEntry) => {
    setAmountDraft(p.amount !== undefined ? String(p.amount) : '')
    setAmountError(null)
    setEditingAmountId(p.id)
  }

  // Enter commits and moves straight into the next row's amount — efficient
  // sequential entry down the table, the same pattern Schedule uses for
  // rapid Activity creation.
  const commitAmount = (id: string, advance: boolean) => {
    const trimmed = amountDraft.trim()
    if (trimmed === '') {
      setEditingAmountId(null)
      setAmountError(null)
      onSetAmount(id, undefined)
      if (advance) advanceTo(id)
      return
    }
    const parsed = Number(trimmed.replace(/,/g, ''))
    if (Number.isNaN(parsed)) {
      setAmountError('Enter a valid number')
      return
    }
    if (parsed < 0 && !allowNegative) {
      setAmountError('Negative amounts are not allowed')
      return
    }
    setAmountError(null)
    setEditingAmountId(null)
    onSetAmount(id, parsed)
    if (advance) advanceTo(id)
  }

  const advanceTo = (fromId: string) => {
    const idx = periods.findIndex((p) => p.id === fromId)
    const next = periods[idx + 1]
    if (next) startEditAmount(next)
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-500">Periodical Budget</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400">Negative amounts</span>
          <div className="flex items-center overflow-hidden rounded border border-slate-200">
            <button
              type="button"
              onClick={() => onToggleAllowNegative(false)}
              aria-pressed={!allowNegative}
              className={`px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                !allowNegative ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Not allowed
            </button>
            <button
              type="button"
              onClick={() => onToggleAllowNegative(true)}
              aria-pressed={allowNegative}
              className={`px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                allowNegative ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Allowed
            </button>
          </div>
        </div>
      </div>

      <div className="rounded border border-slate-200">
        <div className="flex items-center border-b border-slate-100 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500">
          <div className="w-14">Quarter</div>
          <div className="w-16">Year</div>
          <div className="flex-1 text-right">Amount</div>
          <div className="w-4 shrink-0" />
        </div>

        {periods.map((p) => (
          <div key={p.id} className="group flex items-center border-b border-slate-100 px-2 py-1 text-xs last:border-0">
            <div className="w-14 shrink-0 pr-1">
              {editingQuarterId === p.id ? (
                <input
                  autoFocus
                  value={quarterDraft}
                  onChange={(e) => setQuarterDraft(e.target.value)}
                  onBlur={() => commitQuarter(p.id, p.quarter)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitQuarter(p.id, p.quarter)
                    if (e.key === 'Escape') setEditingQuarterId(null)
                  }}
                  className="w-full rounded-sm border border-blue-400 bg-white px-1 py-0.5 text-xs text-slate-800 outline-none ring-1 ring-blue-200"
                />
              ) : (
                <button
                  type="button"
                  onDoubleClick={() => startEditQuarter(p)}
                  title="Double-click to edit"
                  className="w-full truncate rounded-sm px-1 py-0.5 text-left text-slate-700 hover:bg-slate-50"
                >
                  {p.quarter}
                </button>
              )}
            </div>

            <div className="w-16 shrink-0 pr-1">
              {editingYearId === p.id ? (
                <div>
                  <input
                    autoFocus
                    inputMode="numeric"
                    value={yearDraft}
                    onChange={(e) => setYearDraft(e.target.value)}
                    onBlur={() => commitYear(p.id, p.year)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitYear(p.id, p.year)
                      if (e.key === 'Escape') {
                        setEditingYearId(null)
                        setYearError(null)
                      }
                    }}
                    className={`w-full rounded-sm border bg-white px-1 py-0.5 text-xs text-slate-800 outline-none ${
                      yearError ? 'border-rose-400 ring-1 ring-rose-300' : 'border-blue-400 ring-1 ring-blue-200'
                    }`}
                  />
                  {yearError && (
                    <span className="mt-0.5 block">
                      <InlineMessage severity="field-error">{yearError}</InlineMessage>
                    </span>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onDoubleClick={() => startEditYear(p)}
                  title="Double-click to edit"
                  className="w-full truncate rounded-sm px-1 py-0.5 text-left text-slate-700 hover:bg-slate-50"
                >
                  {p.year}
                </button>
              )}
            </div>

            <div className="flex-1">
              {editingAmountId === p.id ? (
                <div>
                  <input
                    autoFocus
                    value={amountDraft}
                    onChange={(e) => setAmountDraft(e.target.value)}
                    onBlur={() => commitAmount(p.id, false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitAmount(p.id, true)
                      if (e.key === 'Escape') {
                        setEditingAmountId(null)
                        setAmountError(null)
                      }
                    }}
                    placeholder="0"
                    className={`w-full rounded-sm border bg-white px-1.5 py-0.5 text-right text-xs text-slate-800 outline-none ${
                      amountError ? 'border-rose-400 ring-1 ring-rose-300' : 'border-blue-400 ring-1 ring-blue-200'
                    }`}
                  />
                  {amountError && (
                    <span className="mt-0.5 block text-right">
                      <InlineMessage severity="field-error">{amountError}</InlineMessage>
                    </span>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onDoubleClick={() => startEditAmount(p)}
                  title="Double-click to edit"
                  className="w-full truncate rounded-sm px-1.5 py-0.5 text-right text-slate-800 hover:bg-slate-50"
                >
                  {p.amount !== undefined ? formatAmount(p.amount) : <span className="italic text-slate-300">—</span>}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => onRemovePeriod(p.id)}
              title="Remove period"
              className="ml-1 hidden w-4 shrink-0 text-slate-300 hover:text-rose-600 group-hover:inline"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={onAddPeriod}
          className="block w-full px-2 py-1.5 text-left text-xs font-medium text-blue-600 hover:bg-blue-50"
        >
          + Add Period
        </button>
      </div>

      <p className="mt-1 text-[10px] italic leading-relaxed text-slate-400">
        Quarter and Year are entered separately and are freely editable — Q1–Q4 2026 are illustrative sample rows,
        not a fixed rule. Period amounts are not validated against Total Budget. Whether negative amounts are
        permitted isn't confirmed yet — shown here as a configurable toggle.
      </p>
    </div>
  )
}
