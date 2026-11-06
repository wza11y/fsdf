import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/generate/route'
import { deriveToken, resetAuthAttempts } from '@/lib/auth'
import { generateDishes, MissingKeyError } from '@/lib/deepseek'
import { resetRateLimit } from '@/lib/rate-limit'
import { TooFewDishesError } from '@/lib/schema'

vi.mock('@/lib/deepseek', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/deepseek')>()
  return { ...actual, generateDishes: vi.fn() }
})

const mockGenerate = vi.mocked(generateDishes)

const VALID_BODY = { theme: '想吃清淡高蛋白' }

function generateRequest(
  body: unknown,
  options: { auth?: boolean; origin?: string; host?: string } = {},
) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-forwarded-for': '1.2.3.4',
  }

  if (options.auth !== false) {
    headers.cookie = `ai_cooking_auth=${deriveToken('sesame')}`
  }

  if (options.origin) headers.origin = options.origin
  if (options.host) headers.host = options.host

  return new Request('http://localhost/api/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  process.env.ACCESS_CODE = 'sesame'
  process.env.DEEPSEEK_API_KEY = 'sk-test'
  process.env.DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
  process.env.DEEPSEEK_MODEL = 'deepseek-chat'
  resetRateLimit()
  resetAuthAttempts()
  mockGenerate.mockReset()
  mockGenerate.mockResolvedValue([{ id: 'dish-1' }] as never)
})

describe('POST /api/generate', () => {
  it('rejects requests without the auth cookie', async () => {
    const response = await POST(generateRequest(VALID_BODY, { auth: false }))

    expect(response.status).toBe(401)
    expect(mockGenerate).not.toHaveBeenCalled()
  })

  it('rejects a blank theme', async () => {
    const response = await POST(generateRequest({ theme: '   ' }))

    expect(response.status).toBe(400)
    expect(mockGenerate).not.toHaveBeenCalled()
  })

  it('rejects a theme longer than 300 characters', async () => {
    const response = await POST(generateRequest({ theme: '菜'.repeat(301) }))

    expect(response.status).toBe(400)
  })

  it('rejects a foreign origin', async () => {
    const response = await POST(
      generateRequest(VALID_BODY, {
        origin: 'https://evil.com',
        host: 'fsdf.vercel.app',
      }),
    )

    expect(response.status).toBe(403)
    expect(mockGenerate).not.toHaveBeenCalled()
  })

  it('accepts a same-origin request on a deployed host', async () => {
    const response = await POST(
      generateRequest(VALID_BODY, {
        origin: 'https://fsdf.vercel.app',
        host: 'fsdf.vercel.app',
      }),
    )

    expect(response.status).toBe(200)
    expect(mockGenerate).toHaveBeenCalledTimes(1)
  })

  it('returns MISSING_API_KEY when the key is absent', async () => {
    delete process.env.DEEPSEEK_API_KEY

    const response = await POST(generateRequest(VALID_BODY))
    const body = (await response.json()) as { code: string; message: string }

    expect(response.status).toBe(500)
    expect(body.code).toBe('MISSING_API_KEY')
    expect(body.message).toContain('DEEPSEEK_API_KEY')
    expect(mockGenerate).not.toHaveBeenCalled()
  })

  it('rate limits after three requests from the same ip', async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await POST(generateRequest(VALID_BODY))
      expect(response.status).toBe(200)
    }

    const blocked = await POST(generateRequest(VALID_BODY))
    const body = (await blocked.json()) as { code: string }

    expect(blocked.status).toBe(429)
    expect(body.code).toBe('RATE_LIMIT')
  })

  it('returns the generated dishes', async () => {
    const response = await POST(generateRequest(VALID_BODY))
    const body = (await response.json()) as { dishes: unknown[] }

    expect(response.status).toBe(200)
    expect(body.dishes).toEqual([{ id: 'dish-1' }])
    expect(mockGenerate).toHaveBeenCalledTimes(1)
    expect(mockGenerate.mock.calls[0][0]).toMatchObject(VALID_BODY)
  })

  it('maps a short batch to TOO_FEW', async () => {
    mockGenerate.mockRejectedValueOnce(new TooFewDishesError(7, 8))

    const response = await POST(generateRequest(VALID_BODY))
    const body = (await response.json()) as { code: string; message: string }

    expect(response.status).toBe(502)
    expect(body.code).toBe('TOO_FEW')
    expect(body.message).toContain('7')
  })

  it('maps a missing key from the client to MISSING_API_KEY', async () => {
    mockGenerate.mockRejectedValueOnce(new MissingKeyError())

    const response = await POST(generateRequest(VALID_BODY))
    const body = (await response.json()) as { code: string }

    expect(response.status).toBe(500)
    expect(body.code).toBe('MISSING_API_KEY')
  })
})
