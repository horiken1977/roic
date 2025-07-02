import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CompaniesPage from '@/app/companies/page'

describe('Companies Page', () => {
  test('renders companies search page', () => {
    render(<CompaniesPage />)
    
    const heading = screen.getByRole('heading', {
      name: /企業検索/i,
    })
    
    expect(heading).toBeInTheDocument()
  })

  test('renders search input', () => {
    render(<CompaniesPage />)
    
    const searchInput = screen.getByPlaceholderText('企業名で検索...')
    expect(searchInput).toBeInTheDocument()
  })

  test('renders search button', () => {
    render(<CompaniesPage />)
    
    const searchButton = screen.getByRole('button', { name: '検索' })
    expect(searchButton).toBeInTheDocument()
  })

  test('renders filter dropdowns', () => {
    render(<CompaniesPage />)
    
    // For select elements with default option selected, use getByRole
    const selects = screen.getAllByRole('combobox')
    expect(selects).toHaveLength(2)
    
    // Check if the options exist
    expect(screen.getByText('業界を選択')).toBeInTheDocument()
    expect(screen.getByText('市場を選択')).toBeInTheDocument()
  })

  test('search input accepts user input', async () => {
    const user = userEvent.setup()
    render(<CompaniesPage />)
    
    const searchInput = screen.getByPlaceholderText('企業名で検索...')
    
    await user.type(searchInput, 'トヨタ')
    expect(searchInput).toHaveValue('トヨタ')
  })

  test('renders search results placeholder', () => {
    render(<CompaniesPage />)
    
    expect(screen.getByText('企業を検索してください')).toBeInTheDocument()
  })
})