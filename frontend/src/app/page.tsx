import Link from "next/link";
import TestProgressWidget from '@/components/TestProgressWidget';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">ROIC分析アプリケーション</h1>
          <p className="text-xl text-blue-100 mb-6">
            日系上場企業のROIC（投下資本利益率）を自動計算・分析・比較
          </p>
          <div className="flex space-x-4">
            <Link
              href="/dashboard"
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              開発進捗ダッシュボード
            </Link>
            <Link
              href="/companies"
              className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-400 transition-colors"
            >
              企業検索・分析
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">📚 ドキュメント一覧</h2>
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* 開発進捗ダッシュボード */}
          <Link href="/dashboard" className="block">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-blue-500">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-2xl">📊</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">開発進捗ダッシュボード</h3>
                  <p className="text-green-600 text-sm font-medium">実装完了</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm">
                リアルタイムで開発状況を監視・可視化
              </p>
              <div className="mt-4 flex items-center text-blue-600">
                <span className="text-sm font-medium">詳細を見る →</span>
              </div>
            </div>
          </Link>

          {/* 機能設計書 */}
          <Link href="/functional-spec" className="block">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-green-500">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-2xl">📋</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">機能設計書</h3>
                  <p className="text-green-600 text-sm font-medium">最新版</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm">
                システム要件・機能仕様・技術設計
              </p>
              <div className="mt-4 flex items-center text-green-600">
                <span className="text-sm font-medium">詳細を見る →</span>
              </div>
            </div>
          </Link>

          {/* テスト仕様書 */}
          <Link href="/test-docs/test-spec" className="block">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-purple-500">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-2xl">🧪</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">テスト仕様書</h3>
                  <p className="text-green-600 text-sm font-medium">自動更新</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm">
                ユニット・E2Eテストの実行状況
              </p>
              <div className="mt-4 flex items-center text-purple-600">
                <span className="text-sm font-medium">詳細を見る →</span>
              </div>
            </div>
          </Link>

          {/* 環境設計書 */}
          <Link href="/environment-design" className="block">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-orange-500">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-2xl">🏗️</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">環境設計書</h3>
                  <p className="text-green-600 text-sm font-medium">自動更新</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm">
                開発・本番環境の詳細設計とインフラ構成
              </p>
              <div className="mt-4 flex items-center text-orange-600">
                <span className="text-sm font-medium">詳細を見る →</span>
              </div>
            </div>
          </Link>

          {/* 運用設計書 */}
          <Link href="/operations-design" className="block">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-red-500">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                  <span className="text-2xl">⚙️</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">運用設計書</h3>
                  <p className="text-green-600 text-sm font-medium">新規追加</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm">
                システム運用ルールと自動化設定
              </p>
              <div className="mt-4 flex items-center text-red-600">
                <span className="text-sm font-medium">詳細を見る →</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Main Features Section */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">🎯 ROIC分析を今すぐ始める</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Link href="/companies" className="block">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-all border border-white/20">
                <h3 className="text-xl font-semibold mb-3">📊 企業検索・ROIC分析</h3>
                <p className="text-purple-100 mb-4">
                  EDINET APIと連携して企業の財務データを自動取得し、4つの計算方式でROICを分析します。
                </p>
                <div className="flex items-center text-white font-medium">
                  <span>分析を開始 →</span>
                </div>
              </div>
            </Link>
            <Link href="/industry-analysis" className="block">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-all border border-white/20">
                <h3 className="text-xl font-semibold mb-3">🏆 業界比較・ランキング</h3>
                <p className="text-purple-100 mb-4">
                  業界内でのROICランキングや、複数業界間でのROIC水準比較分析を行います。
                </p>
                <div className="flex items-center text-white font-medium">
                  <span>業界分析へ →</span>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">プロジェクト進捗概要</h2>
          
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">100%</div>
              <div className="text-gray-600">全体進捗</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">7</div>
              <div className="text-gray-600">完了機能</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">0</div>
              <div className="text-gray-600">開発中</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">9</div>
              <div className="text-gray-600">テスト実行</div>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Phase 1: 基盤構築</span>
                <span className="text-sm text-gray-500">100%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Phase 2: コア機能開発</span>
                <span className="text-sm text-gray-500">75%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Phase 3: データ統合</span>
                <span className="text-sm text-gray-500">20%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: '20%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Phase 4: 高度機能</span>
                <span className="text-sm text-gray-500">0%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gray-400 h-2 rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Access Links */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Documentation Access */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">ドキュメント</h3>
            <div className="space-y-3">
              <Link href="/test-docs/test-plan" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div>
                  <div className="font-medium text-gray-900">テスト計画書</div>
                  <div className="text-sm text-gray-600">テスト戦略・計画・実行手順</div>
                </div>
                <span className="text-blue-600">→</span>
              </Link>
              
              <Link href="/functional-spec" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div>
                  <div className="font-medium text-gray-900">機能設計書</div>
                  <div className="text-sm text-gray-600">システム要件・技術仕様</div>
                </div>
                <span className="text-green-600">→</span>
              </Link>
              
              <Link href="https://github.com/horiken1977/roic" target="_blank" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div>
                  <div className="font-medium text-gray-900">GitHub リポジトリ</div>
                  <div className="text-sm text-gray-600">ソースコード・Issues・PR</div>
                </div>
                <span className="text-gray-600">↗</span>
              </Link>
            </div>
          </div>

          {/* Core Features */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">主な機能</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                <span className="text-gray-700">ROIC自動計算（4つの計算方式対応）</span>
                <span className="ml-auto text-green-600 text-sm">✅</span>
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                <span className="text-gray-700">企業検索・フィルタリング機能</span>
                <span className="ml-auto text-green-600 text-sm">✅</span>
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                <span className="text-gray-700">EDINET API連携・財務データ取得</span>
                <span className="ml-auto text-green-600 text-sm">✅</span>
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                <span className="text-gray-700">業界内比較・ランキング表示</span>
                <span className="ml-auto text-green-600 text-sm">✅</span>
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                <span className="text-gray-700">トレンドチャート・可視化</span>
                <span className="ml-auto text-gray-600 text-sm">📋</span>
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                <span className="text-gray-700">自動テスト・デプロイシステム</span>
                <span className="ml-auto text-green-600 text-sm">✅</span>
              </div>
            </div>
          </div>
        </div>

        {/* Test Progress Section */}
        <TestProgressWidget />

        {/* Sample Data Section - Will be replaced with real data */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">ROIC上位企業（サンプル）</h2>
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

        {/* Auto-update Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-blue-600 mr-2">🤖</span>
            <span className="text-blue-800 font-medium">
              このページは自動化システムにより継続的に更新されています
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}