import { useState, useEffect, useRef, useCallback } from 'react'
import { api, type Container } from '../api/client'
import { useSSE } from '../hooks/useSSE'
import { Trash2, Pause, Play } from 'lucide-react'

const FILE_SOURCES = [
  { value: 'backup', label: 'Backup log' },
  { value: 'auto-rebuild', label: 'Auto-rebuild log' },
]

export default function LogsPage() {
  const [containers, setContainers] = useState<Container[]>([])
  const [source, setSource] = useState<string>('')
  const [paused, setPaused] = useState(false)
  const scrollRef = useRef<HTMLPreElement>(null)
  const atBottomRef = useRef(true)

  useEffect(() => {
    api.get<Container[]>('/api/containers').then((cs) => {
      setContainers(cs)
      if (cs.length > 0) setSource(cs[0].name)
    }).catch(() => {})
  }, [])

  const { lines, connected, error: sseError, clear } = useSSE({
    url: source ? `/api/logs/${source}?lines=200&follow=true` : '',
    enabled: !!source,
  })

  // Auto-scroll to bottom when new lines arrive — unless paused or user scrolled up
  useEffect(() => {
    if (paused || !atBottomRef.current) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines, paused])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    atBottomRef.current = isAtBottom
    if (isAtBottom && paused) setPaused(false)
  }, [paused])

  function changeSource(next: string) {
    setSource(next)
    clear()
    atBottomRef.current = true
    setPaused(false)
  }

  return (
    <div className="p-6 flex flex-col gap-4" style={{ height: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--color-bastion-text)' }}>Logs</h1>
        <div className="flex items-center gap-2">
          <select
            value={source}
            onChange={(e) => changeSource(e.target.value)}
            className="px-2 py-1.5 rounded text-xs"
            style={{
              background: 'var(--color-bastion-surface)',
              color: 'var(--color-bastion-text)',
              border: '1px solid var(--color-bastion-border)',
            }}
          >
            {containers.length > 0 && (
              <optgroup label="Containers">
                {containers.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </optgroup>
            )}
            <optgroup label="Files">
              {FILE_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </optgroup>
          </select>

          <button
            onClick={() => setPaused((p) => !p)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-opacity hover:opacity-80"
            style={{
              background: 'var(--color-bastion-surface)',
              color: 'var(--color-bastion-muted)',
              border: '1px solid var(--color-bastion-border)',
            }}
          >
            {paused ? <Play size={12} /> : <Pause size={12} />}
            {paused ? 'Resume' : 'Pause'}
          </button>

          <button
            onClick={() => { clear(); atBottomRef.current = true }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-opacity hover:opacity-80"
            style={{
              background: 'var(--color-bastion-surface)',
              color: 'var(--color-bastion-muted)',
              border: '1px solid var(--color-bastion-border)',
            }}
          >
            <Trash2 size={12} />
            Clear
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-2 text-xs flex-shrink-0" style={{ color: 'var(--color-bastion-muted)' }}>
        <span
          className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
          style={{
            background: paused
              ? 'var(--color-bastion-yellow)'
              : connected
              ? 'var(--color-bastion-green)'
              : 'var(--color-bastion-border)',
          }}
        />
        {paused ? 'Paused' : connected ? 'Live' : source ? 'Connecting…' : 'Select a source'}
        {sseError && !paused && (
          <span style={{ color: 'var(--color-bastion-red)' }}>— {sseError}</span>
        )}
        <span className="ml-auto">{lines.length} lines</span>
      </div>

      {/* Log output */}
      <pre
        ref={scrollRef}
        onScroll={handleScroll}
        className="font-mono text-xs leading-relaxed rounded-lg p-4 overflow-auto flex-1"
        style={{
          background: 'var(--color-bastion-surface)',
          border: '1px solid var(--color-bastion-border)',
          color: 'var(--color-bastion-text)',
          minHeight: 0,
        }}
      >
        {lines.length === 0 ? (
          <span style={{ color: 'var(--color-bastion-muted)' }}>
            {source ? 'Waiting for output…' : 'Select a log source above.'}
          </span>
        ) : (
          lines.map((line, i) => <div key={i}>{line}</div>)
        )}
      </pre>
    </div>
  )
}
