import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { POST } from '@/app/api/auth/route'
import { resetAuthAttempts } from '@/lib/auth'

const originalAccessCode = process.env.ACCESS_CODE

function authRequest(code: unknown, ip = '1.2.3.4') {
  return new Request('http://localhost/api/auth', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify({ code }),
  })
}

beforeEach(() => {
  process.env.ACCESS_CODE = 'sesame'
  resetAuthAttempts()
})

afterEach(() => {
  if (originalAccessCode === undefined) {
    delete process.env.ACCESS_CODE
  } else {
    process.env.ACCESS_CODE = originalAccessCode
  }
  resetAuthAttempts()
})

describe('POST /api/auth', () => {
  it('rejects a wrong code with 401', async () => {
    const response = await POST(authRequest('wrong'))

    expect(response.status).toBe(401)
  })

  it('locks out after five wrong attempts from the same ip', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await POST(authRequest('wrong'))
      expect(response.status).toBe(401)
    }

    const blocked = await POST(authRequest('sesame'))

    expect(blocked.status).toBe(429)
  })

  it('sets an HttpOnly cookie valid for thirty days on success', async () => {
    const response = await POST(authRequest('sesame'))

    expect(response.status).toBe(200)
    const cookie = response.headers.get('set-cookie') ?? ''
    expect(cookie).toContain('ai_cooking_auth=')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain('Max-Age=2592000')
  })

  it('fails closed with 500 when ACCESS_CODE is missing', async () => {
    delete process.env.ACCESS_CODE

    const response = await POST(authRequest('sesame'))
    const body = (await response.json()) as { code: string }

    expect(response.status).toBe(500)
    expect(body.code).toBe('MISSING_ACCESS_CODE')
  })
})
