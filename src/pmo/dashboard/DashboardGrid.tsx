import type { SectionId } from '../types'
import type { DashboardManifestEntry, WidgetSpan } from './dashboardManifests'
import { getWidgetDefinition } from './widgetRegistry'
import { DashboardWidget } from './widgets/DashboardWidget'
import type { DashboardMode, DemoDashboardRole } from './roleConfig'
import type { ProjectDashboardData } from './data/dashboardModels'

// Literal class tables, not `col-span-${n}` string interpolation — Tailwind's
// JIT scanner extracts class names by regex over the raw file text, so a
// template literal would never match anything at build time. Mobile is the
// unprefixed (mobile-first) base, tablet overrides at `md:`, desktop
// overrides at `lg:` and up.
const MOBILE_SPAN: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
  7: 'col-span-7',
  8: 'col-span-8',
  9: 'col-span-9',
  10: 'col-span-10',
  11: 'col-span-11',
  12: 'col-span-12',
}
const TABLET_SPAN: Record<number, string> = {
  1: 'md:col-span-1',
  2: 'md:col-span-2',
  3: 'md:col-span-3',
  4: 'md:col-span-4',
  5: 'md:col-span-5',
  6: 'md:col-span-6',
  7: 'md:col-span-7',
  8: 'md:col-span-8',
  9: 'md:col-span-9',
  10: 'md:col-span-10',
  11: 'md:col-span-11',
  12: 'md:col-span-12',
}
const DESKTOP_SPAN: Record<number, string> = {
  1: 'lg:col-span-1',
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  5: 'lg:col-span-5',
  6: 'lg:col-span-6',
  7: 'lg:col-span-7',
  8: 'lg:col-span-8',
  9: 'lg:col-span-9',
  10: 'lg:col-span-10',
  11: 'lg:col-span-11',
  12: 'lg:col-span-12',
}

function spanClassName(span: WidgetSpan): string {
  return `${MOBILE_SPAN[span.mobile]} ${TABLET_SPAN[span.tablet]} ${DESKTOP_SPAN[span.desktop]}`
}

// Purely mechanical: looks up each manifest entry's widget in the registry
// and lays it out on a 12-column grid using the span the manifest assigned
// it. Knows nothing about roles, modes, or what a widget contains, and
// makes no width decisions of its own — swapping the manifest is the only
// thing that changes what renders here or how wide it is. While
// `isLoading`, every tile shows a titled skeleton instead of calling the
// widget's own render (so a widget's content logic never has to know about
// the dashboard's initial-load state itself).
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
    // items-start: a grid row's cells default to stretching to the tallest
    // sibling's height, which forces short widgets (e.g. a 3-column compact
    // stat panel) to pad themselves out to match a much taller neighbor
    // (e.g. a 9-column primary list). Each widget should only be as tall as
    // its own content.
    <div className="grid grid-cols-12 items-start gap-3">
      {entries.map((entry) => {
        const def = getWidgetDefinition(entry.widgetId)
        if (!def) return null
        return (
          <div key={entry.widgetId} className={spanClassName(entry.span)}>
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
