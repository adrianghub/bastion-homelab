import { useState, useEffect } from 'react'
import { api } from '../api/client'
import ConfirmDialog from '../components/ConfirmDialog'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

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

export default function ActionsPage() {
  const [actionNames, setActionNames] = useState<string[]>([])
  const [confirm, setConfirm] = useState<string | null>(null)
  const [states, setStates] = useState<Record<string, ActionState>>({})

  useEffect(() => {
    api.get<string[]>('/api/actions').then(setActionNames).catch(() => {})
  }, [])

  function runAction(name: string) {
    setConfirm(null)
    setStates((prev) => ({ ...prev, [name]: { running: true, result: null } }))
    api
      .post<ActionResult>(`/api/actions/${name}`)
      .then((res) => setStates((prev) => ({ ...prev, [name]: { running: false, result: res } })))
      .catch((e: Error) =>
        setStates((prev) => ({
          ...prev,
          [name]: { running: false, result: { ok: false, output: '', error: e.message } },
        }))
      )
  }

  const confirmMeta = confirm ? ACTION_META[confirm] : null

  return (
    <div className="p-6 space-y-4 max-w-2xl">
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

              {/* Output */}
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
