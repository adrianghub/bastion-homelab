import { describe, it, expect, vi } from 'vitest'
import { authHook } from '../auth.js'
import type { FastifyRequest, FastifyReply } from 'fastify'

function makeReq(bearerToken?: string, queryToken?: string): Partial<FastifyRequest> {
  return {
    headers: { authorization: bearerToken ? `Bearer ${bearerToken}` : undefined } as FastifyRequest['headers'],
    query: (queryToken ? { token: queryToken } : {}) as FastifyRequest['query'],
  }
}

function makeReply(): { status: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> } {
  const reply = { status: vi.fn(), send: vi.fn() }
  reply.status.mockReturnValue(reply)
  reply.send.mockReturnValue(reply)
  return reply
}

describe('authHook', () => {
  it('rejects requests with no token — returns 401', async () => {
    const req = makeReq()
    const reply = makeReply()
    await authHook(req as FastifyRequest, reply as unknown as FastifyReply)
    expect(reply.status).toHaveBeenCalledWith(401)
    expect(reply.send).toHaveBeenCalledWith({ error: 'Unauthorized' })
  })

  it('rejects requests with wrong Bearer token — returns 401', async () => {
    const req = makeReq('wrong-token')
    const reply = makeReply()
    await authHook(req as FastifyRequest, reply as unknown as FastifyReply)
    expect(reply.status).toHaveBeenCalledWith(401)
  })

  it('accepts valid Bearer token — does not call reply.status', async () => {
    const req = makeReq('test-token')
    const reply = makeReply()
    await authHook(req as FastifyRequest, reply as unknown as FastifyReply)
    expect(reply.status).not.toHaveBeenCalled()
  })

  it('accepts valid ?token= query param — does not call reply.status', async () => {
    const req = makeReq(undefined, 'test-token')
    const reply = makeReply()
    await authHook(req as FastifyRequest, reply as unknown as FastifyReply)
    expect(reply.status).not.toHaveBeenCalled()
  })
})
