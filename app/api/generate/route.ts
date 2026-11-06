import { z } from 'zod'
import { AUTH_COOKIE, clientIp, verifyToken } from '@/lib/auth'
import {
  generateDishes,
  InvalidKeyError,
  MissingKeyError,
  RateLimitError,
  TimeoutError,
  UpstreamError,
} from '@/lib/deepseek'
import { checkAndConsume } from '@/lib/rate-limit'
import { SchemaError, TooFewDishesError } from '@/lib/schema'
import type { ApiErrorCode } from '@/lib/types'

const bodySchema = z.object({
  theme: z.string().trim().min(1).max(300),
  maxMinutes: z.number().finite().positive().optional(),
  servings: z.number().int().positive().optional(),
  taste: z.enum(['下饭', '清淡', '高蛋白']).optional(),
})

const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function fail(code: ApiErrorCode, message: string, status: number): Response {
  return json({ code, message }, status)
}

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie')
  if (!header) return undefined

  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }

  return undefined
}

function isLocalRequest(request: Request): boolean {
  const origin = request.headers.get('origin')

  if (origin) {
    try {
      const { hostname } = new URL(origin)
      if (!ALLOWED_HOSTS.has(hostname)) return false
    } catch {
      return false
    }
  }

  const hostHeader = request.headers.get('host')

  if (hostHeader) {
    const host = hostHeader.startsWith('[')
      ? hostHeader.slice(0, hostHeader.indexOf(']') + 1)
      : hostHeader.split(':')[0]

    if (!ALLOWED_HOSTS.has(host)) return false
  }

  return true
}

export async function POST(request: Request): Promise<Response> {
  const accessCode = process.env.ACCESS_CODE

  if (!accessCode) {
    return fail('MISSING_ACCESS_CODE', '服务端未配置 ACCESS_CODE', 500)
  }

  if (!verifyToken(readCookie(request, AUTH_COOKIE), accessCode)) {
    return fail('UNAUTHORIZED', '请先输入访问口令', 401)
  }

  if (!isLocalRequest(request)) {
    return fail('BAD_ORIGIN', '只允许本机访问', 403)
  }

  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return fail('BAD_REQUEST', '请求格式不正确', 400)
  }

  const parsed = bodySchema.safeParse(payload)

  if (!parsed.success) {
    return fail('BAD_REQUEST', '请输入 1–300 字的主题', 400)
  }

  const apiKey = process.env.DEEPSEEK_API_KEY?.trim()

  if (!apiKey) {
    return fail(
      'MISSING_API_KEY',
      '服务端未配置 DEEPSEEK_API_KEY——请在项目根目录的 .env.local 中设置后重启开发服务器。',
      500,
    )
  }

  const limit = checkAndConsume(clientIp(request))

  if (!limit.ok) {
    const message =
      limit.retryAfterMs > 60_000
        ? '今天的生成额度用完了，明天再来。'
        : `请求太频繁，请 ${Math.ceil(limit.retryAfterMs / 1000)} 秒后再试。`

    return fail('RATE_LIMIT', message, 429)
  }

  try {
    const dishes = await generateDishes(parsed.data, {
      fetch,
      apiKey,
      baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    })

    return json({ dishes }, 200)
  } catch (error) {
    if (error instanceof MissingKeyError) {
      return fail(
        'MISSING_API_KEY',
        '服务端未配置 DEEPSEEK_API_KEY——请在 .env.local 中设置后重启。',
        500,
      )
    }

    if (error instanceof InvalidKeyError) {
      return fail(
        'INVALID_KEY',
        'API Key 无效，请检查 .env.local 中的 DEEPSEEK_API_KEY。',
        502,
      )
    }

    if (error instanceof RateLimitError) {
      return fail('RATE_LIMIT', '模型服务繁忙，请稍后再试。', 429)
    }

    if (error instanceof TimeoutError) {
      return fail('TIMEOUT', '生成超时了，请重试一次。', 504)
    }

    if (error instanceof TooFewDishesError) {
      return fail(
        'TOO_FEW',
        `这次只凑出 ${error.actual} 道菜，点重试再要一批。`,
        502,
      )
    }

    if (error instanceof SchemaError) {
      return fail('BAD_JSON', '模型返回的格式不对，请重试一次。', 502)
    }

    if (error instanceof UpstreamError) {
      return fail('UPSTREAM', '模型服务出了点问题，请稍后再试。', 502)
    }

    return fail('UPSTREAM', '生成失败，请稍后再试。', 500)
  }
}
