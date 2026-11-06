'use client'

import type { GenerationError } from '@/hooks/use-generate'

type ErrorCopy = {
  title: string
  hint: (message: string) => string
  action?: 'retry' | 'gate'
}

const COPY: Record<string, ErrorCopy> = {
  MISSING_API_KEY: {
    title: '服务端没有配置 API Key',
    hint: () =>
      '请在项目根目录的 .env.local 里设置 DEEPSEEK_API_KEY，然后重启开发服务器。',
    action: 'retry',
  },
  INVALID_KEY: {
    title: 'API Key 不对',
    hint: () =>
      '检查 .env.local 里的 DEEPSEEK_API_KEY 是否填对，改完要重启。',
    action: 'retry',
  },
  MISSING_ACCESS_CODE: {
    title: '服务端没有配置访问口令',
    hint: () => '在 .env.local 里设置 ACCESS_CODE，然后重启开发服务器。',
    action: 'retry',
  },
  UNAUTHORIZED: {
    title: '需要重新输入口令',
    hint: (message) => message || '口令失效了，回到门口重新进一次。',
    action: 'gate',
  },
  RATE_LIMIT: {
    title: '先歇一会儿',
    hint: (message) => message || '请求太频繁，请稍后再试。',
    action: 'retry',
  },
  TIMEOUT: {
    title: '等太久了',
    hint: () => '模型没有按时回来，再试一次通常就好。',
    action: 'retry',
  },
  TOO_FEW: {
    title: '菜不够数',
    hint: (message) => message || '这次凑出的菜太少，再试一次。',
    action: 'retry',
  },
  BAD_JSON: {
    title: '厨房出了点状况',
    hint: () => '模型返回的格式不对，再试一次通常就好。',
    action: 'retry',
  },
  BAD_REQUEST: {
    title: '这个主题没法用',
    hint: (message) => message || '换一个说法再试一次。',
    action: 'retry',
  },
  BAD_ORIGIN: {
    title: '只允许本机访问',
    hint: () => '请用 localhost 打开这个页面。',
  },
  UPSTREAM: {
    title: '厨房出了点状况',
    hint: (message) => message || '模型服务出了问题，稍后再试。',
    action: 'retry',
  },
  NETWORK: {
    title: '网络没连上',
    hint: () => '检查一下网络，然后再试。',
    action: 'retry',
  },
}

const FALLBACK: ErrorCopy = {
  title: '生成失败',
  hint: (message) => message || '请稍后再试。',
  action: 'retry',
}

type ErrorBannerProps = {
  error: GenerationError
  onRetry?: () => void
}

export function ErrorBanner({ error, onRetry }: ErrorBannerProps) {
  const copy = COPY[error.code] ?? FALLBACK

  return (
    <div
      role="alert"
      className="border border-kitchen-chili/40 bg-kitchen-chili/5 p-5"
    >
      <p className="font-serif text-lg text-kitchen-ink">{copy.title}</p>
      <p className="mt-2 text-sm leading-6 text-kitchen-muted">
        {copy.hint(error.message)}
      </p>

      {copy.action === 'gate' ? (
        <a
          href="/gate"
          className="mt-4 inline-block text-sm text-kitchen-ginger underline underline-offset-4"
        >
          回到口令页
        </a>
      ) : copy.action === 'retry' && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 text-sm text-kitchen-ginger underline underline-offset-4"
        >
          再试一次
        </button>
      ) : null}
    </div>
  )
}
