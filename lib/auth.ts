import { createHmac, timingSafeEqual } from 'node:crypto'

export const AUTH_COOKIE = 'ai_cooking_auth'
export const AUTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

const MESSAGE = 'ai-cooking-authorized-v1'
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5

export function deriveToken(accessCode: string): string {
  return createHmac('sha256', accessCode).update(MESSAGE).digest('hex')
}

export function verifyToken(
  token: string | undefined | null,
  accessCode: string | undefined,
): boolean {
  if (!token || !accessCode) return false

  const expected = deriveToken(accessCode)
  const tokenBuffer = Buffer.from(token)
  const expectedBuffer = Buffer.from(expected)

  if (tokenBuffer.length !== expectedBuffer.length) return false

  return timingSafeEqual(tokenBuffer, expectedBuffer)
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || 'local'
}

const attempts = new Map<string, number[]>()

export function checkAuthAttempt(key: string, now = Date.now()): boolean {
  const recent = (attempts.get(key) ?? []).filter(
    (time) => now - time < ATTEMPT_WINDOW_MS,
  )
  attempts.set(key, recent)
  return recent.length < MAX_ATTEMPTS
}

export function recordAuthFailure(key: string, now = Date.now()): void {
  const recent = (attempts.get(key) ?? []).filter(
    (time) => now - time < ATTEMPT_WINDOW_MS,
  )
  recent.push(now)
  attempts.set(key, recent)
}

export function resetAuthAttempts(): void {
  attempts.clear()
}

export function authCookie(token: string): string {
  const parts = [
    `${AUTH_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${AUTH_MAX_AGE_SECONDS}`,
  ]

  if (process.env.NODE_ENV === 'production') parts.push('Secure')

  return parts.join('; ')
}
