import { useRef, useState } from 'react'

export type CellSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useInlineCellSave(onCommit: (value: string) => Promise<void>) {
  const [status, setStatus] = useState<CellSaveStatus>('idle')
  const lastAttempt = useRef<string | null>(null)

  const run = async (value: string) => {
    lastAttempt.current = value
    setStatus('saving')
    try {
      await onCommit(value)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 1200)
    } catch {
      setStatus('error')
    }
  }

  const retry = () => {
    if (lastAttempt.current !== null) void run(lastAttempt.current)
  }

  return { status, run, retry }
}
