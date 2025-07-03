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
import IndustryComparison from './IndustryComparison'

interface ProgressInfo {
  stage: 'searching' | 'fetching_documents' | 'fetching_financial_data' | 'calculating' | 'completed';
  current: number;
  total: number;
  year?: number;
  message: string;
}

export default function EDINETCompanySearch() {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<EDINETCompany[]>([])
  const [selectedCompany, setSelectedCompany] = useState<EDINETCompany | null>(null)
  const [financialData, setFinancialData] = useState<FinancialDataFromEDINET[]>([])
  const [selectedFinancialData, setSelectedFinancialData] = useState<FinancialData | null>(null)
  const [roicResults, setRoicResults] = useState<ReturnType<typeof calculateAllROIC> | null>(null)
  
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingFinancialData, setIsLoadingFinancialData] = useState(false)
  const [progress, setProgress] = useState<ProgressInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [selectedYears, setSelectedYears] = useState<number[]>([2023, 2022, 2021])
  const [showIndustryComparison, setShowIndustryComparison] = useState(false)
  
  // 業界マッピング（EDINETの業界名を業界コードにマッピング）
  const getIndustryCode = (industryName: string): string => {
    const industryMapping: Record<string, string> = {
      '輸送用機器': '1100',
      '電気機器': '1200', 
      '銀行業': '2100',
      '小売業': '3100',
      '情報・通信業': '4100'
    }
    return industryMapping[industryName] || '1100'
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) return

    setIsSearching(true)
    setError(null)
    setProgress({
      stage: 'searching',
      current: 0,
      total: 1,
      message: 'EDINET APIで企業を検索中...'
    })

    try {
      const response = await edinetApiClient.searchCompanies(searchTerm.trim())
      
      if (response.success && response.data) {
        setSearchResults(response.data)
        setProgress({
          stage: 'completed',
          current: 1,
          total: 1,
          message: `${response.data.length}件の企業が見つかりました`
        })
      } else {
        setError(response.error || '検索に失敗しました')
      }
    } catch {
      setError('検索エラーが発生しました')
    } finally {
      setIsSearching(false)
      setTimeout(() => setProgress(null), 3000)
    }
  }

  const handleSelectCompany = async (company: EDINETCompany) => {
    setSelectedCompany(company)
    setIsLoadingFinancialData(true)
    setError(null)
    setFinancialData([])
    setSelectedFinancialData(null)
    setRoicResults(null)

    try {
      setProgress({
        stage: 'fetching_documents',
        current: 0,
        total: selectedYears.length,
        message: `${company.companyName}の書類一覧を取得中...`
      })

      // 書類一覧取得（表示用）
      await edinetApiClient.getDocuments(company.edinetCode, selectedYears)

      setProgress({
        stage: 'fetching_financial_data',
        current: 0,
        total: selectedYears.length,
        message: '財務データを取得中...'
      })

      // 財務データ取得
      const response = await edinetApiClient.getMultipleYearFinancialData(
        company.edinetCode,
        selectedYears,
        (current, total, year) => {
          setProgress({
            stage: 'fetching_financial_data',
            current,
            total,
            year,
            message: `${year}年度の財務データを取得中... (${current}/${total})`
          })
        }
      )

      if (response.success && response.data) {
        setFinancialData(response.data)
        
        // 最新年度のデータを自動選択
        const latestData = response.data[0]
        if (latestData) {
          const convertedData = convertEDINETDataToFinancialData(latestData)
          setSelectedFinancialData(convertedData)

          setProgress({
            stage: 'calculating',
            current: 0,
            total: 1,
            message: 'ROIC計算を実行中...'
          })

          // ROIC計算
          const results = calculateAllROIC(convertedData)
          setRoicResults(results)

          setProgress({
            stage: 'completed',
            current: 1,
            total: 1,
            message: 'ROIC計算が完了しました'
          })
        }
      } else {
        setError(response.error || '財務データの取得に失敗しました')
      }
    } catch {
      setError('財務データ取得エラーが発生しました')
    } finally {
      setIsLoadingFinancialData(false)
      setTimeout(() => setProgress(null), 3000)
    }
  }

  const handleYearSelection = (year: number, checked: boolean) => {
    if (checked) {
      setSelectedYears(prev => [...prev, year].sort((a, b) => b - a))
    } else {
      setSelectedYears(prev => prev.filter(y => y !== year))
    }
  }

  const handleFinancialDataSelection = (data: FinancialDataFromEDINET) => {
    const convertedData = convertEDINETDataToFinancialData(data)
    setSelectedFinancialData(convertedData)
    
    // ROIC再計算
    const results = calculateAllROIC(convertedData)
    setRoicResults(results)
  }

  const renderProgressBar = () => {
    if (!progress) return null

    const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-blue-900">{progress.message}</span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        {progress.year && (
          <div className="text-xs text-blue-700 mt-1">
            処理中: {progress.year}年度
          </div>
        )}
      </div>
    )
  }

  const renderFinancialDataSelector = () => {
    if (financialData.length === 0) return null

    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">取得した財務データ</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {financialData.map((data) => {
            const convertedData = convertEDINETDataToFinancialData(data)
            const quickROIC = calculateAllROIC(convertedData)
            const evaluation = getROICEvaluationLevel(quickROIC.detailed.roic)
            
            return (
              <div
                key={data.fiscalYear}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedFinancialData && 
                  convertEDINETDataToFinancialData(data).operatingIncome === selectedFinancialData.operatingIncome
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleFinancialDataSelection(data)}
              >
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900 mb-1">
                    {data.fiscalYear}年度
                  </div>
                  <div className={`text-xl font-bold mb-2 ${evaluation.color}`}>
                    {formatROIC(quickROIC.detailed.roic)}
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>売上: {formatCurrency(data.netSales)}</div>
                    <div>営業利益: {formatCurrency(data.operatingIncome)}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderROICResults = () => {
    if (!roicResults || !selectedCompany) return null

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {selectedCompany.companyName} - ROIC計算結果
        </h3>
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
    )
  }

  return (
    <div className="space-y-6">
      {/* 検索フォーム */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">EDINET企業検索</h2>
        
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="企業名、証券コード、またはEDINETコードで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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

        {/* 取得年度選択 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            取得対象年度
          </label>
          <div className="flex gap-4">
            {[2023, 2022, 2021, 2020].map(year => (
              <label key={year} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedYears.includes(year)}
                  onChange={(e) => handleYearSelection(year, e.target.checked)}
                  className="mr-2"
                />
                {year}年度
              </label>
            ))}
          </div>
        </div>

        {/* プログレスバー */}
        {renderProgressBar()}

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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">検索結果</h3>
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
                        className="text-blue-600 hover:text-blue-800 text-sm disabled:text-gray-400"
                      >
                        財務データ取得
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 財務データ選択 */}
      {renderFinancialDataSelector()}

      {/* ROIC計算結果 */}
      {renderROICResults()}

      {/* 業界比較機能 */}
      {selectedCompany && roicResults && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">業界比較・ランキング分析</h3>
            <button
              onClick={() => setShowIndustryComparison(!showIndustryComparison)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {showIndustryComparison ? '業界比較を閉じる' : '業界比較を表示'}
            </button>
          </div>
          
          {showIndustryComparison && (
            <IndustryComparison 
              selectedCompany={{
                code: selectedCompany.tickerSymbol || selectedCompany.edinetCode,
                name: selectedCompany.companyName,
                roic: roicResults.detailed.roic,
                industryCode: getIndustryCode(selectedCompany.industry || '')
              }}
            />
          )}
        </div>
      )}

      {/* 使用方法説明 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">EDINET API連携について</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">機能</h4>
            <ul className="space-y-1">
              <li>• 金融庁EDINET APIから企業検索</li>
              <li>• 有価証券報告書から財務データ自動抽出</li>
              <li>• 複数年度データの一括取得</li>
              <li>• 4つの計算方式によるROIC自動計算</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">データソース</h4>
            <ul className="space-y-1">
              <li>• デモ環境: サンプルデータを使用</li>
              <li>• 本番環境: 実際のEDINET APIが必要</li>
              <li>• XBRL形式の財務諸表から自動抽出</li>
              <li>• 連結・単体両方の財務データに対応</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}