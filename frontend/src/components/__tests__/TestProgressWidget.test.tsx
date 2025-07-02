import { render, screen } from '@testing-library/react'
import TestProgressWidget from '../TestProgressWidget'

describe('TestProgressWidget', () => {
  test('renders test progress widget', () => {
    render(<TestProgressWidget />)
    
    const heading = screen.getByRole('heading', {
      name: /テスト進捗状況/i,
    })
    
    expect(heading).toBeInTheDocument()
  })

  test('displays test categories', () => {
    render(<TestProgressWidget />)
    
    expect(screen.getByText('ユニットテスト')).toBeInTheDocument()
    expect(screen.getByText('E2Eテスト')).toBeInTheDocument()
    expect(screen.getByText('パフォーマンス')).toBeInTheDocument()
    expect(screen.getByText('セキュリティ')).toBeInTheDocument()
  })

  test('shows connection status indicator', () => {
    render(<TestProgressWidget />)
    
    // Check for the connection indicator (the green dot)
    const connectionIndicator = document.querySelector('.bg-green-500.rounded-full')
    expect(connectionIndicator).toBeInTheDocument()
  })

  test('displays test metrics', () => {
    render(<TestProgressWidget />)
    
    // Check for numbers that should be present
    expect(screen.getByText('15')).toBeInTheDocument() // Unit tests passed
    expect(screen.getByText('8')).toBeInTheDocument()  // E2E tests passed
    expect(screen.getByText('5')).toBeInTheDocument()  // Integration tests passed
  })
})