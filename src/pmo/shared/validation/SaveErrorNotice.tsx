// The one reusable shape for "this save/network action failed" across
// Inspectors and views — a bordered rose block with the message and a Retry.
// Distinct from InlineMessage: this is a save/network failure after a
// successful field-level validation, not a field error itself.
export function SaveErrorNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] text-rose-600">
      <span className="min-w-0 truncate">{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 font-medium underline underline-offset-2 hover:text-rose-700"
      >
        Retry
      </button>
    </div>
  )
}
