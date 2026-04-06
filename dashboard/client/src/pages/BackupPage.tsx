import { api, type BackupStatus } from '../api/client'
import { usePolling } from '../hooks/usePolling'
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'

export default function BackupPage() {
  const { data: status, error, loading } = usePolling<BackupStatus>({
    fn: () => api.get('/api/backup/status'),
    interval: 60_000,
  })

  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <h1 className="text-lg font-semibold" style={{ color: 'var(--color-bastion-text)' }}>Backup</h1>

      {/* Last run */}
      <section
        className="rounded-lg border p-4 space-y-3"
        style={{ background: 'var(--color-bastion-surface)', borderColor: 'var(--color-bastion-border)' }}
      >
        <h2 className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-bastion-muted)' }}>
          Last run
        </h2>

        {loading && !status && (
          <p className="text-xs" style={{ color: 'var(--color-bastion-muted)' }}>Loading…</p>
        )}
        {error && (
          <p className="text-xs" style={{ color: 'var(--color-bastion-red)' }}>Error: {error}</p>
        )}
        {status && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {status.success === true && <CheckCircle size={15} style={{ color: 'var(--color-bastion-green)' }} />}
              {status.success === false && <XCircle size={15} style={{ color: 'var(--color-bastion-red)' }} />}
              {status.success === null && <Clock size={15} style={{ color: 'var(--color-bastion-muted)' }} />}
              <span
                className="text-sm font-medium"
                style={{
                  color:
                    status.success === true
                      ? 'var(--color-bastion-green)'
                      : status.success === false
                      ? 'var(--color-bastion-red)'
                      : 'var(--color-bastion-muted)',
                }}
              >
                {status.success === true ? 'Succeeded' : status.success === false ? 'Failed' : 'Unknown'}
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-bastion-muted)' }}>
              {status.lastRun ? (
                <>
                  <span style={{ color: 'var(--color-bastion-text)' }}>Timestamp: </span>
                  {status.lastRun}
                </>
              ) : (
                'No backup log found on this Pi.'
              )}
            </p>
          </div>
        )}
      </section>

      {/* Manual trigger info */}
      <section
        className="rounded-lg border p-4 space-y-3"
        style={{ background: 'var(--color-bastion-surface)', borderColor: 'var(--color-bastion-border)' }}
      >
        <h2 className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-bastion-muted)' }}>
          Manual trigger
        </h2>
        <p className="text-xs" style={{ color: 'var(--color-bastion-muted)' }}>
          <code>backup.sh</code> requires root on the host and cannot be triggered from the dashboard container.
          SSH into the Pi and run:
        </p>
        <pre
          className="font-mono text-xs p-3 rounded select-all"
          style={{
            background: 'var(--color-bastion-bg)',
            color: 'var(--color-bastion-text)',
            border: '1px solid var(--color-bastion-border)',
          }}
        >
          sudo /home/adrianzinko/scripts/backup.sh
        </pre>
        <p className="text-xs" style={{ color: 'var(--color-bastion-muted)' }}>
          Then follow progress with:{' '}
          <code className="font-mono" style={{ color: 'var(--color-bastion-text)' }}>
            tail -f /var/log/bastion-backup.log
          </code>
        </p>
      </section>

      {/* Known issues */}
      {status && status.issues.length > 0 && (
        <section
          className="rounded-lg border p-4 space-y-3"
          style={{
            background: 'var(--color-bastion-surface)',
            borderColor: 'rgba(210,153,34,0.3)',
          }}
        >
          <h2
            className="text-xs font-medium uppercase tracking-wide flex items-center gap-1.5"
            style={{ color: 'var(--color-bastion-yellow)' }}
          >
            <AlertTriangle size={12} />
            Known issues
          </h2>
          <ul className="space-y-2">
            {status.issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--color-bastion-muted)' }}>
                <span className="mt-0.5 shrink-0" style={{ color: 'var(--color-bastion-yellow)' }}>•</span>
                {issue}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
