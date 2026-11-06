import { buildSystemPrompt, buildUserPrompt } from './prompt'
import { parseDishes, SchemaError, TooFewDishesError } from './schema'
import type { Dish, GenerateInput } from './types'

export class MissingKeyError extends Error {
  constructor(message = '未配置 DEEPSEEK_API_KEY') {
    super(message)
    this.name = 'MissingKeyError'
  }
}

export class InvalidKeyError extends Error {
  constructor(message = 'API Key 无效') {
    super(message)
    this.name = 'InvalidKeyError'
  }
}

export class RateLimitError extends Error {
  constructor(public readonly retryAfterMs = 60_000) {
    super('请求过于频繁')
    this.name = 'RateLimitError'
  }
}

export class TimeoutError extends Error {
  constructor(message = '模型响应超时') {
    super(message)
    this.name = 'TimeoutError'
  }
}

export class UpstreamError extends Error {
  constructor(
    public readonly status: number,
    message = '上游服务异常',
  ) {
    super(message)
    this.name = 'UpstreamError'
  }
}

export type DeepSeekDeps = {
  fetch: typeof fetch
  apiKey: string
  baseUrl: string
  model: string
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 60_000
const RETRY_NOTE = '上一批不足 8 道，请补足到 10 道并精简步骤。'

export async function generateDishes(
  input: GenerateInput,
  deps: DeepSeekDeps,
): Promise<Dish[]> {
  if (!deps.apiKey || !deps.apiKey.trim()) {
    throw new MissingKeyError()
  }

  try {
    return await requestOnce(input, deps, 0.85)
  } catch (error) {
    if (error instanceof TooFewDishesError || error instanceof SchemaError) {
      const retryInput = {
        ...input,
        theme: `${input.theme.trim()}\n${RETRY_NOTE}`,
      }
      return requestOnce(retryInput, deps, 0.3)
    }

    throw error
  }
}

async function requestOnce(
  input: GenerateInput,
  deps: DeepSeekDeps,
  temperature: number,
): Promise<Dish[]> {
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(),
    deps.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  )

  try {
    const response = await deps.fetch(
      `${deps.baseUrl.replace(/\/+$/, '')}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${deps.apiKey}`,
        },
        body: JSON.stringify({
          model: deps.model,
          messages: [
            { role: 'system', content: buildSystemPrompt() },
            { role: 'user', content: buildUserPrompt(input) },
          ],
          temperature,
          max_tokens: 6000,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      },
    )

    if (response.status === 401) throw new InvalidKeyError()
    if (response.status === 429) throw new RateLimitError()
    if (!response.ok) throw new UpstreamError(response.status)

    const data = (await response.json()) as {
      choices?: { message?: { content?: unknown } }[]
    }
    const content = data.choices?.[0]?.message?.content

    if (typeof content !== 'string') {
      throw new UpstreamError(502, '模型没有返回内容')
    }

    return parseDishes(extractDishes(content))
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError()
    }
    if (error instanceof TypeError) {
      throw new UpstreamError(0, '网络请求失败')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

function stripFences(text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return fenced ? fenced[1].trim() : trimmed
}

function extractDishes(content: string): unknown {
  let data: unknown

  try {
    data = JSON.parse(stripFences(content))
  } catch {
    throw new SchemaError('模型返回的内容不是合法 JSON')
  }

  if (typeof data !== 'object' || data === null || !('dishes' in data)) {
    throw new SchemaError('模型返回的 JSON 缺少 dishes 字段')
  }

  return (data as { dishes: unknown }).dishes
}
