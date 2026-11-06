import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FavoritesDrawer } from '@/components/FavoritesDrawer'
import { HistoryDrawer } from '@/components/HistoryDrawer'
import { saveGeneration, toggleFavorite } from '@/lib/storage'
import type { Dish, Generation } from '@/lib/types'

function makeGeneration(id: string, theme: string, createdAt: number): Generation {
  return { id, createdAt, theme, options: {}, dishes: [] }
}

function makeDish(id: string, name: string): Dish {
  return {
    id,
    name,
    styleTags: ['快手'],
    cravingScore: 88,
    reason: '酸甜开胃',
    cookTimeMinutes: 15,
    servings: 1,
    difficulty: '简单',
    ingredients: [],
    steps: [],
    tip: '少油',
    healthNote: '高蛋白',
  }
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('HistoryDrawer', () => {
  it('shows an empty state before anything is generated', () => {
    render(
      <HistoryDrawer open onClose={vi.fn()} onRestore={vi.fn()} />,
    )

    expect(screen.getByText('还没有生成记录。')).toBeInTheDocument()
  })

  it('lists generations newest first and restores one', () => {
    saveGeneration(makeGeneration('g1', '清淡高蛋白', 1))
    saveGeneration(makeGeneration('g2', '下饭快手', 2))
    const onRestore = vi.fn()
    const onClose = vi.fn()

    render(<HistoryDrawer open onClose={onClose} onRestore={onRestore} />)

    const items = screen.getAllByRole('button', { name: /道菜/ })
    expect(items[0]).toHaveTextContent('下饭快手')
    expect(items[1]).toHaveTextContent('清淡高蛋白')

    fireEvent.click(items[1])

    expect(onRestore).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'g1' }),
    )
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<HistoryDrawer open onClose={onClose} onRestore={vi.fn()} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalled()
  })

  it('moves focus into the dialog when opened', () => {
    render(<HistoryDrawer open onClose={vi.fn()} onRestore={vi.fn()} />)

    expect(screen.getByRole('dialog')).toHaveFocus()
  })
})

describe('FavoritesDrawer', () => {
  it('shows an empty state when nothing is saved', () => {
    render(
      <FavoritesDrawer open onClose={vi.fn()} onToggleFavorite={vi.fn()} />,
    )

    expect(screen.getByText('还没有收藏的菜。')).toBeInTheDocument()
  })

  it('removes a dish after unfavoriting it', () => {
    toggleFavorite(makeDish('dish-1', '番茄炒蛋'))
    const onToggleFavorite = vi.fn((dish: Dish) => {
      toggleFavorite(dish)
    })

    render(
      <FavoritesDrawer
        open
        onClose={vi.fn()}
        onToggleFavorite={onToggleFavorite}
      />,
    )

    expect(screen.getByText('番茄炒蛋')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '取消收藏' }))

    expect(onToggleFavorite).toHaveBeenCalled()
    expect(screen.queryByText('番茄炒蛋')).not.toBeInTheDocument()
    expect(screen.getByText('还没有收藏的菜。')).toBeInTheDocument()
  })
})
