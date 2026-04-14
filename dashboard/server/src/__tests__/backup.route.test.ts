import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'

vi.mock('node:fs', () => ({ existsSync: vi.fn() }))
vi.mock('node:fs/promises', () => ({ readFile: vi.fn() }))

const AUTH = { Authorization: 'Bearer test-token' }

async function buildApp() {
  const app = Fastify({ logger: false })
  const { backupRoutes } = await import('../routes/backup.js')
  await app.register(backupRoutes)
  return app
}

beforeEach(() => {
  vi.resetModules()
})

describe('GET /api/backup/status', () => {
  it('returns 401 without auth', async () => {
    const { existsSync } = await import('node:fs')
    vi.mocked(existsSync).mockReturnValue(false)

    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/backup/status' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 200 with null fields when log file does not exist', async () => {
    const { existsSync } = await import('node:fs')
    vi.mocked(existsSync).mockReturnValue(false)

    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/backup/status', headers: AUTH })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.lastRun).toBeNull()
    expect(body.success).toBeNull()
    expect(body.issues).toEqual([])
  })

  it('returns 200 with EISDIR message when log path is a directory', async () => {
    const { existsSync } = await import('node:fs')
    const { readFile } = await import('node:fs/promises')
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFile).mockRejectedValue(Object.assign(new Error('EISDIR'), { code: 'EISDIR' }))

    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/backup/status', headers: AUTH })
    expect(res.statusCode).toBe(200)
    expect(res.json().issues[0]).toMatch(/directory/)
  })

  it('returns 200 with unreadable message on generic read error', async () => {
    const { existsSync } = await import('node:fs')
    const { readFile } = await import('node:fs/promises')
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFile).mockRejectedValue(Object.assign(new Error('EIO'), { code: 'EIO' }))

    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/backup/status', headers: AUTH })
    expect(res.statusCode).toBe(200)
    expect(res.json().issues[0]).toMatch(/not readable/)
  })
})
