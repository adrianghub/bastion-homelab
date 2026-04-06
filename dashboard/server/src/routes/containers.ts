import type { FastifyInstance } from 'fastify'
import { authHook } from '../auth.js'
import { listContainers, containerAction } from '../services/docker.js'

export async function containersRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authHook)

  app.get('/api/containers', async (_req, reply) => {
    const containers = await listContainers()
    return reply.send(containers)
  })

  const validActions = ['start', 'stop', 'restart'] as const
  type ContainerAction = (typeof validActions)[number]

  app.post<{ Params: { id: string; action: string } }>(
    '/api/containers/:id/:action',
    async (req, reply) => {
      const { id, action } = req.params
      if (!(validActions as readonly string[]).includes(action)) {
        return reply.status(400).send({ error: 'Invalid action' })
      }
      try {
        await containerAction(id, action as ContainerAction)
        return reply.send({ ok: true })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Docker operation failed'
        return reply.status(500).send({ error: message })
      }
    }
  )
}
