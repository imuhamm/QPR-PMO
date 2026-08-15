// "View as" is a presentation-only perspective switcher for demoing the
// Dashboard to a client — it is NOT the logged-in user's real role, and
// nothing outside src/pmo/dashboard should ever read it for an
// authorization decision. Named distinctly from any future real
// user/permission role for that reason.
export type DemoDashboardRole =
  | 'project-manager'
  | 'program-manager'
  | 'pmo-office'
  | 'project-member'
  | 'admin'
  | 'executive'

export type DashboardMode = 'operational' | 'analytical'

export interface DashboardRoleConfig {
  id: DemoDashboardRole
  label: string
  defaultMode: DashboardMode
  /** Which modes this role's dashboard offers. Order = display order in the mode switch. */
  supportedModes: DashboardMode[]
}

// Confirmed defaults/support matrix — do not infer additional modes for a
// role beyond what's listed here.
export const DASHBOARD_ROLES: DashboardRoleConfig[] = [
  { id: 'project-manager', label: 'Project Manager', defaultMode: 'operational', supportedModes: ['operational', 'analytical'] },
  { id: 'program-manager', label: 'Program Manager', defaultMode: 'analytical', supportedModes: ['analytical', 'operational'] },
  { id: 'pmo-office', label: 'PMO Office', defaultMode: 'analytical', supportedModes: ['analytical', 'operational'] },
  { id: 'project-member', label: 'Project Member', defaultMode: 'operational', supportedModes: ['operational'] },
  { id: 'admin', label: 'Admin', defaultMode: 'operational', supportedModes: ['operational'] },
  { id: 'executive', label: 'Executive', defaultMode: 'analytical', supportedModes: ['analytical'] },
]

export const DEFAULT_DEMO_ROLE: DemoDashboardRole = 'project-manager'

export function getRoleConfig(role: DemoDashboardRole): DashboardRoleConfig {
  return DASHBOARD_ROLES.find((r) => r.id === role)!
}

export function roleSupportsMode(role: DemoDashboardRole, mode: DashboardMode): boolean {
  return getRoleConfig(role).supportedModes.includes(mode)
}
