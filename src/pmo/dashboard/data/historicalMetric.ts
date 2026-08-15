export type TrendDirection = 'up' | 'down' | 'flat'

// Reusable "how did this change since last update" wrapper. Every trend
// narrative this dashboard needs ("+2 risks since last update", "forecast
// slipped another 9 days", "health changed Green → Amber", "actual
// progress increased 6%") is expressed through this same shape, computed
// once here in the data layer — widgets render `changeLabel`/`direction`,
// they never diff `current`/`previous` themselves.
export interface HistoricalMetric<T> {
  current: T
  previous: T
  /** current − previous, in whatever unit T represents (points, days, a severity rank for ordinal types). Omitted when T has no meaningful numeric distance. */
  delta?: number
  /** The literal direction the value moved — NOT whether that's good or bad. Callers decide tone (rising risk exposure is 'up' and bad; rising % complete is 'up' and good). */
  direction: TrendDirection
  /** Pre-formatted, ready-to-render summary of the change — the thing a widget actually displays. */
  changeLabel: string
}

function directionFromDelta(delta: number): TrendDirection {
  return delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
}

export function buildNumericMetric(
  current: number,
  previous: number,
  formatLabel: (delta: number, current: number, previous: number) => string,
): HistoricalMetric<number> {
  const delta = current - previous
  return { current, previous, delta, direction: directionFromDelta(delta), changeLabel: formatLabel(delta, current, previous) }
}

const MS_PER_DAY = 86_400_000
function diffDays(fromISO: string, toISO: string): number {
  return Math.round((new Date(toISO).getTime() - new Date(fromISO).getTime()) / MS_PER_DAY)
}

// For ISO date values (e.g. a forecast finish date) where the meaningful
// "delta" is the day gap between the two dates, not the dates themselves.
export function buildDateMetric(
  currentISO: string,
  previousISO: string,
  formatLabel: (deltaDays: number) => string,
): HistoricalMetric<string> {
  const delta = diffDays(previousISO, currentISO)
  return { current: currentISO, previous: previousISO, delta, direction: directionFromDelta(delta), changeLabel: formatLabel(delta) }
}
