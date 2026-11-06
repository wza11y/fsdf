import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import type { Dish } from './types'

export class SchemaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SchemaError'
  }
}

export class TooFewDishesError extends Error {
  constructor(
    public readonly actual: number,
    public readonly min: number,
  ) {
    super(`只生成了 ${actual} 道菜，至少需要 ${min} 道`)
    this.name = 'TooFewDishesError'
  }
}

const scoreSchema = z.union([z.number(), z.string()]).transform((value) => {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.min(100, Math.max(0, Math.round(parsed)))
})

const ingredientSchema = z.object({
  name: z.string().trim().min(1),
  amount: z.string().trim().min(1),
})

const dishSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1),
  styleTags: z.array(z.string().trim().min(1)).min(1),
  cravingScore: scoreSchema,
  reason: z.string().trim().min(1),
  cookTimeMinutes: z.number().nonnegative(),
  servings: z.number().positive(),
  difficulty: z.enum(['简单', '中等']),
  ingredients: z.array(ingredientSchema).min(1),
  steps: z.array(z.string().trim().min(1)).min(1),
  tip: z.string().trim().min(1),
  healthNote: z.string().trim().min(1),
})

export function parseDishes(
  raw: unknown,
  options: { min?: number } = {},
): Dish[] {
  const min = options.min ?? 8
  const array = z.array(z.unknown()).safeParse(raw)

  if (!array.success) {
    throw new SchemaError('模型返回的不是菜品数组')
  }

  const dishes: Dish[] = []

  for (const item of array.data) {
    const parsed = dishSchema.safeParse(item)

    if (!parsed.success) {
      const detail = parsed.error.issues[0]?.message ?? '格式错误'
      throw new SchemaError(`菜品数据不合法：${detail}`)
    }

    dishes.push({ ...parsed.data, id: parsed.data.id ?? randomUUID() })
  }

  const seen = new Set<string>()
  const unique = dishes.filter((dish) => {
    const key = dish.name.trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (unique.length < min) {
    throw new TooFewDishesError(unique.length, min)
  }

  return unique
}
