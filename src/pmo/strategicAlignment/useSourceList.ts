import { useCallback, useState } from 'react'

export type SourceListStatus = 'idle' | 'loading' | 'ready' | 'error'

export function useSourceList<T>(loader: () => Promise<T[]>) {
  const [status, setStatus] = useState<SourceListStatus>('idle')
  const [items, setItems] = useState<T[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setStatus('loading')
    setError(null)
    loader()
      .then((data) => {
        setItems(data)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Failed to load')
      })
  }, [loader])

  return { status, items, error, load }
}
