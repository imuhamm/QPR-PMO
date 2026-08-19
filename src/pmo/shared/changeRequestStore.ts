import type { ScheduleImpactScope, ScheduleImpactSummary } from './changeRequestImpact'

export type ChangeCategory = 'Schedule' | 'Scope' | 'Cost' | 'Resource' | 'Other'
export type ChangePriority = 'Low' | 'Medium' | 'High' | 'Critical'
export const CHANGE_CATEGORIES: ChangeCategory[] = ['Schedule', 'Scope', 'Cost', 'Resource', 'Other']
export const CHANGE_PRIORITIES: ChangePriority[] = ['Low', 'Medium', 'High', 'Critical']

// A field's pending indicator stays up for every status except the two
// truly settled ones: Rejected (abandoned) and Applied (the approved value
// itself has now moved, so there's nothing left to propose). Approved sits
// in between deliberately — the decision is made, but nothing about the
// approved value changes until the separate, explicit Apply step runs (see
// applyChangeRequest below and ProjectDetailsShell's handleApplyCR), so the
// field still has to read as "there's a live proposal here" until then.
export type ChangeRequestStatus = 'Awaiting Approval' | 'Approved' | 'Rejected' | 'Returned for Information' | 'Applied'

export function isOpenStatus(status: ChangeRequestStatus): boolean {
  return status === 'Awaiting Approval' || status === 'Returned for Information' || status === 'Approved'
}

// Withdrawing only makes sense before a decision exists (or while one's
// been kicked back for more detail) — once Approved, the decision is made;
// pulling it back reads as a different action (asking the approver to
// reverse themselves), not a withdrawal, so this prototype doesn't offer it.
export function canWithdrawStatus(status: ChangeRequestStatus): boolean {
  return status === 'Awaiting Approval' || status === 'Returned for Information'
}

// What a protected field's pending block should say next to the CR
// reference — every status reads fine verbatim except Approved, which needs
// the extra "not applied yet" context or it could be misread as already in
// effect.
export function pendingStatusLabel(status: ChangeRequestStatus): string {
  return status === 'Approved' ? 'Approved · Ready to Apply' : status
}

export type ChangeRequestActivityType = 'submitted' | 'approved' | 'rejected' | 'returned' | 'applied'

export interface ChangeRequestActivityEntry {
  id: string
  type: ChangeRequestActivityType
  actor: string
  timestamp: string
  comment?: string
}

// A Change Request that's been through Submit — the one record both the
// inline pending indicators (BaselineValue's dot/popover, the Activity
// Details panel, the header's project-wide strip) and the full reviewer
// detail view read from. Everything the detail view needs to render
// without recomputing anything is captured here at submission time —
// scheduleImpact in particular is a snapshot of what the requester actually
// saw and confirmed, not a live recalculation that could quietly drift if
// the schedule changes again before a reviewer looks at it.
export interface SubmittedChangeRequest {
  reference: string
  title: string
  project: string
  affectedEntity: string
  affectedField: string
  currentApproved: string
  currentApprovedISO?: string
  proposedISO: string
  proposedDisplay: string
  scope?: ScheduleImpactScope
  requestedBy: string
  submittedDate: string
  status: ChangeRequestStatus
  reason: string
  category?: ChangeCategory
  priority?: ChangePriority
  effectiveDate?: string
  businessImpact?: string
  attachments: string[]
  /** Snapshot of computeScheduleImpact's result at submission time — null only when the request had no schedule scope at all. */
  scheduleImpact: ScheduleImpactSummary | null
  activity: ChangeRequestActivityEntry[]
}

function scopesMatch(a?: ScheduleImpactScope, b?: ScheduleImpactScope): boolean {
  // Both undefined means the same thing here: a governed field with no
  // schedule scope at all (Overview's Project Manager, Strategic Alignment,
  // ...) — those still need to find their own pending CR by affectedField
  // alone, the same as every scoped field does by scope+affectedField.
  if (!a && !b) return true
  if (!a || !b || a.kind !== b.kind) return false
  if (a.kind === 'project' && b.kind === 'project') return true
  if (a.kind === 'phase' && b.kind === 'phase') return a.id === b.id
  if (a.kind === 'activity' && b.kind === 'activity') return a.id === b.id
  if (a.kind === 'milestone' && b.kind === 'milestone') return a.id === b.id
  return false
}

// The one lookup every protected field (grid cell, Activity Details row,
// header stat) runs to find out whether it already has an open Change
// Request — same scope+field matching the Impact Analysis step already
// keys off of, so a field's pending state and its Request Change trigger
// never disagree about which field they mean.
export function findPendingChangeRequest(
  crs: SubmittedChangeRequest[],
  scope: ScheduleImpactScope | undefined,
  field: string,
): SubmittedChangeRequest | undefined {
  return crs.find((cr) => isOpenStatus(cr.status) && cr.affectedField === field && scopesMatch(cr.scope, scope))
}

// Mock reference only — this prototype has no backend to assign a real one.
// Derived from the current count rather than a module-level counter so it
// stays a pure function of state.
export function nextCrReference(existingCount: number): string {
  return `CR-${String(existingCount + 1).padStart(3, '0')}`
}

// The one state transition a reviewer can make — Approve/Reject/Return all
// go through here so the status change and its Activity entry are always
// written together, never one without the other.
export function recordChangeRequestDecision(
  crs: SubmittedChangeRequest[],
  reference: string,
  decision: Extract<ChangeRequestActivityType, 'approved' | 'rejected' | 'returned'>,
  actor: string,
  timestamp: string,
  comment: string | undefined,
): SubmittedChangeRequest[] {
  const statusByDecision: Record<typeof decision, ChangeRequestStatus> = {
    approved: 'Approved',
    rejected: 'Rejected',
    returned: 'Returned for Information',
  }
  return crs.map((cr) =>
    cr.reference === reference
      ? {
          ...cr,
          status: statusByDecision[decision],
          activity: [
            ...cr.activity,
            { id: `${reference}-a${cr.activity.length + 1}`, type: decision, actor, timestamp, comment: comment || undefined },
          ],
        }
      : cr,
  )
}

// The one transition that moves a CR from "decided" to "in effect" —
// Approved → Applied. Only stamps the record itself (status + Activity
// entry); the actual mutation of the approved value it's applying, and the
// new Baseline History entry that preserves what it superseded, both happen
// in the caller (ProjectDetailsShell's handleApplyCR) since this store
// module has no access to scheduleRows or projectMeta.
export function applyChangeRequest(
  crs: SubmittedChangeRequest[],
  reference: string,
  actor: string,
  timestamp: string,
): SubmittedChangeRequest[] {
  return crs.map((cr) =>
    cr.reference === reference && cr.status === 'Approved'
      ? {
          ...cr,
          status: 'Applied',
          activity: [...cr.activity, { id: `${reference}-a${cr.activity.length + 1}`, type: 'applied', actor, timestamp }],
        }
      : cr,
  )
}
