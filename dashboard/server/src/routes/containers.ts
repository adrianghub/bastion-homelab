import type { FastifyInstance } from 'fastify'
import { authHook } from '../auth.js'
import { listContainers, containerAction } from '../services/docker.js'

export async function containersRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authHook)

  app.get('/api/containers', async (_req, reply) => {
    const containers = await listContainers()
    return reply.send(containers)
  })

  app.post<{ Params: { id: string; action: string } }>(
    '/api/containers/:id/:action',
    async (req, reply) => {
      const { id, action } = req.params
      if (!['start', 'stop', 'restart'].includes(action)) {
        return reply.status(400).send({ error: 'Invalid action' })
      }
      await containerAction(id, action as 'start' | 'stop' | 'restart')
      return reply.send({ ok: true })
    }
  )
}
