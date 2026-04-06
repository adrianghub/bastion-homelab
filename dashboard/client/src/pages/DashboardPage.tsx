import { api, type Container, type SystemStats } from '../api/client'
import { usePolling } from '../hooks/usePolling'
import ServiceCard from '../components/ServiceCard'
import SystemGauge from '../components/SystemGauge'
import { RefreshCw, AlertCircle } from 'lucide-react'

export default function DashboardPage() {
  const {
    data: containers,
    error: containersErr,
    loading: containersLoading,
    refresh: refreshContainers,
  } = usePolling<Container[]>({ fn: () => api.get('/api/containers'), interval: 5000 })

  const {
    data: system,
    error: systemErr,
  } = usePolling<SystemStats>({ fn: () => api.get('/api/system'), interval: 5000 })

  const runningCount = containers?.filter((c) => c.state === 'running').length ?? 0
  const totalCount = containers?.length ?? 0

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--color-bastion-text)' }}>
            Dashboard
          </h1>
          {!containersLoading && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-bastion-muted)' }}>
              {runningCount} / {totalCount} containers running
            </p>
          )}
        </div>
        <button
          onClick={refreshContainers}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-opacity hover:opacity-80"
          style={{ background: 'var(--color-bastion-surface)', color: 'var(--color-bastion-muted)', border: '1px solid var(--color-bastion-border)' }}
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* System stats */}
      {systemErr && (
        <ErrorBanner message={`System stats: ${systemErr}`} />
      )}
      {system && (
        <SystemGauge cpu={system.cpu} mem={system.mem} disk={system.disk} temp={system.temp} />
      )}

      {/* Container grid */}
      {containersErr && <ErrorBanner message={`Containers: ${containersErr}`} />}

      {containersLoading && !containers && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {containers && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {containers.map((c) => (
            <ServiceCard key={c.id} container={c} onRefresh={refreshContainers} />
          ))}
        </div>
      )}
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
      style={{ background: 'rgba(248,81,73,0.1)', color: 'var(--color-bastion-red)', border: '1px solid rgba(248,81,73,0.2)' }}
    >
      <AlertCircle size={15} />
      {message}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div
      className="rounded-lg border p-3.5 space-y-2.5 animate-pulse"
      style={{ background: 'var(--color-bastion-surface)', borderColor: 'var(--color-bastion-border)' }}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-bastion-border)' }} />
        <div className="h-3 w-24 rounded" style={{ background: 'var(--color-bastion-border)' }} />
      </div>
      <div className="h-2.5 w-16 rounded" style={{ background: 'var(--color-bastion-border)' }} />
      <div className="h-2.5 w-20 rounded" style={{ background: 'var(--color-bastion-border)' }} />
      <div className="flex gap-1.5">
        <div className="h-6 w-14 rounded" style={{ background: 'var(--color-bastion-border)' }} />
        <div className="h-6 w-14 rounded" style={{ background: 'var(--color-bastion-border)' }} />
      </div>
    </div>
  )
}
