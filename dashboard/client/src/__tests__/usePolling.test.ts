import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePolling } from '../hooks/usePolling'

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with loading: true and no data', () => {
    const fn = vi.fn().mockResolvedValue('data')
    const { result } = renderHook(() => usePolling({ fn, interval: 1000 }))
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('populates data after a successful fetch', async () => {
    const fn = vi.fn().mockResolvedValue(['container-a'])
    const { result } = renderHook(() => usePolling({ fn, interval: 1000 }))
    await act(async () => {})
    expect(result.current.data).toEqual(['container-a'])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sets error when fetch throws, keeps loading: false', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('network timeout'))
    const { result } = renderHook(() => usePolling({ fn, interval: 1000 }))
    await act(async () => {})
    expect(result.current.error).toBe('network timeout')
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('calls fn again after each interval', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    renderHook(() => usePolling({ fn, interval: 5000 }))

    await act(async () => {})
    expect(fn).toHaveBeenCalledTimes(1)

    await act(async () => { vi.advanceTimersByTime(5000) })
    await act(async () => {})
    expect(fn).toHaveBeenCalledTimes(2)

    await act(async () => { vi.advanceTimersByTime(5000) })
    await act(async () => {})
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('does not call fn when enabled is false', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    renderHook(() => usePolling({ fn, interval: 1000, enabled: false }))
    await act(async () => { vi.advanceTimersByTime(5000) })
    expect(fn).not.toHaveBeenCalled()
  })

  it('refresh() triggers an immediate fetch outside the interval', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const { result } = renderHook(() => usePolling({ fn, interval: 60_000 }))
    await act(async () => {})
    expect(fn).toHaveBeenCalledTimes(1)

    await act(async () => { result.current.refresh() })
    await act(async () => {})
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('clears the interval on unmount', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const { unmount } = renderHook(() => usePolling({ fn, interval: 1000 }))
    await act(async () => {})
    unmount()
    await act(async () => { vi.advanceTimersByTime(5000) })
    expect(fn).toHaveBeenCalledTimes(1) // only the initial call
  })
})
