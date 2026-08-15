import type { Project } from '../types'

export const mockProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Client Portal Revamp',
    description: 'Redesign and rebuild the client-facing portal for better self-service.',
    status: 'in-progress',
    startDate: '2026-01-15',
    endDate: '2026-09-30',
    phases: [
      {
        id: 'phase-1',
        name: 'Discovery & Planning',
        status: 'completed',
        startDate: '2026-01-15',
        endDate: '2026-02-28',
        milestones: [
          {
            id: 'ms-1',
            name: 'Requirements Sign-off',
            status: 'completed',
            dueDate: '2026-02-20',
            activities: [
              { id: 'act-1', name: 'Stakeholder interviews', status: 'completed', startDate: '2026-01-15', endDate: '2026-01-25', owner: 'A. Farouk' },
              { id: 'act-2', name: 'Draft requirements doc', status: 'completed', startDate: '2026-01-26', endDate: '2026-02-10', owner: 'A. Farouk' },
              { id: 'act-3', name: 'Client review & sign-off', status: 'completed', startDate: '2026-02-11', endDate: '2026-02-20', owner: 'M. Hesham' },
            ],
          },
        ],
      },
      {
        id: 'phase-2',
        name: 'Design',
        status: 'in-progress',
        startDate: '2026-03-01',
        endDate: '2026-04-15',
        milestones: [
          {
            id: 'ms-2',
            name: 'UI/UX Prototype Approved',
            status: 'in-progress',
            dueDate: '2026-04-10',
            activities: [
              { id: 'act-4', name: 'Wireframes', status: 'completed', startDate: '2026-03-01', endDate: '2026-03-12', owner: 'S. Ali' },
              { id: 'act-5', name: 'High-fidelity mockups', status: 'in-progress', startDate: '2026-03-13', endDate: '2026-04-01', owner: 'S. Ali' },
              { id: 'act-6', name: 'Client feedback round', status: 'not-started', startDate: '2026-04-02', endDate: '2026-04-10', owner: 'M. Hesham' },
            ],
          },
        ],
      },
      {
        id: 'phase-3',
        name: 'Development',
        status: 'not-started',
        startDate: '2026-04-16',
        endDate: '2026-08-15',
        milestones: [
          {
            id: 'ms-3',
            name: 'MVP Feature Complete',
            status: 'not-started',
            dueDate: '2026-07-15',
            activities: [
              { id: 'act-7', name: 'Backend API build', status: 'not-started', startDate: '2026-04-16', endDate: '2026-06-01' },
              { id: 'act-8', name: 'Frontend build', status: 'not-started', startDate: '2026-04-16', endDate: '2026-06-15' },
              { id: 'act-9', name: 'QA & bug fixes', status: 'not-started', startDate: '2026-06-16', endDate: '2026-07-15' },
            ],
          },
        ],
      },
    ],
  },
]
