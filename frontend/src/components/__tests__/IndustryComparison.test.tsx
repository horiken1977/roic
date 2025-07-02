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
  generateIndustryComparison: jest.fn(() => null),
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

  test('renders view mode toggle buttons', () => {
    render(<IndustryComparison />)
    
    expect(screen.getByText('テーブル')).toBeInTheDocument()
    expect(screen.getByText('チャート')).toBeInTheDocument()
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
})