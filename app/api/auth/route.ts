import {
  authCookie,
  checkAuthAttempt,
  clientIp,
  deriveToken,
  recordAuthFailure,
  verifyToken,
} from '@/lib/auth'

function json(
  body: unknown,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

export async function POST(request: Request): Promise<Response> {
  const accessCode = process.env.ACCESS_CODE

  if (!accessCode) {
    return json(
      {
        code: 'MISSING_ACCESS_CODE',
        message: '服务端未配置 ACCESS_CODE',
      },
      500,
    )
  }

  const ip = clientIp(request)

  if (!checkAuthAttempt(ip)) {
    return json(
      { code: 'RATE_LIMIT', message: '尝试次数太多，请 10 分钟后再试' },
      429,
    )
  }

  let payload: unknown = null

  try {
    payload = await request.json()
  } catch {
    payload = null
  }

  const code =
    typeof payload === 'object' && payload !== null && 'code' in payload
      ? (payload as { code: unknown }).code
      : undefined

  if (typeof code !== 'string' || !verifyToken(deriveToken(code), accessCode)) {
    recordAuthFailure(ip)
    return json({ code: 'UNAUTHORIZED', message: '口令不正确' }, 401)
  }

  return json({ ok: true }, 200, {
    'Set-Cookie': authCookie(deriveToken(accessCode)),
  })
}
