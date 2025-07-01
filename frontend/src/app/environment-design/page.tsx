'use client';

import { useState, useEffect } from 'react';
import Navigation from '../../components/Navigation';
import Breadcrumb from '../../components/Breadcrumb';

interface EnvironmentInfo {
  os: string;
  nodejs: string;
  npm: string;
  git: string;
  framework: string;
  database: string;
  cloud: string;
  lastUpdated: string;
}

export default function EnvironmentDesignPage() {
  const [environmentInfo, setEnvironmentInfo] = useState<EnvironmentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 環境情報を取得（実際の実装では API から取得）
    const fetchEnvironmentInfo = async () => {
      try {
        // 模擬データ（実際はAPI経由で取得）
        const mockData: EnvironmentInfo = {
          os: 'macOS 15.5 (ARM64)',
          nodejs: 'v24.3.0',
          npm: '11.4.2',
          git: '2.39.5',
          framework: 'Next.js 15.3.4 + React 19.0.0',
          database: 'PostgreSQL (AWS RDS)',
          cloud: 'AWS (Lambda, RDS, S3)',
          lastUpdated: new Date().toISOString().split('T')[0]
        };
        
        setTimeout(() => {
          setEnvironmentInfo(mockData);
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error('環境情報の取得に失敗:', error);
        setLoading(false);
      }
    };

    fetchEnvironmentInfo();
  }, []);

  const breadcrumbItems = [
    { label: 'ホーム', href: '/' },
    { label: '環境設計書', href: '/environment-design' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Breadcrumb items={breadcrumbItems} />
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Header - Unified style with dashboard */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="container mx-auto px-4">
          <Breadcrumb items={breadcrumbItems} />
          <h1 className="text-4xl font-bold mb-4">🏗️ 環境設計書</h1>
          <p className="text-xl text-blue-100 mb-6">
            ROIC分析アプリケーションの開発・本番環境の詳細設計とインフラストラクチャ構成
          </p>
          <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium inline-block">
            最終更新: {environmentInfo?.lastUpdated}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">

          <div className="prose max-w-none">

            {/* 環境概要カード */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-4">💻 開発環境</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>OS:</span>
                    <span className="font-mono">{environmentInfo?.os}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Node.js:</span>
                    <span className="font-mono">{environmentInfo?.nodejs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>npm:</span>
                    <span className="font-mono">{environmentInfo?.npm}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Git:</span>
                    <span className="font-mono">{environmentInfo?.git}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-4">☁️ インフラ構成</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>フレームワーク:</span>
                    <span className="font-mono text-sm">{environmentInfo?.framework}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>データベース:</span>
                    <span className="font-mono">{environmentInfo?.database}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>クラウド:</span>
                    <span className="font-mono">{environmentInfo?.cloud}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>デプロイ:</span>
                    <span className="font-mono">GitHub Pages</span>
                  </div>
                </div>
              </div>
            </div>

            {/* アーキテクチャ図 */}
            <div className="bg-gray-50 p-6 rounded-lg mb-8">
              <h3 className="text-xl font-bold mb-4 text-gray-800">🏗️ システムアーキテクチャ</h3>
              <div className="bg-white p-4 rounded border-2 border-dashed border-gray-300">
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-2">📊</div>
                  <p>システム構成図</p>
                  <p className="text-sm">フロントエンド ↔ API ↔ データベース</p>
                </div>
              </div>
            </div>

            {/* 技術スタック */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-bold text-blue-800 mb-2">フロントエンド</h4>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>• Next.js 15.3.4</li>
                  <li>• React 19.0.0</li>
                  <li>• TypeScript 5.x</li>
                  <li>• Tailwind CSS 4.x</li>
                  <li>• Zustand 5.0.6</li>
                </ul>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-bold text-green-800 mb-2">バックエンド</h4>
                <ul className="text-sm text-green-600 space-y-1">
                  <li>• Node.js &gt;=18.0.0</li>
                  <li>• Express.js 4.18.2</li>
                  <li>• PostgreSQL</li>
                  <li>• AWS SDK 2.x</li>
                  <li>• Winston Logger</li>
                </ul>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-bold text-purple-800 mb-2">開発ツール</h4>
                <ul className="text-sm text-purple-600 space-y-1">
                  <li>• Jest 30.0.3</li>
                  <li>• Playwright 1.53.2</li>
                  <li>• ESLint 9.x</li>
                  <li>• GitHub Actions</li>
                  <li>• VS Code</li>
                </ul>
              </div>
            </div>

            {/* パフォーマンス最適化 */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
              <h4 className="font-bold text-yellow-800 mb-2">⚡ 最新の最適化実装</h4>
              <div className="text-yellow-700">
                <p className="mb-2"><strong>Git パフォーマンス最適化 (2025-07-01):</strong></p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>core.preloadindex=true (ファイルシステム最適化)</li>
                  <li>core.fscache=true (キャッシュ有効化)</li>
                  <li>**/node_modules/ .gitignore追加</li>
                  <li>status.submoduleSummary=false (高速化)</li>
                </ul>
              </div>
            </div>

            {/* セキュリティ */}
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
              <h4 className="font-bold text-red-800 mb-2">🛡️ セキュリティ設定</h4>
              <div className="text-red-700 space-y-2">
                <div>
                  <strong>認証・認可:</strong>
                  <ul className="list-disc list-inside text-sm mt-1">
                    <li>JWT Token認証</li>
                    <li>HTTPS通信必須</li>
                    <li>CORS設定済み</li>
                  </ul>
                </div>
                <div>
                  <strong>機密情報保護:</strong>
                  <ul className="list-disc list-inside text-sm mt-1">
                    <li>.env*, *.key, *.pem除外</li>
                    <li>AWSクレデンシャル除外</li>
                    <li>Rate Limiting実装</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 自動化機能 */}
            <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 mb-8">
              <h4 className="font-bold text-indigo-800 mb-2">🔄 自動化機能</h4>
              <div className="text-indigo-700">
                <p className="mb-2"><strong>ドキュメント自動更新:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>環境設定変更時の自動検知</li>
                  <li>設計書・仕様書の自動更新</li>
                  <li>テスト結果の自動反映</li>
                  <li>GitHub Pages自動デプロイ</li>
                </ul>
              </div>
            </div>
          </div>

          {/* フッター */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm text-gray-500">
              <div>
                このドキュメントは自動更新されます
              </div>
              <div>
                📄 詳細: <a href="/functional-spec.html" className="text-blue-600 hover:underline" target="_blank">docs/environment-design.md</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}