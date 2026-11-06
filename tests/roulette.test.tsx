import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RouletteWheel } from '@/components/RouletteWheel'
import { pickIndex } from '@/lib/roulette'
import type { Dish } from '@/lib/types'

function makeDish(index: number): Dish {
  return {
    id: `dish-${index}`,
    name: `菜${index}`,
    styleTags: ['快手'],
    cravingScore: 80,
    reason: '理由',
    cookTimeMinutes: 15,
    servings: 1,
    difficulty: '简单',
    ingredients: [],
    steps: [],
    tip: '少油',
    healthNote: '高蛋白',
  }
}

function makeDishes(count: number): Dish[] {
  return Array.from({ length: count }, (_, index) => makeDish(index))
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('pickIndex', () => {
  it('maps the low end of random to the first slice', () => {
    expect(pickIndex(8, () => 0)).toBe(0)
    expect(pickIndex(10, () => 0)).toBe(0)
  })

  it('maps the high end of random to the last slice', () => {
    expect(pickIndex(8, () => 0.999)).toBe(7)
    expect(pickIndex(10, () => 0.999)).toBe(9)
  })

  it('stays in range for any random value', () => {
    for (let step = 0; step < 100; step += 1) {
      const index = pickIndex(8, () => step / 100)
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(8)
    }
  })
})

describe('RouletteWheel', () => {
  it('renders one segment per dish', () => {
    const { rerender } = render(
      <RouletteWheel
        dishes={makeDishes(8)}
        open
        onClose={vi.fn()}
        onPick={vi.fn()}
      />,
    )

    expect(screen.getAllByTestId('wheel-segment')).toHaveLength(8)

    rerender(
      <RouletteWheel
        dishes={makeDishes(10)}
        open
        onClose={vi.fn()}
        onPick={vi.fn()}
      />,
    )

    expect(screen.getAllByTestId('wheel-segment')).toHaveLength(10)
  })

  it('disables the spin when there are fewer than two dishes', () => {
    render(
      <RouletteWheel
        dishes={makeDishes(1)}
        open
        onClose={vi.fn()}
        onPick={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '转盘替我选' })).toBeDisabled()
    expect(screen.getByText('至少要有两道菜才能转。')).toBeInTheDocument()
  })

  it('picks immediately when reduced motion is requested', () => {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue({ matches: true }),
      configurable: true,
    })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const onPick = vi.fn()

    render(
      <RouletteWheel
        dishes={makeDishes(8)}
        open
        onClose={vi.fn()}
        onPick={onPick}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '转盘替我选' }))

    expect(onPick).toHaveBeenCalledTimes(1)
    expect(onPick).toHaveBeenCalledWith(0)
  })

  it('reports the landed slice after the spin transition', () => {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue({ matches: false }),
      configurable: true,
    })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const onPick = vi.fn()

    render(
      <RouletteWheel
        dishes={makeDishes(8)}
        open
        onClose={vi.fn()}
        onPick={onPick}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '转盘替我选' }))

    expect(onPick).not.toHaveBeenCalled()

    fireEvent.transitionEnd(screen.getByTestId('roulette-wheel'), {
      propertyName: 'transform',
    })

    expect(onPick).toHaveBeenCalledTimes(1)
    expect(onPick).toHaveBeenCalledWith(0)
  })

  it('resets a spin that is closed mid-way', () => {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue({ matches: false }),
      configurable: true,
    })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const onClose = vi.fn()
    const onPick = vi.fn()

    const { rerender } = render(
      <RouletteWheel
        dishes={makeDishes(8)}
        open
        onClose={onClose}
        onPick={onPick}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '转盘替我选' }))
    expect(screen.getByRole('button', { name: '转着…' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(onClose).toHaveBeenCalled()

    rerender(
      <RouletteWheel
        dishes={makeDishes(8)}
        open={false}
        onClose={onClose}
        onPick={onPick}
      />,
    )
    rerender(
      <RouletteWheel
        dishes={makeDishes(8)}
        open
        onClose={onClose}
        onPick={onPick}
      />,
    )

    expect(screen.getByRole('button', { name: '转盘替我选' })).toBeEnabled()
    expect(onPick).not.toHaveBeenCalled()
  })
})
