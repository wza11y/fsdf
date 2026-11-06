import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DishCard } from '@/components/DishCard'
import { DishGrid } from '@/components/DishGrid'
import { dishToText } from '@/lib/format'
import type { Dish } from '@/lib/types'

function makeDish(overrides: Partial<Dish> = {}): Dish {
  return {
    id: 'dish-1',
    name: '番茄炒蛋',
    styleTags: ['快手', '高蛋白'],
    cravingScore: 88,
    reason: '酸甜开胃，十五分钟上桌',
    cookTimeMinutes: 15,
    servings: 1,
    difficulty: '简单',
    ingredients: [
      { name: '番茄', amount: '2 个' },
      { name: '鸡蛋', amount: '2 个' },
    ],
    steps: ['番茄切块', '鸡蛋炒散', '合炒调味'],
    tip: '番茄先去皮更出沙',
    healthNote: '蛋白质充足，油量可控',
    ...overrides,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('DishCard', () => {
  it('shows the dish facts and recipe when open', () => {
    render(
      <DishCard
        dish={makeDish()}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
        defaultOpen
      />,
    )

    expect(screen.getByText('番茄炒蛋')).toBeInTheDocument()
    expect(screen.getByText('快手')).toBeInTheDocument()
    expect(screen.getByLabelText('心动值 88/100')).toBeInTheDocument()
    expect(screen.getByText('酸甜开胃，十五分钟上桌')).toBeInTheDocument()
    expect(screen.getByText('番茄')).toBeInTheDocument()
    expect(screen.getByText('番茄切块')).toBeInTheDocument()
    expect(screen.getByText('番茄先去皮更出沙')).toBeInTheDocument()
  })

  it('copies the formatted dish text', () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    render(
      <DishCard
        dish={makeDish()}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
        defaultOpen
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '复制' }))

    expect(writeText).toHaveBeenCalledWith(dishToText(makeDish()))
  })

  it('asks the parent to toggle its favorite state', () => {
    const onToggleFavorite = vi.fn()

    render(
      <DishCard
        dish={makeDish()}
        isFavorite={false}
        onToggleFavorite={onToggleFavorite}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '收藏' }))

    expect(onToggleFavorite).toHaveBeenCalledWith(makeDish())
  })

  it('marks a favorite dish as pressed', () => {
    render(
      <DishCard
        dish={makeDish()}
        isFavorite
        onToggleFavorite={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '已收藏' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})

describe('DishGrid', () => {
  it('opens the first dish and collapses the rest', () => {
    render(
      <DishGrid
        dishes={[makeDish(), makeDish({ id: 'dish-2', name: '青椒肉丝' })]}
        favorites={[]}
        onToggleFavorite={vi.fn()}
      />,
    )

    expect(screen.getByText('番茄切块')).toBeInTheDocument()
    expect(screen.queryByText('青椒肉丝')).toBeInTheDocument()
    expect(screen.getAllByText('番茄切块')).toHaveLength(1)
  })

  it('expands another dish on demand', () => {
    render(
      <DishGrid
        dishes={[makeDish(), makeDish({ id: 'dish-2', name: '青椒肉丝' })]}
        favorites={[]}
        onToggleFavorite={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '看青椒肉丝的配方' }))

    expect(screen.getAllByText('番茄切块')).toHaveLength(2)
  })
})
