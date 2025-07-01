import { render, screen } from '@testing-library/react'
import DashboardPage from '@/app/dashboard/page'

describe('Dashboard Page', () => {
  test('renders dashboard heading', () => {
    render(<DashboardPage />)
    
    const heading = screen.getByRole('heading', {
      name: /ROICダッシュボード/i,
    })
    
    expect(heading).toBeInTheDocument()
  })

  test('renders statistics cards', () => {
    render(<DashboardPage />)
    
    expect(screen.getByText('総企業数')).toBeInTheDocument()
    expect(screen.getByText('平均ROIC')).toBeInTheDocument()
    expect(screen.getByText('更新日')).toBeInTheDocument()
    
    expect(screen.getByText('3,847')).toBeInTheDocument()
    expect(screen.getByText('8.5%')).toBeInTheDocument()
    expect(screen.getByText('2025/07/01')).toBeInTheDocument()
  })

  test('renders top companies table', () => {
    render(<DashboardPage />)
    
    const tableHeading = screen.getByRole('heading', {
      name: /ROIC上位企業/i,
    })
    
    expect(tableHeading).toBeInTheDocument()
    
    // Check table headers
    expect(screen.getByText('順位')).toBeInTheDocument()
    expect(screen.getByText('企業名')).toBeInTheDocument()
    expect(screen.getByText('業界')).toBeInTheDocument()
    expect(screen.getByText('ROIC')).toBeInTheDocument()
  })

  test('renders sample company data', () => {
    render(<DashboardPage />)
    
    expect(screen.getByText('サンプル企業A')).toBeInTheDocument()
    expect(screen.getByText('サンプル企業B')).toBeInTheDocument()
    expect(screen.getByText('サンプル企業C')).toBeInTheDocument()
    
    expect(screen.getByText('25.3%')).toBeInTheDocument()
    expect(screen.getByText('22.1%')).toBeInTheDocument()
    expect(screen.getByText('19.8%')).toBeInTheDocument()
  })

  test('renders chart placeholder', () => {
    render(<DashboardPage />)
    
    const chartHeading = screen.getByRole('heading', {
      name: /業界別ROIC平均/i,
    })
    
    expect(chartHeading).toBeInTheDocument()
    expect(screen.getByText('チャートを表示予定（Recharts実装後）')).toBeInTheDocument()
  })
})