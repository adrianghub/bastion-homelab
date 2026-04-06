import type { FastifyInstance } from 'fastify'
import { authHook } from '../auth.js'
import { getSystemStats } from '../services/system.js'

export async function systemRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authHook)

  app.get('/api/system', async (_req, reply) => {
    const stats = await getSystemStats()
    return reply.send(stats)
  })
}
