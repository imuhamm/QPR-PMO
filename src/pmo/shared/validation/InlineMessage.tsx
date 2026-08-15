import type { ReactNode } from 'react'
import type { ValidationSeverity } from './types'

const TEXT_COLOR: Record<ValidationSeverity, string> = {
  'field-error': 'text-rose-600',
  warning: 'text-amber-600',
}

const GLYPH_COLOR: Record<ValidationSeverity, string> = {
  'field-error': 'text-rose-500',
  warning: 'text-amber-500',
}

// Shown close to the field it concerns. `compact` swaps the message text for
// a single glyph + tooltip — for grid cells too narrow to hold a sentence
// (Schedule) — while still resolving to the same message on hover.
export function InlineMessage({
  severity,
  children,
  compact,
}: {
  severity: ValidationSeverity
  children: ReactNode
  compact?: boolean
}) {
  if (compact) {
    return (
      <span title={typeof children === 'string' ? children : undefined} className={`shrink-0 text-[10px] font-semibold ${GLYPH_COLOR[severity]}`}>
        {severity === 'field-error' ? '!' : '⚠'}
      </span>
    )
  }
  return <span className={`block text-[10px] ${TEXT_COLOR[severity]}`}>{children}</span>
}

// Centralizes the "required" asterisk next to a field label.
export function RequiredMark() {
  return <span className="text-rose-500"> *</span>
}
