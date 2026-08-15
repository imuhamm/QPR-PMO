import { useEffect, useRef, useState } from 'react'

// Only "Open Project" is genuinely supported right now — there's no
// permission model in this app, so "Edit Project" wouldn't represent a
// distinct capability, and Duplicate/Export/Delete/Archive/Share don't
// exist anywhere else in the product to justify adding here.
export function RowOverflowMenu({ onOpenProject }: { onOpenProject: () => void }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    // Stops the row's own "click opens the Project" handler from firing for
    // anything inside this control — opening happens only via the menu item.
    <div ref={rootRef} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Project actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        ⋯
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-40 rounded-md border border-slate-200 bg-white py-1 text-xs shadow-md"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onOpenProject()
            }}
            className="block w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50"
          >
            Open Project
          </button>
        </div>
      )}
    </div>
  )
}
