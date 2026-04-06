import { useEffect, useRef, useState } from 'react'
import { getToken } from '../api/client'

interface UseSSEOptions {
  url: string
  enabled?: boolean
  maxLines?: number
}

interface UseSSEResult {
  lines: string[]
  connected: boolean
  error: string | null
  clear: () => void
}

const RETRY_DELAY_MS = 5000

export function useSSE({ url, enabled = true, maxLines = 500 }: UseSSEOptions): UseSSEResult {
  const [lines, setLines] = useState<string[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = () => setLines([])

  useEffect(() => {
    if (!enabled) return

    let destroyed = false

    function connect() {
      if (destroyed) return

      // SSE doesn't support custom headers — pass token as query param
      const token = getToken()
      const urlWithToken = token
        ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
        : url

      const es = new EventSource(urlWithToken)
      esRef.current = es

      es.onopen = () => {
        setConnected(true)
        setError(null)
      }

      es.onmessage = (e) => {
        const line = e.data as string
        setLines((prev) => {
          const next = [...prev, line]
          return next.length > maxLines ? next.slice(next.length - maxLines) : next
        })
      }

      es.onerror = () => {
        es.close()
        esRef.current = null
        setConnected(false)
        setError('Connection lost — retrying…')
        retryTimerRef.current = setTimeout(connect, RETRY_DELAY_MS)
      }
    }

    connect()

    return () => {
      destroyed = true
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      esRef.current?.close()
      esRef.current = null
      setConnected(false)
    }
  }, [url, enabled, maxLines])

  return { lines, connected, error, clear }
}
