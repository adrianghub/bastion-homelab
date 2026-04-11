import { useState, useEffect } from 'react'
import { api, type ActionRun } from '../api/client'
import { usePolling } from '../hooks/usePolling'
import ConfirmDialog from '../components/ConfirmDialog'
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'

const ACTION_META: Record<string, { label: string; description: string; danger?: boolean }> = {
  'ssl-renew':         { label: 'Renew SSL cert',        description: 'Certbot DNS-01 renewal + nginx reload' },
  'rebuild-n8n':       { label: 'Rebuild n8n',           description: 'Pull base image + rebuild n8n-custom' },
  'rebuild-nextcloud': { label: 'Rebuild Nextcloud',     description: 'Pull base image + rebuild nextcloud-custom' },
  'rebuild-htop-web':  { label: 'Rebuild htop-web',      description: 'Pull base image + rebuild htop-web-custom' },
  'nextcloud-update':  { label: 'Nextcloud upgrade',     description: 'Run occ upgrade + repair sequence' },
  'docker-prune':      { label: 'Docker prune',          description: 'Remove unused images and containers (no volumes)', danger: true },
}

interface ActionResult {
  ok: boolean
  output: string
  error?: string
}

interface ActionState {
  running: boolean
  result: ActionResult | null
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function duration(startIso: string, endIso: string): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime()
  const secs = Math.round(ms / 1000)
  return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`
}

export default function ActionsPage() {
  const [actionNames, setActionNames] = useState<string[]>([])
  const [confirm, setConfirm] = useState<string | null>(null)
  const [states, setStates] = useState<Record<string, ActionState>>({})
  const [expandedRun, setExpandedRun] = useState<string | null>(null)

  const { data: history } = usePolling<ActionRun[]>({ fn: () => api.get('/api/actions/history'), interval: 30_000 })

  useEffect(() => {
    api.get<string[]>('/api/actions').then(setActionNames).catch(() => {})
  }, [])

  function runAction(name: string) {
    setConfirm(null)
    setStates((prev) => ({ ...prev, [name]: { running: true, result: null } }))
    api
      .post<ActionResult>(`/api/actions/${name}`)
      .then((res) => {
        setStates((prev) => ({ ...prev, [name]: { running: false, result: res } }))
        // Clear ephemeral result after 5s — history is the canonical record
        setTimeout(() => {
          setStates((prev) => ({ ...prev, [name]: { running: false, result: null } }))
        }, 5_000)
      })
      .catch((e: Error) =>
        setStates((prev) => ({
          ...prev,
          [name]: { running: false, result: { ok: false, output: '', error: e.message } },
        }))
      )
  }

  const confirmMeta = confirm ? ACTION_META[confirm] : null

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--color-bastion-text)' }}>Actions</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--color-bastion-muted)' }}>
          Whitelisted one-click operations. Each runs a fixed command on the Pi — no user input is interpolated.
        </p>
      </div>

      <div className="space-y-3">
        {actionNames.map((name) => {
          const meta = ACTION_META[name] ?? { label: name, description: '' }
          const state = states[name]

          return (
            <div
              key={name}
              className="rounded-lg border p-4 space-y-3"
              style={{
                background: 'var(--color-bastion-surface)',
                borderColor: meta.danger
                  ? 'rgba(248,81,73,0.25)'
                  : 'var(--color-bastion-border)',
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-bastion-text)' }}>
                    {meta.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-bastion-muted)' }}>
                    {meta.description}
                  </p>
                </div>
                <button
                  onClick={() => setConfirm(name)}
                  disabled={state?.running}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: meta.danger ? 'rgba(248,81,73,0.12)' : 'var(--color-bastion-border)',
                    color: meta.danger ? 'var(--color-bastion-red)' : 'var(--color-bastion-text)',
                    border: `1px solid ${meta.danger ? 'rgba(248,81,73,0.3)' : 'var(--color-bastion-border)'}`,
                  }}
                >
                  {state?.running && <Loader2 size={11} className="animate-spin" />}
                  {state?.running ? 'Running…' : 'Run'}
                </button>
              </div>

              {/* Ephemeral result (auto-clears after 5s) */}
              {state?.result && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs">
                    {state.result.ok ? (
                      <CheckCircle size={12} style={{ color: 'var(--color-bastion-green)' }} />
                    ) : (
                      <XCircle size={12} style={{ color: 'var(--color-bastion-red)' }} />
                    )}
                    <span
                      style={{
                        color: state.result.ok
                          ? 'var(--color-bastion-green)'
                          : 'var(--color-bastion-red)',
                      }}
                    >
                      {state.result.ok ? 'Completed' : 'Failed'}
                    </span>
                  </div>
                  {(state.result.output || state.result.error) && (
                    <pre
                      className="font-mono text-xs p-3 rounded overflow-auto"
                      style={{
                        background: 'var(--color-bastion-bg)',
                        color: state.result.ok
                          ? 'var(--color-bastion-text)'
                          : 'var(--color-bastion-red)',
                        border: '1px solid var(--color-bastion-border)',
                        maxHeight: '200px',
                      }}
                    >
                      {state.result.error || state.result.output}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Run history */}
      {history && history.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium" style={{ color: 'var(--color-bastion-text)' }}>
            Run history
          </h2>
          <div
            className="rounded-lg border divide-y overflow-hidden"
            style={{
              borderColor: 'var(--color-bastion-border)',
              background: 'var(--color-bastion-surface)',
            }}
          >
            {history.slice(0, 20).map((run) => {
              const meta = ACTION_META[run.name]
              const isExpanded = expandedRun === run.id
              const hasOutput = run.output || run.error
              return (
                <div key={run.id} style={{ borderColor: 'var(--color-bastion-border)' }}>
                  <div
                    className="flex items-center gap-3 px-4 py-2.5"
                    onClick={() => hasOutput && setExpandedRun(isExpanded ? null : run.id)}
                    style={{ cursor: hasOutput ? 'pointer' : 'default' }}
                  >
                    {run.status === 'success' ? (
                      <CheckCircle size={13} style={{ color: 'var(--color-bastion-green)', flexShrink: 0 }} />
                    ) : (
                      <XCircle size={13} style={{ color: 'var(--color-bastion-red)', flexShrink: 0 }} />
                    )}
                    <span className="text-xs font-medium flex-1" style={{ color: 'var(--color-bastion-text)' }}>
                      {meta?.label ?? run.name}
                    </span>
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-bastion-muted)' }}>
                      <Clock size={11} />
                      {duration(run.startedAt, run.finishedAt)}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-bastion-muted)' }}>
                      {timeAgo(run.startedAt)}
                    </span>
                  </div>
                  {isExpanded && hasOutput && (
                    <pre
                      className="font-mono text-xs px-4 py-3 overflow-auto"
                      style={{
                        background: 'var(--color-bastion-bg)',
                        color: run.status === 'success'
                          ? 'var(--color-bastion-text)'
                          : 'var(--color-bastion-red)',
                        borderTop: '1px solid var(--color-bastion-border)',
                        maxHeight: '200px',
                      }}
                    >
                      {run.error || run.output}
                    </pre>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {confirm && confirmMeta && (
        <ConfirmDialog
          open={true}
          title={`Run "${confirmMeta.label}"?`}
          description={confirmMeta.description}
          confirmLabel="Run"
          danger={confirmMeta.danger}
          onConfirm={() => runAction(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
