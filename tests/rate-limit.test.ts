import { beforeEach, describe, expect, it } from 'vitest'
import { checkAndConsume, resetRateLimit } from '@/lib/rate-limit'

const NOW = new Date('2026-11-06T12:00:00').getTime()

beforeEach(() => {
  resetRateLimit()
})

describe('checkAndConsume', () => {
  it('allows three requests per minute and blocks the fourth', () => {
    expect(checkAndConsume('ip-a', NOW).ok).toBe(true)
    expect(checkAndConsume('ip-a', NOW + 100).ok).toBe(true)
    expect(checkAndConsume('ip-a', NOW + 200).ok).toBe(true)

    const blocked = checkAndConsume('ip-a', NOW + 300)

    expect(blocked.ok).toBe(false)
    if (!blocked.ok) {
      expect(blocked.retryAfterMs).toBeGreaterThan(0)
      expect(blocked.retryAfterMs).toBeLessThanOrEqual(60_000)
    }
  })

  it('reopens the window after a minute', () => {
    for (let index = 0; index < 3; index += 1) {
      expect(checkAndConsume('ip-a', NOW + index).ok).toBe(true)
    }

    expect(checkAndConsume('ip-a', NOW + 60_001).ok).toBe(true)
  })

  it('keeps different keys independent', () => {
    for (let index = 0; index < 3; index += 1) {
      checkAndConsume('ip-a', NOW + index)
    }

    expect(checkAndConsume('ip-b', NOW + 10).ok).toBe(true)
  })

  it('stops at the global daily cap of fifty', () => {
    for (let index = 0; index < 50; index += 1) {
      expect(checkAndConsume(`ip-${index}`, NOW + index).ok).toBe(true)
    }

    const blocked = checkAndConsume('ip-new', NOW + 100)

    expect(blocked.ok).toBe(false)
    if (!blocked.ok) {
      expect(blocked.retryAfterMs).toBeGreaterThan(0)
    }
  })

  it('restores the counters after reset', () => {
    for (let index = 0; index < 50; index += 1) {
      checkAndConsume(`ip-${index}`, NOW + index)
    }

    resetRateLimit()

    expect(checkAndConsume('ip-new', NOW + 100).ok).toBe(true)
  })
})
