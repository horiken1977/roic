'use client'

import { useEffect, useState } from 'react'

interface Feature {
  name: string
  status: 'completed' | 'in_progress' | 'planned'
  progress: number
  description: string
  priority: 'high' | 'medium' | 'low'
  phase: string
  files?: string[]
}

interface Phase {
  name: string
  status: 'completed' | 'in_progress' | 'planned'
  progress: number
  description: string
  features: Feature[]
}

export default function FunctionalSpecTable() {
  const [phases, setPhases] = useState<Phase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 機能設計書からデータを取得（実際のデータ）
    const phaseData: Phase[] = [
      {
        name: 'Phase 1: MVP基盤構築',
        status: 'completed',
        progress: 100,
        description: '基本機能とインフラの構築',
        features: [
          {
            name: 'ROIC自動計算',
            status: 'completed',
            progress: 100,
            description: '4つの計算方式に対応したROIC自動計算',
            priority: 'high',
            phase: 'Phase 1',
            files: ['frontend/src/components/ROICCalculator.tsx', 'frontend/src/utils/roicCalculations.ts']
          },
          {
            name: '企業検索・ROIC表示',
            status: 'completed',
            progress: 100,
            description: '企業検索機能とROIC値表示、統合ROIC計算機能',
            priority: 'high',
            phase: 'Phase 1',
            files: ['frontend/src/app/companies/page.tsx']
          },
          {
            name: '企業検索・フィルタリング',
            status: 'completed',
            progress: 100,
            description: '効率的な企業検索とフィルタリング機能',
            priority: 'high',
            phase: 'Phase 1',
            files: ['frontend/src/app/companies/page.tsx', 'frontend/src/components/CompanySearch.tsx']
          },
          {
            name: '進捗ダッシュボード',
            status: 'completed',
            progress: 100,
            description: 'リアルタイムで開発状況を監視・可視化',
            priority: 'high',
            phase: 'Phase 1',
            files: ['frontend/src/app/dashboard/page.tsx', 'frontend/src/app/page.tsx']
          },
          {
            name: '機能設計書',
            status: 'completed',
            progress: 100,
            description: 'システム要件・機能仕様・技術設計',
            priority: 'medium',
            phase: 'Phase 1',
            files: ['docs/functional-spec.md', 'frontend/src/app/functional-spec/page.tsx']
          },
          {
            name: 'テスト仕様書',
            status: 'completed',
            progress: 100,
            description: 'ユニット・E2Eテストの実行状況',
            priority: 'medium',
            phase: 'Phase 1',
            files: ['frontend/src/app/test-docs/test-spec/page.tsx']
          },
          {
            name: '環境設計書',
            status: 'completed',
            progress: 100,
            description: '開発・本番環境の詳細設計とインフラ構成',
            priority: 'medium',
            phase: 'Phase 1',
            files: ['frontend/src/app/environment-design/page.tsx', 'docs/environment-design.md']
          },
          {
            name: '運用設計書',
            status: 'completed',
            progress: 100,
            description: 'システム運用ルールと自動化設定',
            priority: 'high',
            phase: 'Phase 1',
            files: ['frontend/src/app/operations-design/page.tsx', 'docs/operations-design.md']
          }
        ]
      },
      {
        name: 'Phase 2: コア機能拡張',
        status: 'completed',
        progress: 100,
        description: '業界比較・データ可視化機能の追加',
        features: [
          {
            name: '業界比較・ランキング',
            status: 'completed',
            progress: 100,
            description: '同業界内でのROIC比較とランキング表示、業界間比較分析',
            priority: 'high',
            phase: 'Phase 2',
            files: ['frontend/src/components/IndustryComparison.tsx', 'frontend/src/app/industry-analysis/page.tsx']
          },
          {
            name: 'データ可視化',
            status: 'completed',
            progress: 100,
            description: 'ROICトレンドチャート・グラフ表示',
            priority: 'high',
            phase: 'Phase 2',
            files: ['frontend/src/components/ROICTrendChart.tsx']
          }
        ]
      },
      {
        name: 'Phase 3: データ統合',
        status: 'planned',
        progress: 0,
        description: '外部API統合・データベース連携',
        features: [
          {
            name: 'EDINET API統合',
            status: 'planned',
            progress: 0,
            description: '外部APIからの財務データ取得',
            priority: 'medium',
            phase: 'Phase 3'
          }
        ]
      }
    ]

    setPhases(phaseData)
    setLoading(false)
  }, [])

  const getStatusBadge = (status: 'completed' | 'in_progress' | 'planned') => {
    const styles = {
      completed: 'bg-green-100 text-green-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      planned: 'bg-gray-100 text-gray-800'
    }
    const labels = {
      completed: '完了',
      in_progress: '対応中',
      planned: '未着手'
    }
    const icons = {
      completed: '✅',
      in_progress: '🚧',
      planned: '📋'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        <span className="mr-1">{icons[status]}</span>
        {labels[status]}
      </span>
    )
  }

  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    const styles = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-blue-100 text-blue-800',
      low: 'bg-gray-100 text-gray-800'
    }
    const labels = {
      high: '高',
      medium: '中',
      low: '低'
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[priority]}`}>
        {labels[priority]}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="h-64 bg-gray-100 rounded"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 全体進捗サマリー */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 開発進捗サマリー</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {phases.map((phase) => (
            <div key={phase.name} className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900">{phase.name}</h3>
                {getStatusBadge(phase.status)}
              </div>
              <p className="text-sm text-gray-600 mb-3">{phase.description}</p>
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">進捗</span>
                  <span className="font-medium">{phase.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      phase.status === 'completed' ? 'bg-green-500' :
                      phase.status === 'in_progress' ? 'bg-yellow-500' : 'bg-gray-400'
                    }`}
                    style={{ width: `${phase.progress}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                機能数: {phase.features.length}個
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phase別詳細テーブル */}
      {phases.map((phase) => (
        <div key={phase.name} className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className={`px-6 py-4 border-b ${
            phase.status === 'completed' ? 'bg-green-50 border-green-200' :
            phase.status === 'in_progress' ? 'bg-yellow-50 border-yellow-200' :
            'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">{phase.name}</h3>
              <div className="flex items-center gap-4">
                {getStatusBadge(phase.status)}
                <span className="text-sm font-medium text-gray-700">
                  {phase.features.filter(f => f.status === 'completed').length}/{phase.features.length} 完了
                </span>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    機能名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    進捗
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    優先度
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    説明
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {phase.features.map((feature, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{feature.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(feature.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className={`h-2 rounded-full ${
                                feature.progress === 100 ? 'bg-green-500' :
                                feature.progress > 0 ? 'bg-yellow-500' : 'bg-gray-400'
                              }`}
                              style={{ width: `${feature.progress}%` }}
                            ></div>
                          </div>
                        </div>
                        <span className="text-sm text-gray-600 ml-2 w-12 text-right">
                          {feature.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge(feature.priority)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{feature.description}</div>
                      {feature.files && feature.files.length > 0 && (
                        <div className="mt-1">
                          <details className="text-xs">
                            <summary className="text-gray-500 cursor-pointer hover:text-gray-700">
                              関連ファイル ({feature.files.length})
                            </summary>
                            <div className="mt-1 space-y-0.5">
                              {feature.files.map((file, idx) => (
                                <div key={idx} className="text-gray-600 font-mono pl-2">
                                  {file}
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* 統計情報 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 統計情報</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {phases.reduce((acc, p) => acc + p.features.length, 0)}
            </div>
            <div className="text-sm text-gray-600">総機能数</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {phases.reduce((acc, p) => acc + p.features.filter(f => f.status === 'completed').length, 0)}
            </div>
            <div className="text-sm text-gray-600">完了機能</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {phases.reduce((acc, p) => acc + p.features.filter(f => f.status === 'in_progress').length, 0)}
            </div>
            <div className="text-sm text-gray-600">対応中</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-600">
              {phases.reduce((acc, p) => acc + p.features.filter(f => f.status === 'planned').length, 0)}
            </div>
            <div className="text-sm text-gray-600">未着手</div>
          </div>
        </div>
      </div>
    </div>
  )
}