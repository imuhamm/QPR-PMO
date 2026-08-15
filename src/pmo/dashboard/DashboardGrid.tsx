import type { SectionId } from '../types'
import type { DashboardManifestEntry } from './dashboardManifests'
import { getWidgetDefinition } from './widgetRegistry'
import type { WidgetSize } from './widgets/DashboardWidget'
import { DashboardWidget } from './widgets/DashboardWidget'
import type { DashboardMode, DemoDashboardRole } from './roleConfig'
import type { ProjectDashboardData } from './data/dashboardModels'

// Uses the app's existing responsive grid/breakpoint convention (Tailwind's
// standard steps, nothing bespoke) — 2xl is included so 'large' and 'full'
// are actually distinct on a wide monitor instead of both meaning
// "the whole row" the way they would in a 3-column grid.
const SPAN_CLASS: Record<WidgetSize, string> = {
  small: 'col-span-1',
  medium: 'col-span-1 md:col-span-2',
  large: 'col-span-1 md:col-span-2 xl:col-span-3 2xl:col-span-3',
  full: 'col-span-full',
}

// Purely mechanical: looks up each manifest entry's widget in the registry
// and lays it out. Knows nothing about roles, modes, or what a widget
// contains — swapping the manifest is the only thing that changes what
// renders here. While `isLoading`, every tile shows a titled skeleton
// instead of calling the widget's own render (so a widget's content logic
// never has to know about the dashboard's initial-load state itself).
export function DashboardGrid({
  entries,
  role,
  mode,
  data,
  isLoading,
  onNavigateToSection,
}: {
  entries: DashboardManifestEntry[]
  role: DemoDashboardRole
  mode: DashboardMode
  data: ProjectDashboardData
  isLoading: boolean
  onNavigateToSection: (id: SectionId) => void
}) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-xs text-slate-400">
        No widgets configured for this role/mode yet.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {entries.map((entry) => {
        const def = getWidgetDefinition(entry.widgetId)
        if (!def) return null
        return (
          <div key={entry.widgetId} className={SPAN_CLASS[def.size]}>
            {isLoading ? (
              <DashboardWidget title={def.title} loadState="loading" />
            ) : (
              def.render({ role, mode, data, onNavigateToSection })
            )}
          </div>
        )
      })}
    </div>
  )
}
