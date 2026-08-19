import { ProjectWorkspace } from './ProjectWorkspace'
import { mockProjectMeta } from './data/mockProjectDetails'
import { initialDraftScheduleRows } from './schedule/scheduleData'
import { draftOverview } from './overview/overviewData'
import { draftAlignment } from './strategicAlignment/strategicAlignmentData'
import { draftRisks } from './risks/risksData'

// The Draft (pre-approval) Project page — proj-client-portal-revamp, and the
// fallback workspace for every other row in the Register, none of which has
// a real data set behind it yet (see App.tsx). Nothing here is
// Change-Request-gated, since ProjectWorkspace's `locked` only turns on once
// a Project has an execution snapshot, which a Draft never has. Its starting
// data reflects a Project that has passed Create Project's mandatory fields
// (a real Strategic Alignment, real Schedule content) but hasn't been
// approved yet (no Baseline, no execution history — see
// initialDraftScheduleRows) — not the Approved/Active demo's content, which
// is what this page showed before being split out. Kept as its own page —
// not a branch inside ProjectDetailsShell — so Draft's experience can keep
// diverging from the Approved/Active one on its own as this prototype
// grows; see ProjectDetailsShell for that counterpart and App.tsx for the
// routing.
export function DraftProjectShell({ onBack }: { onBack?: () => void }) {
  return (
    <ProjectWorkspace
      initialMeta={mockProjectMeta}
      initialScheduleRows={initialDraftScheduleRows}
      initialOverviewFields={draftOverview}
      initialAlignments={draftAlignment}
      initialRisks={draftRisks}
      onBack={onBack}
    />
  )
}
