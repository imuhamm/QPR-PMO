// One entry per re-baselining event for the whole Project — not per field.
// A Project has one approved plan at a time; each entry here is a snapshot
// of "what the plan was, and why it changed," in the order it changed, so
// the story reads as accumulating history rather than a single value
// quietly being overwritten. previousApprovedValue/newApprovedValue are
// kept even though the compact card list (BaselineHistoryPanel) doesn't
// render them yet — that's the data a future Compare view needs, and
// dropping it now would mean losing it for good (see requirement to
// "preserve the previous approved value in history").
export interface BaselineHistoryEntry {
  baselineNumber: number
  date: string
  /** "Original Project Approval" for the first entry, "Created from CR-XXX" for every one after. */
  source: string
  /** The CR's own title — absent only for the original, CR-less baseline. */
  reason?: string
  /** Lets a card link back to the CR that created it — absent for the original baseline. */
  reference?: string
  affectedEntity?: string
  affectedField?: string
  previousApprovedValue?: string
  newApprovedValue?: string
}

// This prototype's mock data has no real "Project approved on" field
// anywhere else (ProjectMeta/mockProjectDetails.ts has no such date) — this
// is a synthesized placeholder, deliberately earlier than every date in the
// mock schedule (which starts 2026-01-15), standing in for "before the
// schedule/baseline data this app ships with existed."
export const ORIGINAL_BASELINE_DATE = '2025-12-01'

export function createOriginalBaselineEntry(): BaselineHistoryEntry {
  return { baselineNumber: 1, date: ORIGINAL_BASELINE_DATE, source: 'Original Project Approval' }
}
