import { useState } from 'react'
import { PROJECT_SECTIONS } from './types'
import type { ProjectMeta, SaveState, SectionId } from './types'
import { mockSectionReadiness } from './data/mockProjectDetails'
import { ProjectHeader } from './components/ProjectHeader'
import { ProjectViewBar } from './components/ProjectViewBar'
import { ReadinessPanel } from './components/ReadinessPanel'
import { SectionPlaceholder } from './components/SectionPlaceholder'
import { ScheduleWorkspace } from './schedule/ScheduleWorkspace'
import { cascadeReschedule, MOCK_CURRENT_USER, MOCK_TODAY } from './schedule/scheduleData'
import type { ScheduleRow } from './schedule/scheduleData'
import { OverviewView } from './overview/OverviewView'
import type { OverviewFields } from './overview/overviewData'
import { ResourcesView } from './resources/ResourcesView'
import { BudgetView } from './budget/BudgetView'
import { RisksView } from './risks/RisksView'
import type { RiskRow } from './risks/risksData'
import { StrategicAlignmentView } from './strategicAlignment/StrategicAlignmentView'
import type { StrategicAlignmentEntry } from './strategicAlignment/strategicAlignmentData'
import { BusinessCaseView } from './businessCase/BusinessCaseView'
import { DashboardView } from './dashboard/DashboardView'
import { ChangeRequestPanel } from './shared/ChangeRequestPanel'
import type { ChangeRequestDraft, ChangeRequestJustification } from './shared/ChangeRequestPanel'
import { ChangeRequestDetailView } from './shared/ChangeRequestDetailView'
import { applyChangeRequest, nextCrReference, recordChangeRequestDecision } from './shared/changeRequestStore'
import type { SubmittedChangeRequest } from './shared/changeRequestStore'
import type { ScheduleImpactSummary } from './shared/changeRequestImpact'
import { BaselineHistoryPanel } from './shared/BaselineHistoryPanel'
import { createOriginalBaselineEntry } from './shared/baselineHistory'
import type { BaselineHistoryEntry } from './shared/baselineHistory'
import type { ActivityHistoryEntry } from './schedule/activityHistory'

function fmtCrDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// The actual Project workspace — header, view bar, and the readiness overlay
// stay mounted; only the canvas beneath the view bar swaps per section. Not
// used directly: ProjectDetailsShell (Approved/Active) and DraftProjectShell
// (Draft) are the two pages that mount this with their own `initialMeta`,
// kept as separate top-level components — not one shell branching on status
// — so each page can diverge on its own as this prototype grows, while
// sharing the one workspace implementation until it needs to.
export function ProjectWorkspace({
  initialMeta,
  initialScheduleRows,
  initialOverviewFields,
  initialAlignments,
  initialRisks,
  onBack,
}: {
  initialMeta: ProjectMeta
  initialScheduleRows: ScheduleRow[]
  initialOverviewFields: OverviewFields
  initialAlignments: StrategicAlignmentEntry[]
  initialRisks: RiskRow[]
  onBack?: () => void
}) {
  // Lifted into state (not a plain const) because Update Progress Mode's
  // save needs to move execution.lastUpdated forward.
  const [projectMeta, setProjectMeta] = useState<ProjectMeta>(initialMeta)

  const [activeSection, setActiveSection] = useState<SectionId>('overview')
  const [readinessOpen, setReadinessOpen] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [savedAtLabel, setSavedAtLabel] = useState('just now')

  // Lifted out of ScheduleWorkspace: Resources reads the same Activities,
  // and it means Schedule's edits survive switching to another view and back.
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>(initialScheduleRows)
  const [scheduleSelectedId, setScheduleSelectedId] = useState<string | null>(null)
  // Lifted so the header's "Update Progress" button (a sibling of Schedule,
  // not a descendant) can jump straight into the bulk-update table.
  const [updateProgressMode, setUpdateProgressMode] = useState(false)
  // Lifted for the same reason as updateProgressMode above — a protected
  // baseline value's "Request Change" trigger can fire from the header
  // (Baseline End) or from deep inside Schedule (grid cells, the Activity
  // Details panel), so the panel itself has to live above all of them.
  const [changeRequest, setChangeRequest] = useState<ChangeRequestDraft | null>(null)
  // Every submitted CR, regardless of which field triggered it — passed
  // down whole to each surface that renders protected fields (header,
  // grid, Activity Details panel) so each one can look up its own pending
  // state the same way (see changeRequestStore's scope+field matching)
  // instead of this component pre-filtering per consumer.
  const [submittedCRs, setSubmittedCRs] = useState<SubmittedChangeRequest[]>([])
  // The one CR a reviewer is currently looking at, if any — set from any
  // "View CR" trigger (header banner, grid popover, Activity Details panel,
  // the intake wizard's own confirmation step). Rendering the detail view
  // is an early return below, not another overlay layer, since it's meant
  // to read as its own full screen, not a panel stacked over the workspace.
  const [viewingCRReference, setViewingCRReference] = useState<string | null>(null)
  // The Project's baseline ledger — starts with the original approval and
  // gets one more entry every time an Approved CR is Applied (see
  // handleApplyCR). Never rewritten in place; each entry is kept forever,
  // which is the whole point of "Baseline History" — see baselineHistory.ts.
  const [baselineHistory, setBaselineHistory] = useState<BaselineHistoryEntry[]>([createOriginalBaselineEntry()])
  const [baselineHistoryOpen, setBaselineHistoryOpen] = useState(false)
  // Every Activity's operational-field history (Status/% Complete/Forecast
  // Finish/Actuals/Progress Notes) — entirely separate from submittedCRs
  // above. Lifted for the same reason scheduleRows is: switching away from
  // Schedule and back shouldn't lose it.
  const [activityHistory, setActivityHistory] = useState<ActivityHistoryEntry[]>([])

  const handleNavigateToSchedule = () => setActiveSection('schedule')
  const handleNavigateToActivity = (activityId: string) => {
    setScheduleSelectedId(activityId)
    setActiveSection('schedule')
  }
  const handleUpdateProgress = () => {
    setActiveSection('schedule')
    setUpdateProgressMode(true)
  }
  // The confirmed Status Date from an Update Progress batch save becomes
  // the Project's new "Last Progress Update" — shown in the header's
  // execution strip and offered back as next time's "Previous update".
  const handleProgressSaved = (statusDate: string) => {
    setProjectMeta((prev) => (prev.execution ? { ...prev, execution: { ...prev.execution, lastUpdated: statusDate } } : prev))
  }
  // Submitting a Change Request never touches the approved baseline itself
  // (baselineStart/baselineFinish, execution.baselineEndDate, ...) — the
  // only effects are a new record in the CR store and one more Project
  // sitting in "pending review," same as the header's existing "3 pending
  // CRs" count already implied was possible. The panel keeps itself open
  // to show its own confirmation step; this handler doesn't close it.
  // changeRequest is guaranteed set here — this only ever fires from the
  // panel this component renders conditionally on it.
  const handleChangeRequestSubmit = (
    proposedValue: string,
    justification: ChangeRequestJustification,
    impact: ScheduleImpactSummary | null,
  ): string => {
    const draft = changeRequest!
    const reference = nextCrReference(submittedCRs.length)
    // A 'text' draft (Overview, Strategic Alignment) has no real date to
    // format — the requester's own words are the display value, same as
    // currentApproved already is for these fields.
    const proposedDisplay = draft.fieldType === 'text' ? proposedValue : fmtCrDate(proposedValue)
    setSubmittedCRs((prev) => [
      ...prev,
      {
        reference,
        title: justification.title,
        project: projectMeta.name,
        affectedEntity: draft.affectedEntity,
        affectedField: draft.affectedField,
        currentApproved: draft.currentApproved,
        currentApprovedISO: draft.currentApprovedISO,
        proposedISO: proposedValue,
        proposedDisplay,
        scope: draft.scope,
        requestedBy: MOCK_CURRENT_USER,
        submittedDate: MOCK_TODAY,
        status: 'Awaiting Approval',
        reason: justification.reason,
        category: justification.category,
        priority: justification.priority,
        effectiveDate: justification.effectiveDate,
        businessImpact: justification.businessImpact,
        attachments: justification.attachments,
        scheduleImpact: impact,
        activity: [{ id: `${reference}-a1`, type: 'submitted', actor: MOCK_CURRENT_USER, timestamp: MOCK_TODAY }],
      },
    ])
    setProjectMeta((prev) =>
      prev.execution ? { ...prev, execution: { ...prev.execution, pendingChangeRequests: prev.execution.pendingChangeRequests + 1 } } : prev,
    )
    return reference
  }
  // Approve/Reject both resolve the request — Return for Information
  // deliberately doesn't decrement the pending count (see isOpenStatus):
  // nothing about the request is settled yet, it's just been kicked back
  // for more detail, so it should keep reading as pending everywhere a
  // protected field shows it.
  const handleCRDecision = (decision: 'approved' | 'rejected' | 'returned', comment: string) => {
    if (!viewingCRReference) return
    setSubmittedCRs((prev) => recordChangeRequestDecision(prev, viewingCRReference, decision, MOCK_CURRENT_USER, MOCK_TODAY, comment))
    if (decision !== 'returned') {
      setProjectMeta((prev) =>
        prev.execution
          ? { ...prev, execution: { ...prev.execution, pendingChangeRequests: Math.max(0, prev.execution.pendingChangeRequests - 1) } }
          : prev,
      )
    }
  }
  // The one CR action this prototype can actually perform end-to-end (no
  // new screen needed, unlike "View CR") — always permitted here since
  // MOCK_CURRENT_USER is the only requester identity this prototype has,
  // but real per-CR canWithdraw is still computed at each display site
  // (see changeRequestStore usage in ProjectHeader/ScheduleGrid/
  // ActivityDetailsPanel) so the permission check has somewhere to live
  // once there's more than one user.
  const handleWithdrawCR = (reference: string) => {
    setSubmittedCRs((prev) => prev.filter((cr) => cr.reference !== reference))
    setProjectMeta((prev) =>
      prev.execution
        ? { ...prev, execution: { ...prev.execution, pendingChangeRequests: Math.max(0, prev.execution.pendingChangeRequests - 1) } }
        : prev,
    )
  }
  // Approved → Applied: the one place a CR's proposed value actually
  // becomes the approved one. cr.currentApproved/proposedDisplay are
  // already exactly what's needed for the new Baseline History entry —
  // both were captured at submission time, so "what it superseded" is
  // never re-derived or guessed here.
  const handleApplyCR = (reference: string) => {
    const cr = submittedCRs.find((c) => c.reference === reference)
    if (!cr || cr.status !== 'Approved') return

    const scope = cr.scope
    if (scope?.kind === 'activity') {
      setScheduleRows((prev) => {
        const next = prev.map((r) => {
          if (r.id !== scope.id || r.kind !== 'activity') return r
          if (cr.affectedField === 'Baseline Start') return { ...r, baselineStart: cr.proposedISO }
          if (cr.affectedField === 'Baseline Finish') return { ...r, baselineFinish: cr.proposedISO }
          // A Forecast Finish CR (see ActivityDetailsPanel's
          // significant-schedule-impact gate) escalated an edit to the
          // *working* schedule, not the baseline — applying it moves `end`,
          // the same field a normal Forecast Finish edit would have, had it
          // been small enough to save directly.
          if (cr.affectedField === 'Forecast Finish') return { ...r, end: cr.proposedISO }
          return r
        })
        // Only a Forecast Finish actually drives the Finish-to-Start
        // cascade (see cascadeReschedule) — a Baseline field is reference
        // data, not part of the working schedule graph, so it never ripples.
        if (cr.affectedField !== 'Forecast Finish') return next
        const outcome = cascadeReschedule(next, scope.id)
        return outcome.ok ? outcome.rows : next
      })
    } else if (scope?.kind === 'milestone') {
      setScheduleRows((prev) => prev.map((r) => (r.id === scope.id && r.kind === 'milestone' ? { ...r, date: cr.proposedISO } : r)))
    } else if (scope?.kind === 'project') {
      setProjectMeta((prev) => (prev.execution ? { ...prev, execution: { ...prev.execution, baselineEndDate: cr.proposedISO } } : prev))
    }
    // 'phase' scope: no independent stored field to mutate — a Phase's
    // baseline is always derived from its child Activities (see
    // scheduleData.ts's getPhaseBaselineRange), so applying one only
    // records the status change and history entry below, not a data edit.

    setSubmittedCRs((prev) => applyChangeRequest(prev, reference, MOCK_CURRENT_USER, MOCK_TODAY))

    setBaselineHistory((prev) => [
      ...prev,
      {
        baselineNumber: prev.length + 1,
        date: MOCK_TODAY,
        source: `Created from ${reference}`,
        reason: cr.title,
        reference,
        affectedEntity: cr.affectedEntity,
        affectedField: cr.affectedField,
        previousApprovedValue: cr.currentApproved,
        newApprovedValue: cr.proposedDisplay,
      },
    ])
  }

  // Driven by real field commits (currently only Overview). A failed commit
  // simply leaves the last-known-good "Saved" state in place.
  const handleSaveStart = () => setSaveState('saving')
  const handleSaveEnd = (success: boolean) => {
    if (success) {
      setSaveState('saved')
      setSavedAtLabel('just now')
    } else {
      setSaveState('saved')
    }
  }

  // The mandatory fields captured at Project creation (Overview's identity/
  // governance fields, Strategic Alignment) go read-only the moment a
  // Project has moved into execution — `execution` is only ever populated
  // once a Project has been approved (see ProjectMeta/ProjectExecutionSnapshot
  // in types.ts), so its presence is the same signal ProjectHeader already
  // uses to gate the Baseline End field's own Change-Request protection.
  // In practice this is always false for DraftProjectShell's initialMeta and
  // always true for ProjectDetailsShell's — see those two pages.
  const locked = !!projectMeta.execution

  // Dashboard summarizes execution data (progress, health, trend widgets)
  // that doesn't exist until a Project is Active — dropped from Draft's tab
  // bar entirely rather than shown empty. activeSection can never actually
  // land on 'dashboard' while unlocked: it starts on 'overview' and nothing
  // else navigates to it (see goToSection's callers), so no fallback state
  // is needed here.
  const sections = locked ? PROJECT_SECTIONS : PROJECT_SECTIONS.filter((s) => s.id !== 'dashboard')

  const activeSectionDef = PROJECT_SECTIONS.find((s) => s.id === activeSection)!

  const goToSection = (id: SectionId) => {
    setActiveSection(id)
    setReadinessOpen(false)
  }

  const viewingCR = viewingCRReference ? submittedCRs.find((cr) => cr.reference === viewingCRReference) : undefined
  if (viewingCR) {
    return (
      <ChangeRequestDetailView
        cr={viewingCR}
        onClose={() => setViewingCRReference(null)}
        onDecision={handleCRDecision}
        onApply={handleApplyCR}
      />
    )
  }

  return (
    <div className="flex h-screen min-w-[1120px] flex-col bg-white text-slate-900">
      <ProjectHeader
        meta={projectMeta}
        saveState={saveState}
        savedAtLabel={savedAtLabel}
        onBack={onBack}
        onUpdateProgress={handleUpdateProgress}
        onRequestChange={setChangeRequest}
        onViewCR={setViewingCRReference}
        submittedCRs={submittedCRs}
        onWithdrawCR={handleWithdrawCR}
        onOpenBaselineHistory={() => setBaselineHistoryOpen(true)}
      />

      <ProjectViewBar
        active={activeSection}
        onSelect={setActiveSection}
        sections={sections}
        readiness={mockSectionReadiness}
        readinessOpen={readinessOpen}
        onToggleReadiness={() => setReadinessOpen((v) => !v)}
      />

      <div className="relative min-h-0 flex-1">
        <main className="h-full w-full overflow-hidden">
          {activeSection === 'dashboard' && <DashboardView onNavigateToSection={goToSection} />}
          {activeSection === 'overview' && (
            <OverviewView
              initialFields={initialOverviewFields}
              locked={locked}
              onRequestChange={setChangeRequest}
              submittedCRs={submittedCRs}
              onWithdrawCR={handleWithdrawCR}
              onViewCR={setViewingCRReference}
              onSaveStart={handleSaveStart}
              onSaveEnd={handleSaveEnd}
            />
          )}
          {activeSection === 'schedule' && (
            <ScheduleWorkspace
              rows={scheduleRows}
              setRows={setScheduleRows}
              selectedId={scheduleSelectedId}
              setSelectedId={setScheduleSelectedId}
              updateProgressMode={updateProgressMode}
              setUpdateProgressMode={setUpdateProgressMode}
              previousStatusDate={projectMeta.execution?.lastUpdated}
              onProgressSaved={handleProgressSaved}
              locked={locked}
              onRequestChange={setChangeRequest}
              submittedCRs={submittedCRs}
              onWithdrawCR={handleWithdrawCR}
              onViewCR={setViewingCRReference}
              activityHistory={activityHistory}
              onRecordHistory={(entries) => setActivityHistory((prev) => [...prev, ...entries])}
              onSaveStart={handleSaveStart}
              onSaveEnd={handleSaveEnd}
            />
          )}
          {activeSection === 'resources' && (
            <ResourcesView
              rows={scheduleRows}
              onNavigateToActivity={handleNavigateToActivity}
              onNavigateToSchedule={handleNavigateToSchedule}
            />
          )}
          {activeSection === 'budget-planned-dates' && (
            <BudgetView scheduleRows={scheduleRows} onSaveStart={handleSaveStart} onSaveEnd={handleSaveEnd} />
          )}
          {activeSection === 'risks' && (
            <RisksView initialRisks={initialRisks} onSaveStart={handleSaveStart} onSaveEnd={handleSaveEnd} />
          )}
          {activeSection === 'strategic-alignment' && (
            <StrategicAlignmentView
              initialAlignments={initialAlignments}
              locked={locked}
              onRequestChange={setChangeRequest}
              submittedCRs={submittedCRs}
              onWithdrawCR={handleWithdrawCR}
              onViewCR={setViewingCRReference}
              onSaveStart={handleSaveStart}
              onSaveEnd={handleSaveEnd}
            />
          )}
          {activeSection === 'business-case' && (
            <BusinessCaseView onSaveStart={handleSaveStart} onSaveEnd={handleSaveEnd} />
          )}
          {activeSection !== 'dashboard' &&
            activeSection !== 'overview' &&
            activeSection !== 'schedule' &&
            activeSection !== 'resources' &&
            activeSection !== 'budget-planned-dates' &&
            activeSection !== 'risks' &&
            activeSection !== 'strategic-alignment' &&
            activeSection !== 'business-case' && <SectionPlaceholder section={activeSectionDef} />}
        </main>

        {readinessOpen && (
          <>
            <div className="absolute inset-0 z-10" onClick={() => setReadinessOpen(false)} />
            <div className="absolute inset-y-0 right-0 z-20">
              <ReadinessPanel
                readiness={mockSectionReadiness}
                activeSection={activeSection}
                onNavigate={goToSection}
                onClose={() => setReadinessOpen(false)}
              />
            </div>
          </>
        )}

        {changeRequest && (
          // Above the Activity Details panel (z-30) — a Change Request
          // triggered from a baseline cell inside that panel should sit in
          // front of it, not behind.
          <div className="absolute inset-y-0 right-0 z-40">
            <ChangeRequestPanel
              project={projectMeta.name}
              request={changeRequest}
              rows={scheduleRows}
              onCancel={() => setChangeRequest(null)}
              onSubmit={handleChangeRequestSubmit}
              onViewCR={setViewingCRReference}
            />
          </div>
        )}

        {baselineHistoryOpen && (
          <div className="absolute inset-y-0 right-0 z-40">
            <BaselineHistoryPanel
              entries={baselineHistory}
              onClose={() => setBaselineHistoryOpen(false)}
              onViewCR={(reference) => {
                setBaselineHistoryOpen(false)
                setViewingCRReference(reference)
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
