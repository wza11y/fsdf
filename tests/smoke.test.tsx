import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('test harness', () => {
  it('renders React into jsdom', () => {
    render(<div>AI cooking</div>)

    expect(screen.getByText('AI cooking')).toBeInTheDocument()
  })
})
