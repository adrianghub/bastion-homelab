import si from 'systeminformation'

export interface SystemStats {
  cpu: number
  mem: { used: number; total: number }
  disk: { used: number; total: number }
  temp: number | null
}

export async function getSystemStats(): Promise<SystemStats> {
  const [load, mem, fs, temp] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.cpuTemperature(),
  ])

  // Pick the largest filesystem (NVMe root partition)
  const rootFs = fs.reduce((a, b) => (b.size > a.size ? b : a), fs[0])

  return {
    cpu: load.currentLoad,
    mem: {
      used: mem.active,
      total: mem.total,
    },
    disk: {
      used: rootFs?.used ?? 0,
      total: rootFs?.size ?? 0,
    },
    temp: temp.main !== -1 ? (temp.main ?? null) : null,
  }
}
