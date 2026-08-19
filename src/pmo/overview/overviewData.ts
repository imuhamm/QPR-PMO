export interface OverviewFields {
  name: string
  description: string
  program: string
  department: string
  projectType: string
  projectManager: string
  projectOwner: string
  reportingFrequency: string
  outcomes: string
}

// The Approved/Active demo's Overview content — ProjectDetailsShell only,
// left exactly as it always was.
export const initialOverview: OverviewFields = {
  name: 'Client Portal Revamp',
  description:
    'Redesign and rebuild the client-facing portal for better self-service, reducing support ticket volume and improving customer satisfaction scores.',
  program: 'Digital Experience Program',
  department: 'Information Technology',
  projectType: 'Strategic Initiative',
  projectManager: 'M. Hesham',
  projectOwner: 'S. Al-Rashid',
  reportingFrequency: 'Monthly',
  outcomes: '',
}

// The Draft demo's Overview content — DraftProjectShell only. Holds exactly
// what Create Project actually requires (Name/Description/Program/Manager/
// Owner/Reporting Frequency are all mandatory there — see CreateProjectModal)
// as if this Project had just been created; Department and Project Type
// aren't captured by that form, so they start unset here, same as a real
// freshly-created Project would show them.
export const draftOverview: OverviewFields = {
  name: 'Client Portal Revamp',
  description:
    'Redesign and rebuild the client-facing portal for better self-service, reducing support ticket volume and improving customer satisfaction scores.',
  program: 'Digital Experience Program',
  department: '',
  projectType: '',
  projectManager: 'M. Hesham',
  projectOwner: 'S. Al-Rashid',
  reportingFrequency: 'Monthly',
  outcomes: '',
}

// Sourced from the same corpus of Program names already used across this
// app (Overview's own Program, the Projects Register) — not invented here.
export const PROGRAM_OPTIONS = [
  'Digital Experience Program',
  'Cloud Modernization Program',
  'Data & Analytics Program',
  'Customer Success Program',
]

export const DEPARTMENT_OPTIONS = [
  'Information Technology',
  'Marketing',
  'Operations',
  'Customer Experience',
  'Finance',
]

export const PROJECT_TYPE_OPTIONS = [
  'Strategic Initiative',
  'Operational Improvement',
  'Compliance',
  'Innovation / R&D',
]

export const PEOPLE_OPTIONS = ['M. Hesham', 'S. Al-Rashid', 'A. Farouk', 'S. Ali', 'R. Nasser', 'L. Haddad']

export const REPORTING_FREQUENCY_OPTIONS = ['Weekly', 'Bi-weekly', 'Monthly', 'Quarterly']
