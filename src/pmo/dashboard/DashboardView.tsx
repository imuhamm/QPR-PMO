import { useEffect, useState } from 'react'
import type { SectionId } from '../types'
import { DEFAULT_DEMO_ROLE, getRoleConfig } from './roleConfig'
import type { DashboardMode, DemoDashboardRole } from './roleConfig'
import { RoleModeSwitcher } from './RoleModeSwitcher'
import { getDashboardManifest } from './dashboardManifests'
import { DashboardGrid } from './DashboardGrid'
import { getProjectDashboardData } from './data/mockDashboardData'

const INITIAL_LOAD_DELAY = 450

// Role + Mode -> manifest -> registry -> grid -> widgets. This container
// owns only the presentation-only "view as" state (previewRole/previewMode)
// — nothing else in the app reads it, and nothing here makes an
// authorization decision from it. Deleting this file (or just the
// RoleModeSwitcher line below) removes the whole demo affordance without
// touching any other Project Details view.
export function DashboardView({ onNavigateToSection }: { onNavigateToSection: (id: SectionId) => void }) {
  const [previewRole, setPreviewRole] = useState<DemoDashboardRole>(DEFAULT_DEMO_ROLE)
  const [previewMode, setPreviewMode] = useState<DashboardMode>(getRoleConfig(DEFAULT_DEMO_ROLE).defaultMode)

  // One-time simulated fetch when the tab mounts (matches every other
  // view's async-load convention) — this is NOT re-triggered by changing
  // role/mode, since switching perspective must update immediately, not
  // flash a loading state.
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), INITIAL_LOAD_DELAY)
    return () => clearTimeout(timer)
  }, [])

  const roleConfig = getRoleConfig(previewRole)

  const handleRoleChange = (role: DemoDashboardRole) => {
    setPreviewRole(role)
    // Switching perspective always resets to that role's own default mode
    // — a role never inherits a mode it doesn't support.
    setPreviewMode(getRoleConfig(role).defaultMode)
  }

  const manifest = getDashboardManifest(previewRole, previewMode)
  const data = getProjectDashboardData()

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 py-3">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <RoleModeSwitcher
          role={previewRole}
          onRoleChange={handleRoleChange}
          mode={previewMode}
          onModeChange={setPreviewMode}
          availableModes={roleConfig.supportedModes}
        />
      </div>

      <DashboardGrid
        entries={manifest}
        role={previewRole}
        mode={previewMode}
        data={data}
        isLoading={isLoading}
        onNavigateToSection={onNavigateToSection}
      />
    </div>
  )
}
