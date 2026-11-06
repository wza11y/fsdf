'use client'

import { useState } from 'react'
import { ThemeForm } from '@/components/ThemeForm'
import type { GenerateInput } from '@/lib/types'

export default function Home() {
  const [lastInput, setLastInput] = useState<GenerateInput | null>(null)

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-8 sm:py-24">
      <header>
        <p className="font-serif text-sm tracking-[0.18em] text-kitchen-muted">
          AI cooking
        </p>
        <h1 className="mt-4 font-serif text-4xl leading-tight text-kitchen-ink sm:text-5xl">
          今晚，想吃点什么？
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-kitchen-muted">
          下班了，不想再想。说一个念头，剩下的交给厨房。
        </p>
      </header>

      <div className="mt-12 border-t border-kitchen-line pt-10">
        <ThemeForm onSubmit={setLastInput} />
      </div>

      <section className="mt-14 border-t border-kitchen-line pt-8">
        {lastInput ? (
          <p className="text-sm leading-7 text-kitchen-muted">
            已经收到「{lastInput.theme}」。下一步会在这里铺开 8–10 道菜。
          </p>
        ) : (
          <p className="text-sm leading-7 text-kitchen-muted">
            结果会在这里铺开。菜名、心动值、配料和步骤，一道一道排好。
          </p>
        )}
      </section>
    </main>
  )
}
