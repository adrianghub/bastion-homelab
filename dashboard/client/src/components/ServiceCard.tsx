import { useState } from 'react'
import { Play, Square, RotateCcw, ExternalLink } from 'lucide-react'
import type { Container } from '../api/client'
import { api } from '../api/client'
import ConfirmDialog from './ConfirmDialog'

const SERVICE_URLS: Record<string, string> = {
  'bastion-nextcloud': 'https://cloud.bastionreda.online',
  'bastion-n8n': 'https://n8n.bastionreda.online',
  'bastion-vaultwarden': 'https://pass.bastionreda.online',
  'bastion-freshrss': 'https://rss.bastionreda.online',
  'bastion-portainer': 'https://portainer.bastionreda.online',
  'bastion-htop-web': 'https://status.bastionreda.online',
}

function StatusDot({ state }: { state: string }) {
  const color =
    state === 'running'
      ? 'var(--color-bastion-green)'
      : state === 'restarting'
      ? 'var(--color-bastion-yellow)'
      : 'var(--color-bastion-red)'

  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ background: color, boxShadow: state === 'running' ? `0 0 6px ${color}` : 'none' }}
    />
  )
}

function sinceTime(isoDate: string): string {
  const secs = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000)
  if (secs < 60) return `${secs}s`
  if (secs < 3600) return `${Math.floor(secs / 60)}m`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`
  return `${Math.floor(secs / 86400)}d`
}

interface ServiceCardProps {
  container: Container
  onRefresh: () => void
}

type Confirm = { action: 'stop' | 'restart' } | null

export default function ServiceCard({ container, onRefresh }: ServiceCardProps) {
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const url = SERVICE_URLS[container.name]
  const isRunning = container.state === 'running'
  const restartCount = container.restartCount ?? 0
  const restartBadgeColor =
    restartCount >= 3
      ? 'var(--color-bastion-red)'
      : restartCount > 0
      ? 'var(--color-bastion-yellow)'
      : null

  async function doAction(action: 'start' | 'stop' | 'restart') {
    setBusy(true)
    try {
      await api.post(`/api/containers/${container.id}/${action}`)
      onRefresh()
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  function handleStop() { setConfirm({ action: 'stop' }) }
  function handleRestart() { setConfirm({ action: 'restart' }) }

  async function handleConfirm() {
    if (!confirm) return
    setConfirm(null)
    await doAction(confirm.action)
  }

  const shortImage = container.image.split('/').pop()?.split(':')[0] ?? container.image

  return (
    <>
      <div
        className="rounded-lg border p-3.5 flex flex-col gap-2.5 transition-opacity"
        style={{
          background: 'var(--color-bastion-surface)',
          borderColor: 'var(--color-bastion-border)',
          opacity: busy ? 0.6 : 1,
        }}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <StatusDot state={container.state} />
            <span
              className="text-sm font-medium truncate"
              style={{ color: 'var(--color-bastion-text)' }}
              title={container.name}
            >
              {container.name.replace('bastion-', '')}
            </span>
            {restartBadgeColor && (
              <span
                className="shrink-0 text-xs font-mono px-1 rounded"
                style={{
                  background: `color-mix(in srgb, ${restartBadgeColor} 15%, transparent)`,
                  color: restartBadgeColor,
                  border: `1px solid color-mix(in srgb, ${restartBadgeColor} 30%, transparent)`,
                }}
                title={`Restarted ${restartCount} time${restartCount === 1 ? '' : 's'}`}
              >
                ↺{restartCount}
              </span>
            )}
          </div>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-bastion-muted)' }}
              title={url}
            >
              <ExternalLink size={13} />
            </a>
          )}
        </div>

        {/* Image + status */}
        <div className="space-y-0.5">
          <p className="text-xs font-mono truncate" style={{ color: 'var(--color-bastion-muted)' }} title={container.image}>
            {shortImage}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-bastion-muted)' }}>
            {container.status} · {sinceTime(container.stateStartedAt)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-0.5">
          {!isRunning && (
            <button
              onClick={() => doAction('start')}
              disabled={busy}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ background: 'rgba(63,185,80,0.15)', color: 'var(--color-bastion-green)' }}
              title="Start"
            >
              <Play size={11} /> Start
            </button>
          )}
          {isRunning && (
            <button
              onClick={handleStop}
              disabled={busy}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ background: 'rgba(248,81,73,0.12)', color: 'var(--color-bastion-red)' }}
              title="Stop"
            >
              <Square size={11} /> Stop
            </button>
          )}
          <button
            onClick={handleRestart}
            disabled={busy}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: 'var(--color-bastion-border)', color: 'var(--color-bastion-muted)' }}
            title="Restart"
          >
            <RotateCcw size={11} /> Restart
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.action === 'stop' ? `Stop ${container.name}?` : `Restart ${container.name}?`}
        description={confirm?.action === 'stop' ? 'The container will be stopped immediately.' : 'The container will restart. Expect a brief outage.'}
        confirmLabel={confirm?.action === 'stop' ? 'Stop' : 'Restart'}
        danger={confirm?.action === 'stop'}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}
