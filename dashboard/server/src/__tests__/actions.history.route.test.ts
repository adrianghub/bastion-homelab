import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'

const AUTH = { Authorization: 'Bearer test-token' }

// Mock child_process so we don't run real shell commands in tests
vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}))

const { exec } = await import('node:child_process')
const execMock = vi.mocked(exec)

async function buildApp() {
  const app = Fastify({ logger: false })
  const { actionsRoutes } = await import('../routes/actions.js')
  await app.register(actionsRoutes)
  return app
}

describe('GET /api/actions/history', () => {
  it('returns 401 without auth', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/actions/history' })
    expect(res.statusCode).toBe(401)
  })

  it('returns an array', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/actions/history', headers: AUTH })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
  })
})

describe('Action journal: run recording', () => {
  beforeEach(() => {
    execMock.mockReset()
  })

  it('records a successful run in history', async () => {
    // Simulate exec calling the callback with success
    execMock.mockImplementation((_cmd, _opts, cb) => {
      if (typeof cb === 'function') cb(null, 'done\n', '')
      return {} as ReturnType<typeof exec>
    })

    const app = await buildApp()

    await app.inject({ method: 'POST', url: '/api/actions/docker-prune', headers: AUTH })

    const histRes = await app.inject({ method: 'GET', url: '/api/actions/history', headers: AUTH })
    const runs = histRes.json() as Array<{ name: string; status: string }>

    const match = runs.find((r) => r.name === 'docker-prune' && r.status === 'success')
    expect(match).toBeDefined()
  })

  it('records a failed run in history', async () => {
    execMock.mockImplementation((_cmd, _opts, cb) => {
      if (typeof cb === 'function') {
        const err = Object.assign(new Error('command failed'), { stdout: '', stderr: 'permission denied', code: 1 })
        cb(err, '', 'permission denied')
      }
      return {} as ReturnType<typeof exec>
    })

    const app = await buildApp()

    await app.inject({ method: 'POST', url: '/api/actions/docker-prune', headers: AUTH })

    const histRes = await app.inject({ method: 'GET', url: '/api/actions/history', headers: AUTH })
    const runs = histRes.json() as Array<{ name: string; status: string }>

    const match = runs.find((r) => r.name === 'docker-prune' && r.status === 'error')
    expect(match).toBeDefined()
  })
})
