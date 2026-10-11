import { useCallback, useEffect, useState } from 'react'
import { useApi } from './ApiProvider'

export type ApiQueryState<T> = {
  data: T | null
  error: Error | null
  loading: boolean
  refetch: () => void
}

export function useApiQuery<T>(path: string | null, pollIntervalMs = 0): ApiQueryState<T> {
  const { request } = useApi()
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(Boolean(path))
  const [revision, setRevision] = useState(0)
  const refetch = useCallback(() => setRevision(value => value + 1), [])

  useEffect(() => {
    if (!path) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }
    const controller = new AbortController()
    let pollTimer: number | undefined
    let disposed = false
    setLoading(current => current || data === null)
    setError(null)
    const load = async () => {
      try {
        const next = await request<T>(path, { signal: controller.signal })
        if (disposed) return
        setData(next)
        setError(null)
      } catch (caught) {
        if (disposed || controller.signal.aborted) return
        setError(caught instanceof Error ? caught : new Error('Backend request failed.'))
      } finally {
        if (disposed) return
        setLoading(false)
        if (pollIntervalMs > 0) pollTimer = window.setTimeout(load, pollIntervalMs)
      }
    }
    void load()
    return () => {
      disposed = true
      controller.abort()
      if (pollTimer !== undefined) window.clearTimeout(pollTimer)
    }
  }, [request, path, pollIntervalMs, revision])

  return { data, error, loading, refetch }
}
