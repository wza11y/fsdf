'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
import type { GenerateInput, Taste } from '@/lib/types'

const TIME_OPTIONS = [15, 30, 45] as const
const SERVING_OPTIONS = [1, 2, 3] as const
const TASTE_OPTIONS: { value: Taste; label: string }[] = [
  { value: '下饭', label: '下饭' },
  { value: '清淡', label: '清淡少油' },
  { value: '高蛋白', label: '高蛋白' },
]

type ThemeFormProps = {
  onSubmit: (input: GenerateInput) => void
  disabled?: boolean
}

type ChipProps = {
  selected: boolean
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}

function Chip({ selected, onClick, disabled, children }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={
        selected
          ? 'rounded-full border border-kitchen-ginger bg-kitchen-ginger/15 px-4 py-2 text-sm text-kitchen-ginger transition'
          : 'rounded-full border border-kitchen-line px-4 py-2 text-sm text-kitchen-muted transition hover:border-kitchen-muted hover:text-kitchen-ink'
      }
    >
      {children}
    </button>
  )
}

export function ThemeForm({ onSubmit, disabled = false }: ThemeFormProps) {
  const [theme, setTheme] = useState('')
  const [maxMinutes, setMaxMinutes] = useState<number>()
  const [servings, setServings] = useState<number>()
  const [taste, setTaste] = useState<Taste>()

  function toggle<T>(current: T | undefined, next: T): T | undefined {
    return current === next ? undefined : next
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = theme.trim()
    if (!trimmed || disabled) return

    const input: GenerateInput = { theme: trimmed }
    if (maxMinutes) input.maxMinutes = maxMinutes
    if (servings) input.servings = servings
    if (taste) input.taste = taste

    onSubmit(input)
  }

  return (
    <form onSubmit={handleSubmit}>
      <label
        htmlFor="theme"
        className="block font-serif text-2xl leading-snug text-kitchen-ink sm:text-3xl"
      >
        今晚想吃点什么？
      </label>

      <textarea
        id="theme"
        value={theme}
        disabled={disabled}
        onChange={(event) => setTheme(event.target.value)}
        rows={2}
        placeholder="说个大概就行：清淡点、高蛋白、二十分钟能做好。"
        className="mt-4 w-full resize-none border-0 border-b border-kitchen-line bg-transparent pb-3 text-lg leading-8 text-kitchen-ink outline-none transition placeholder:text-kitchen-muted/70 focus:border-kitchen-ginger disabled:opacity-50"
      />

      <div
        role="group"
        aria-label="多久做完"
        className="mt-6 flex flex-wrap items-center gap-2"
      >
        <span className="mr-1 text-sm text-kitchen-muted">多久做完</span>
        {TIME_OPTIONS.map((minutes) => (
          <Chip
            key={minutes}
            selected={maxMinutes === minutes}
            disabled={disabled}
            onClick={() => setMaxMinutes((current) => toggle(current, minutes))}
          >
            {minutes} 分钟
          </Chip>
        ))}
      </div>

      <div
        role="group"
        aria-label="几个人吃"
        className="mt-3 flex flex-wrap items-center gap-2"
      >
        <span className="mr-1 text-sm text-kitchen-muted">几个人吃</span>
        {SERVING_OPTIONS.map((count) => (
          <Chip
            key={count}
            selected={servings === count}
            disabled={disabled}
            onClick={() => setServings((current) => toggle(current, count))}
          >
            {count} 人
          </Chip>
        ))}
      </div>

      <div
        role="group"
        aria-label="口味倾向"
        className="mt-3 flex flex-wrap items-center gap-2"
      >
        <span className="mr-1 text-sm text-kitchen-muted">口味</span>
        {TASTE_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            selected={taste === option.value}
            disabled={disabled}
            onClick={() => setTaste((current) => toggle(current, option.value))}
          >
            {option.label}
          </Chip>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={disabled || !theme.trim()}
          className="rounded-md bg-kitchen-chili px-6 py-3 font-medium text-kitchen-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          生成今天的菜
        </button>
        <p className="text-sm text-kitchen-muted">
          一次 8–10 道，转盘替你选。
        </p>
      </div>
    </form>
  )
}
