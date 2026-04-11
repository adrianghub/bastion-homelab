const TOKEN_KEY = 'bastion_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return getToken() !== null
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `HTTP ${res.status}`)
  }

  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
}

// Types shared between client and server
export interface Container {
  id: string
  name: string
  image: string
  state: 'running' | 'exited' | 'restarting' | 'paused' | 'dead' | string
  status: string
  ports: string[]
  created: number
  restartCount: number
  stateStartedAt: string
  url?: string
}

export interface SystemStats {
  cpu: number
  mem: { used: number; total: number }
  disk: { used: number; total: number }
  temp: number | null
}

export interface BackupStatus {
  lastRun: string | null
  success: boolean | null
  duration: string | null
  issues: string[]
}

export interface AutomationJob {
  id: string
  name: string
  cron: string
  schedule: string
  description: string
  mechanism: string
  status: 'ok' | 'warning' | 'unknown'
  warning?: string
}

export interface ActionRun {
  id: string
  name: string
  startedAt: string
  finishedAt: string
  status: 'success' | 'error'
  output: string
  error?: string
}

export interface Incident {
  id: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  remediation: string
  status: 'active' | 'mitigated'
  detectedAt: string
}
