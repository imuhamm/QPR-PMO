export interface RiskRow {
  id: string
  name: string
  description?: string
  owner?: string
  impact: number // 1–5
  likelihood: number // 1–5
  mitigation?: string
}

export function riskValue(risk: RiskRow): number {
  return risk.impact * risk.likelihood
}

export const MAX_RISK_VALUE = 25 // 5 (Impact) × 5 (Likelihood)

// The Approved/Active demo's Risks — ProjectDetailsShell only, left exactly
// as it always was. Sample content so the register's visual range (varying
// scores, mitigation text) is reviewable immediately — not a claim that a
// Project must start with Risks recorded. Removable, same as any other row
// here.
export const initialRisks: RiskRow[] = [
  {
    id: 'risk-1',
    name: 'Key vendor delivery delay',
    owner: 'A. Farouk',
    impact: 4,
    likelihood: 3,
    mitigation: 'Maintain a secondary vendor shortlist; carry a 2-week schedule buffer.',
  },
  {
    id: 'risk-2',
    name: 'Scope creep from stakeholder requests',
    owner: 'M. Hesham',
    impact: 3,
    likelihood: 2,
    mitigation: 'Formal change-request process with sponsor sign-off required.',
  },
  {
    id: 'risk-3',
    name: 'Key resource attrition',
    owner: 'S. Ali',
    impact: 5,
    likelihood: 2,
    mitigation: 'Cross-train a backup owner on critical Activities.',
  },
]

// The Draft demo's Risks — DraftProjectShell only. Empty: nothing here is
// mandatory at Project creation, and a fresh Draft hasn't done a risk pass
// yet.
export const draftRisks: RiskRow[] = []

export type RiskPatch = Omit<RiskRow, 'id'>

export function createRisk(patch: RiskPatch): RiskRow {
  return { id: `risk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...patch }
}

export function addRisk(risks: RiskRow[], patch: RiskPatch): RiskRow[] {
  return [...risks, createRisk(patch)]
}

export function updateRisk(risks: RiskRow[], id: string, patch: RiskPatch): RiskRow[] {
  return risks.map((r) => (r.id === id ? { id: r.id, ...patch } : r))
}

export function removeRisk(risks: RiskRow[], id: string): RiskRow[] {
  return risks.filter((r) => r.id !== id)
}
