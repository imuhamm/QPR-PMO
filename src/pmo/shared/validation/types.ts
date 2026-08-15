// Field Error: prevents the current value from being saved (shown close to
// the field). Warning: can be saved, but the user may want to look at it —
// only ever applied where an existing, confirmed rule supports it (never a
// new business rule). Readiness Blocker is intentionally not part of this
// type — it's a section-level concept owned by ReadinessPanel/ProjectViewBar,
// with its own richer shape (SectionReadiness), not a per-field severity.
export type ValidationSeverity = 'field-error' | 'warning'
