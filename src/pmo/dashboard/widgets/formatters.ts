// Shared across several dashboard widgets (unlike most one-off view-local
// formatters elsewhere in this app) — centralized here rather than
// duplicated per widget file.
export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function fmtSigned(value: number, unit = ''): string {
  return `${value > 0 ? '+' : ''}${value}${unit}`
}
