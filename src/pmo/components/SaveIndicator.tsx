import type { SaveState } from '../types'

const CONFIG: Record<SaveState, { dot: string; label: (t: string) => string }> = {
  saved: { dot: 'bg-emerald-500', label: (t) => `Saved ${t}` },
  saving: { dot: 'bg-amber-500 animate-pulse', label: () => 'Saving…' },
  unsaved: { dot: 'bg-slate-400', label: () => 'Unsaved changes' },
}

export function SaveIndicator({ state, savedAtLabel }: { state: SaveState; savedAtLabel: string }) {
  const cfg = CONFIG[state]
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      <span>{cfg.label(savedAtLabel)}</span>
    </div>
  )
}
