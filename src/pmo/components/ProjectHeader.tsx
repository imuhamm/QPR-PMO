import { useState } from 'react'
import type { ReactNode } from 'react'
import type { ProjectExecutionSnapshot, ProjectMeta, SaveState } from '../types'
import { SaveIndicator } from './SaveIndicator'
import { ProjectStatusBadge } from '../shared/ProjectStatusBadge'
import { BaselineValue } from '../shared/BaselineValue'
import type { ChangeRequestDraft } from '../shared/ChangeRequestPanel'
import { canWithdrawStatus, findPendingChangeRequest, pendingStatusLabel } from '../shared/changeRequestStore'
import type { SubmittedChangeRequest } from '../shared/changeRequestStore'
import { MOCK_CURRENT_USER } from '../schedule/scheduleData'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const HEALTH_DOT: Record<ProjectExecutionSnapshot['health'], string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-rose-500',
}
const HEALTH_LABEL: Record<ProjectExecutionSnapshot['health'], string> = {
  green: 'On Track',
  amber: 'At Risk',
  red: 'Critical',
}

// One label:value pair in the execution strip — same "muted label, dark
// value" convention row 1 already uses for Program/PM, just a level down in
// a second row so the strip reads as an extension of the header, not a
// stat-card grid.
function ExecutionStat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="shrink-0 whitespace-nowrap text-slate-500">
      {label}: <span className="font-medium text-slate-700">{children}</span>
    </span>
  )
}

