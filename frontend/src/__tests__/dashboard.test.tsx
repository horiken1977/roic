import { render, screen } from '@testing-library/react'
import DashboardPage from '@/app/dashboard/page'

describe('Dashboard Page', () => {
  test('renders loading state during redirect', () => {
    render(<DashboardPage />)
    
    expect(screen.getByText('ホームページにリダイレクトしています...')).toBeInTheDocument()
  })

  test('renders loading spinner', () => {
    render(<DashboardPage />)
    
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  test('has proper page structure', () => {
    render(<DashboardPage />)
    
    const container = document.querySelector('.min-h-screen')
    expect(container).toBeInTheDocument()
    expect(container).toHaveClass('bg-gray-50')
  })
})