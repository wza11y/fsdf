import { describe, expect, it } from 'vitest'
import { parseDishes, SchemaError, TooFewDishesError } from '@/lib/schema'

function makeDish(overrides: Record<string, unknown> = {}) {
  return {
    name: '番茄炒蛋',
    styleTags: ['快手', '下饭'],
    cravingScore: 88,
    reason: '酸甜开胃，15 分钟就能上桌',
    cookTimeMinutes: 15,
    servings: 1,
    difficulty: '简单',
    ingredients: [{ name: '番茄', amount: '1 个' }],
    steps: ['番茄切块', '鸡蛋炒散', '合炒调味'],
    tip: '番茄先去皮更出沙',
    healthNote: '蛋白质充足，油量可控',
    ...overrides,
  }
}

function makeDishes(count: number, overrides: Record<string, unknown> = {}) {
  return Array.from({ length: count }, (_, index) =>
    makeDish({ name: `菜${index}`, ...overrides }),
  )
}

describe('parseDishes', () => {
  it('parses ten valid dishes and assigns ids', () => {
    const dishes = parseDishes(makeDishes(10))

    expect(dishes).toHaveLength(10)
    expect(dishes[0].name).toBe('菜0')
    expect(dishes[0].cravingScore).toBe(88)
    expect(typeof dishes[0].id).toBe('string')
    expect(dishes[0].id.length).toBeGreaterThan(0)
  })

  it('accepts nine dishes', () => {
    expect(parseDishes(makeDishes(9))).toHaveLength(9)
  })

  it('deduplicates dishes with the same name', () => {
    const dishes = parseDishes(makeDishes(10, { name: '番茄炒蛋' }), { min: 1 })

    expect(dishes).toHaveLength(1)
  })

  it('throws TooFewDishesError when dedupe leaves fewer than eight', () => {
    const raw = makeDishes(8)
    raw[7] = makeDish({ name: '菜0' })

    expect(() => parseDishes(raw)).toThrow(TooFewDishesError)

    try {
      parseDishes(raw)
    } catch (error) {
      expect(error).toBeInstanceOf(TooFewDishesError)
      expect((error as TooFewDishesError).actual).toBe(7)
      expect((error as TooFewDishesError).min).toBe(8)
    }
  })

  it('clamps cravingScore to 0-100 and coerces numeric strings', () => {
    const dishes = parseDishes(
      [
        makeDish({ name: '高分', cravingScore: 150 }),
        makeDish({ name: '中分', cravingScore: '88' }),
        makeDish({ name: '低分', cravingScore: -20 }),
      ],
      { min: 1 },
    )

    expect(dishes.map((dish) => dish.cravingScore)).toEqual([100, 88, 0])
  })

  it('throws SchemaError when steps are missing', () => {
    const withoutSteps = makeDish()
    delete (withoutSteps as Record<string, unknown>).steps

    expect(() => parseDishes([withoutSteps])).toThrow(SchemaError)
  })

  it('throws TooFewDishesError for an empty array', () => {
    expect(() => parseDishes([])).toThrow(TooFewDishesError)
  })
})
