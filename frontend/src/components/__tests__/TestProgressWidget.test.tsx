import { render, screen } from '@testing-library/react'
import TestProgressWidget from '../TestProgressWidget'

describe.skip('TestProgressWidget', () => {
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
    
    // Check for test success counts in the format "X/Y 成功"
    expect(screen.getByText(/15\/15 成功/)).toBeInTheDocument() // Unit tests
    expect(screen.getByText(/8\/8 成功/)).toBeInTheDocument()   // E2E tests
    expect(screen.getByText(/3\/3 成功/)).toBeInTheDocument()   // Performance tests
    expect(screen.getByText(/2\/2 成功/)).toBeInTheDocument()   // Security tests
  })
})