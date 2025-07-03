'use client'

import { useState } from 'react'
import IndustryComparison from '@/components/IndustryComparison'
import { 
  getAllIndustries, 
  generateIndustryComparison,
  type IndustryComparison as IndustryComparisonType
} from '@/utils/industryCalculations'

export default function IndustryAnalysisPage() {
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(['1100'])
  const [comparisonMode, setComparisonMode] = useState<'single' | 'multi'>('single')
  const [analysisData, setAnalysisData] = useState<Map<string, IndustryComparisonType>>(new Map())
  const [loading, setLoading] = useState(false)

  const industries = getAllIndustries()

  const handleIndustryToggle = (industryCode: string) => {
    if (comparisonMode === 'single') {
      setSelectedIndustries([industryCode])
    } else {
      setSelectedIndustries(prev => 
        prev.includes(industryCode) 
          ? prev.filter(code => code !== industryCode)
          : [...prev, industryCode]
      )
    }
  }

  const loadAnalysisData = async () => {
    setLoading(true)
    try {
      const dataMap = new Map<string, IndustryComparisonType>()
      
      for (const industryCode of selectedIndustries) {
        const data = generateIndustryComparison(industryCode)
        if (data) {
          dataMap.set(industryCode, data)
        }
      }
      
      setAnalysisData(dataMap)
    } catch (error) {
      console.error('業界分析データの取得に失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderMultiIndustryComparison = () => {
    if (analysisData.size === 0) return null

    const industries = Array.from(analysisData.entries())

    return (
      <div className="space-y-6">
        {/* 業界間比較サマリー */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">業界間ROIC比較</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">業界</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900">企業数</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900">平均ROIC</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900">中央値</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900">最高値</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900">最低値</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900">標準偏差</th>
                </tr>
              </thead>
              <tbody>
                {industries
                  .sort(([,a], [,b]) => b.statistics.average_roic - a.statistics.average_roic)
                  .map(([industryCode, data], index) => {
                    const industryInfo = getAllIndustries().find(i => i.industry_code === industryCode)
                    const roicValues = data.companies.map(c => c.roic_value)
                    const stdDev = Math.sqrt(
                      roicValues.reduce((sum, val) => sum + Math.pow(val - data.statistics.average_roic, 2), 0) / roicValues.length
                    )
                    
                    return (
                      <tr key={industryCode} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <span className="font-medium text-gray-900">
                              {index + 1}. {industryInfo?.industry_name}
                            </span>
                            {index < 3 && (
                              <span className="ml-2 text-xs">
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-gray-600">
                          {data.companies.length}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-semibold text-blue-600">
                            {(data.statistics.average_roic * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-gray-600">
                          {(data.statistics.median_roic * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-center text-green-600">
                          {(data.statistics.max_roic * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-center text-red-600">
                          {(data.statistics.min_roic * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-center text-gray-600">
                          {(stdDev * 100).toFixed(1)}%
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 業界別詳細分析 */}
        {industries.map(([industryCode]) => {
          const industryInfo = getAllIndustries().find(i => i.industry_code === industryCode)
          
          return (
            <div key={industryCode} className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📊 {industryInfo?.industry_name} - 詳細分析
              </h3>
              
              <IndustryComparison />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">🏭 業界ROIC分析</h1>
        <p className="text-gray-600">
          業界別のROIC分析、企業ランキング、および業界間比較を行います
        </p>
      </div>

      {/* 分析設定 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">分析設定</h2>
        
        {/* 比較モード選択 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            分析モード
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setComparisonMode('single')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                comparisonMode === 'single'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              単一業界分析
            </button>
            <button
              onClick={() => setComparisonMode('multi')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                comparisonMode === 'multi'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              業界間比較
            </button>
          </div>
        </div>

        {/* 業界選択 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            分析対象業界 {comparisonMode === 'multi' && '（複数選択可）'}
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {industries.map((industry) => (
              <label
                key={industry.industry_code}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedIndustries.includes(industry.industry_code)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type={comparisonMode === 'single' ? 'radio' : 'checkbox'}
                  name="industry"
                  value={industry.industry_code}
                  checked={selectedIndustries.includes(industry.industry_code)}
                  onChange={() => handleIndustryToggle(industry.industry_code)}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{industry.industry_name}</div>
                  <div className="text-xs text-gray-500">
                    典型的ROIC: {industry.characteristics.typical_roic_range}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 分析実行ボタン */}
        <button
          onClick={loadAnalysisData}
          disabled={loading || selectedIndustries.length === 0}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
        >
          {loading ? '分析中...' : '分析実行'}
        </button>
      </div>

      {/* 分析結果 */}
      {loading && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">業界分析を実行中...</span>
          </div>
        </div>
      )}

      {!loading && analysisData.size > 0 && (
        <>
          {comparisonMode === 'single' && selectedIndustries.length === 1 && (
            <IndustryComparison />
          )}
          
          {comparisonMode === 'multi' && selectedIndustries.length > 1 && (
            renderMultiIndustryComparison()
          )}
        </>
      )}

      {/* 使用方法説明 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">業界分析について</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">単一業界分析</h4>
            <ul className="space-y-1">
              <li>• 選択した業界内での企業ランキング</li>
              <li>• 四分位分析・統計サマリー</li>
              <li>• 業界特性の詳細情報</li>
              <li>• ROIC分布チャート表示</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">業界間比較</h4>
            <ul className="space-y-1">
              <li>• 複数業界のROIC水準比較</li>
              <li>• 業界別平均値・標準偏差分析</li>
              <li>• 業界特性の横断的比較</li>
              <li>• 投資判断への活用</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}