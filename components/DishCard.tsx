'use client'

import { useEffect, useId, useState } from 'react'
import { dishToText } from '@/lib/format'
import type { Dish } from '@/lib/types'

type DishCardProps = {
  dish: Dish
  isFavorite: boolean
  onToggleFavorite: (dish: Dish) => void
  defaultOpen?: boolean
}

export function DishCard({
  dish,
  isFavorite,
  onToggleFavorite,
  defaultOpen = false,
}: DishCardProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [copied, setCopied] = useState(false)
  const recipeId = useId()

  useEffect(() => {
    if (!copied) return

    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function copyDish() {
    try {
      await navigator.clipboard.writeText(dishToText(dish))
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <article className="border-t border-kitchen-line py-7">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h2 className="font-serif text-2xl leading-snug text-kitchen-ink sm:text-[1.7rem]">
            {dish.name}
          </h2>

          <div className="mt-2 flex flex-wrap gap-2">
            {dish.styleTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-kitchen-line px-2.5 py-1 text-xs text-kitchen-muted"
              >
                {tag}
              </span>
            ))}
          </div>

          <p className="mt-3 max-w-xl text-sm leading-6 text-kitchen-muted">
            {dish.reason}
          </p>
        </div>

        <div
          aria-label={`心动值 ${dish.cravingScore}/100`}
          className="shrink-0 text-right"
        >
          <p className="text-xs text-kitchen-muted">心动值</p>
          <p className="mt-1 font-serif text-3xl text-kitchen-ginger">
            {dish.cravingScore}
            <span className="ml-1 text-sm text-kitchen-muted">/100</span>
          </p>
          <div className="mt-2 h-px w-20 bg-kitchen-line">
            <div
              className="h-px bg-kitchen-ginger"
              style={{ width: `${dish.cravingScore}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-kitchen-muted">
        <span>耗时 {dish.cookTimeMinutes} 分钟</span>
        <span>{dish.servings} 人份</span>
        <span>{dish.difficulty}</span>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={copyDish}
            className="text-kitchen-muted transition hover:text-kitchen-ink"
          >
            {copied ? '已复制' : '复制'}
          </button>
          <button
            type="button"
            aria-pressed={isFavorite}
            onClick={() => onToggleFavorite(dish)}
            className={
              isFavorite
                ? 'text-kitchen-ginger transition'
                : 'text-kitchen-muted transition hover:text-kitchen-ink'
            }
          >
            {isFavorite ? '已收藏' : '收藏'}
          </button>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={recipeId}
            onClick={() => setOpen((current) => !current)}
            className="text-kitchen-ink underline decoration-kitchen-line underline-offset-4 transition hover:decoration-kitchen-ginger"
          >
            {open ? `收起${dish.name}的配方` : `看${dish.name}的配方`}
          </button>
        </div>
      </div>

      {open ? (
        <div
          id={recipeId}
          className="mt-6 grid gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]"
        >
          <section>
            <h3 className="text-xs text-kitchen-muted">配料</h3>
            <ul className="mt-3 space-y-2 text-sm text-kitchen-ink">
              {dish.ingredients.map((item) => (
                <li
                  key={`${item.name}-${item.amount}`}
                  className="flex justify-between gap-4 border-b border-kitchen-line/60 pb-2"
                >
                  <span>{item.name}</span>
                  <span className="text-kitchen-muted">{item.amount}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-xs text-kitchen-muted">步骤</h3>
            <ol className="mt-3 space-y-3 text-sm leading-6 text-kitchen-ink">
              {dish.steps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="text-kitchen-ginger">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
            <p className="text-sm leading-6 text-kitchen-muted">
              关键点：<span className="text-kitchen-ink">{dish.tip}</span>
            </p>
            <p className="text-sm leading-6 text-kitchen-muted">
              健康：<span className="text-kitchen-ink">{dish.healthNote}</span>
            </p>
          </div>
        </div>
      ) : null}
    </article>
  )
}
