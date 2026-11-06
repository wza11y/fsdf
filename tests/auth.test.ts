import { describe, expect, it } from 'vitest'
import { deriveToken, verifyToken } from '@/lib/auth'

describe('deriveToken', () => {
  it('is stable for the same access code', () => {
    expect(deriveToken('sesame')).toBe(deriveToken('sesame'))
  })

  it('differs for different access codes', () => {
    expect(deriveToken('sesame')).not.toBe(deriveToken('sesame2'))
  })

  it('is a 64 character hex digest', () => {
    expect(deriveToken('sesame')).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('verifyToken', () => {
  it('accepts the matching token', () => {
    expect(verifyToken(deriveToken('sesame'), 'sesame')).toBe(true)
  })

  it('rejects a token from another code', () => {
    expect(verifyToken(deriveToken('other'), 'sesame')).toBe(false)
  })

  it('rejects a missing token', () => {
    expect(verifyToken(undefined, 'sesame')).toBe(false)
  })

  it('rejects when no access code is configured', () => {
    expect(verifyToken(deriveToken('sesame'), undefined)).toBe(false)
    expect(verifyToken(deriveToken('sesame'), '')).toBe(false)
  })
})
