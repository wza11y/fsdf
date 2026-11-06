import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorBanner } from '@/components/ErrorBanner'
import type { GenerationErrorCode } from '@/hooks/use-generate'

describe('ErrorBanner', () => {
  it('names the missing environment variable and file', () => {
    render(
      <ErrorBanner
        error={{ code: 'MISSING_API_KEY', message: '服务端未配置' }}
        onRetry={vi.fn()}
      />,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('DEEPSEEK_API_KEY')
    expect(alert).toHaveTextContent('.env.local')
  })

  it.each<[GenerationErrorCode, string, string]>([
    ['TOO_FEW', '这次只凑出 7 道菜，点重试再要一批。', '菜不够'],
    ['TIMEOUT', '生成超时了，请重试一次。', '等太久'],
    ['RATE_LIMIT', '请求太频繁，请 60 秒后再试。', '请求太频繁'],
    ['NETWORK', '网络中断', '网络'],
    ['BAD_JSON', '格式错误', '格式'],
    ['INVALID_KEY', 'key 错误', 'API Key'],
  ])('explains %s in plain Chinese', (code, message, expected) => {
    render(
      <ErrorBanner error={{ code, message }} onRetry={vi.fn()} />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(expected)
  })

  it('offers a retry action when a retry handler exists', () => {
    const onRetry = vi.fn()
    render(
      <ErrorBanner
        error={{ code: 'TIMEOUT', message: '生成超时了' }}
        onRetry={onRetry}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '再试一次' }))

    expect(onRetry).toHaveBeenCalled()
  })

  it('links back to the gate when the session is not authorized', () => {
    render(
      <ErrorBanner error={{ code: 'UNAUTHORIZED', message: '口令失效' }} />,
    )

    expect(screen.getByRole('link', { name: /回到口令页/ })).toHaveAttribute(
      'href',
      '/gate',
    )
  })
})
