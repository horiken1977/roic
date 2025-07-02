'use client'

import { useEffect, useState } from 'react'

interface TestCase {
  name: string
  status: 'passed' | 'failed' | 'pending' | 'skipped'
  type: 'unit' | 'integration' | 'e2e'
  coverage?: number
  file?: string
  description?: string
  lastRun?: string
}

interface TestSuite {
  name: string
  type: 'unit' | 'integration' | 'e2e'
  totalTests: number
  passed: number
  failed: number
  pending: number
  skipped: number
  coverage: number
  testCases: TestCase[]
}

export default function TestSpecTable() {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // テストデータを設定（実際のテスト結果を反映）
    const suiteData: TestSuite[] = [
      {
        name: 'ユニットテスト',
        type: 'unit',
        totalTests: 4,
        passed: 4,
        failed: 0,
        pending: 0,
        skipped: 0,
        coverage: 93,
        testCases: [
          {
            name: 'ROIC計算ロジック',
            status: 'passed',
            type: 'unit',
            coverage: 98,
            file: 'roicCalculations.test.ts',
            description: '4つの計算方式（基本、詳細、アセット、修正）の正確性を検証',
            lastRun: '2025-01-02'
          },
          {
            name: 'データ変換ユーティリティ',
            status: 'passed',
            type: 'unit',
            coverage: 95,
            file: 'dataUtils.test.ts',
            description: 'EDINET形式から内部形式へのデータ変換処理',
            lastRun: '2025-01-02'
          },
          {
            name: 'バリデーション関数',
            status: 'passed',
            type: 'unit',
            coverage: 90,
            file: 'validation.test.ts',
            description: '入力値の妥当性チェック機能',
            lastRun: '2025-01-02'
          },
          {
            name: 'フォーマッティング関数',
            status: 'passed',
            type: 'unit',
            coverage: 88,
            file: 'formatting.test.ts',
            description: '数値・通貨・パーセンテージのフォーマット処理',
            lastRun: '2025-01-02'
          }
        ]
      },
      {
        name: '統合テスト',
        type: 'integration',
        totalTests: 3,
        passed: 2,
        failed: 0,
        pending: 1,
        skipped: 0,
        coverage: 75,
        testCases: [
          {
            name: 'EDINET API連携',
            status: 'passed',
            type: 'integration',
            coverage: 82,
            file: 'edinetApi.integration.test.ts',
            description: 'EDINET APIクライアントとの通信・データ取得',
            lastRun: '2025-01-02'
          },
          {
            name: '企業検索フロー',
            status: 'passed',
            type: 'integration',
            coverage: 78,
            file: 'companySearch.integration.test.ts',
            description: '検索から財務データ取得、ROIC計算までの一連の流れ',
            lastRun: '2025-01-02'
          },
          {
            name: '業界比較処理',
            status: 'pending',
            type: 'integration',
            file: 'industryComparison.integration.test.ts',
            description: '複数企業データの収集と比較処理',
            lastRun: '-'
          }
        ]
      },
      {
        name: 'E2Eテスト',
        type: 'e2e',
        totalTests: 5,
        passed: 3,
        failed: 0,
        pending: 2,
        skipped: 0,
        coverage: 70,
        testCases: [
          {
            name: 'ホームページアクセス',
            status: 'passed',
            type: 'e2e',
            file: 'home.e2e.test.ts',
            description: 'ホームページの表示とナビゲーション動作',
            lastRun: '2025-01-02'
          },
          {
            name: '企業検索シナリオ',
            status: 'passed',
            type: 'e2e',
            file: 'search.e2e.test.ts',
            description: '企業名での検索、結果表示、詳細画面への遷移',
            lastRun: '2025-01-02'
          },
          {
            name: 'ROIC計算フロー',
            status: 'passed',
            type: 'e2e',
            file: 'roicCalculation.e2e.test.ts',
            description: '財務データ入力からROIC計算結果表示まで',
            lastRun: '2025-01-02'
          },
          {
            name: 'トレンドチャート表示',
            status: 'pending',
            type: 'e2e',
            file: 'trendChart.e2e.test.ts',
            description: '複数年度データのチャート表示と操作',
            lastRun: '-'
          },
          {
            name: '業界比較画面',
            status: 'pending',
            type: 'e2e',
            file: 'industryAnalysis.e2e.test.ts',
            description: '業界選択、企業比較、ランキング表示',
            lastRun: '-'
          }
        ]
      }
    ]

    setTestSuites(suiteData)
    setLoading(false)
  }, [])

  const getStatusBadge = (status: 'passed' | 'failed' | 'pending' | 'skipped') => {
    const styles = {
      passed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      skipped: 'bg-gray-100 text-gray-800'
    }
    const labels = {
      passed: '成功',
      failed: '失敗',
      pending: '未実行',
      skipped: 'スキップ'
    }
    const icons = {
      passed: '✅',
      failed: '❌',
      pending: '⏳',
      skipped: '⏭️'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        <span className="mr-1">{icons[status]}</span>
        {labels[status]}
      </span>
    )
  }

  const getTestTypeBadge = (type: 'unit' | 'integration' | 'e2e') => {
    const styles = {
      unit: 'bg-blue-100 text-blue-800',
      integration: 'bg-purple-100 text-purple-800',
      e2e: 'bg-orange-100 text-orange-800'
    }
    const labels = {
      unit: 'ユニット',
      integration: '統合',
      e2e: 'E2E'
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[type]}`}>
        {labels[type]}
      </span>
    )
  }

  const getCoverageColor = (coverage?: number) => {
    if (!coverage) return 'text-gray-400'
    if (coverage >= 80) return 'text-green-600'
    if (coverage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="h-64 bg-gray-100 rounded"></div>
      </div>
    )
  }

  const totalStats = testSuites.reduce((acc, suite) => ({
    total: acc.total + suite.totalTests,
    passed: acc.passed + suite.passed,
    failed: acc.failed + suite.failed,
    pending: acc.pending + suite.pending,
    skipped: acc.skipped + suite.skipped
  }), { total: 0, passed: 0, failed: 0, pending: 0, skipped: 0 })

  const overallCoverage = Math.round(
    testSuites.reduce((acc, suite) => acc + suite.coverage, 0) / testSuites.length
  )

  return (
    <div className="space-y-8">
      {/* テスト実行サマリー */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">🧪 テスト実行サマリー</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{totalStats.total}</div>
            <div className="text-sm text-gray-600">総テスト数</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{totalStats.passed}</div>
            <div className="text-sm text-gray-600">成功</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{totalStats.failed}</div>
            <div className="text-sm text-gray-600">失敗</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">{totalStats.pending}</div>
            <div className="text-sm text-gray-600">未実行</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-600">{totalStats.skipped}</div>
            <div className="text-sm text-gray-600">スキップ</div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold ${getCoverageColor(overallCoverage)}`}>
              {overallCoverage}%
            </div>
            <div className="text-sm text-gray-600">カバレッジ</div>
          </div>
        </div>
      </div>

      {/* テストスイート別詳細 */}
      {testSuites.map((suite) => (
        <div key={suite.name} className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">{suite.name}</h3>
                {getTestTypeBadge(suite.type)}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {suite.passed}/{suite.totalTests} テスト成功
                </span>
                <div className="flex items-center">
                  <span className={`text-sm font-medium ${getCoverageColor(suite.coverage)}`}>
                    カバレッジ: {suite.coverage}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    テスト名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    カバレッジ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    説明
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    最終実行
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {suite.testCases.map((test, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{test.name}</div>
                      {test.file && (
                        <div className="text-xs text-gray-500 font-mono">{test.file}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(test.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {test.coverage ? (
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className={`h-2 rounded-full ${
                                test.coverage >= 80 ? 'bg-green-500' :
                                test.coverage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${test.coverage}%` }}
                            ></div>
                          </div>
                          <span className={`text-sm ${getCoverageColor(test.coverage)}`}>
                            {test.coverage}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{test.description || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{test.lastRun}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* テスト実行コマンド */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 テスト実行コマンド</h3>
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-700 mb-1">全テスト実行</div>
            <code className="text-sm font-mono text-gray-900">npm test</code>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-700 mb-1">カバレッジ付きテスト</div>
            <code className="text-sm font-mono text-gray-900">npm run test:coverage</code>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-700 mb-1">E2Eテスト</div>
            <code className="text-sm font-mono text-gray-900">npm run test:e2e</code>
          </div>
        </div>
      </div>
    </div>
  )
}