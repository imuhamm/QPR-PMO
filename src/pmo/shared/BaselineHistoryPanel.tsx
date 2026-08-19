import type { BaselineHistoryEntry } from './baselineHistory'

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Compact, read-only — the point of this panel is just to make the fact
// visible that approved changes accumulate as traceable history instead of
// silently overwriting the plan, not to be a full baseline management
// screen. View re-uses the CR detail view this project already has (only
// meaningful for a baseline that came from a CR — the original approval
// has no CR to open). Compare is deliberately inert: the task is explicit
// that a real comparison tool isn't in scope yet, so it stays a visible,
// disabled placeholder rather than something that quietly does nothing.
export function BaselineHistoryPanel({
  entries,
  onClose,
  onViewCR,
}: {
  entries: BaselineHistoryEntry[]
  onClose: () => void
  onViewCR: (reference: string) => void
}) {
  return (
    <aside className="flex h-full w-96 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-xl">
      <div className="flex items-start justify-between border-b border-slate-200 px-3 py-2.5">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Baseline History</span>
          <p className="mt-0.5 max-w-[15rem] text-[11px] leading-snug text-slate-500">
            Every approved change creates a new baseline — nothing here is overwritten.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-2 px-3 py-3">
        {entries.map((entry) => (
          <div key={entry.baselineNumber} className="rounded-md border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800">
                Baseline {String(entry.baselineNumber).padStart(2, '0')}
              </span>
              <span className="shrink-0 text-[11px] text-slate-400">{fmtDate(entry.date)}</span>
            </div>

            <div className="mt-1 text-[11px]">
              {entry.reference ? (
                <button
                  type="button"
                  onClick={() => onViewCR(entry.reference!)}
                  className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  {entry.source}
                </button>
              ) : (
                <span className="font-medium text-slate-500">{entry.source}</span>
              )}
            </div>

            {entry.reason && <div className="mt-0.5 truncate text-xs text-slate-700">{entry.reason}</div>}

            <div className="mt-2 flex items-center gap-3 border-t border-slate-100 pt-2">
              <button
                type="button"
                disabled={!entry.reference}
                onClick={() => entry.reference && onViewCR(entry.reference)}
                className="text-[11px] font-medium text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-300"
              >
                View
              </button>
              <button
                type="button"
                disabled
                title="Baseline comparison isn't built yet"
                className="cursor-not-allowed text-[11px] font-medium text-slate-300"
              >
                Compare
              </button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
