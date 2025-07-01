import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

describe('Home Page', () => {
  test('renders main heading', () => {
    render(<Home />)
    
    const heading = screen.getByRole('heading', {
      name: /ROIC分析アプリケーション/i,
    })
    
    expect(heading).toBeInTheDocument()
  })

  test('renders feature cards', () => {
    render(<Home />)
    
    expect(screen.getByText('企業検索・分析')).toBeInTheDocument()
    expect(screen.getByText('業界比較')).toBeInTheDocument()
  })

  test('renders main features list', () => {
    render(<Home />)
    
    expect(screen.getByText('ROIC自動計算（4つの計算方式対応）')).toBeInTheDocument()
    expect(screen.getByText('企業検索・フィルタリング機能')).toBeInTheDocument()
    expect(screen.getByText('業界内比較・ランキング表示')).toBeInTheDocument()
    expect(screen.getByText('トレンドチャート・可視化')).toBeInTheDocument()
  })

  test('has proper description', () => {
    render(<Home />)
    
    const description = screen.getByText(
      '日系上場企業のROIC（投下資本利益率）を計算・分析・比較できるツールです。'
    )
    
    expect(description).toBeInTheDocument()
  })
})