'use client'

import { useState } from 'react'
import { 
  edinetApiClient, 
  EDINETCompany, 
  FinancialDataFromEDINET,
  convertEDINETDataToFinancialData 
} from '@/services/edinetApi'
import { 
  calculateAllROIC, 
  formatROIC, 
  formatCurrency,
  getROICEvaluationLevel,
  FinancialData
} from '@/utils/roicCalculations'
import ROICTrendChart from './ROICTrendChart'
import ExportButtons from './ExportButtons'

export default function EDINETCompanySearchSimple() {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<EDINETCompany[]>([])
  const [selectedCompany, setSelectedCompany] = useState<EDINETCompany | null>(null)
  const [financialData, setFinancialData] = useState<FinancialDataFromEDINET | null>(null)
  const [roicResults, setRoicResults] = useState<ReturnType<typeof calculateAllROIC> | null>(null)
  const [multiYearData, setMultiYearData] = useState<FinancialDataFromEDINET[]>([])
  const [showTrendChart, setShowTrendChart] = useState(false)
  
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingFinancialData, setIsLoadingFinancialData] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!searchTerm.trim()) return

    setIsSearching(true)
    setError(null)
    setSearchResults([])

    try {
      console.log('Searching for:', searchTerm) // デバッグ用
      const response = await edinetApiClient.searchCompanies(searchTerm.trim())
      console.log('Search response:', response) // デバッグ用
      
      if (response.success && response.data) {
        setSearchResults(response.data)
      } else {
        setError(response.error || '検索に失敗しました')
      }
    } catch (err) {
      console.error('Search error:', err) // デバッグ用
      setError('検索エラーが発生しました')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectCompany = async (company: EDINETCompany) => {
    setSelectedCompany(company)
    setIsLoadingFinancialData(true)
    setError(null)
    setFinancialData(null)
    setRoicResults(null)
    setMultiYearData([])
    setShowTrendChart(false)

    try {
      console.log('Fetching financial data for:', company.companyName) // デバッグ用
      
      // 最新年度の財務データを取得
      const response = await edinetApiClient.getFinancialData(company.edinetCode, 2023)
      console.log('Financial data response:', response) // デバッグ用

      if (response.success && response.data) {
        setFinancialData(response.data)
        
        // ROIC計算を実行
        const convertedData = convertEDINETDataToFinancialData(response.data)
        console.log('Converted financial data:', convertedData) // デバッグ用
        
        const results = calculateAllROIC(convertedData)
        console.log('ROIC results:', results) // デバッグ用
        
        setRoicResults(results)
      } else {
        setError(response.error || '財務データの取得に失敗しました')
      }
    } catch (err) {
      console.error('Financial data error:', err) // デバッグ用
      setError('財務データ取得エラーが発生しました')
    } finally {
      setIsLoadingFinancialData(false)
    }
  }

  const handleLoadTrendData = async () => {
    if (!selectedCompany) return
    
    setIsLoadingFinancialData(true)
    setError(null)
    
    try {
      const years = [2023, 2022, 2021, 2020, 2019]
      const response = await edinetApiClient.getMultipleYearFinancialData(
        selectedCompany.edinetCode,
        years,
        (current, total, year) => {
          console.log(`Loading ${year} data... (${current}/${total})`)
        }
      )
      
      if (response.success && response.data) {
        setMultiYearData(response.data)
        setShowTrendChart(true)
      } else {
        setError(response.error || '複数年度データの取得に失敗しました')
      }
    } catch (err) {
      setError('トレンドデータ取得エラーが発生しました')
    } finally {
      setIsLoadingFinancialData(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="space-y-6">
      {/* 検索フォーム */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">🔍 企業検索（EDINET API連携）</h2>
        
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="企業名、証券コード、またはEDINETコードで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSearching}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchTerm.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            {isSearching ? '検索中...' : '検索'}
          </button>
        </div>

        {/* デバッグ情報 */}
        <div className="text-xs text-gray-500 mb-4">
          デバッグ: 検索語句 = "{searchTerm}", 検索中 = {isSearching.toString()}, 結果数 = {searchResults.length}
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-red-600">⚠️</span>
              <span className="text-sm text-red-800">{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* 検索結果 */}
      {searchResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            検索結果 ({searchResults.length}件)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4">企業名</th>
                  <th className="text-left py-3 px-4">証券コード</th>
                  <th className="text-left py-3 px-4">EDINETコード</th>
                  <th className="text-left py-3 px-4">業界</th>
                  <th className="text-center py-3 px-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map((company) => (
                  <tr key={company.edinetCode} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {company.companyName}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {company.tickerSymbol || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-600 font-mono">
                      {company.edinetCode}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {company.industry || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleSelectCompany(company)}
                        disabled={isLoadingFinancialData}
                        className="text-blue-600 hover:text-blue-800 text-sm disabled:text-gray-400 bg-blue-50 px-3 py-1 rounded"
                      >
                        {isLoadingFinancialData && selectedCompany?.edinetCode === company.edinetCode 
                          ? '取得中...' 
                          : 'ROIC分析'
                        }
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 選択企業の財務データ */}
      {selectedCompany && financialData && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📊 {selectedCompany.companyName} - 財務データ ({financialData.fiscalYear}年度)
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-sm text-blue-700">売上高</div>
              <div className="text-lg font-bold text-blue-900">
                {formatCurrency(financialData.netSales)}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-sm text-green-700">営業利益</div>
              <div className="text-lg font-bold text-green-900">
                {formatCurrency(financialData.operatingIncome)}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-sm text-purple-700">総資産</div>
              <div className="text-lg font-bold text-purple-900">
                {formatCurrency(financialData.totalAssets)}
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="text-sm text-orange-700">株主資本</div>
              <div className="text-lg font-bold text-orange-900">
                {formatCurrency(financialData.shareholdersEquity)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ROIC計算結果 */}
      {roicResults && selectedCompany && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              🎯 {selectedCompany.companyName} - ROIC計算結果
            </h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleLoadTrendData}
                disabled={isLoadingFinancialData}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400"
              >
                {isLoadingFinancialData ? 'データ取得中...' : '📈 トレンド分析を表示'}
              </button>
              <ExportButtons
                reportData={{
                  company: selectedCompany,
                  financialData: financialData!,
                  roicResults: roicResults,
                  multiYearData: multiYearData
                }}
                showPDF={true}
                showExcel={true}
                showChart={false}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(roicResults).map(([method, result]) => {
              const evaluation = getROICEvaluationLevel(result.roic)
              const methodNames = {
                basic: '基本方式',
                detailed: '詳細方式',
                asset: 'アセット方式',
                modified: '修正方式'
              }

              return (
                <div key={method} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-gray-900">
                      {methodNames[method as keyof typeof methodNames]}
                    </h4>
                    <span className={`text-2xl font-bold ${evaluation.color}`}>
                      {formatROIC(result.roic)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {evaluation.description}
                  </div>
                  <div className="text-xs text-gray-500">
                    <div>NOPAT: {formatCurrency(result.nopat)}</div>
                    <div>投下資本: {formatCurrency(result.investedCapital)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ROICトレンドチャート */}
      {showTrendChart && multiYearData.length > 0 && selectedCompany && (
        <ROICTrendChart 
          financialDataList={multiYearData}
          companyName={selectedCompany.companyName}
          industryAverage={0.12} // 業界平均のサンプル値
        />
      )}

      {/* 使用方法説明 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">✨ テスト手順</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="font-medium text-blue-900">1. 企業検索</div>
            <div>「トヨタ」と入力して検索ボタンをクリック</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="font-medium text-green-900">2. ROIC分析</div>
            <div>検索結果のトヨタ自動車の「ROIC分析」ボタンをクリック</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="font-medium text-purple-900">3. 結果確認</div>
            <div>財務データと4つの計算方式によるROIC結果を確認</div>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg">
            <div className="font-medium text-orange-900">4. トレンド分析</div>
            <div>「トレンド分析を表示」ボタンで過去5年間の推移を確認</div>
          </div>
        </div>
      </div>
    </div>
  )
}