import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ThemeForm } from '@/components/ThemeForm'

function getThemeInput() {
  return screen.getByLabelText('今晚想吃点什么？')
}

function getSubmitButton() {
  return screen.getByRole('button', { name: /生成今天的菜/ })
}

describe('ThemeForm', () => {
  it('disables submit until a theme is entered', () => {
    render(<ThemeForm onSubmit={vi.fn()} />)

    expect(getSubmitButton()).toBeDisabled()

    fireEvent.change(getThemeInput(), { target: { value: '清淡' } })

    expect(getSubmitButton()).toBeEnabled()
  })

  it('submits the trimmed theme', () => {
    const onSubmit = vi.fn()
    render(<ThemeForm onSubmit={onSubmit} />)

    fireEvent.change(getThemeInput(), { target: { value: '  番茄  ' } })
    fireEvent.click(getSubmitButton())

    expect(onSubmit).toHaveBeenCalledWith({ theme: '番茄' })
  })

  it('includes a selected time budget', () => {
    const onSubmit = vi.fn()
    render(<ThemeForm onSubmit={onSubmit} />)

    fireEvent.change(getThemeInput(), { target: { value: '清淡' } })
    fireEvent.click(screen.getByRole('button', { name: '30 分钟' }))
    fireEvent.click(getSubmitButton())

    expect(onSubmit).toHaveBeenCalledWith({ theme: '清淡', maxMinutes: 30 })
  })

  it('toggles a chip off when clicked twice', () => {
    const onSubmit = vi.fn()
    render(<ThemeForm onSubmit={onSubmit} />)

    fireEvent.change(getThemeInput(), { target: { value: '清淡' } })
    const chip = screen.getByRole('button', { name: '清淡少油' })
    fireEvent.click(chip)
    fireEvent.click(chip)
    fireEvent.click(getSubmitButton())

    expect(onSubmit).toHaveBeenCalledWith({ theme: '清淡' })
  })

  it('includes servings and taste', () => {
    const onSubmit = vi.fn()
    render(<ThemeForm onSubmit={onSubmit} />)

    fireEvent.change(getThemeInput(), { target: { value: '高蛋白' } })
    fireEvent.click(screen.getByRole('button', { name: '2 人' }))
    fireEvent.click(screen.getByRole('button', { name: '清淡少油' }))
    fireEvent.click(getSubmitButton())

    expect(onSubmit).toHaveBeenCalledWith({
      theme: '高蛋白',
      servings: 2,
      taste: '清淡',
    })
  })

  it('cannot submit while disabled', () => {
    render(<ThemeForm onSubmit={vi.fn()} disabled />)

    expect(getSubmitButton()).toBeDisabled()
  })
})
