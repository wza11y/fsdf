import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGenerate } from '@/hooks/use-generate'
import { loadHistory } from '@/lib/storage'
import type { Dish } from '@/lib/types'

function makeDish(id = 'dish-1'): Dish {
  return {
    id,
    name: '番茄炒蛋',
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

function okResponse(dishes: Dish[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ dishes }),
  }
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useGenerate', () => {
  it('stores a successful generation in history', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse([makeDish()])))
    const { result } = renderHook(() => useGenerate())

    await act(async () => {
      await result.current.generate({ theme: '清淡高蛋白' })
    })

    expect(result.current.status).toBe('success')
    expect(result.current.dishes).toHaveLength(1)
    expect(loadHistory()).toHaveLength(1)
    expect(loadHistory()[0].theme).toBe('清淡高蛋白')
  })

  it('surfaces the server error code and message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({
          code: 'TOO_FEW',
          message: '这次只凑出 7 道菜，点重试再要一批。',
        }),
      }),
    )
    const { result } = renderHook(() => useGenerate())

    await act(async () => {
      await result.current.generate({ theme: '清淡' })
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toEqual({
      code: 'TOO_FEW',
      message: '这次只凑出 7 道菜，点重试再要一批。',
    })
  })

  it('flags the gate on 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          code: 'UNAUTHORIZED',
          message: '请先输入访问口令',
        }),
      }),
    )
    const { result } = renderHook(() => useGenerate())

    await act(async () => {
      await result.current.generate({ theme: '清淡' })
    })

    expect(result.current.needsGate).toBe(true)
  })

  it('ignores a second call while one is in flight', async () => {
    let resolveFetch: (value: unknown) => void = () => {}
    const pending = new Promise((resolve) => {
      resolveFetch = resolve
    })
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending))
    const { result } = renderHook(() => useGenerate())

    act(() => {
      void result.current.generate({ theme: 'a' })
      void result.current.generate({ theme: 'b' })
    })

    expect(result.current.status).toBe('loading')
    expect(loadHistory()).toHaveLength(0)

    await act(async () => {
      resolveFetch(okResponse([makeDish()]))
      await pending
    })

    expect(result.current.dishes).toHaveLength(1)
  })
})
