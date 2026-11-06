'use client'

import {
  useCallback,
  useEffect,
  useState,
  type TransitionEvent as ReactTransitionEvent,
} from 'react'
import { pickIndex } from '@/lib/roulette'
import type { Dish } from '@/lib/types'

type RouletteWheelProps = {
  dishes: Dish[]
  open: boolean
  onClose: () => void
  onPick: (index: number) => void
}

const SPIN_MS = 3000
const TURNS = 4
const SLICE_COLORS = ['#f7f0e5', '#efe4d4']

export function RouletteWheel({
  dishes,
  open,
  onClose,
  onPick,
}: RouletteWheelProps) {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [pendingIndex, setPendingIndex] = useState<number | null>(null)
  const [resultIndex, setResultIndex] = useState<number | null>(null)

  const close = useCallback(() => {
    setSpinning(false)
    setPendingIndex(null)
    setResultIndex(null)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, close])

  if (!open) return null

  const count = dishes.length
  const step = count > 0 ? 360 / count : 360

  const gradient =
    count > 0
      ? `conic-gradient(${dishes
          .map(
            (_dish, index) =>
              `${SLICE_COLORS[index % SLICE_COLORS.length]} ${
                index * step
              }deg ${(index + 1) * step}deg`,
          )
          .join(', ')})`
      : SLICE_COLORS[0]

  function spin() {
    if (count < 2 || spinning) return

    const index = pickIndex(count)
    const target = (360 - (index + 0.5) * step + 360) % 360
    const current = ((rotation % 360) + 360) % 360
    const delta = (target - current + 360) % 360
    const nextRotation = rotation + TURNS * 360 + delta

    setResultIndex(null)

    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced) {
      setRotation(nextRotation)
      setResultIndex(index)
      onPick(index)
      return
    }

    setPendingIndex(index)
    setSpinning(true)
    setRotation(nextRotation)
  }

  function handleTransitionEnd(event: ReactTransitionEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || pendingIndex === null) return

    const landed = pendingIndex
    setSpinning(false)
    setResultIndex(landed)
    setPendingIndex(null)
    onPick(landed)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="今天吃什么转盘"
        className="w-full max-w-md rounded-2xl border border-kitchen-line bg-kitchen-bg p-6"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-xl text-kitchen-ink">让转盘决定</h2>
          <button
            type="button"
            onClick={close}
            aria-label="关闭"
            className="text-sm text-kitchen-muted transition hover:text-kitchen-ink"
          >
            关闭
          </button>
        </div>

        <div className="relative mx-auto mt-8 h-80 w-80 max-w-full">
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1">
            <div className="h-0 w-0 border-x-[10px] border-t-[16px] border-x-transparent border-t-kitchen-chili" />
          </div>

          <div
            data-testid="roulette-wheel"
            onTransitionEnd={handleTransitionEnd}
            className="relative h-full w-full rounded-full border border-kitchen-line"
            style={{
              background: gradient,
              transform: `rotate(${rotation}deg)`,
              transition: spinning
                ? `transform ${SPIN_MS}ms cubic-bezier(0.17, 0.67, 0.12, 1)`
                : 'none',
            }}
          >
            {dishes.map((dish, index) => (
              <span
                key={dish.id}
                data-testid="wheel-segment"
                className="absolute left-1/2 top-1/2 w-24 text-center text-xs leading-tight text-kitchen-ink"
                style={{
                  transform: `translate(-50%, -50%) rotate(${
                    (index + 0.5) * step
                  }deg) translateY(-6.2rem)`,
                }}
              >
                <span className="block truncate">{dish.name}</span>
              </span>
            ))}
          </div>

          <div className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-kitchen-line bg-kitchen-bg" />
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={spin}
            disabled={count < 2 || spinning}
            className="rounded-md bg-kitchen-chili px-6 py-3 font-medium text-kitchen-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {spinning ? '转着…' : '转盘替我选'}
          </button>

          {count < 2 ? (
            <p className="text-sm text-kitchen-muted">至少要有两道菜才能转。</p>
          ) : null}

          <p aria-live="polite" className="min-h-6 text-sm text-kitchen-ginger">
            {resultIndex !== null
              ? `已选中：${dishes[resultIndex]?.name ?? ''}`
              : null}
          </p>
        </div>
      </div>
    </div>
  )
}
