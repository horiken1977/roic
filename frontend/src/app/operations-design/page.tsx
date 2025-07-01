'use client';

import { useState, useEffect } from 'react';
import Navigation from '../../components/Navigation';
import Breadcrumb from '../../components/Breadcrumb';

interface OperationRule {
  id: string;
  category: string;
  title: string;
  description: string;
  enabled: boolean;
  schedule?: string;
  actions?: string[];
}

interface OperationMetrics {
  autoCommits: number;
  deployments: number;
  costSavings: string;
  uptime: string;
  lastUpdate: string;
}

export default function OperationsDesignPage() {
  const [operationRules, setOperationRules] = useState<OperationRule[]>([]);
  const [metrics, setMetrics] = useState<OperationMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 運用ルールとメトリクスを取得（実際の実装では API から取得）
    const fetchOperationData = async () => {
      try {
        // 模擬データ（実際はAPI経由で取得）
        const mockRules: OperationRule[] = [
          {
            id: 'auto-update',
            category: '自動更新',
            title: 'チャットベース自動更新',
            description: '対話型チャットで機能追加やテスト項目の追加を検知し、自動でドキュメント更新',
            enabled: true,
            actions: ['設定ファイル更新', '機能設計書再生成', 'テスト仕様書更新', 'ダッシュボード反映']
          },
          {
            id: 'auto-deployment',
            category: 'CI/CD',
            title: '自動コミット・プッシュ・デプロイ',
            description: 'ローカルファイル更新後の自動CI/CDパイプライン実行',
            enabled: true,
            actions: ['git add', 'git commit', 'git push', 'GitHub Actions', 'テスト実行', 'デプロイ']
          },
          {
            id: 'aws-shutdown',
            category: 'コスト最適化',
            title: 'AWS夜間シャットダウン',
            description: 'AWS環境の夜間シャットダウンによるコスト最適化',
            enabled: true,
            schedule: '22:00-08:00 JST',
            actions: ['EC2停止', 'RDS停止', 'Lambda制限', 'CloudWatch無効化']
          },
          {
            id: 'monitoring',
            category: '監視',
            title: 'システム監視・アラート',
            description: '24時間365日のシステム監視とアラート通知',
            enabled: true,
            actions: ['ヘルスチェック', 'パフォーマンス監視', 'エラー検知', 'Slack通知']
          }
        ];

        const mockMetrics: OperationMetrics = {
          autoCommits: 127,
          deployments: 89,
          costSavings: '約35%削減',
          uptime: '99.95%',
          lastUpdate: new Date().toISOString()
        };

        setTimeout(() => {
          setOperationRules(mockRules);
          setMetrics(mockMetrics);
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error('運用情報の取得に失敗:', error);
        setLoading(false);
      }
    };

    fetchOperationData();
  }, []);

  const breadcrumbItems = [
    { label: 'ホーム', href: '/' },
    { label: '運用設計書', href: '/operations-design' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
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
          <h1 className="text-4xl font-bold mb-4">⚙️ 運用設計書</h1>
          <p className="text-xl text-blue-100 mb-6">
            ROIC分析アプリケーションのシステム運用ルールと自動化設定
          </p>
          <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium inline-block">
            最終更新: {metrics?.lastUpdate ? new Date(metrics.lastUpdate).toLocaleString('ja-JP') : '-'}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* 運用メトリクス */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📊 運用メトリクス</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-blue-50 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{metrics?.autoCommits || 0}</div>
              <div className="text-sm text-gray-600">自動コミット数</div>
            </div>
            <div className="bg-green-50 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{metrics?.deployments || 0}</div>
              <div className="text-sm text-gray-600">自動デプロイ数</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-2">{metrics?.costSavings || '-'}</div>
              <div className="text-sm text-gray-600">コスト削減率</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">{metrics?.uptime || '-'}</div>
              <div className="text-sm text-gray-600">稼働率</div>
            </div>
          </div>
        </div>

        {/* 運用ルール一覧 */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📋 システム運用ルール</h2>
          <div className="space-y-6">
            {operationRules.map((rule) => (
              <div key={rule.id} className="border-l-4 border-blue-500 pl-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-semibold text-gray-800">
                    {rule.title}
                    {rule.enabled && (
                      <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        有効
                      </span>
                    )}
                  </h3>
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {rule.category}
                  </span>
                </div>
                <p className="text-gray-600 mb-3">{rule.description}</p>
                {rule.schedule && (
                  <div className="text-sm text-blue-600 mb-2">
                    ⏰ スケジュール: {rule.schedule}
                  </div>
                )}
                {rule.actions && rule.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {rule.actions.map((action, index) => (
                      <span
                        key={index}
                        className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded"
                      >
                        {action}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 自動化フロー図 */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">🔄 自動化フロー</h2>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="text-center space-y-4">
              <div className="bg-blue-100 rounded-lg p-4 inline-block">
                <div className="font-semibold">1. チャット対話</div>
                <div className="text-sm text-gray-600">機能追加・変更依頼</div>
              </div>
              <div className="text-2xl">↓</div>
              <div className="bg-green-100 rounded-lg p-4 inline-block">
                <div className="font-semibold">2. 自動検知</div>
                <div className="text-sm text-gray-600">キーワード解析・ルール適用</div>
              </div>
              <div className="text-2xl">↓</div>
              <div className="bg-yellow-100 rounded-lg p-4 inline-block">
                <div className="font-semibold">3. ファイル更新</div>
                <div className="text-sm text-gray-600">設定・ドキュメント自動生成</div>
              </div>
              <div className="text-2xl">↓</div>
              <div className="bg-purple-100 rounded-lg p-4 inline-block">
                <div className="font-semibold">4. 自動コミット</div>
                <div className="text-sm text-gray-600">git add → commit → push</div>
              </div>
              <div className="text-2xl">↓</div>
              <div className="bg-red-100 rounded-lg p-4 inline-block">
                <div className="font-semibold">5. CI/CD実行</div>
                <div className="text-sm text-gray-600">テスト → ビルド → デプロイ</div>
              </div>
            </div>
          </div>
        </div>

        {/* セキュリティ・コンプライアンス */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">🛡️ セキュリティ・コンプライアンス</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-3">セキュリティ対策</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• GitHub Secretsによる認証情報管理</li>
                <li>• AWS IAMロールベースアクセス制御</li>
                <li>• 自動セキュリティスキャン（npm audit）</li>
                <li>• HTTPS通信の強制</li>
                <li>• 定期的な依存関係の更新</li>
              </ul>
            </div>
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-3">監査・ログ管理</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• 全操作の監査ログ記録</li>
                <li>• CloudWatch Logsへの集約</li>
                <li>• 30日間のログ保持</li>
                <li>• 異常検知アラート設定</li>
                <li>• 月次監査レポート生成</li>
              </ul>
            </div>
          </div>
        </div>

        {/* バックアップ・災害復旧 */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">💾 バックアップ・災害復旧</h2>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6">
            <h3 className="font-semibold text-yellow-800 mb-3">バックアップポリシー</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>日次バックアップ</strong>
                <ul className="mt-2 text-gray-600">
                  <li>• データベース全体</li>
                  <li>• 設定ファイル</li>
                  <li>• ユーザーデータ</li>
                </ul>
              </div>
              <div>
                <strong>週次バックアップ</strong>
                <ul className="mt-2 text-gray-600">
                  <li>• アプリケーション全体</li>
                  <li>• システム設定</li>
                  <li>• ログアーカイブ</li>
                </ul>
              </div>
              <div>
                <strong>月次バックアップ</strong>
                <ul className="mt-2 text-gray-600">
                  <li>• 完全システムイメージ</li>
                  <li>• 長期保存（1年間）</li>
                  <li>• 外部ストレージ保管</li>
                </ul>
              </div>
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
              📄 詳細: <a href="/docs/operations-design.md" className="text-blue-600 hover:underline">docs/operations-design.md</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}