import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'

const AUTH = { Authorization: 'Bearer test-token' }

async function buildApp() {
  const app = Fastify({ logger: false })
  const { actionsRoutes } = await import('../routes/actions.js')
  await app.register(actionsRoutes)
  return app
}

describe('GET /api/actions', () => {
  it('returns 401 without auth', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/actions' })
    expect(res.statusCode).toBe(401)
  })

  it('returns the whitelisted action names', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/actions', headers: AUTH })
    expect(res.statusCode).toBe(200)
    const actions = res.json() as string[]
    expect(actions).toContain('ssl-renew')
    expect(actions).toContain('docker-prune')
    expect(actions).toContain('rebuild-n8n')
    // Confirm no arbitrary keys leak through
    expect(actions.every((a) => typeof a === 'string')).toBe(true)
  })
})

describe('POST /api/actions/:name', () => {
  it('returns 401 without auth', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'POST', url: '/api/actions/ssl-renew' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 for an action not in the whitelist', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/actions/rm-rf-everything',
      headers: AUTH,
    })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toMatchObject({ error: 'Unknown action' })
  })
})
