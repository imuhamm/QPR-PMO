import { useState } from 'react'
import type { ProjectMeta, SaveState } from '../types'
import { SaveIndicator } from './SaveIndicator'
import { ProjectStatusBadge } from '../shared/ProjectStatusBadge'

export function ProjectHeader({
  meta,
  saveState,
  savedAtLabel,
  onBack,
}: {
  meta: ProjectMeta
  saveState: SaveState
  savedAtLabel: string
  onBack?: () => void
}) {
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <header className="shrink-0 border-b border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-4 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-3 text-xs">
          {onBack && (
            <>
              <button
                type="button"
                onClick={onBack}
                className="shrink-0 font-medium text-slate-500 hover:text-slate-800"
              >
                ← Projects
              </button>
              <span className="h-3.5 w-px shrink-0 bg-slate-200" />
            </>
          )}

          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-sm font-semibold text-slate-900">{meta.name}</h1>
            <ProjectStatusBadge status={meta.status} />
          </div>

          <span className="h-3.5 w-px shrink-0 bg-slate-200" />

          <span className="shrink-0 text-slate-500">
            Program: <span className="font-medium text-slate-700">{meta.program}</span>
          </span>
          <span className="shrink-0 text-slate-500">
            PM: <span className="font-medium text-slate-700">{meta.projectManager}</span>
          </span>
          {meta.projectOwner && (
            <span className="shrink-0 text-slate-500">
              Owner: <span className="font-medium text-slate-700">{meta.projectOwner}</span>
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <SaveIndicator state={saveState} savedAtLabel={savedAtLabel} />

          <div className="h-3.5 w-px bg-slate-200" />

          <button
            type="button"
            disabled
            title="Submit for review will be enabled once required sections are complete"
            className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-400 disabled:cursor-not-allowed"
          >
            Submit for Review
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-label="More project actions"
              className="rounded px-1.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
            >
              ⋯
            </button>
            {moreOpen && (
              <div
                className="absolute right-0 z-30 mt-1 w-40 rounded-md border border-slate-200 bg-white py-1 text-xs shadow-md"
                onMouseLeave={() => setMoreOpen(false)}
              >
                <button type="button" className="block w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50">
                  Duplicate
                </button>
                <button type="button" className="block w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50">
                  Export
                </button>
                <button type="button" className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50">
                  Delete Draft
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
