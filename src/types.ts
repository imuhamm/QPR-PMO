export type Status = 'not-started' | 'in-progress' | 'completed' | 'at-risk' | 'delayed'

export interface Activity {
  id: string
  name: string
  status: Status
  startDate: string
  endDate: string
  owner?: string
}

export interface Milestone {
  id: string
  name: string
  status: Status
  dueDate: string
  activities: Activity[]
}

export interface Phase {
  id: string
  name: string
  status: Status
  startDate: string
  endDate: string
  milestones: Milestone[]
}

export interface Project {
  id: string
  name: string
  description: string
  status: Status
  startDate: string
  endDate: string
  phases: Phase[]
}
