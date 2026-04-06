interface GaugeBarProps {
  label: string
  value: number      // 0–100 percent
  detail: string     // e.g. "3.1 / 7.8 GB"
  warn?: number      // threshold for yellow (default 70)
  crit?: number      // threshold for red (default 90)
}

function GaugeBar({ label, value, detail, warn = 70, crit = 90 }: GaugeBarProps) {
  const pct = Math.min(100, Math.max(0, value))
  const color =
    pct >= crit
      ? 'var(--color-bastion-red)'
      : pct >= warn
      ? 'var(--color-bastion-yellow)'
      : 'var(--color-bastion-green)'

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: 'var(--color-bastion-muted)' }}>{label}</span>
        <span className="text-xs font-mono" style={{ color: 'var(--color-bastion-text)' }}>{detail}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bastion-border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

interface SystemGaugeProps {
  cpu: number
  mem: { used: number; total: number }
  disk: { used: number; total: number }
  temp: number | null
}

function fmt(bytes: number, decimals = 1) {
  const gb = bytes / 1024 / 1024 / 1024
  return gb >= 1 ? `${gb.toFixed(decimals)} GB` : `${(bytes / 1024 / 1024).toFixed(0)} MB`
}

export default function SystemGauge({ cpu, mem, disk, temp }: SystemGaugeProps) {
  const memPct = mem.total > 0 ? (mem.used / mem.total) * 100 : 0
  const diskPct = disk.total > 0 ? (disk.used / disk.total) * 100 : 0

  return (
    <div
      className="rounded-lg border p-4 space-y-3"
      style={{ background: 'var(--color-bastion-surface)', borderColor: 'var(--color-bastion-border)' }}
    >
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-bastion-muted)' }}>
          System
        </h2>
        {temp !== null && (
          <span
            className="text-xs font-mono"
            style={{ color: temp > 80 ? 'var(--color-bastion-red)' : temp > 65 ? 'var(--color-bastion-yellow)' : 'var(--color-bastion-muted)' }}
          >
            {temp.toFixed(1)}°C
          </span>
        )}
      </div>

      <GaugeBar label="CPU" value={cpu} detail={`${cpu.toFixed(1)}%`} />
      <GaugeBar label="RAM" value={memPct} detail={`${fmt(mem.used)} / ${fmt(mem.total)}`} />
      <GaugeBar label="Disk" value={diskPct} detail={`${fmt(disk.used)} / ${fmt(disk.total)}`} warn={80} crit={95} />
    </div>
  )
}
