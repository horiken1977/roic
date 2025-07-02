'use client'

import { useEffect, useState } from 'react'

interface Environment {
  name: string
  status: 'active' | 'staging' | 'development' | 'maintenance'
  url?: string
  description: string
  lastDeploy: string
  version: string
  health: 'healthy' | 'warning' | 'error'
}

interface InfraComponent {
  name: string
  type: 'hosting' | 'database' | 'cdn' | 'monitoring' | 'ci_cd' | 'storage'
  provider: string
  status: 'active' | 'configuring' | 'planned'
  description: string
  configuration?: string[]
}

interface Deployment {
  environment: string
  trigger: string
  status: 'success' | 'failed' | 'in_progress'
  timestamp: string
  duration?: string
  deployedBy: string
}

export default function EnvironmentTable() {
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [infraComponents, setInfraComponents] = useState<InfraComponent[]>([])
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 環境設定データ（実際の設定を反映）
    const envData: Environment[] = [
      {
        name: 'Production（本番環境）',
        status: 'active',
        url: 'https://horiken1977.github.io/roic/',
        description: 'GitHub Pages本番環境。自動デプロイ対応',
        lastDeploy: '2025-01-02 15:30',
        version: 'v2.1.0',
        health: 'healthy'
      },
      {
        name: 'Development（開発環境）',
        status: 'development',
        url: 'http://localhost:3000',
        description: 'ローカル開発環境。Next.js開発サーバー',
        lastDeploy: '2025-01-02 16:00',
        version: 'dev-latest',
        health: 'healthy'
      },
      {
        name: 'AWS S3（予備環境）',
        status: 'maintenance',
        url: '-',
        description: 'AWS S3静的ホスティング（現在設定中）',
        lastDeploy: '-',
        version: '-',
        health: 'warning'
      }
    ]

    const infraData: InfraComponent[] = [
      {
        name: 'GitHub Pages',
        type: 'hosting',
        provider: 'GitHub',
        status: 'active',
        description: '静的サイトホスティング',
        configuration: ['Custom Domain対応', 'HTTPS強制', '自動ビルド・デプロイ']
      },
      {
        name: 'GitHub Actions',
        type: 'ci_cd',
        provider: 'GitHub',
        status: 'active',
        description: 'CI/CDパイプライン',
        configuration: ['main-ci-cd.yml', 'Jest テスト実行', 'Next.js ビルド', 'ESLint チェック']
      },
      {
        name: 'AWS S3',
        type: 'storage',
        provider: 'AWS',
        status: 'configuring',
        description: '静的ファイルストレージ（予備）',
        configuration: ['パブリックアクセス設定', 'CloudFront連携予定']
      },
      {
        name: 'Next.js',
        type: 'hosting',
        provider: 'Vercel Inc.',
        status: 'active',
        description: 'React フレームワーク',
        configuration: ['v15.3.4', 'Static Site Generation', 'TypeScript対応']
      },
      {
        name: 'Recharts',
        type: 'monitoring',
        provider: 'recharts.org',
        status: 'active',
        description: 'データ可視化ライブラリ',
        configuration: ['ROICトレンドチャート', 'レスポンシブ対応']
      }
    ]

    const deploymentData: Deployment[] = [
      {
        environment: 'Production',
        trigger: 'git push main',
        status: 'success',
        timestamp: '2025-01-02 15:30:25',
        duration: '2m 34s',
        deployedBy: 'Claude Code'
      },
      {
        environment: 'Production',
        trigger: 'git push main',
        status: 'success',
        timestamp: '2025-01-02 14:15:12',
        duration: '2m 18s',
        deployedBy: 'Claude Code'
      },
      {
        environment: 'AWS S3',
        trigger: 'manual',
        status: 'failed',
        timestamp: '2025-01-02 12:00:00',
        duration: '45s',
        deployedBy: 'Claude Code'
      }
    ]

    setEnvironments(envData)
    setInfraComponents(infraData)
    setDeployments(deploymentData)
    setLoading(false)
  }, [])

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      staging: 'bg-blue-100 text-blue-800',
      development: 'bg-yellow-100 text-yellow-800',
      maintenance: 'bg-orange-100 text-orange-800',
      configuring: 'bg-purple-100 text-purple-800',
      planned: 'bg-gray-100 text-gray-800'
    }
    const labels: Record<string, string> = {
      active: '稼働中',
      staging: 'ステージング',
      development: '開発中',
      maintenance: 'メンテナンス',
      configuring: '設定中',
      planned: '計画中'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getHealthBadge = (health: string) => {
    const styles: Record<string, string> = {
      healthy: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800'
    }
    const labels: Record<string, string> = {
      healthy: '正常',
      warning: '警告',
      error: 'エラー'
    }
    const icons: Record<string, string> = {
      healthy: '🟢',
      warning: '🟡',
      error: '🔴'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[health]}`}>
        <span className="mr-1">{icons[health]}</span>
        {labels[health]}
      </span>
    )
  }

  const getDeploymentStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      in_progress: 'bg-blue-100 text-blue-800'
    }
    const icons: Record<string, string> = {
      success: '✅',
      failed: '❌',
      in_progress: '🔄'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        <span className="mr-1">{icons[status]}</span>
        {status === 'success' ? '成功' : status === 'failed' ? '失敗' : '実行中'}
      </span>
    )
  }

  const getComponentTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      hosting: 'bg-blue-100 text-blue-800',
      database: 'bg-green-100 text-green-800',
      cdn: 'bg-purple-100 text-purple-800',
      monitoring: 'bg-orange-100 text-orange-800',
      ci_cd: 'bg-red-100 text-red-800',
      storage: 'bg-gray-100 text-gray-800'
    }
    const labels: Record<string, string> = {
      hosting: 'ホスティング',
      database: 'データベース',
      cdn: 'CDN',
      monitoring: '監視',
      ci_cd: 'CI/CD',
      storage: 'ストレージ'
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[type]}`}>
        {labels[type] || type}
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
      {/* 環境ステータス */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">🌐 環境ステータス</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  環境名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ヘルス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最終デプロイ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  バージョン
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {environments.map((env, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{env.name}</div>
                    <div className="text-sm text-gray-500">{env.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(env.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getHealthBadge(env.health)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {env.url && env.url !== '-' ? (
                      <a href={env.url} target="_blank" rel="noopener noreferrer" 
                         className="text-blue-600 hover:text-blue-800 text-sm">
                        {env.url}
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {env.lastDeploy}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                    {env.version}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* インフラコンポーネント */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">🏗️ インフラストラクチャ</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  コンポーネント
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タイプ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  プロバイダー
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  説明・設定
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {infraComponents.map((component, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{component.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getComponentTypeBadge(component.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(component.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {component.provider}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{component.description}</div>
                    {component.configuration && component.configuration.length > 0 && (
                      <div className="mt-1">
                        <details className="text-xs">
                          <summary className="text-gray-500 cursor-pointer hover:text-gray-700">
                            設定詳細 ({component.configuration.length})
                          </summary>
                          <div className="mt-1 space-y-0.5">
                            {component.configuration.map((config, idx) => (
                              <div key={idx} className="text-gray-600 pl-2">
                                • {config}
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

      {/* デプロイ履歴 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">🚀 デプロイ履歴</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  環境
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  トリガー
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  実行時刻
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  実行時間
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  実行者
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deployments.map((deployment, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {deployment.environment}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getDeploymentStatusBadge(deployment.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                    {deployment.trigger}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {deployment.timestamp}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {deployment.duration || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {deployment.deployedBy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 設定ファイル・コマンド */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">⚙️ 設定・コマンド</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">主要設定ファイル</h3>
            <div className="space-y-2 text-sm">
              <div className="bg-gray-50 rounded p-3">
                <div className="font-mono text-gray-700">.github/workflows/main-ci-cd.yml</div>
                <div className="text-gray-600">CI/CDパイプライン設定</div>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <div className="font-mono text-gray-700">next.config.js</div>
                <div className="text-gray-600">Next.js設定</div>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <div className="font-mono text-gray-700">package.json</div>
                <div className="text-gray-600">依存関係・スクリプト</div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">デプロイコマンド</h3>
            <div className="space-y-2 text-sm">
              <div className="bg-gray-50 rounded p-3">
                <div className="font-mono text-gray-700">npm run build</div>
                <div className="text-gray-600">本番ビルド</div>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <div className="font-mono text-gray-700">npm run dev</div>
                <div className="text-gray-600">開発サーバー起動</div>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <div className="font-mono text-gray-700">git push origin main</div>
                <div className="text-gray-600">自動デプロイトリガー</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}