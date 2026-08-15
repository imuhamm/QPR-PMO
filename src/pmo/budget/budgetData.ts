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
// are freely added, renamed, and removed, and nothing here validates their
// sum against Total Budget.
export interface PeriodBudgetEntry {
  id: string
  label: string
  amount?: number
}

export const initialPeriodBudgets: PeriodBudgetEntry[] = [
  { id: 'period-1', label: 'Q1' },
  { id: 'period-2', label: 'Q2' },
  { id: 'period-3', label: 'Q3' },
  { id: 'period-4', label: 'Q4' },
]

// No currency symbol here — unlike Total Budget's formatCurrency, no
// currency is actually configured anywhere in this product for period
// amounts, so this stays a plain formatted number rather than assuming one.
export function formatAmount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function addPeriod(periods: PeriodBudgetEntry[]): PeriodBudgetEntry[] {
  return [...periods, { id: `period-${Date.now()}`, label: `Period ${periods.length + 1}` }]
}

export function renamePeriod(periods: PeriodBudgetEntry[], id: string, label: string): PeriodBudgetEntry[] {
  return periods.map((p) => (p.id === id ? { ...p, label } : p))
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
