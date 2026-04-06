import { useEffect, useRef, useState, useCallback } from 'react'

interface UsePollingOptions<T> {
  fn: () => Promise<T>
  interval?: number
  enabled?: boolean
}

interface UsePollingResult<T> {
  data: T | null
  error: string | null
  loading: boolean
  refresh: () => void
}

export function usePolling<T>({
  fn,
  interval = 5000,
  enabled = true,
}: UsePollingOptions<T>): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const fnRef = useRef(fn)
  fnRef.current = fn

  const fetch = useCallback(async () => {
    try {
      const result = await fnRef.current()
      setData(result)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    fetch()
    const id = setInterval(fetch, interval)
    return () => clearInterval(id)
  }, [enabled, interval, fetch])

  return { data, error, loading, refresh: fetch }
}
