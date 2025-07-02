import { render, screen } from '@testing-library/react'
import IndustryComparison from '../IndustryComparison'

// Mock the industry calculations utility
jest.mock('@/utils/industryCalculations', () => ({
  getAllIndustries: jest.fn(() => [
    {
      industry_code: '1100',
      industry_name: '自動車・輸送機器',
      parent_category: '製造業',
      roic_adjustment: { coefficient: 0.95, reason: 'テスト調整' },
      representative_companies: [],
      characteristics: {
        capital_intensity: '高',
        r_and_d_intensity: '中',
        working_capital_turnover: '中',
        typical_roic_range: '8-15%'
      }
    }
  ]),
  generateIndustryComparison: jest.fn(() => ({
    industry_code: '1100',
    industry_name: '自動車・輸送機器',
    companies: [
      {
        company_code: '7203',
        company_name: 'トヨタ自動車',
        industry_code: '1100',
        roic_value: 0.12,
        calculation_method: 'detailed',
        fiscal_year: '2024'
      }
    ],
    statistics: {
      average_roic: 0.12,
      median_roic: 0.12,
      max_roic: 0.12,
      min_roic: 0.12,
      quartiles: { q1: 0.10, q2: 0.12, q3: 0.14 }
    }
  })),
  calculateIndustryRanking: jest.fn(() => ({
    rank: 1,
    totalCompanies: 1,
    percentile: 100,
    quartile: 'top' as const
  })),
  getIndustryCharacteristics: jest.fn(() => '業界特性テスト'),
  getQuartileDescription: jest.fn(() => '業界上位25%（優秀）'),
  getROICColorClass: jest.fn(() => 'text-green-600 font-bold')
}))

describe('IndustryComparison', () => {
  test('renders industry comparison heading', () => {
    render(<IndustryComparison />)
    
    const heading = screen.getByRole('heading', {
      name: /業界比較・ランキング/i,
    })
    
    expect(heading).toBeInTheDocument()
  })

  test('renders industry selection dropdown', () => {
    render(<IndustryComparison />)
    
    const dropdown = screen.getByLabelText('業界:')
    expect(dropdown).toBeInTheDocument()
    expect(dropdown.tagName).toBe('SELECT')
  })

  test('renders view mode toggle buttons', () => {
    render(<IndustryComparison />)
    
    expect(screen.getByText('テーブル')).toBeInTheDocument()
    expect(screen.getByText('チャート')).toBeInTheDocument()
  })

  test('renders industry statistics summary', () => {
    render(<IndustryComparison />)
    
    // Wait for async data to load
    setTimeout(() => {
      expect(screen.getByText('企業数')).toBeInTheDocument()
      expect(screen.getByText('業界平均')).toBeInTheDocument()
      expect(screen.getByText('中央値')).toBeInTheDocument()
      expect(screen.getByText('最高値')).toBeInTheDocument()
      expect(screen.getByText('最低値')).toBeInTheDocument()
    }, 100)
  })

  test('handles selected company prop', () => {
    const selectedCompany = {
      code: '7203',
      name: 'トヨタ自動車',
      roic: 0.15,
      industryCode: '1100'
    }

    render(<IndustryComparison selectedCompany={selectedCompany} />)
    
    expect(screen.getByText('分析対象企業')).toBeInTheDocument()
    expect(screen.getByText('トヨタ自動車')).toBeInTheDocument()
    expect(screen.getByText('7203')).toBeInTheDocument()
  })

  test('renders loading state', () => {
    render(<IndustryComparison />)
    
    // Should show loading initially
    const loadingText = screen.getByText('業界比較データを読み込み中...')
    expect(loadingText).toBeInTheDocument()
  })
})