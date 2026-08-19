// Sourced from QPR Metrics — Objectives and KPIs are external reference
// data, not owned by this Project. Shape carries a code + name + context so
// similarly-named items stay distinguishable.
export interface MetricsItem {
  id: string
  code: string
  name: string
  context?: string
}

export const mockObjectives: MetricsItem[] = [
  { id: 'so-101', code: 'SO-101', name: 'Improve Customer Retention', context: 'Sponsor: VP Customer Success' },
  {
    id: 'so-102',
    code: 'SO-102',
    name: 'Improve Customer Retention (Enterprise Segment)',
    context: 'Sponsor: VP Enterprise Sales',
  },
  { id: 'so-201', code: 'SO-201', name: 'Accelerate Digital Transformation', context: 'Sponsor: CIO' },
  { id: 'so-210', code: 'SO-210', name: 'Reduce Operational Cost', context: 'Sponsor: COO' },
  { id: 'so-305', code: 'SO-305', name: 'Expand Market Share', context: 'Sponsor: CMO' },
  { id: 'so-410', code: 'SO-410', name: 'Strengthen Data Governance', context: 'Sponsor: CIO' },
]

export const mockKPIs: MetricsItem[] = [
  { id: 'kpi-014', code: 'KPI-014', name: 'Net Promoter Score', context: 'Unit: score (-100 to 100)' },
  { id: 'kpi-015', code: 'KPI-015', name: 'Net Promoter Score (Enterprise)', context: 'Unit: score (-100 to 100)' },
  { id: 'kpi-022', code: 'KPI-022', name: 'Customer Churn Rate', context: 'Unit: %' },
  { id: 'kpi-031', code: 'KPI-031', name: 'Digital Adoption Rate', context: 'Unit: %' },
  { id: 'kpi-040', code: 'KPI-040', name: 'Operating Cost Ratio', context: 'Unit: %' },
  { id: 'kpi-055', code: 'KPI-055', name: 'Market Share', context: 'Unit: %' },
  { id: 'kpi-060', code: 'KPI-060', name: 'Data Quality Score', context: 'Unit: score (0-100)' },
  { id: 'kpi-063', code: 'KPI-063', name: 'Time to Value', context: 'Unit: days' },
]

// One Strategic Alignment record per Project (the UI caps `alignments` to a
// single entry), but that record links to multiple Strategic Objectives and
// multiple KPIs — both are confirmed multi-select, not a single Objective
// paired with a single KPI.
export interface StrategicAlignmentEntry {
  id: string
  objectiveIds: string[]
  kpiIds: string[]
}
