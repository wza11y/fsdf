import type { Dish, Generation } from './types'

const HISTORY_KEY = 'ai-cooking:history:v1'
const FAVORITES_KEY = 'ai-cooking:favorites:v1'

export const HISTORY_LIMIT = 30

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

function readArray<T>(key: string): T[] {
  const storage = getStorage()
  if (!storage) return []

  try {
    const raw = storage.getItem(key)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function writeArray(key: string, value: unknown[]): void {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota exceeded or storage disabled: degrade silently.
  }
}

export function loadHistory(): Generation[] {
  return readArray<Generation>(HISTORY_KEY)
}

export function saveGeneration(generation: Generation): void {
  const history = loadHistory().filter((entry) => entry.id !== generation.id)
  writeArray(HISTORY_KEY, [generation, ...history].slice(0, HISTORY_LIMIT))
}

export function removeGeneration(id: string): void {
  writeArray(
    HISTORY_KEY,
    loadHistory().filter((entry) => entry.id !== id),
  )
}

export function loadFavorites(): Dish[] {
  return readArray<Dish>(FAVORITES_KEY)
}

export function toggleFavorite(dish: Dish): boolean {
  const favorites = loadFavorites()
  const exists = favorites.some((item) => item.id === dish.id)
  const next = exists
    ? favorites.filter((item) => item.id !== dish.id)
    : [dish, ...favorites]

  writeArray(FAVORITES_KEY, next)

  return !exists
}
