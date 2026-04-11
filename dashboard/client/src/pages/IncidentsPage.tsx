import { api, type Incident } from '../api/client'
import { usePolling } from '../hooks/usePolling'
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react'

const SEVERITY_ORDER: Incident['severity'][] = ['critical', 'warning', 'info']

const SEVERITY_META: Record<Incident['severity'], {
  label: string
  icon: typeof AlertTriangle
  color: string
  borderColor: string
}> = {
  critical: {
    label: 'Critical',
    icon: AlertCircle,
    color: 'var(--color-bastion-red)',
    borderColor: 'rgba(248,81,73,0.35)',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    color: 'var(--color-bastion-yellow)',
    borderColor: 'rgba(210,153,34,0.35)',
  },
  info: {
    label: 'Info',
    icon: Info,
    color: 'var(--color-bastion-accent)',
    borderColor: 'rgba(88,166,255,0.25)',
  },
}

export default function IncidentsPage() {
  const { data: incidents, error, loading } = usePolling<Incident[]>({ fn: () => api.get('/api/incidents'), interval: 300_000 })

  const byGroup = SEVERITY_ORDER.reduce<Record<string, Incident[]>>((acc, sev) => {
    acc[sev] = (incidents ?? []).filter((i) => i.severity === sev)
    return acc
  }, {} as Record<string, Incident[]>)

  const activeCount = (incidents ?? []).filter((i) => i.status === 'active').length

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--color-bastion-text)' }}>Incidents</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--color-bastion-muted)' }}>
          Known operational risks and remediation steps.
          {!loading && incidents && (
            <> — <span style={{ color: activeCount > 0 ? 'var(--color-bastion-red)' : 'var(--color-bastion-green)' }}>
              {activeCount} active
            </span></>
          )}
        </p>
      </div>

      {error && (
        <p className="text-xs" style={{ color: 'var(--color-bastion-red)' }}>
          Failed to load incidents.
        </p>
      )}

      {loading && !incidents && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-20 rounded-lg border animate-pulse"
              style={{ background: 'var(--color-bastion-surface)', borderColor: 'var(--color-bastion-border)' }}
            />
          ))}
        </div>
      )}

      {SEVERITY_ORDER.map((sev) => {
        const group = byGroup[sev]
        if (!group || group.length === 0) return null
        const meta = SEVERITY_META[sev]
        const Icon = meta.icon
        return (
          <div key={sev} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: meta.color }}>
              {meta.label}
            </h2>
            <div className="space-y-2">
              {group.map((incident) => {
                const isActive = incident.status === 'active'
                return (
                  <div
                    key={incident.id}
                    className="rounded-lg border p-4 space-y-3"
                    style={{
                      background: 'var(--color-bastion-surface)',
                      borderColor: isActive ? meta.borderColor : 'var(--color-bastion-border)',
                      opacity: isActive ? 1 : 0.6,
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-start gap-3">
                      <Icon
                        size={15}
                        style={{ color: isActive ? meta.color : 'var(--color-bastion-muted)', flexShrink: 0, marginTop: 1 }}
                      />
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            className={`text-sm font-medium ${isActive ? '' : 'line-through'}`}
                            style={{ color: isActive ? 'var(--color-bastion-text)' : 'var(--color-bastion-muted)' }}
                          >
                            {incident.title}
                          </p>
                          {isActive ? (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                              style={{
                                background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
                                color: meta.color,
                                border: `1px solid color-mix(in srgb, ${meta.color} 30%, transparent)`,
                              }}
                            >
                              active
                            </span>
                          ) : (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1"
                              style={{
                                background: 'rgba(63,185,80,0.1)',
                                color: 'var(--color-bastion-green)',
                                border: '1px solid rgba(63,185,80,0.25)',
                              }}
                            >
                              <CheckCircle2 size={10} />
                              mitigated
                            </span>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: 'var(--color-bastion-muted)' }}>
                          Detected {incident.detectedAt}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--color-bastion-muted)' }}>
                      {incident.description}
                    </p>

                    {/* Remediation */}
                    <div
                      className="rounded p-3 space-y-1"
                      style={{ background: 'var(--color-bastion-bg)', border: '1px solid var(--color-bastion-border)' }}
                    >
                      <p className="text-xs font-medium" style={{ color: 'var(--color-bastion-text)' }}>
                        Remediation
                      </p>
                      <p className="text-xs font-mono leading-relaxed" style={{ color: 'var(--color-bastion-muted)' }}>
                        {incident.remediation}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {incidents && incidents.length === 0 && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-bastion-green)' }}>
          <CheckCircle2 size={16} />
          No known incidents.
        </div>
      )}
    </div>
  )
}
