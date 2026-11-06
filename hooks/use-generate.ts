'use client'

import { useCallback, useRef, useState } from 'react'
import { saveGeneration } from '@/lib/storage'
import type {
  ApiErrorCode,
  Dish,
  GenerateInput,
  Generation,
  GenerationOptions,
} from '@/lib/types'

export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error'

export type GenerationErrorCode = ApiErrorCode | 'NETWORK'

export type GenerationError = {
  code: GenerationErrorCode
  message: string
}

type GenerateResponse = {
  dishes?: unknown
  code?: string
  message?: string
}

const FALLBACK_MESSAGE = '生成失败，请稍后再试。'

function toOptions(input: GenerateInput): GenerationOptions {
  const options: GenerationOptions = {}
  if (input.maxMinutes) options.maxMinutes = input.maxMinutes
  if (input.servings) options.servings = input.servings
  if (input.taste) options.taste = input.taste
  return options
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

export function useGenerate() {
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [dishes, setDishes] = useState<Dish[]>([])
  const [error, setError] = useState<GenerationError | null>(null)
  const [needsGate, setNeedsGate] = useState(false)
  const inFlight = useRef(false)

  const generate = useCallback(async (input: GenerateInput) => {
    if (inFlight.current) return

    inFlight.current = true
    setStatus('loading')
    setError(null)
    setNeedsGate(false)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      const data = (await response
        .json()
        .catch(() => null)) as GenerateResponse | null

      if (response.status === 401) {
        setNeedsGate(true)
        setError({
          code: 'UNAUTHORIZED',
          message: data?.message ?? '请先输入访问口令。',
        })
        setStatus('error')
        return
      }

      if (!response.ok) {
        setError({
          code: (data?.code as GenerationErrorCode) ?? 'UPSTREAM',
          message: data?.message ?? FALLBACK_MESSAGE,
        })
        setStatus('error')
        return
      }

      if (!Array.isArray(data?.dishes) || data.dishes.length === 0) {
        setError({
          code: 'UPSTREAM',
          message: '这次没有拿到菜，请再试一次。',
        })
        setStatus('error')
        return
      }

      const record: Generation = {
        id: createId(),
        createdAt: Date.now(),
        theme: input.theme,
        options: toOptions(input),
        dishes: data.dishes as Dish[],
      }

      saveGeneration(record)
      setDishes(record.dishes)
      setStatus('success')
    } catch {
      setError({ code: 'NETWORK', message: '网络出错了，请检查后重试。' })
      setStatus('error')
    } finally {
      inFlight.current = false
    }
  }, [])

  const restore = useCallback((generation: Generation) => {
    setDishes(generation.dishes)
    setError(null)
    setNeedsGate(false)
    setStatus('success')
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setDishes([])
    setError(null)
    setNeedsGate(false)
  }, [])

  return { status, dishes, error, needsGate, generate, restore, reset }
}
