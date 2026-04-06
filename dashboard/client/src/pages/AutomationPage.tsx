import { api, type AutomationJob } from '../api/client'
import { usePolling } from '../hooks/usePolling'
import { CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react'

function StatusIcon({ status }: { status: AutomationJob['status'] }) {
  if (status === 'ok') return <CheckCircle size={14} style={{ color: 'var(--color-bastion-green)' }} />
  if (status === 'warning') return <AlertTriangle size={14} style={{ color: 'var(--color-bastion-yellow)' }} />
  return <HelpCircle size={14} style={{ color: 'var(--color-bastion-muted)' }} />
}

export default function AutomationPage() {
  const { data: jobs, error, loading } = usePolling<AutomationJob[]>({
    fn: () => api.get('/api/automation'),
    interval: 300_000,
  })

  const warningCount = jobs?.filter((j) => j.status === 'warning').length ?? 0

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--color-bastion-text)' }}>Automation</h1>
        {warningCount > 0 && (
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(210,153,34,0.15)', color: 'var(--color-bastion-yellow)' }}
          >
            {warningCount} warning{warningCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs" style={{ color: 'var(--color-bastion-red)' }}>Error: {error}</p>
      )}
      {loading && !jobs && (
        <p className="text-xs" style={{ color: 'var(--color-bastion-muted)' }}>Loading…</p>
      )}

      {jobs && (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div
              key={job.name}
              className="rounded-lg border p-4"
              style={{
                background: 'var(--color-bastion-surface)',
                borderColor:
                  job.status === 'warning'
                    ? 'rgba(210,153,34,0.3)'
                    : 'var(--color-bastion-border)',
              }}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  <StatusIcon status={job.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-4 flex-wrap">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-bastion-text)' }}>
                      {job.name}
                    </p>
                    <p className="text-xs shrink-0 font-mono" style={{ color: 'var(--color-bastion-muted)' }}>
                      {job.schedule}
                    </p>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-bastion-muted)' }}>
                    {job.description}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-bastion-border)' }}>
                    via {job.mechanism}
                  </p>
                  {job.warning && (
                    <p
                      className="text-xs mt-2 px-2.5 py-1.5 rounded"
                      style={{
                        background: 'rgba(210,153,34,0.1)',
                        color: 'var(--color-bastion-yellow)',
                        border: '1px solid rgba(210,153,34,0.2)',
                      }}
                    >
                      {job.warning}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
