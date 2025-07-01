'use client'

import { useState, useEffect } from 'react'

interface TestResults {
  unit: { passed: number; failed: number; total: number; coverage: number; lastRun: string | null }
  e2e: { passed: number; failed: number; total: number; lastRun: string | null }
  integration: { passed: number; failed: number; total: number; lastRun: string | null }
  performance: { passed: number; failed: number; total: number; lastRun: string | null }
  security: { passed: number; failed: number; total: number; lastRun: string | null }
  build: { status: string; lastRun: string | null }
  deployment: { status: string; lastRun: string | null }
}

export default function TestProgressWidget() {
  const [testResults, setTestResults] = useState<TestResults>({
    unit: { passed: 0, failed: 0, total: 0, coverage: 0, lastRun: null },
    e2e: { passed: 0, failed: 0, total: 0, lastRun: null },
    integration: { passed: 0, failed: 0, total: 0, lastRun: null },
    performance: { passed: 0, failed: 0, total: 0, lastRun: null },
    security: { passed: 0, failed: 0, total: 0, lastRun: null },
    build: { status: 'unknown', lastRun: null },
    deployment: { status: 'unknown', lastRun: null }
  })
  
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    // WebSocket接続でリアルタイム更新
    let ws: WebSocket | null = null
    
    const connectWebSocket = () => {
      try {
        ws = new WebSocket('ws://localhost:3002')
        
        ws.onopen = () => {
          console.log('Test progress WebSocket connected')
          setIsConnected(true)
        }
        
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            
            switch (message.type) {
              case 'initial-data':
                setTestResults(message.data)
                setLastUpdate(new Date())
                break
                
              case 'unit-test-results':
                setTestResults(prev => ({ ...prev, unit: message.data }))
                setLastUpdate(new Date())
                break
                
              case 'e2e-test-results':
                setTestResults(prev => ({ ...prev, e2e: message.data }))
                setLastUpdate(new Date())
                break
                
              case 'build-results':
                setTestResults(prev => ({ ...prev, build: message.data }))
                setLastUpdate(new Date())
                break
                
              case 'performance-test-results':
                setTestResults(prev => ({ ...prev, performance: message.data }))
                setLastUpdate(new Date())
                break
                
              case 'security-test-results':
                setTestResults(prev => ({ ...prev, security: message.data }))
                setLastUpdate(new Date())
                break
                
              default:
                setLastUpdate(new Date())
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }
        
        ws.onclose = () => {
          console.log('Test progress WebSocket disconnected')
          setIsConnected(false)
          
          // 5秒後に再接続を試行
          setTimeout(connectWebSocket, 5000)
        }
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          setIsConnected(false)
        }
        
      } catch (error) {
        console.error('Failed to connect WebSocket:', error)
        setIsConnected(false)
        
        // フォールバック: 定期的なポーリング
        setTimeout(() => {
          fetchTestResults()
        }, 10000)
      }
    }

    connectWebSocket()
    
    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [])

  const fetchTestResults = async () => {
    try {
      const response = await fetch('/api/test-results')
      if (response.ok) {
        const data = await response.json()
        setTestResults(data)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch test results:', error)
    }
  }

  const getProgressPercentage = (passed: number, total: number) => {
    if (total === 0) return 0
    return Math.round((passed / total) * 100)
  }

  const getStatusColor = (passed: number, failed: number, total: number) => {
    if (total === 0) return 'bg-gray-200'
    if (failed > 0) return 'bg-red-500'
    return 'bg-green-500'
  }

  const getStatusIcon = (passed: number, failed: number, total: number) => {
    if (total === 0) return '⏳'
    if (failed > 0) return '❌'
    return '✅'
  }

  const formatLastRun = (lastRun: string | null) => {
    if (!lastRun) return '未実行'
    
    const date = new Date(lastRun)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'たった今'
    if (diffMins < 60) return `${diffMins}分前`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}時間前`
    return date.toLocaleDateString('ja-JP')
  }

  const testCategories = [
    {
      name: 'ユニットテスト',
      icon: '🧪',
      data: testResults.unit,
      showCoverage: true
    },
    {
      name: 'E2Eテスト',
      icon: '🎭',
      data: testResults.e2e,
      showCoverage: false
    },
    {
      name: 'パフォーマンス',
      icon: '⚡',
      data: testResults.performance,
      showCoverage: false
    },
    {
      name: 'セキュリティ',
      icon: '🔒',
      data: testResults.security,
      showCoverage: false
    }
  ]

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">テスト進捗状況</h3>
        <div className="flex items-center gap-2">
          <div 
            className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            title={isConnected ? 'リアルタイム接続中' : '接続なし'}
          />
          <span className="text-xs text-gray-500">
            {lastUpdate ? `更新: ${formatLastRun(lastUpdate.toISOString())}` : '未更新'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {testCategories.map((category) => (
          <div key={category.name} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{category.icon}</span>
                <span className="font-medium text-gray-900">{category.name}</span>
              </div>
              <span className="text-lg">
                {getStatusIcon(category.data.passed, category.data.failed, category.data.total)}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {category.data.passed}/{category.data.total} 成功
                </span>
                <span className="text-gray-600">
                  {getProgressPercentage(category.data.passed, category.data.total)}%
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(
                    category.data.passed, 
                    category.data.failed, 
                    category.data.total
                  )}`}
                  style={{ 
                    width: `${getProgressPercentage(category.data.passed, category.data.total)}%` 
                  }}
                />
              </div>
              
              {category.showCoverage && category.data.coverage > 0 && (
                <div className="text-xs text-gray-500">
                  カバレッジ: {category.data.coverage}%
                </div>
              )}
              
              <div className="text-xs text-gray-400">
                {formatLastRun(category.data.lastRun)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span>🔧</span>
            <span className="font-medium text-gray-900">ビルド</span>
            <span className="text-sm">
              {testResults.build.status === 'success' ? '✅' : 
               testResults.build.status === 'failed' ? '❌' : '⏳'}
            </span>
          </div>
          <div className="text-xs text-gray-400">
            {formatLastRun(testResults.build.lastRun)}
          </div>
        </div>
        
        <div className="border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span>🚀</span>
            <span className="font-medium text-gray-900">デプロイメント</span>
            <span className="text-sm">
              {testResults.deployment.status === 'success' ? '✅' : 
               testResults.deployment.status === 'failed' ? '❌' : '⏳'}
            </span>
          </div>
          <div className="text-xs text-gray-400">
            {formatLastRun(testResults.deployment.lastRun)}
          </div>
        </div>
      </div>

      {!isConnected && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600">⚠️</span>
            <span className="text-sm text-yellow-800">
              リアルタイム更新が無効です。手動で再読み込みしてください。
            </span>
          </div>
        </div>
      )}
    </div>
  )
}