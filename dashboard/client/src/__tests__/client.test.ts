import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getToken, setToken, clearToken, isAuthenticated } from '../api/client'

describe('token helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('getToken returns null when no token is stored', () => {
    expect(getToken()).toBeNull()
  })

  it('setToken stores the token; getToken retrieves it', () => {
    setToken('my-secret-token')
    expect(getToken()).toBe('my-secret-token')
  })

  it('clearToken removes the stored token', () => {
    setToken('my-secret-token')
    clearToken()
    expect(getToken()).toBeNull()
  })

  it('isAuthenticated returns false when no token is stored', () => {
    expect(isAuthenticated()).toBe(false)
  })

  it('isAuthenticated returns true when a token is stored', () => {
    setToken('my-secret-token')
    expect(isAuthenticated()).toBe(true)
  })
})

describe('api.get — fetch wrapper', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('injects Authorization header when a token is stored', async () => {
    setToken('my-secret-token')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )

    const { api } = await import('../api/client')
    await api.get('/api/test')

    const [, options] = fetchSpy.mock.calls[0]
    const headers = options?.headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer my-secret-token')
  })

  it('clears token and redirects on 401 response', async () => {
    setToken('expired-token')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Unauthorized', { status: 401 })
    )
    // jsdom doesn't actually navigate; capture the assignment
    const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue(
      { href: '' } as Location
    )

    const { api } = await import('../api/client')
    await expect(api.get('/api/test')).rejects.toThrow('Unauthorized')
    expect(getToken()).toBeNull()
    locationSpy.mockRestore()
  })
})

describe('api.post — Content-Type header', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('sends Content-Type: application/json when a body is provided', async () => {
    setToken('tok')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )

    const { api } = await import('../api/client')
    await api.post('/api/test', { foo: 'bar' })

    const [, options] = fetchSpy.mock.calls[0]
    const headers = options?.headers as Record<string, string>
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('omits Content-Type when no body is provided (bodyless POST)', async () => {
    setToken('tok')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )

    const { api } = await import('../api/client')
    await api.post('/api/test')

    const [, options] = fetchSpy.mock.calls[0]
    const headers = options?.headers as Record<string, string>
    expect(headers['Content-Type']).toBeUndefined()
  })
})