function ExecutionStrip({
  execution,
  onRequestChange,
  submittedCRs,
  onWithdrawCR,
  onViewCR,
}: {
  execution: ProjectExecutionSnapshot
  onRequestChange: (draft: ChangeRequestDraft) => void
  submittedCRs: SubmittedChangeRequest[]
  onWithdrawCR: (reference: string) => void
  onViewCR: (reference: string) => void
}) {
  const varianceLabel =
    execution.varianceDays === 0
      ? 'On baseline'
      : execution.varianceDays > 0
        ? `+${execution.varianceDays}d late`
        : `${execution.varianceDays}d early`
  const varianceClass =
    execution.varianceDays > 0 ? 'text-rose-600' : execution.varianceDays < 0 ? 'text-emerald-600' : 'text-slate-700'

  // Project Finish is the one field on this page whose pending CR affects
  // the entire Project, not one row — the exception the task calls out for
  // more prominence than a dot-and-popover. Still not a big banner: one
  // slim tinted row, same visual weight as the strip above it.
  const projectFinishCR = findPendingChangeRequest(submittedCRs, { kind: 'project' }, 'Project Finish')

  return (
    <>
      <div className="flex items-center gap-3 border-t border-slate-100 px-3 py-1 text-xs">
        <ExecutionStat label="Progress">{execution.progressPct}%</ExecutionStat>

        <span className="flex shrink-0 items-center gap-1.5 text-slate-500">
          Health:
          <span className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${HEALTH_DOT[execution.health]}`} />
            <span className="font-medium text-slate-700">{HEALTH_LABEL[execution.health]}</span>
          </span>
        </span>

        <span className="h-3.5 w-px shrink-0 bg-slate-200" />

        <span className="shrink-0 whitespace-nowrap text-slate-500">
          Baseline End:{' '}
          <BaselineValue
            triggerClassName="rounded-sm px-1 py-0.5 font-medium text-slate-700"
            onRequestChange={() =>
              onRequestChange({
                affectedEntity: 'Project Schedule',
                affectedField: 'Project Finish',
                currentApproved: formatDate(execution.baselineEndDate),
                currentApprovedISO: execution.baselineEndDate,
                scope: { kind: 'project' },
              })
            }
            pending={
              projectFinishCR
                ? {
                    reference: projectFinishCR.reference,
                    proposedDisplay: projectFinishCR.proposedDisplay,
                    statusLabel: pendingStatusLabel(projectFinishCR.status),
                    canWithdraw: projectFinishCR.requestedBy === MOCK_CURRENT_USER && canWithdrawStatus(projectFinishCR.status),
                  }
                : undefined
            }
            onWithdraw={() => projectFinishCR && onWithdrawCR(projectFinishCR.reference)}
            onViewCR={() => projectFinishCR && onViewCR(projectFinishCR.reference)}
          >
            {formatDate(execution.baselineEndDate)}
          </BaselineValue>
        </span>
        <ExecutionStat label="Forecast End">{formatDate(execution.forecastEndDate)}</ExecutionStat>
        <span className="shrink-0 whitespace-nowrap text-slate-500">
          Variance: <span className={`font-medium ${varianceClass}`}>{varianceLabel}</span>
        </span>

        <span className="h-3.5 w-px shrink-0 bg-slate-200" />

        <ExecutionStat label="Last Update">{formatDate(execution.lastUpdated)}</ExecutionStat>

        {execution.pendingChangeRequests > 0 && (
          <span className="shrink-0 whitespace-nowrap text-slate-400">
            {execution.pendingChangeRequests} pending CR{execution.pendingChangeRequests === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {projectFinishCR && (
        <div className="flex items-center gap-3 border-t border-amber-100 bg-amber-50/50 px-3 py-1 text-xs">
          <span className="shrink-0 font-medium text-amber-800">Project Finish</span>
          <span className="text-amber-700">
            Proposed: <span className="font-semibold text-amber-900">{projectFinishCR.proposedDisplay}</span>
          </span>
          <span className="text-amber-700">
            {projectFinishCR.reference} · {pendingStatusLabel(projectFinishCR.status)}
          </span>
          <span className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => onViewCR(projectFinishCR.reference)}
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              View CR
            </button>
            {projectFinishCR.requestedBy === MOCK_CURRENT_USER && canWithdrawStatus(projectFinishCR.status) && (
              <button
                type="button"
                onClick={() => onWithdrawCR(projectFinishCR.reference)}
                className="font-medium text-rose-600 hover:text-rose-700"
              >
                Withdraw Request
              </button>
            )}
          </span>
        </div>
      )}
    </>
  )
}

export function ProjectHeader({
  meta,
  saveState,
  savedAtLabel,
  onBack,
  onUpdateProgress,
  onRequestChange,
  submittedCRs,
  onWithdrawCR,
  onViewCR,
  onOpenBaselineHistory,
}: {
  meta: ProjectMeta
  saveState: SaveState
  savedAtLabel: string
  onBack?: () => void
  onUpdateProgress?: () => void
  onRequestChange: (draft: ChangeRequestDraft) => void
  submittedCRs: SubmittedChangeRequest[]
  onWithdrawCR: (reference: string) => void
  onViewCR: (reference: string) => void
  onOpenBaselineHistory: () => void
}) {
  const [moreOpen, setMoreOpen] = useState(false)
  const { execution } = meta

  return (
    <header className="shrink-0 border-b border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-4 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-3 text-xs">
          {onBack && (
            <>
              <button
                type="button"
                onClick={onBack}
                className="shrink-0 font-medium text-slate-500 hover:text-slate-800"
              >
                ← Projects
              </button>
              <span className="h-3.5 w-px shrink-0 bg-slate-200" />
            </>
          )}

          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-sm font-semibold text-slate-900">{meta.name}</h1>
            <ProjectStatusBadge status={meta.status} />
          </div>

          <span className="h-3.5 w-px shrink-0 bg-slate-200" />

          <span className="shrink-0 text-slate-500">
            Program: <span className="font-medium text-slate-700">{meta.program}</span>
          </span>
          <span className="shrink-0 text-slate-500">
            PM: <span className="font-medium text-slate-700">{meta.projectManager}</span>
          </span>
          {meta.projectOwner && (
            <span className="shrink-0 text-slate-500">
              Owner: <span className="font-medium text-slate-700">{meta.projectOwner}</span>
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <SaveIndicator state={saveState} savedAtLabel={savedAtLabel} />

          <div className="h-3.5 w-px bg-slate-200" />

          {execution ? (
            <button
              type="button"
              onClick={onUpdateProgress}
              title="Log a progress update for this Project"
              className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              Update Progress
            </button>
          ) : (
            <button
              type="button"
              disabled
              title="Submit for review will be enabled once required sections are complete"
              className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-400 disabled:cursor-not-allowed"
            >
              Submit for Review
            </button>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-label="More project actions"
              className="rounded px-1.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
            >
              ⋯
            </button>
            {moreOpen && (
              <div
                className="absolute right-0 z-30 mt-1 w-40 rounded-md border border-slate-200 bg-white py-1 text-xs shadow-md"
                onMouseLeave={() => setMoreOpen(false)}
              >
                {execution && (
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false)
                      onOpenBaselineHistory()
                    }}
                    className="block w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50"
                  >
                    Baseline History
                  </button>
                )}
                <button type="button" className="block w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50">
                  Duplicate
                </button>
                <button type="button" className="block w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50">
                  Export
                </button>
                {!execution && (
                  <button type="button" className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50">
                    Delete Draft
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {execution && (
        <ExecutionStrip
          execution={execution}
          onRequestChange={onRequestChange}
          submittedCRs={submittedCRs}
          onWithdrawCR={onWithdrawCR}
          onViewCR={onViewCR}
        />
      )}
    </header>
  )
}
