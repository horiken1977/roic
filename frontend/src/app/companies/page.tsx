'use client'

import { useState } from 'react'
import Link from 'next/link'
import ROICCalculator from '@/components/ROICCalculator'

interface Company {
  id: string
  name: string
  code: string
  industry: string
  market: string
  roic: number
  lastUpdated: string
}

// サンプル企業データ
const sampleCompanies: Company[] = [
  {
    id: '1',
    name: 'トヨタ自動車',
    code: '7203',
    industry: '自動車・輸送機器',
    market: 'プライム市場',
    roic: 0.089,
    lastUpdated: '2024-12-31'
  },
  {
    id: '2', 
    name: 'ソニーグループ',
    code: '6758',
    industry: '電気機器',
    market: 'プライム市場',
    roic: 0.134,
    lastUpdated: '2024-12-31'
  },
  {
    id: '3',
    name: '三菱UFJフィナンシャル・グループ',
    code: '8306',
    industry: '銀行業',
    market: 'プライム市場',
    roic: 0.067,
    lastUpdated: '2024-12-31'
  },
  {
    id: '4',
    name: 'ファーストリテイリング',
    code: '9983',
    industry: '小売業',
    market: 'プライム市場',
    roic: 0.156,
    lastUpdated: '2024-12-31'
  },
  {
    id: '5',
    name: 'キーエンス',
    code: '6861',
    industry: '電気機器',
    market: 'プライム市場',
    roic: 0.298,
    lastUpdated: '2024-12-31'
  }
]

export default function CompaniesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const [selectedMarket, setSelectedMarket] = useState('')
  const [searchResults, setSearchResults] = useState<Company[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)

  const handleSearch = () => {
    let filtered = sampleCompanies.filter(company => {
      const matchesName = searchTerm === '' || 
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.code.includes(searchTerm)
      
      const matchesIndustry = selectedIndustry === '' || 
        company.industry.includes(selectedIndustry)
      
      const matchesMarket = selectedMarket === '' || 
        company.market.includes(selectedMarket)
      
      return matchesName && matchesIndustry && matchesMarket
    })

    setSearchResults(filtered)
    setHasSearched(true)
  }

  const formatROIC = (roic: number): string => {
    return `${(roic * 100).toFixed(1)}%`
  }

  const getROICColor = (roic: number): string => {
    if (roic >= 0.15) return 'text-green-600 font-bold'
    if (roic >= 0.10) return 'text-blue-600 font-semibold'
    if (roic >= 0.05) return 'text-yellow-600'
    return 'text-red-600'
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
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">企業検索</h1>
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {showCalculator ? 'ROIC計算を閉じる' : 'ROIC計算を開く'}
          </button>
        </div>
        
        <div className="mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="企業名または証券コードで検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button 
              onClick={handleSearch}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              検索
            </button>
          </div>
        </div>
        
        <div className="flex gap-4 mb-6">
          <select 
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">業界を選択</option>
            <option value="自動車">自動車・輸送機器</option>
            <option value="電気機器">電気機器</option>
            <option value="銀行業">銀行業</option>
            <option value="小売業">小売業</option>
          </select>
          <select 
            value={selectedMarket}
            onChange={(e) => setSelectedMarket(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">市場を選択</option>
            <option value="プライム市場">プライム市場</option>
            <option value="スタンダード市場">スタンダード市場</option>
            <option value="グロース市場">グロース市場</option>
          </select>
        </div>
      </div>

      {/* ROIC計算機 */}
      {showCalculator && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">ROIC自動計算</h2>
          <ROICCalculator />
        </div>
      )}
      
      {/* 検索結果 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          検索結果 {hasSearched && `(${searchResults.length}件)`}
        </h2>
        
        {!hasSearched ? (
          <div className="text-gray-500 text-center py-8">
            企業名または証券コードを入力して検索してください
          </div>
        ) : searchResults.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            検索条件に一致する企業が見つかりませんでした
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4">企業名</th>
                  <th className="text-left py-3 px-4">証券コード</th>
                  <th className="text-left py-3 px-4">業界</th>
                  <th className="text-left py-3 px-4">市場</th>
                  <th className="text-right py-3 px-4">ROIC</th>
                  <th className="text-left py-3 px-4">最終更新</th>
                  <th className="text-center py-3 px-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map((company) => (
                  <tr key={company.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {company.name}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {company.code}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {company.industry}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {company.market}
                    </td>
                    <td className={`py-3 px-4 text-right ${getROICColor(company.roic)}`}>
                      {formatROIC(company.roic)}
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-sm">
                      {company.lastUpdated}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button className="text-blue-600 hover:text-blue-800 text-sm">
                        詳細
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 使用方法説明 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">使用方法</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">企業検索</h4>
            <ul className="space-y-1">
              <li>• 企業名の一部または証券コードで検索可能</li>
              <li>• 業界・市場での絞り込み検索に対応</li>
              <li>• Enterキーでも検索実行可能</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">ROIC評価基準</h4>
            <ul className="space-y-1">
              <li>• <span className="text-green-600 font-bold">15%以上</span>: 優秀</li>
              <li>• <span className="text-blue-600 font-semibold">10-15%</span>: 良好</li>
              <li>• <span className="text-yellow-600">5-10%</span>: 平均的</li>
              <li>• <span className="text-red-600">5%未満</span>: 要改善</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}