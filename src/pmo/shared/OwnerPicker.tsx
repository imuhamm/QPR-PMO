import { PEOPLE_OPTIONS } from '../overview/overviewData'
import { SearchableSelect } from './SearchableSelect'

// Owner "from QPR UMS" — same person directory Overview's Project Manager /
// Project Owner fields already use. Thin wrapper over SearchableSelect so
// this and the Create Project modal's pickers share one implementation.
export function OwnerPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <SearchableSelect value={value} onChange={onChange} options={PEOPLE_OPTIONS} emptyOptionLabel="Unassigned" />
  )
}
