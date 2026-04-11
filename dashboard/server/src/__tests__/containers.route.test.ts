import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import type { ContainerInfo } from '../services/docker.js'

// Mock the docker service before importing the route
vi.mock('../services/docker.js', () => ({
  listContainers: vi.fn(),
  containerAction: vi.fn(),
}))

const { listContainers, containerAction } = await import('../services/docker.js')

const AUTH = { Authorization: 'Bearer test-token' }

async function buildApp() {
  const app = Fastify({ logger: false })
  const { containersRoutes } = await import('../routes/containers.js')
  await app.register(containersRoutes)
  return app
}

describe('GET /api/containers', () => {
  it('returns 401 without auth header', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/containers' })
    expect(res.statusCode).toBe(401)
  })

  it('returns container list from docker service', async () => {
    const mockContainers: ContainerInfo[] = [
      { id: 'abc123', name: 'bastion-proxy', image: 'nginx:1.29', state: 'running', status: 'Up 2 hours', ports: [], created: 1700000000, restartCount: 0, stateStartedAt: '2024-01-01T00:00:00Z' },
    ]
    vi.mocked(listContainers).mockResolvedValue(mockContainers)

    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/containers', headers: AUTH })

    expect(res.statusCode).toBe(200)
    const body = res.json() as ContainerInfo[]
    expect(body).toHaveLength(1)
    expect(body[0].name).toBe('bastion-proxy')
    expect(body[0].state).toBe('running')
  })
})

describe('POST /api/containers/:id/:action', () => {
  beforeEach(() => {
    vi.mocked(containerAction).mockReset()
  })

  it('returns 401 without auth', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'POST', url: '/api/containers/abc/restart' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 for unknown action', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/containers/abc123/kill',
      headers: AUTH,
    })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toMatchObject({ error: 'Invalid action' })
  })

  it.each(['start', 'stop', 'restart'] as const)(
    'calls containerAction with correct args for %s',
    async (action) => {
      vi.mocked(containerAction).mockResolvedValue(undefined)
      const app = await buildApp()
      const res = await app.inject({
        method: 'POST',
        url: `/api/containers/abc123/${action}`,
        headers: AUTH,
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual({ ok: true })
      expect(containerAction).toHaveBeenCalledWith('abc123', action)
    }
  )

  it('returns 500 with error message when Docker operation fails', async () => {
    vi.mocked(containerAction).mockRejectedValue(new Error('socket hang up'))
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/containers/abc123/stop',
      headers: AUTH,
    })
    expect(res.statusCode).toBe(500)
    expect(res.json()).toMatchObject({ error: 'socket hang up' })
  })
})
