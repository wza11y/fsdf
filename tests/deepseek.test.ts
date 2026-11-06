import { describe, expect, it, vi } from 'vitest'
import {
  generateDishes,
  InvalidKeyError,
  MissingKeyError,
  RateLimitError,
  TimeoutError,
  type DeepSeekDeps,
} from '@/lib/deepseek'
import { TooFewDishesError } from '@/lib/schema'

function makeDish(name: string) {
  return {
    name,
    styleTags: ['快手'],
    cravingScore: 80,
    reason: '理由',
    cookTimeMinutes: 15,
    servings: 1,
    difficulty: '简单',
    ingredients: [{ name: '番茄', amount: '1 个' }],
    steps: ['切', '炒'],
    tip: '少油',
    healthNote: '高蛋白',
  }
}

function payload(count: number, prefix = '菜') {
  return JSON.stringify({
    dishes: Array.from({ length: count }, (_, index) =>
      makeDish(`${prefix}${index}`),
    ),
  })
}

function completion(content: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  } as unknown as Response
}

function failure(status: number) {
  return {
    ok: false,
    status,
    json: async () => ({}),
  } as unknown as Response
}

function deps(
  fetchImpl: (url: string, init: RequestInit) => Promise<Response>,
  overrides: Partial<DeepSeekDeps> = {},
): DeepSeekDeps {
  return {
    fetch: fetchImpl as unknown as typeof fetch,
    apiKey: 'sk-test',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    ...overrides,
  }
}

const input = { theme: '想吃清淡高蛋白' }

describe('generateDishes', () => {
  it('throws MissingKeyError when the api key is blank', async () => {
    const fetchImpl = vi.fn()

    await expect(
      generateDishes(input, deps(fetchImpl as never, { apiKey: '  ' })),
    ).rejects.toBeInstanceOf(MissingKeyError)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('maps 401 to InvalidKeyError', async () => {
    await expect(
      generateDishes(input, deps(async () => failure(401))),
    ).rejects.toBeInstanceOf(InvalidKeyError)
  })

  it('maps 429 to RateLimitError', async () => {
    await expect(
      generateDishes(input, deps(async () => failure(429))),
    ).rejects.toBeInstanceOf(RateLimitError)
  })

  it('maps aborts to TimeoutError', async () => {
    const hangingFetch = (_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
        })
      })

    await expect(
      generateDishes(input, deps(hangingFetch, { timeoutMs: 30 })),
    ).rejects.toBeInstanceOf(TimeoutError)
  })

  it('strips markdown fences before parsing', async () => {
    const content = '```json\n' + payload(8) + '\n```'

    const dishes = await generateDishes(input, deps(async () => completion(content)))

    expect(dishes).toHaveLength(8)
  })

  it('retries once with a lower temperature when the JSON is invalid', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(completion('这不是 JSON'))
      .mockResolvedValueOnce(completion(payload(10)))

    const dishes = await generateDishes(input, deps(fetchImpl))

    expect(dishes).toHaveLength(10)
    expect(fetchImpl).toHaveBeenCalledTimes(2)

    const firstBody = JSON.parse(fetchImpl.mock.calls[0][1].body as string)
    const secondBody = JSON.parse(fetchImpl.mock.calls[1][1].body as string)
    expect(secondBody.temperature).toBeLessThan(firstBody.temperature)
  })

  it('retries once when the first batch has fewer than eight dishes', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(completion(payload(7)))
      .mockResolvedValueOnce(completion(payload(9)))

    const dishes = await generateDishes(input, deps(fetchImpl))

    expect(dishes).toHaveLength(9)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('throws TooFewDishesError when both attempts are short', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(completion(payload(7)))
      .mockResolvedValueOnce(completion(payload(7)))

    await expect(generateDishes(input, deps(fetchImpl))).rejects.toBeInstanceOf(
      TooFewDishesError,
    )
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
})
