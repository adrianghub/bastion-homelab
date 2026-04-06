import type { FastifyRequest, FastifyReply } from 'fastify'
import { config } from './config.js'

export async function authHook(request: FastifyRequest, reply: FastifyReply) {
  // Support both Authorization header (API calls) and ?token= query param (SSE)
  const authHeader = request.headers.authorization
  const queryToken = (request.query as Record<string, string>).token

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : queryToken

  if (!token || token !== config.authToken) {
    reply.status(401).send({ error: 'Unauthorized' })
  }
}
