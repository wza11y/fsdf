'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

export function GateForm() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = code.trim()
    if (!trimmed || pending) return

    setPending(true)
    setError('')

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      })

      if (response.ok) {
        router.replace('/')
        router.refresh()
        return
      }

      const data = (await response.json().catch(() => null)) as {
        code?: string
      } | null

      if (response.status === 429) {
        setError('尝试次数太多，请 10 分钟后再试。')
      } else if (data?.code === 'MISSING_ACCESS_CODE') {
        setError(
          '服务端没有配置 ACCESS_CODE，请在项目根目录的 .env.local 中设置后重启。',
        )
      } else {
        setError('口令不正确，请再试一次。')
      }
    } catch {
      setError('网络出错了，请稍后再试。')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <label
        htmlFor="access-code"
        className="block text-sm font-medium text-stone-700"
      >
        访问口令
      </label>
      <input
        id="access-code"
        type="password"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        placeholder="输入口令才能进入厨房"
        autoComplete="current-password"
        className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
      />
      <button
        type="submit"
        disabled={!code.trim() || pending}
        className="w-full rounded-xl bg-stone-900 px-4 py-3 font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? '验证中…' : '进入'}
      </button>
      {error ? (
        <p role="alert" className="text-sm leading-6 text-red-600">
          {error}
        </p>
      ) : null}
    </form>
  )
}
