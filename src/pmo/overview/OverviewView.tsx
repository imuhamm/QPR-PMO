import { useRef, useState } from 'react'
import { DEPARTMENT_OPTIONS, PEOPLE_OPTIONS, PROJECT_TYPE_OPTIONS, REPORTING_FREQUENCY_OPTIONS } from './overviewData'
import type { OverviewFields } from './overviewData'
import { PropertyRow, SectionHeading } from './PropertyRow'
import { TextField } from './TextField'
import { TextAreaField } from './TextAreaField'
import { SelectField } from './SelectField'
import { BaselineValue } from '../shared/BaselineValue'
import type { ChangeRequestDraft } from '../shared/ChangeRequestPanel'
import { canWithdrawStatus, findPendingChangeRequest, pendingStatusLabel } from '../shared/changeRequestStore'
import type { SubmittedChangeRequest } from '../shared/changeRequestStore'
import { MOCK_CURRENT_USER } from '../schedule/scheduleData'

const SIMULATED_DELAY = 550

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// The identity/governance fields captured as mandatory at Project creation
// (Project Name, Description, Project Manager, Project Owner, Reporting
// Frequency) — everything this view renders that ISN'T in this list
// (Department, Project Type, Outcomes) was never mandatory at creation, so
// it stays freely editable even once `locked`. Program is separately locked
// unconditionally for an unrelated reason (portfolio-managed) — see its own
// SelectField below, not this mechanism.
export function OverviewView({
  initialFields,
  locked,
  onRequestChange,
  submittedCRs,
  onWithdrawCR,
  onViewCR,
  onSaveStart,
  onSaveEnd,
}: {
  /** Supplied by the page (ProjectDetailsShell/DraftProjectShell via ProjectWorkspace) — each starts this view from its own content rather than a single shared constant. */
  initialFields: OverviewFields
  locked: boolean
  onRequestChange: (draft: ChangeRequestDraft) => void
  submittedCRs: SubmittedChangeRequest[]
  onWithdrawCR: (reference: string) => void
  onViewCR: (reference: string) => void
  onSaveStart: () => void
  onSaveEnd: (success: boolean) => void
}) {
  const [fields, setFields] = useState<OverviewFields>(initialFields)
  // Department's first save attempt always fails, to demonstrate the save-error/retry state.
  const departmentFailedOnce = useRef(false)

  const commit = <K extends keyof OverviewFields>(key: K) =>
    async (value: string) => {
      onSaveStart()
      try {
        if (key === 'department' && !departmentFailedOnce.current) {
          departmentFailedOnce.current = true
          await delay(SIMULATED_DELAY)
          onSaveEnd(false)
          throw new Error('Save failed')
        }
        await delay(SIMULATED_DELAY)
        setFields((prev) => ({ ...prev, [key]: value }))
        onSaveEnd(true)
      } catch (err) {
        onSaveEnd(false)
        throw err
      }
    }

  // One shared trigger for every mandatory-at-creation field once `locked`
  // — same BaselineValue component Schedule's baseline dates already use,
  // so "read-only, requires a Change Request" reads identically everywhere
  // in the app rather than inventing a second lock affordance here.
  const lockedField = (field: string, display: string) => {
    const pending = findPendingChangeRequest(submittedCRs, undefined, field)
    return (
      <BaselineValue
        triggerClassName="w-full min-w-0 rounded-sm px-1.5 py-0.5 text-left text-xs text-slate-800 hover:bg-slate-50"
        onRequestChange={() =>
          onRequestChange({
            affectedEntity: 'Project Details',
            affectedField: field,
            currentApproved: display || 'Not set',
            fieldType: 'text',
          })
        }
        pending={
          pending
            ? {
                reference: pending.reference,
                proposedDisplay: pending.proposedDisplay,
                statusLabel: pendingStatusLabel(pending.status),
                canWithdraw: pending.requestedBy === MOCK_CURRENT_USER && canWithdrawStatus(pending.status),
              }
            : undefined
        }
        onWithdraw={() => pending && onWithdrawCR(pending.reference)}
        onViewCR={() => pending && onViewCR(pending.reference)}
      >
        {display || 'Not set'}
      </BaselineValue>
    )
  }

  return (
    <div className="grid h-full grid-cols-2 gap-x-10 overflow-y-auto px-4 py-3">
      <div>
        <SectionHeading title="Project Definition" />

        <PropertyRow label="Project Name" required>
          {locked ? lockedField('Project Name', fields.name) : <TextField value={fields.name} onCommit={commit('name')} required />}
        </PropertyRow>

        <PropertyRow label="Description" required>
          {locked ? (
            lockedField('Description', fields.description)
          ) : (
            <TextAreaField value={fields.description} onCommit={commit('description')} />
          )}
        </PropertyRow>

        <PropertyRow label="Program">
          <SelectField
            value={fields.program}
            options={[]}
            onCommit={commit('program')}
            disabled
            disabledReason="Managed at the portfolio level — contact your PMO admin to change."
          />
        </PropertyRow>

        <PropertyRow label="Department">
          <SelectField value={fields.department} options={DEPARTMENT_OPTIONS} onCommit={commit('department')} />
        </PropertyRow>

        <PropertyRow label="Project Type">
          <SelectField
            value={fields.projectType}
            options={PROJECT_TYPE_OPTIONS}
            onCommit={commit('projectType')}
          />
        </PropertyRow>
      </div>

      <div className="border-l border-slate-200 pl-10">
        <SectionHeading title="Ownership & Governance" />

        <PropertyRow label="Project Manager" required>
          {locked ? (
            lockedField('Project Manager', fields.projectManager)
          ) : (
            <SelectField value={fields.projectManager} options={PEOPLE_OPTIONS} onCommit={commit('projectManager')} />
          )}
        </PropertyRow>

        <PropertyRow label="Project Owner" required>
          {locked ? (
            lockedField('Project Owner', fields.projectOwner)
          ) : (
            <SelectField value={fields.projectOwner} options={PEOPLE_OPTIONS} onCommit={commit('projectOwner')} />
          )}
        </PropertyRow>

        <PropertyRow label="Reporting Frequency" required>
          {locked ? (
            lockedField('Reporting Frequency', fields.reportingFrequency)
          ) : (
            <SelectField
              value={fields.reportingFrequency}
              options={REPORTING_FREQUENCY_OPTIONS}
              onCommit={commit('reportingFrequency')}
            />
          )}
        </PropertyRow>

        <PropertyRow label="Outcomes">
          <TextAreaField value={fields.outcomes} onCommit={commit('outcomes')} />
        </PropertyRow>
      </div>
    </div>
  )
}
