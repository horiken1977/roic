import Link from 'next/link'

export default function TestDocsPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">テスト文書</h1>
        <p className="text-gray-600 mb-6">
          ROIC分析アプリケーションのテスト計画書と仕様書をご覧いただけます。
          これらの文書はテスト実行結果に応じてリアルタイムで更新されます。
        </p>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Link 
            href="/test-docs/test-plan"
            className="block p-6 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-blue-900 mb-2">📋 テスト計画書</h2>
                <p className="text-blue-700 mb-4">
                  テスト戦略、プロセス、進捗状況を確認できます
                </p>
                <div className="text-sm text-blue-600">
                  ✓ テスト戦略とアプローチ<br/>
                  ✓ フェーズ別進捗状況<br/>
                  ✓ カバレッジ統計<br/>
                  ✓ リアルタイム更新
                </div>
              </div>
              <div className="text-blue-500">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </div>
          </Link>
          
          <Link 
            href="/test-docs/test-spec"
            className="block p-6 border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-green-900 mb-2">📊 テスト仕様書</h2>
                <p className="text-green-700 mb-4">
                  詳細なテスト項目、実行状況、結果を確認できます
                </p>
                <div className="text-sm text-green-600">
                  ✓ テストスイート実行状況<br/>
                  ✓ 成功・失敗率の詳細<br/>
                  ✓ テスト項目別進捗<br/>
                  ✓ 自動更新レポート
                </div>
              </div>
              <div className="text-green-500">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </div>
          </Link>
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">💡 ご利用方法</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• テスト文書は自動的に最新の実行結果で更新されます</li>
            <li>• 新しいタブで開くため、ダッシュボードと並行して確認できます</li>
            <li>• 進捗バーと統計情報はリアルタイムで反映されます</li>
            <li>• モバイルデバイスでも最適化された表示で閲覧できます</li>
          </ul>
        </div>

        <div className="mt-4 flex justify-center">
          <Link 
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            ← ダッシュボードに戻る
          </Link>
        </div>
      </div>
    </div>
  )
}