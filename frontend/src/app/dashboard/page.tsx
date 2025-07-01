import TestProgressWidget from '@/components/TestProgressWidget'
import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">ROICダッシュボード</h1>
        
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900">総企業数</h3>
            <p className="text-2xl font-bold text-blue-700">3,847</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900">平均ROIC</h3>
            <p className="text-2xl font-bold text-green-700">8.5%</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-900">更新日</h3>
            <p className="text-2xl font-bold text-purple-700">2025/07/01</p>
          </div>
        </div>
      </div>

      <TestProgressWidget />

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">テスト文書</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link 
            href="/test-docs/test-plan" 
            target="_blank"
            className="block p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900">📋 テスト計画書</h3>
                <p className="text-sm text-blue-700">テスト戦略・プロセス・進捗状況</p>
              </div>
              <div className="text-blue-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </div>
          </Link>
          
          <Link 
            href="/test-docs/test-spec" 
            target="_blank"
            className="block p-4 border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-green-900">📊 テスト仕様書</h3>
                <p className="text-sm text-green-700">詳細テスト項目・実行状況・結果</p>
              </div>
              <div className="text-green-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </div>
          </Link>
        </div>
        
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            💡 テスト文書はリアルタイムで更新されます。テスト実行結果が自動的に反映されます。
          </p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">ROIC上位企業</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">順位</th>
                <th className="text-left py-2">企業名</th>
                <th className="text-left py-2">業界</th>
                <th className="text-left py-2">ROIC</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">1</td>
                <td className="py-2">サンプル企業A</td>
                <td className="py-2">テクノロジー</td>
                <td className="py-2 text-green-600 font-semibold">25.3%</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">2</td>
                <td className="py-2">サンプル企業B</td>
                <td className="py-2">ヘルスケア</td>
                <td className="py-2 text-green-600 font-semibold">22.1%</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">3</td>
                <td className="py-2">サンプル企業C</td>
                <td className="py-2">消費財</td>
                <td className="py-2 text-green-600 font-semibold">19.8%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">業界別ROIC平均</h2>
        <div className="text-gray-500 text-center py-8">
          チャートを表示予定（Recharts実装後）
        </div>
      </div>
    </div>
  );
}