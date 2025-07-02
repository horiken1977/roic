'use client';

import React, { useState, useEffect } from 'react';
import {
  getAllIndustries,
  generateIndustryComparison,
  calculateIndustryRanking,
  getIndustryCharacteristics,
  getQuartileDescription,
  getROICColorClass,
  type IndustryData,
  type IndustryComparison,
  type CompanyROICData
} from '@/utils/industryCalculations';

interface IndustryComparisonProps {
  selectedCompany?: {
    code: string;
    name: string;
    roic: number;
    industryCode: string;
  };
}

export default function IndustryComparison({ selectedCompany }: IndustryComparisonProps) {
  const [industries] = useState<IndustryData[]>(getAllIndustries());
  const [selectedIndustry, setSelectedIndustry] = useState<string>('1100');
  const [comparisonData, setComparisonData] = useState<IndustryComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  useEffect(() => {
    loadIndustryComparison(selectedIndustry);
  }, [selectedIndustry]);

  const loadIndustryComparison = async (industryCode: string) => {
    setLoading(true);
    try {
      // 実際の実装では、ここでバックエンドAPIからデータを取得
      const data = generateIndustryComparison(industryCode);
      setComparisonData(data);
    } catch (error) {
      console.error('業界比較データの取得に失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCompanyRanking = (company: CompanyROICData) => {
    if (!comparisonData) return null;
    return calculateIndustryRanking(company.roic_value, comparisonData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">業界比較データを読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🏭 業界比較・ランキング</h2>
        
        {/* 業界選択 */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <label htmlFor="industry-select" className="text-sm font-medium text-gray-700">
              業界:
            </label>
            <select
              id="industry-select"
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {industries.map((industry) => (
                <option key={industry.industry_code} value={industry.industry_code}>
                  {industry.industry_name}
                </option>
              ))}
            </select>
          </div>

          {/* 表示モード切替 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">表示:</span>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              テーブル
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === 'chart'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              チャート
            </button>
          </div>
        </div>

        {/* 選択された企業の情報 */}
        {selectedCompany && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-900 mb-2">分析対象企業</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">企業名:</span>
                <div className="text-blue-900">{selectedCompany.name}</div>
              </div>
              <div>
                <span className="text-blue-700 font-medium">企業コード:</span>
                <div className="text-blue-900">{selectedCompany.code}</div>
              </div>
              <div>
                <span className="text-blue-700 font-medium">ROIC:</span>
                <div className={getROICColorClass(selectedCompany.roic)}>
                  {(selectedCompany.roic * 100).toFixed(2)}%
                </div>
              </div>
              <div>
                <span className="text-blue-700 font-medium">業界:</span>
                <div className="text-blue-900">
                  {industries.find(i => i.industry_code === selectedCompany.industryCode)?.industry_name}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {comparisonData && (
        <>
          {/* 業界統計サマリー */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {comparisonData.companies.length}
              </div>
              <div className="text-sm text-gray-600">企業数</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {(comparisonData.statistics.average_roic * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">業界平均</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {(comparisonData.statistics.median_roic * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">中央値</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {(comparisonData.statistics.max_roic * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">最高値</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {(comparisonData.statistics.min_roic * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">最低値</div>
            </div>
          </div>

          {/* 四分位情報 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">四分位分析</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-medium text-gray-700">第1四分位 (Q1)</div>
                <div className="text-lg font-bold text-gray-900">
                  {(comparisonData.statistics.quartiles.q1 * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">下位25%</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-700">第2四分位 (Q2)</div>
                <div className="text-lg font-bold text-gray-900">
                  {(comparisonData.statistics.quartiles.q2 * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">中央値</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-700">第3四分位 (Q3)</div>
                <div className="text-lg font-bold text-gray-900">
                  {(comparisonData.statistics.quartiles.q3 * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">上位25%</div>
              </div>
            </div>
          </div>

          {/* 企業ランキング表 */}
          {viewMode === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">順位</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">企業名</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">企業コード</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">ROIC</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">四分位</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">パーセンタイル</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.companies
                    .sort((a, b) => b.roic_value - a.roic_value)
                    .map((company, index) => {
                      const ranking = getCompanyRanking(company);
                      const isSelected = selectedCompany?.code === company.company_code;
                      
                      return (
                        <tr
                          key={company.company_code}
                          className={`border-b border-gray-100 hover:bg-gray-50 ${
                            isSelected ? 'bg-blue-50 border-blue-200' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <span className="font-semibold text-gray-900">{index + 1}</span>
                              {index < 3 && (
                                <span className="ml-2 text-xs">
                                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={isSelected ? 'font-semibold text-blue-900' : 'text-gray-900'}>
                              {company.company_name}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600 font-mono">
                            {company.company_code}
                          </td>
                          <td className="py-3 px-4">
                            <span className={getROICColorClass(company.roic_value, ranking?.quartile)}>
                              {(company.roic_value * 100).toFixed(2)}%
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {ranking && (
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {getQuartileDescription(ranking.quartile)}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {ranking && `${ranking.percentile}%`}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          {/* チャート表示 */}
          {viewMode === 'chart' && (
            <div className="space-y-6">
              {/* 分布チャート（簡易版） */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">ROIC分布</h3>
                <div className="relative h-64 border border-gray-200 rounded bg-white p-4">
                  <div className="absolute inset-4 flex items-end justify-around">
                    {comparisonData.companies
                      .sort((a, b) => a.roic_value - b.roic_value)
                      .map((company, index) => {
                        const height = Math.max(
                          10,
                          (company.roic_value / comparisonData.statistics.max_roic) * 180
                        );
                        const isSelected = selectedCompany?.code === company.company_code;
                        
                        return (
                          <div
                            key={company.company_code}
                            className="flex flex-col items-center"
                            style={{ width: `${100 / comparisonData.companies.length}%` }}
                          >
                            <div
                              className={`w-full max-w-6 rounded-t transition-all duration-300 ${
                                isSelected
                                  ? 'bg-blue-600 border-2 border-blue-800'
                                  : getROICColorClass(company.roic_value).includes('green')
                                  ? 'bg-green-500'
                                  : getROICColorClass(company.roic_value).includes('blue')
                                  ? 'bg-blue-500'
                                  : getROICColorClass(company.roic_value).includes('yellow')
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ height: `${height}px` }}
                              title={`${company.company_name}: ${(company.roic_value * 100).toFixed(2)}%`}
                            />
                            <div className="text-xs text-gray-600 mt-1 text-center">
                              {index + 1}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  
                  {/* Y軸ラベル */}
                  <div className="absolute left-0 top-4 h-48 flex flex-col justify-between text-xs text-gray-500">
                    <span>{(comparisonData.statistics.max_roic * 100).toFixed(1)}%</span>
                    <span>{(comparisonData.statistics.average_roic * 100).toFixed(1)}%</span>
                    <span>0%</span>
                  </div>
                </div>
                
                {/* 平均線の説明 */}
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center space-x-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                      上位25%
                    </span>
                    <span className="flex items-center">
                      <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                      25-50%
                    </span>
                    <span className="flex items-center">
                      <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                      50-75%
                    </span>
                    <span className="flex items-center">
                      <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                      下位25%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 業界特性情報 */}
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 mb-2">業界特性</h3>
            <pre className="text-sm text-yellow-800 whitespace-pre-line">
              {getIndustryCharacteristics(selectedIndustry)}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}