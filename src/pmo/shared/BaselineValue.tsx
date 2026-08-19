import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

// What any protected field needs to know about its own pending Change
// Request to render one — deliberately thin (not the full
// SubmittedChangeRequest record) so this component stays generic instead of
// coupled to the CR store's shape. canWithdraw is computed by the caller
// (currently always "is the current mock user the requester" — see
// changeRequestStore.ts) rather than here, since permission logic isn't
// this component's concern.
export interface PendingChangeRequestInfo {
  reference: string
  proposedDisplay: string
  /** e.g. "Awaiting Approval" or "Approved · Ready to Apply" — see changeRequestStore's pendingStatusLabel. Passed in rather than assumed so this component doesn't need to know the CR status enum. */
  statusLabel: string
  canWithdraw: boolean
}

// The approved value never moves for this — Current Approved keeps
// rendering exactly as it always has (see BaselineValue below); this is
// only ever secondary, subordinate content. Used two ways: always inside
// BaselineValue's own popover (every protected field gets this, however
// dense its cell is), and additionally rendered inline, permanently
// visible, by roomier contexts that opt in (Activity Details panel,
// Project Header) — see each call site.
export function PendingChangeNotice({
  pending,
  onWithdraw,
  onViewCR,
  compact,
}: {
  pending: PendingChangeRequestInfo
  onWithdraw?: () => void
  onViewCR?: () => void
  compact?: boolean
}) {
  return (
    <div className={`rounded-md border border-amber-200 bg-amber-50 ${compact ? 'px-2 py-1.5' : 'p-2.5'}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Proposed</div>
      <div className="text-xs font-semibold text-amber-900">{pending.proposedDisplay}</div>
      <div className="mt-0.5 text-[11px] text-amber-700">
        {pending.reference} · {pending.statusLabel}
      </div>
      <div className="mt-1.5 flex items-center gap-3">
        <button type="button" onClick={onViewCR} className="text-[11px] font-medium text-blue-600 hover:text-blue-700">
          View CR
        </button>
        {pending.canWithdraw && (
          <button type="button" onClick={onWithdraw} className="text-[11px] font-medium text-rose-600 hover:text-rose-700">
            Withdraw Request
          </button>
        )}
      </div>
    </div>
  )
}

// Wraps any approved-plan value that's read-only by governance, not by
// circumstance — Baseline Start/Finish and Approved Milestone Date in the
// Schedule grid, Approved (Baseline) Finish in the Project header. A native
// title=""  tooltip isn't enough here: this is the one place users learn
// *why* the field is locked and *what to do about it*, so the explanation
// has to survive being seen, not just hovered over — click or focus opens
// it, same disclosure pattern as the grid's other popovers (NoteCell,
// ActivityStatusCell).
//
// When `pending` is set, the approved value shown by `children` never
// changes — it's still the official one. The popover leads with the
// pending proposal instead of "Request Change" (a field already has one
// request in flight; it doesn't need a second), and a small amber dot
// marks the trigger so a pending CR is visible without opening anything —
// the "subtle inline indicator" dense grid cells can afford, before the
// full Proposed/Reference/actions block behind the click.
export function BaselineValue({
  children,
  onRequestChange,
  triggerClassName = '',
  panelAlign = 'left',
  style,
  pending,
  onWithdraw,
  onViewCR,
}: {
  children: ReactNode
  onRequestChange?: () => void
  triggerClassName?: string
  panelAlign?: 'left' | 'right'
  /** Explicit pixel width for fixed-width grid columns — omit to let it size to content (header stats, detail panel rows). */
  style?: { width?: number }
  pending?: PendingChangeRequestInfo
  onWithdraw?: () => void
  onViewCR?: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <span ref={rootRef} style={style} className="relative inline-flex shrink-0 align-middle">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          // Not a toggle: a native click focuses the button first, which
          // already opens it via onFocus below — treating this as a toggle
          // would open-then-immediately-close on every single click.
          // Outside click / Escape / Request Change are the close paths.
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={pending ? `${pending.reference} pending — click for details` : 'Baseline value — click for details'}
        className={`flex cursor-pointer items-center gap-0.5 truncate text-left outline-none hover:bg-slate-100/80 focus:bg-slate-100/80 focus:ring-1 focus:ring-inset focus:ring-blue-300 ${triggerClassName}`}
      >
        <span aria-hidden="true" className="shrink-0 text-[8px] text-slate-400">
          🔒
        </span>
        {pending && (
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title="Pending Change Request" />
        )}
        <span className="truncate">{children}</span>
      </button>

      {open && (
        <div
          role="dialog"
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-full z-30 mt-1 w-60 rounded-md border border-slate-200 bg-white p-3 text-left normal-case shadow-lg ${
            panelAlign === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <span aria-hidden="true">🔒</span> Baseline value
          </div>
          <p className="mt-1 text-[11px] font-normal leading-snug text-slate-500">
            This value is part of the approved project plan. Changes require approval through a Change Request.
          </p>

          {pending ? (
            <div className="mt-2">
              <PendingChangeNotice
                pending={pending}
                compact
                onViewCR={() => {
                  setOpen(false)
                  onViewCR?.()
                }}
                onWithdraw={() => {
                  setOpen(false)
                  onWithdraw?.()
                }}
              />
            </div>
          ) : (
            onRequestChange && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onRequestChange()
                }}
                className="mt-2 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
              >
                Request Change
              </button>
            )
          )}
        </div>
      )}
    </span>
  )
}
