export interface BudgetFields {
  totalBudget?: number
  plannedStart?: string
  plannedEnd?: string
}

// Starts empty deliberately — this Project is still Draft and hasn't had
// Budget or Planned Dates entered yet, matching the "Total Budget missing"
// readiness blocker established for this section from the very first task.
export const initialBudgetFields: BudgetFields = {}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

// Periodical Budget: a scalable period → amount pattern, not a quarterly
// business rule. Q1–Q4 below are illustrative sample rows only — periods
// are freely added, edited, and removed, and nothing here validates their
// sum against Total Budget.
export interface PeriodBudgetEntry {
  id: string
  quarter: string
  year: number
  amount?: number
}

export const initialPeriodBudgets: PeriodBudgetEntry[] = [
  { id: 'period-1', quarter: 'Q1', year: 2026 },
  { id: 'period-2', quarter: 'Q2', year: 2026 },
  { id: 'period-3', quarter: 'Q3', year: 2026 },
  { id: 'period-4', quarter: 'Q4', year: 2026 },
]

// No currency symbol here — unlike Total Budget's formatCurrency, no
// currency is actually configured anywhere in this product for period
// amounts, so this stays a plain formatted number rather than assuming one.
export function formatAmount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

// New rows continue on from the last period (Q4 rolls into Q1 of the next
// year) so adding a period is a single click for the common case.
function nextQuarter(quarter: string, year: number): { quarter: string; year: number } {
  const match = /^Q([1-4])$/.exec(quarter)
  if (!match) return { quarter: 'Q1', year: year + 1 }
  const q = Number(match[1])
  return q === 4 ? { quarter: 'Q1', year: year + 1 } : { quarter: `Q${q + 1}`, year }
}

export function addPeriod(periods: PeriodBudgetEntry[]): PeriodBudgetEntry[] {
  const last = periods[periods.length - 1]
  const next = last ? nextQuarter(last.quarter, last.year) : { quarter: 'Q1', year: new Date().getFullYear() }
  return [...periods, { id: `period-${Date.now()}`, ...next }]
}

export function setPeriodQuarter(periods: PeriodBudgetEntry[], id: string, quarter: string): PeriodBudgetEntry[] {
  return periods.map((p) => (p.id === id ? { ...p, quarter } : p))
}

export function setPeriodYear(periods: PeriodBudgetEntry[], id: string, year: number): PeriodBudgetEntry[] {
  return periods.map((p) => (p.id === id ? { ...p, year } : p))
}

export function setPeriodAmount(
  periods: PeriodBudgetEntry[],
  id: string,
  amount: number | undefined,
): PeriodBudgetEntry[] {
  return periods.map((p) => (p.id === id ? { ...p, amount } : p))
}

export function removePeriod(periods: PeriodBudgetEntry[], id: string): PeriodBudgetEntry[] {
  return periods.filter((p) => p.id !== id)
}
