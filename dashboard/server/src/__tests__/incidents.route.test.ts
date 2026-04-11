import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'

const AUTH = { Authorization: 'Bearer test-token' }

async function buildApp() {
  const app = Fastify({ logger: false })
  const { incidentsRoutes } = await import('../routes/incidents.js')
  await app.register(incidentsRoutes)
  return app
}

describe('GET /api/incidents', () => {
  it('returns 401 without auth', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/incidents' })
    expect(res.statusCode).toBe(401)
  })

  it('returns an array of incidents', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/incidents', headers: AUTH })
    expect(res.statusCode).toBe(200)
    const incidents = res.json() as Array<{
      id: string
      severity: string
      title: string
      status: string
    }>
    expect(Array.isArray(incidents)).toBe(true)
    expect(incidents.length).toBeGreaterThan(0)
    for (const incident of incidents) {
      expect(typeof incident.id).toBe('string')
      expect(['critical', 'warning', 'info']).toContain(incident.severity)
      expect(typeof incident.title).toBe('string')
      expect(['active', 'mitigated']).toContain(incident.status)
    }
  })

  it('includes the known docker-prune-volumes incident', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/incidents', headers: AUTH })
    const incidents = res.json() as Array<{ id: string }>
    expect(incidents.some((i) => i.id === 'docker-prune-volumes')).toBe(true)
  })
})
