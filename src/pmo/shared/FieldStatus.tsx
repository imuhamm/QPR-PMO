export type FieldStatus = 'idle' | 'saving' | 'saved' | 'error' | 'required'

export function FieldStatusLine({ status, onRetry }: { status: FieldStatus; onRetry?: () => void }) {
  if (status === 'idle') return null

  if (status === 'saving') {
    return <span className="text-[10px] text-amber-600">Saving…</span>
  }
  if (status === 'saved') {
    return <span className="text-[10px] text-emerald-600">Saved</span>
  }
  if (status === 'required') {
    return <span className="text-[10px] text-rose-600">Required</span>
  }
  // error
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-rose-600">
      Couldn't save
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-medium underline underline-offset-2 hover:text-rose-700">
          Retry
        </button>
      )}
    </span>
  )
}
