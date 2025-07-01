import { act, renderHook } from '@testing-library/react'
import { useCompanyStore, useRoicStore, useUIStore } from '../store'

describe('Company Store', () => {
  test('should initialize with default values', () => {
    const { result } = renderHook(() => useCompanyStore())
    
    expect(result.current.companies).toEqual([])
    expect(result.current.selectedCompany).toBeNull()
    expect(result.current.searchQuery).toBe('')
    expect(result.current.selectedIndustry).toBe('')
    expect(result.current.selectedMarket).toBe('')
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  test('should update search query', () => {
    const { result } = renderHook(() => useCompanyStore())
    
    act(() => {
      result.current.setSearchQuery('トヨタ')
    })
    
    expect(result.current.searchQuery).toBe('トヨタ')
  })

  test('should clear filters', () => {
    const { result } = renderHook(() => useCompanyStore())
    
    act(() => {
      result.current.setSearchQuery('テスト')
      result.current.setSelectedIndustry('製造業')
      result.current.setSelectedMarket('プライム')
    })
    
    act(() => {
      result.current.clearFilters()
    })
    
    expect(result.current.searchQuery).toBe('')
    expect(result.current.selectedIndustry).toBe('')
    expect(result.current.selectedMarket).toBe('')
    expect(result.current.companies).toEqual([])
  })
})

describe('ROIC Store', () => {
  test('should initialize with default values', () => {
    const { result } = renderHook(() => useRoicStore())
    
    expect(result.current.roicData).toEqual([])
    expect(result.current.selectedRoic).toBeNull()
    expect(result.current.comparisonData).toEqual([])
    expect(result.current.industryAnalysis).toBeNull()
    expect(result.current.rankings).toEqual([])
    expect(result.current.calculationMethod).toBe('standard')
    expect(result.current.selectedFiscalYear).toBe(new Date().getFullYear() - 1)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  test('should update calculation method', () => {
    const { result } = renderHook(() => useRoicStore())
    
    act(() => {
      result.current.setCalculationMethod('adjusted')
    })
    
    expect(result.current.calculationMethod).toBe('adjusted')
  })

  test('should update fiscal year', () => {
    const { result } = renderHook(() => useRoicStore())
    
    act(() => {
      result.current.setSelectedFiscalYear(2023)
    })
    
    expect(result.current.selectedFiscalYear).toBe(2023)
  })
})

describe('UI Store', () => {
  test('should initialize with default values', () => {
    const { result } = renderHook(() => useUIStore())
    
    expect(result.current.sidebarOpen).toBe(false)
    expect(result.current.theme).toBe('light')
    expect(result.current.language).toBe('ja')
  })

  test('should toggle sidebar', () => {
    const { result } = renderHook(() => useUIStore())
    
    act(() => {
      result.current.setSidebarOpen(true)
    })
    
    expect(result.current.sidebarOpen).toBe(true)
  })

  test('should change theme', () => {
    const { result } = renderHook(() => useUIStore())
    
    act(() => {
      result.current.setTheme('dark')
    })
    
    expect(result.current.theme).toBe('dark')
  })
})