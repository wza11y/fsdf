export const PER_MINUTE = 3
export const PER_DAY_GLOBAL = 50

const MINUTE_MS = 60_000

type RateResult = { ok: true } | { ok: false; retryAfterMs: number }

const hitsByKey = new Map<string, number[]>()
let dailyKey = dayKey(Date.now())
let dailyCount = 0

function dayKey(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function msUntilTomorrow(timestamp: number): number {
  const tomorrow = new Date(timestamp)
  tomorrow.setHours(24, 0, 0, 0)
  return tomorrow.getTime() - timestamp
}

export function checkAndConsume(
  key: string,
  now = Date.now(),
): RateResult {
  const today = dayKey(now)

  if (today !== dailyKey) {
    dailyKey = today
    dailyCount = 0
  }

  if (dailyCount >= PER_DAY_GLOBAL) {
    return { ok: false, retryAfterMs: msUntilTomorrow(now) }
  }

  const recent = (hitsByKey.get(key) ?? []).filter(
    (time) => now - time < MINUTE_MS,
  )

  if (recent.length >= PER_MINUTE) {
    const oldest = recent[0]
    hitsByKey.set(key, recent)
    return { ok: false, retryAfterMs: Math.max(0, MINUTE_MS - (now - oldest)) }
  }

  recent.push(now)
  hitsByKey.set(key, recent)
  dailyCount += 1

  return { ok: true }
}

export function resetRateLimit(): void {
  hitsByKey.clear()
  dailyCount = 0
  dailyKey = dayKey(Date.now())
}
