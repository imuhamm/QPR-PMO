import { useState } from 'react'
import { PROJECT_SECTIONS } from './types'
import type { SaveState, SectionId } from './types'
import { mockProjectMeta, mockSectionReadiness } from './data/mockProjectDetails'
import { ProjectHeader } from './components/ProjectHeader'
import { ProjectViewBar } from './components/ProjectViewBar'
import { ReadinessPanel } from './components/ReadinessPanel'
import { SectionPlaceholder } from './components/SectionPlaceholder'
import { ScheduleWorkspace } from './schedule/ScheduleWorkspace'
import { initialScheduleRows } from './schedule/scheduleData'
import type { ScheduleRow } from './schedule/scheduleData'
import { OverviewView } from './overview/OverviewView'
import { ResourcesView } from './resources/ResourcesView'
import { BudgetView } from './budget/BudgetView'
import { RisksView } from './risks/RisksView'
import { StrategicAlignmentView } from './strategicAlignment/StrategicAlignmentView'
import { BusinessCaseView } from './businessCase/BusinessCaseView'
import { DashboardView } from './dashboard/DashboardView'

// Header, view bar, and the readiness overlay stay mounted; only the canvas
// beneath the view bar swaps per section.
export function ProjectDetailsShell({ onBack }: { onBack?: () => void }) {
  const [activeSection, setActiveSection] = useState<SectionId>('overview')
  const [readinessOpen, setReadinessOpen] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [savedAtLabel, setSavedAtLabel] = useState('just now')

  // Lifted out of ScheduleWorkspace: Resources reads the same Activities,
  // and it means Schedule's edits survive switching to another view and back.
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>(initialScheduleRows)
  const [scheduleSelectedId, setScheduleSelectedId] = useState<string | null>(null)

  const handleNavigateToSchedule = () => setActiveSection('schedule')
  const handleNavigateToActivity = (activityId: string) => {
    setScheduleSelectedId(activityId)
    setActiveSection('schedule')
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

  const activeSectionDef = PROJECT_SECTIONS.find((s) => s.id === activeSection)!

  const goToSection = (id: SectionId) => {
    setActiveSection(id)
    setReadinessOpen(false)
  }

  return (
    <div className="flex h-screen min-w-[1120px] flex-col bg-white text-slate-900">
      <ProjectHeader meta={mockProjectMeta} saveState={saveState} savedAtLabel={savedAtLabel} onBack={onBack} />

      <ProjectViewBar
        active={activeSection}
        onSelect={setActiveSection}
        readiness={mockSectionReadiness}
        readinessOpen={readinessOpen}
        onToggleReadiness={() => setReadinessOpen((v) => !v)}
      />

      <div className="relative min-h-0 flex-1">
        <main className="h-full w-full overflow-hidden">
          {activeSection === 'dashboard' && <DashboardView onNavigateToSection={goToSection} />}
          {activeSection === 'overview' && (
            <OverviewView onSaveStart={handleSaveStart} onSaveEnd={handleSaveEnd} />
          )}
          {activeSection === 'schedule' && (
            <ScheduleWorkspace
              rows={scheduleRows}
              setRows={setScheduleRows}
              selectedId={scheduleSelectedId}
              setSelectedId={setScheduleSelectedId}
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
            <RisksView onSaveStart={handleSaveStart} onSaveEnd={handleSaveEnd} />
          )}
          {activeSection === 'strategic-alignment' && (
            <StrategicAlignmentView onSaveStart={handleSaveStart} onSaveEnd={handleSaveEnd} />
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
      </div>
    </div>
  )
}
