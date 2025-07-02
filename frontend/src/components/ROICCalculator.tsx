'use client'

import { useState } from 'react'
import { 
  FinancialData, 
  ROICResult,
  calculateAllROIC,
  formatROIC,
  formatCurrency,
  getROICEvaluationLevel,
  sampleCompanyData
} from '@/utils/roicCalculations'

export default function ROICCalculator() {
  const [financialData, setFinancialData] = useState<FinancialData>(sampleCompanyData)
  const [results, setResults] = useState<ReturnType<typeof calculateAllROIC> | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<'basic' | 'detailed' | 'asset' | 'modified'>('detailed')

  const handleInputChange = (field: keyof FinancialData, value: string) => {
    const numValue = parseFloat(value) || 0
    setFinancialData(prev => ({
      ...prev,
      [field]: numValue
    }))
  }

  const handleCalculate = () => {
    const calculatedResults = calculateAllROIC(financialData)
    setResults(calculatedResults)
  }

  const handleLoadSample = () => {
    setFinancialData(sampleCompanyData)
    setResults(null)
  }

  const renderInputField = (
    label: string,
    field: keyof FinancialData,
    unit: string = '千円',
    step: string = '1000'
  ) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} ({unit})
      </label>
      <input
        type="number"
        step={step}
        value={financialData[field] || ''}
        onChange={(e) => handleInputChange(field, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  )

  const renderResultCard = (title: string, result: ROICResult, methodKey: string) => {
    const evaluation = getROICEvaluationLevel(result.roic)
    const isSelected = selectedMethod === methodKey

    return (
      <div 
        className={`border rounded-lg p-4 cursor-pointer transition-all ${
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => setSelectedMethod(methodKey as typeof selectedMethod)}
      >
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold text-gray-900">{title}</h4>
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
  }

  const renderBreakdown = () => {
    if (!results || !results[selectedMethod]) return null

    const result = results[selectedMethod]
    
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3">計算内訳</h4>
        <div className="space-y-2">
          {Object.entries(result.breakdown).map(([key, value]) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-gray-600">{key}:</span>
              <span className="font-medium">
                {key.includes('率') || key.includes('ROIC') ? 
                  `${(value * 100).toFixed(2)}%` : 
                  formatCurrency(value)
                }
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">ROIC自動計算</h1>
        <p className="text-gray-600">
          財務データを入力して、4つの計算方式でROIC（投下資本利益率）を自動計算します
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 入力フォーム */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">財務データ入力</h2>
              <button
                onClick={handleLoadSample}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                サンプル読込
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">損益計算書項目</h3>
              {renderInputField('営業利益', 'operatingIncome')}
              {renderInputField('受取利息', 'interestIncome')}
              {renderInputField('実効税率', 'taxRate', '%', '0.01')}

              <h3 className="font-medium text-gray-900 border-b pb-2 mt-6">貸借対照表項目</h3>
              {renderInputField('総資産', 'totalAssets')}
              {renderInputField('現金及び現金同等物', 'cashAndEquivalents')}
              {renderInputField('株主資本', 'shareholdersEquity')}
              {renderInputField('有利子負債', 'interestBearingDebt')}
              {renderInputField('買掛金', 'accountsPayable')}
              {renderInputField('未払金', 'accruedExpenses')}

              <h3 className="font-medium text-gray-900 border-b pb-2 mt-6">IFRS16対応項目</h3>
              {renderInputField('リース費用', 'leaseExpense')}
              {renderInputField('リース債務', 'leaseDebt')}

              <button
                onClick={handleCalculate}
                className="w-full mt-6 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                ROIC計算実行
              </button>
            </div>
          </div>
        </div>

        {/* 結果表示 */}
        <div className="lg:col-span-2">
          {results ? (
            <div className="space-y-6">
              {/* 計算結果一覧 */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">計算結果</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderResultCard('基本方式', results.basic, 'basic')}
                  {renderResultCard('詳細方式', results.detailed, 'detailed')}
                  {renderResultCard('アセット方式', results.asset, 'asset')}
                  {renderResultCard('修正方式', results.modified, 'modified')}
                </div>
              </div>

              {/* 詳細内訳 */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {selectedMethod === 'basic' && '基本方式'}
                  {selectedMethod === 'detailed' && '詳細方式'}
                  {selectedMethod === 'asset' && 'アセット方式'}
                  {selectedMethod === 'modified' && '修正方式'}
                  の詳細
                </h3>
                {renderBreakdown()}
              </div>

              {/* 計算式説明 */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">計算式</h3>
                <div className="space-y-3 text-sm">
                  {selectedMethod === 'basic' && (
                    <div>
                      <div className="font-medium">基本方式（財務指標直接計算）</div>
                      <div className="text-gray-600 mt-1">
                        ROIC = 営業利益 × (1 - 実効税率) ÷ (総資産 - 現金及び現金同等物)
                      </div>
                      <div className="text-gray-500 text-xs mt-1">
                        最もシンプルな計算方式、営業利益をベースにした税引後利益を使用
                      </div>
                    </div>
                  )}
                  {selectedMethod === 'detailed' && (
                    <div>
                      <div className="font-medium">詳細方式（NOPAT個別計算）</div>
                      <div className="text-gray-600 mt-1">
                        NOPAT = (営業利益 + 受取利息) × (1 - 実効税率)<br/>
                        投下資本 = 株主資本 + 有利子負債<br/>
                        ROIC = NOPAT ÷ 投下資本
                      </div>
                      <div className="text-gray-500 text-xs mt-1">
                        より精密な計算、金融収益も含めた事業利益を評価
                      </div>
                    </div>
                  )}
                  {selectedMethod === 'asset' && (
                    <div>
                      <div className="font-medium">アセット方式（総資産ベース）</div>
                      <div className="text-gray-600 mt-1">
                        投下資本 = 総資産 - 無利子負債（買掛金、未払金等）<br/>
                        ROIC = NOPAT ÷ 投下資本
                      </div>
                      <div className="text-gray-500 text-xs mt-1">
                        バランスシート全体から運転資本効率を評価
                      </div>
                    </div>
                  )}
                  {selectedMethod === 'modified' && (
                    <div>
                      <div className="font-medium">修正方式（リース調整）</div>
                      <div className="text-gray-600 mt-1">
                        修正NOPAT = NOPAT + リース費用 × (1 - 実効税率)<br/>
                        修正投下資本 = 投下資本 + リース債務<br/>
                        修正ROIC = 修正NOPAT ÷ 修正投下資本
                      </div>
                      <div className="text-gray-500 text-xs mt-1">
                        IFRS16対応、オペレーティングリースの資本化調整
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-center text-gray-500 py-12">
                <div className="text-4xl mb-4">📊</div>
                <div className="text-lg mb-2">ROIC計算結果</div>
                <div>財務データを入力して「ROIC計算実行」ボタンを押してください</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}