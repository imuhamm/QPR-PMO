import { useRef, useState } from 'react'
import {
  DEPARTMENT_OPTIONS,
  PEOPLE_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  REPORTING_FREQUENCY_OPTIONS,
  initialOverview,
} from './overviewData'
import type { OverviewFields } from './overviewData'
import { PropertyRow, SectionHeading } from './PropertyRow'
import { TextField } from './TextField'
import { TextAreaField } from './TextAreaField'
import { SelectField } from './SelectField'

const SIMULATED_DELAY = 550

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function OverviewView({
  onSaveStart,
  onSaveEnd,
}: {
  onSaveStart: () => void
  onSaveEnd: (success: boolean) => void
}) {
  const [fields, setFields] = useState<OverviewFields>(initialOverview)
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

  return (
    <div className="grid h-full grid-cols-2 gap-x-10 overflow-y-auto px-4 py-3">
      <div>
        <SectionHeading title="Project Definition" />

        <PropertyRow label="Project Name" required>
          <TextField value={fields.name} onCommit={commit('name')} required />
        </PropertyRow>

        <PropertyRow label="Description">
          <TextAreaField value={fields.description} onCommit={commit('description')} />
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

        <PropertyRow label="Project Manager">
          <SelectField
            value={fields.projectManager}
            options={PEOPLE_OPTIONS}
            onCommit={commit('projectManager')}
          />
        </PropertyRow>

        <PropertyRow label="Project Owner">
          <SelectField value={fields.projectOwner} options={PEOPLE_OPTIONS} onCommit={commit('projectOwner')} />
        </PropertyRow>

        <PropertyRow label="Reporting Frequency">
          <SelectField
            value={fields.reportingFrequency}
            options={REPORTING_FREQUENCY_OPTIONS}
            onCommit={commit('reportingFrequency')}
          />
        </PropertyRow>

        <PropertyRow label="Outcomes">
          <TextAreaField value={fields.outcomes} onCommit={commit('outcomes')} />
        </PropertyRow>
      </div>
    </div>
  )
}
