import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock component for testing
const MockComponent = () => {
  return (
    <div>
      <h1>ROIC Analysis Application</h1>
      <p>Frontend testing setup is working correctly!</p>
    </div>
  )
}

describe('Frontend Test Setup', () => {
  it('renders the mock component correctly', () => {
    render(<MockComponent />)
    
    expect(screen.getByText('ROIC Analysis Application')).toBeInTheDocument()
    expect(screen.getByText('Frontend testing setup is working correctly!')).toBeInTheDocument()
  })

  it('has proper test environment setup', () => {
    expect(process.env.NODE_ENV).toBe('test')
  })
})