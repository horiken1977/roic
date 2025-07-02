'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { FinancialDataFromEDINET } from '@/services/edinetApi'
import { calculateAllROIC, formatROIC } from '@/utils/roicCalculations'
import { ChartExportButton } from './ExportButtons'

interface ROICTrendChartProps {
  financialDataList: FinancialDataFromEDINET[]
  companyName: string
  industryAverage?: number
}

interface ChartDataPoint {
  year: number
  basic: number
  detailed: number
  asset: number
  modified: number
  industryAvg?: number
}

export default function ROICTrendChart({ 
  financialDataList, 
  companyName,
  industryAverage 
}: ROICTrendChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [selectedMethods, setSelectedMethods] = useState({
    basic: true,
    detailed: true,
    asset: false,
    modified: false
  })

  useEffect(() => {
    // 財務データからROICを計算してチャートデータを生成
    const data = financialDataList
      .sort((a, b) => a.fiscalYear - b.fiscalYear)
      .map(financialData => {
        const convertedData = {
          operatingIncome: financialData.operatingIncome,
          interestIncome: financialData.interestIncome,
          taxRate: financialData.taxRate,
          totalAssets: financialData.totalAssets,
          cashAndEquivalents: financialData.cashAndEquivalents,
          shareholdersEquity: financialData.shareholdersEquity,
          interestBearingDebt: financialData.interestBearingDebt,
          accountsPayable: financialData.accountsPayable,
          accruedExpenses: financialData.accruedExpenses,
          leaseExpense: financialData.leaseExpense,
          leaseDebt: financialData.leaseDebt
        }
        
        const roicResults = calculateAllROIC(convertedData)
        
        return {
          year: financialData.fiscalYear,
          basic: roicResults.basic.roic * 100,
          detailed: roicResults.detailed.roic * 100,
          asset: roicResults.asset.roic * 100,
          modified: roicResults.modified.roic * 100,
          industryAvg: industryAverage ? industryAverage * 100 : undefined
        }
      })
    
    setChartData(data)
  }, [financialDataList, industryAverage])

  const handleMethodToggle = (method: keyof typeof selectedMethods) => {
    setSelectedMethods(prev => ({
      ...prev,
      [method]: !prev[method]
    }))
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <p className="font-semibold text-gray-900 mb-2">{label}年度</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatROIC(entry.value / 100)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const lineColors = {
    basic: '#3B82F6',      // blue-500
    detailed: '#10B981',   // green-500
    asset: '#F59E0B',      // amber-500
    modified: '#8B5CF6',   // violet-500
    industryAvg: '#EF4444' // red-500
  }

  const methodNames = {
    basic: '基本方式',
    detailed: '詳細方式',
    asset: 'アセット方式',
    modified: '修正方式'
  }

  // 最新年度のROIC値を取得
  const latestData = chartData[chartData.length - 1]
  const bestMethod = latestData ? Object.entries({
    basic: latestData.basic,
    detailed: latestData.detailed,
    asset: latestData.asset,
    modified: latestData.modified
  }).reduce((a, b) => a[1] > b[1] ? a : b)[0] : 'detailed'

  const chartId = `roic-trend-chart-${Date.now()}`

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              📈 ROICトレンド分析 - {companyName}
            </h3>
            <p className="text-sm text-gray-600">
              過去{chartData.length}年間のROIC推移と計算方式別の比較
            </p>
          </div>
          <ChartExportButton 
            chartElementId={chartId}
            label="チャート保存"
          />
        </div>
      </div>

      {/* 計算方式の選択 */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-3">
          {Object.entries(selectedMethods).map(([method, isSelected]) => (
            <button
              key={method}
              onClick={() => handleMethodToggle(method as keyof typeof selectedMethods)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className={`inline-block w-3 h-3 rounded-full mr-2`} 
                    style={{ backgroundColor: lineColors[method as keyof typeof lineColors] }}></span>
              {methodNames[method as keyof typeof methodNames]}
            </button>
          ))}
        </div>
      </div>

      {/* チャート */}
      <div id={chartId} className="mb-6" style={{ height: '400px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="year" 
              stroke="#6B7280"
              style={{ fontSize: '14px' }}
            />
            <YAxis 
              stroke="#6B7280"
              style={{ fontSize: '14px' }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }}
              formatter={(value: string) => {
                if (value === 'industryAvg') return '業界平均'
                return methodNames[value as keyof typeof methodNames] || value
              }}
            />
            
            {/* 業界平均線 */}
            {industryAverage && (
              <ReferenceLine 
                y={industryAverage * 100} 
                stroke={lineColors.industryAvg}
                strokeDasharray="5 5"
                label={{ value: "業界平均", position: "right" }}
              />
            )}
            
            {/* 各計算方式のライン */}
            {selectedMethods.basic && (
              <Line
                type="monotone"
                dataKey="basic"
                stroke={lineColors.basic}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="basic"
              />
            )}
            {selectedMethods.detailed && (
              <Line
                type="monotone"
                dataKey="detailed"
                stroke={lineColors.detailed}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="detailed"
              />
            )}
            {selectedMethods.asset && (
              <Line
                type="monotone"
                dataKey="asset"
                stroke={lineColors.asset}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="asset"
              />
            )}
            {selectedMethods.modified && (
              <Line
                type="monotone"
                dataKey="modified"
                stroke={lineColors.modified}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="modified"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 分析サマリー */}
      {latestData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-700 mb-1">最新ROIC（{bestMethod}）</div>
            <div className="text-2xl font-bold text-blue-900">
              {formatROIC(latestData[bestMethod as keyof ChartDataPoint] as number / 100)}
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-green-700 mb-1">3年平均成長率</div>
            <div className="text-2xl font-bold text-green-900">
              {chartData.length >= 3 ? (
                (() => {
                  const startValue = chartData[chartData.length - 3][bestMethod as keyof ChartDataPoint] as number
                  const endValue = latestData[bestMethod as keyof ChartDataPoint] as number
                  const growthRate = ((endValue - startValue) / startValue) * 100
                  return `${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}%`
                })()
              ) : 'N/A'}
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-sm text-purple-700 mb-1">業界平均との差</div>
            <div className="text-2xl font-bold text-purple-900">
              {industryAverage ? (
                (() => {
                  const diff = (latestData.detailed - industryAverage * 100)
                  return `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`
                })()
              ) : 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* トレンド解説 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-2">📊 トレンド分析のポイント</h4>
        <ul className="space-y-1 text-sm text-gray-600">
          <li>• 複数の計算方式で一貫して上昇傾向にある場合、経営効率が改善</li>
          <li>• 業界平均を上回るROICは、競争優位性の指標</li>
          <li>• 年度間の大きな変動は、特殊要因の影響を示唆</li>
          <li>• 計算方式により差が大きい場合は、資本構成の特徴を反映</li>
        </ul>
      </div>
    </div>
  )
}