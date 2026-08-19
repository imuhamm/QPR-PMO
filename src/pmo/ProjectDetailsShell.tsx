import { ProjectWorkspace } from './ProjectWorkspace'
import { mockActiveProjectMeta } from './data/mockProjectDetails'
import { initialScheduleRows } from './schedule/scheduleData'
import { initialOverview } from './overview/overviewData'
import { initialRisks } from './risks/risksData'

// The Approved/Active Project page — proj-core-banking-migration, the only
// Project in the Register with a real execution snapshot (see types.ts's
// ProjectExecutionSnapshot). A separate page from DraftProjectShell (not one
// shell branching on status) so this page's behavior — Change-Request-gated
// mandatory fields, the execution strip, Update Progress — can keep evolving
// without touching Draft's. Both currently mount the same ProjectWorkspace,
// each supplying its own starting data (schedule, Overview fields, Risks —
// unrelated to `initialMeta`, since ProjectWorkspace has no per-Project data
// store to derive them from); see DraftProjectShell for the pre-approval
// counterpart and App.tsx for how a Project routes to one or the other.
// Strategic Alignment starts empty here (`[]`), exactly as it always did.
export function ProjectDetailsShell({ onBack }: { onBack?: () => void }) {
  return (
    <ProjectWorkspace
      initialMeta={mockActiveProjectMeta}
      initialScheduleRows={initialScheduleRows}
      initialOverviewFields={initialOverview}
      initialAlignments={[]}
      initialRisks={initialRisks}
      onBack={onBack}
    />
  )
}
