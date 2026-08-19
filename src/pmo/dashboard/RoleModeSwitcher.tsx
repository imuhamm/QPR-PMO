import { DASHBOARD_ROLES } from './roleConfig'
import type { DashboardMode, DemoDashboardRole } from './roleConfig'

const MODE_LABEL: Record<DashboardMode, string> = { operational: 'Operational', analytical: 'Analytical' }

// Presentation-only chrome for the Dashboard tab: the "Preview as" role
// picker (a fixed list of 6 — plain select, same convention as the Register
// page's own filter dropdowns in FilterPopover.tsx) plus a compact
// segmented mode switch that only appears when the current role actually
// supports more than one mode. The indigo pill is the whole "this previews
// a role, it isn't a real permission change" signal — deliberately no
// banner or explanatory copy, since that would read as a caveat during a
// live client walkthrough rather than a normal piece of UI chrome.
export function RoleModeSwitcher({
  role,
  onRoleChange,
  mode,
  onModeChange,
  availableModes,
}: {
  role: DemoDashboardRole
  onRoleChange: (role: DemoDashboardRole) => void
  mode: DashboardMode
  onModeChange: (mode: DashboardMode) => void
  availableModes: DashboardMode[]
}) {
  return (
    <div className="flex items-center gap-4">
      <label className="flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 py-1 pl-3 pr-1.5 text-xs font-medium text-indigo-700">
        Preview as
        <select
          value={role}
          onChange={(e) => onRoleChange(e.target.value as DemoDashboardRole)}
          className="rounded border border-indigo-200 bg-white px-2 py-1 text-xs font-normal text-slate-800 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
        >
          {DASHBOARD_ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </label>

      {availableModes.length > 1 && (
        <div className="inline-flex rounded border border-slate-300 p-0.5 text-xs">
          {availableModes.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              aria-pressed={mode === m}
              className={`rounded px-2 py-0.5 font-medium transition-colors ${
                mode === m ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
