import type { Status } from '../types'

const STYLES: Record<Status, string> = {
  'not-started': 'bg-gray-100 text-gray-600',
  'in-progress': 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  'at-risk': 'bg-amber-100 text-amber-700',
  delayed: 'bg-red-100 text-red-700',
}

const LABELS: Record<Status, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  completed: 'Completed',
  'at-risk': 'At Risk',
  delayed: 'Delayed',
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  )
}
