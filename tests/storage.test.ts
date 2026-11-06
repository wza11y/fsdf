import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadFavorites,
  loadHistory,
  removeGeneration,
  saveGeneration,
  toggleFavorite,
} from '@/lib/storage'
import type { Dish, Generation } from '@/lib/types'

function makeGeneration(id: string): Generation {
  return {
    id,
    createdAt: 1,
    theme: '清淡高蛋白',
    options: {},
    dishes: [],
  }
}

function makeDish(id: string, name = '番茄炒蛋'): Dish {
  return {
    id,
    name,
    styleTags: ['快手'],
    cravingScore: 88,
    reason: '酸甜开胃',
    cookTimeMinutes: 15,
    servings: 1,
    difficulty: '简单',
    ingredients: [],
    steps: [],
    tip: '少油',
    healthNote: '高蛋白',
  }
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('history storage', () => {
  it('saves the newest generation first', () => {
    saveGeneration(makeGeneration('first'))
    saveGeneration(makeGeneration('second'))

    expect(loadHistory().map((entry) => entry.id)).toEqual(['second', 'first'])
  })

  it('keeps at most thirty generations', () => {
    for (let index = 0; index < 31; index += 1) {
      saveGeneration(makeGeneration(`entry-${index}`))
    }

    const history = loadHistory()

    expect(history).toHaveLength(30)
    expect(history[0].id).toBe('entry-30')
    expect(history.at(-1)?.id).toBe('entry-1')
  })

  it('returns an empty list when the stored JSON is corrupt', () => {
    window.localStorage.setItem('ai-cooking:history:v1', '{not json')

    expect(loadHistory()).toEqual([])
  })

  it('does not throw when storage quota is exceeded', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })

    expect(() => saveGeneration(makeGeneration('full'))).not.toThrow()
  })

  it('removes a generation by id', () => {
    saveGeneration(makeGeneration('keep'))
    saveGeneration(makeGeneration('drop'))

    removeGeneration('drop')

    expect(loadHistory().map((entry) => entry.id)).toEqual(['keep'])
  })

  it('returns an empty list when localStorage is unavailable', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })

    expect(loadHistory()).toEqual([])
  })
})

describe('favorites storage', () => {
  it('toggles a favorite on and off', () => {
    const dish = makeDish('dish-1')

    expect(toggleFavorite(dish)).toBe(true)
    expect(loadFavorites().map((item) => item.id)).toEqual(['dish-1'])

    expect(toggleFavorite(dish)).toBe(false)
    expect(loadFavorites()).toEqual([])
  })

  it('stores the newest favorite first', () => {
    toggleFavorite(makeDish('dish-1'))
    toggleFavorite(makeDish('dish-2', '青椒肉丝'))

    expect(loadFavorites().map((item) => item.id)).toEqual(['dish-2', 'dish-1'])
  })
})
