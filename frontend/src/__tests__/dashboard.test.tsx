import { render, screen } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import DashboardPage from '@/app/dashboard/page'

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

describe('Dashboard Page', () => {
  const mockPush = jest.fn()
  const mockReplace = jest.fn()

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('renders loading state during redirect', () => {
    render(<DashboardPage />)
    
    expect(screen.getByText('ホームページにリダイレクトしています...')).toBeInTheDocument()
  })

  test('calls router.replace to redirect to home', () => {
    render(<DashboardPage />)
    
    expect(mockReplace).toHaveBeenCalledWith('/')
  })

  test('renders loading spinner', () => {
    render(<DashboardPage />)
    
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })
})