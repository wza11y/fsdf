'use client'

import { useEffect, useState } from 'react'

import { DishGrid } from '@/components/DishGrid'
import { ErrorBanner } from '@/components/ErrorBanner'
import { FavoritesDrawer } from '@/components/FavoritesDrawer'
import { HistoryDrawer } from '@/components/HistoryDrawer'
import { RouletteWheel } from '@/components/RouletteWheel'
import { SkeletonGrid } from '@/components/SkeletonGrid'
import { ThemeForm } from '@/components/ThemeForm'
import { useGenerate } from '@/hooks/use-generate'
import { loadFavorites, toggleFavorite } from '@/lib/storage'
import type { Dish, GenerateInput, Generation } from '@/lib/types'

function LoadingStatus() {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((value) => value + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <p className="mb-6 text-sm text-kitchen-muted">
      正在配菜，已经等了 {seconds} 秒。通常需要 15–25 秒。
    </p>
  )
}

export default function Home() {
  const { status, dishes, error, generate, restore } = useGenerate()
  const [favorites, setFavorites] = useState<Dish[]>(() =>
    typeof window === 'undefined' ? [] : loadFavorites(),
  )
  const [historyOpen, setHistoryOpen] = useState(false)
  const [favoritesOpen, setFavoritesOpen] = useState(false)
  const [wheelOpen, setWheelOpen] = useState(false)
  const [lastInput, setLastInput] = useState<GenerateInput | null>(null)
  const [pickedIndex, setPickedIndex] = useState<number | null>(null)

  function handleGenerate(input: GenerateInput) {
    setLastInput(input)
    setPickedIndex(null)
    void generate(input)
  }

  function handleToggleFavorite(dish: Dish) {
    toggleFavorite(dish)
    setFavorites(loadFavorites())
  }

  function handleRestore(generation: Generation) {
    restore(generation)
    setPickedIndex(null)
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
      <header className="flex items-start justify-between gap-6">
        <div>
          <p className="font-serif text-sm tracking-[0.18em] text-kitchen-muted">
            AI cooking
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-tight text-kitchen-ink sm:text-5xl">
            今晚，想吃点什么？
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-kitchen-muted">
            下班了，不想再想。说一个念头，剩下的交给厨房。
          </p>
        </div>

        <nav
          aria-label="记录"
          className="flex shrink-0 gap-4 pt-1 text-sm text-kitchen-muted"
        >
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="transition hover:text-kitchen-ink"
          >
            历史
          </button>
          <button
            type="button"
            onClick={() => setFavoritesOpen(true)}
            className="transition hover:text-kitchen-ink"
          >
            收藏
          </button>
        </nav>
      </header>

      <div className="mt-12 border-t border-kitchen-line pt-10">
        <ThemeForm onSubmit={handleGenerate} disabled={status === 'loading'} />
      </div>

      <section className="mt-14">
        {status === 'idle' ? (
          <p className="text-sm leading-7 text-kitchen-muted">
            结果会在这里铺开。菜名、心动值、配料和步骤，一道一道排好。
          </p>
        ) : null}

        {status === 'loading' ? (
          <div>
            <LoadingStatus />
            <SkeletonGrid />
          </div>
        ) : null}

        {status === 'error' && error ? (
          <ErrorBanner
            error={error}
            onRetry={lastInput ? () => handleGenerate(lastInput) : undefined}
          />
        ) : null}

        {status === 'success' ? (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-kitchen-muted">
                共 {dishes.length} 道。
                {pickedIndex !== null && dishes[pickedIndex]
                  ? `转盘选中了「${dishes[pickedIndex].name}」。`
                  : ''}
              </p>
              <button
                type="button"
                onClick={() => setWheelOpen(true)}
                disabled={dishes.length < 2}
                className="rounded-md border border-kitchen-ginger px-4 py-2 text-sm text-kitchen-ginger transition hover:bg-kitchen-ginger/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                转盘替我选
              </button>
            </div>

            <DishGrid
              dishes={dishes}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
            />
          </>
        ) : null}
      </section>

      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRestore={handleRestore}
      />
      <FavoritesDrawer
        open={favoritesOpen}
        onClose={() => setFavoritesOpen(false)}
        onToggleFavorite={handleToggleFavorite}
      />
      <RouletteWheel
        dishes={dishes}
        open={wheelOpen}
        onClose={() => setWheelOpen(false)}
        onPick={(index) => {
          setPickedIndex(index)
          setWheelOpen(false)
        }}
      />
    </main>
  )
}
