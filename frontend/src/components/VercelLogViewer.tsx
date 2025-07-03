'use client'

import React, { useState, useEffect } from 'react'
import { vercelLogsApiClient, VercelLogEntry } from '@/services/vercelLogsApi'

/**
 * Vercelログビューアー
 * サーバーサイドログの表示・ダウンロード機能
 */
export default function VercelLogViewer() {
  const [logs, setLogs] = useState<VercelLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)

  // ログ自動更新
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchRecentLogs();
      }, 10000); // 10秒間隔で更新
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchRecentLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await vercelLogsApiClient.getRecentLogs(200);
      
      if (response.success && response.data) {
        setLogs(response.data.logs);
        setLastFetch(new Date());
        console.log(`📊 Vercelログ取得完了: ${response.data.logs.length}件`);
      } else {
        setError(response.message || 'ログの取得に失敗しました');
      }
    } catch (err) {
      console.error('Vercelログ取得エラー:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTxt = () => {
    if (logs.length > 0) {
      vercelLogsApiClient.downloadLogs(logs, 'txt');
    }
  };

  const handleDownloadJson = () => {
    if (logs.length > 0) {
      vercelLogsApiClient.downloadLogs(logs, 'json');
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return 'text-red-600';
      case 'warn': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getLogLevelBg = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return 'bg-red-50';
      case 'warn': return 'bg-yellow-50';
      case 'info': return 'bg-blue-50';
      default: return 'bg-gray-50';
    }
  };

  // ログレベル別の統計
  const logStats = logs.reduce((acc, log) => {
    acc[log.level] = (acc[log.level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-lg">
      {/* ヘッダー */}
      <div 
        className="flex items-center justify-between p-3 bg-gray-50 rounded-t-lg cursor-pointer hover:bg-gray-100"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🖥️</span>
          <h3 className="font-semibold text-gray-800">Vercelサーバーログ</h3>
          {logs.length > 0 && (
            <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
              {logs.length}件
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {loading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
          <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4">
          {/* コントロール */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={fetchRecentLogs}
              disabled={loading}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? '取得中...' : '📡 最新ログ取得'}
            </button>
            
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1 text-sm rounded ${
                autoRefresh 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {autoRefresh ? '🔄 自動更新ON' : '⏸️ 自動更新OFF'}
            </button>

            {logs.length > 0 && (
              <>
                <button
                  onClick={handleDownloadTxt}
                  className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                >
                  📄 TXT
                </button>
                <button
                  onClick={handleDownloadJson}
                  className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                >
                  📋 JSON
                </button>
              </>
            )}
          </div>

          {/* 統計情報 */}
          {Object.keys(logStats).length > 0 && (
            <div className="bg-gray-50 rounded p-3 mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">📊 ログ統計</div>
              <div className="flex flex-wrap gap-3 text-xs">
                {Object.entries(logStats).map(([level, count]) => (
                  <span key={level} className={`${getLogLevelColor(level)} font-medium`}>
                    {level.toUpperCase()}: {count}件
                  </span>
                ))}
                {lastFetch && (
                  <span className="text-gray-500">
                    最終取得: {lastFetch.toLocaleTimeString('ja-JP')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
              <div className="text-red-800 text-sm">
                ❌ {error}
              </div>
            </div>
          )}

          {/* ログ一覧 */}
          {logs.length > 0 ? (
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded">
              {logs.slice(0, 50).map((log, index) => (
                <div 
                  key={`${log.id}-${index}`}
                  className={`p-2 border-b border-gray-100 text-xs font-mono ${getLogLevelBg(log.level)}`}
                >
                  <div className="flex gap-2 items-start">
                    <span className="text-gray-500 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString('ja-JP')}
                    </span>
                    <span className={`shrink-0 font-bold ${getLogLevelColor(log.level)}`}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="break-all">
                      {log.message}
                    </span>
                  </div>
                </div>
              ))}
              {logs.length > 50 && (
                <div className="p-2 text-center text-gray-500 text-xs bg-gray-50">
                  ... 他 {logs.length - 50} 件のログ（ダウンロードで全件確認可能）
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              📭 ログがありません。「最新ログ取得」ボタンを押してください。
            </div>
          )}

          {/* 使用方法 */}
          <details className="mt-4">
            <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
              📖 使用方法
            </summary>
            <div className="mt-2 text-xs text-gray-600 space-y-1 bg-gray-50 p-2 rounded">
              <div>• 「📡 最新ログ取得」: 過去1時間のサーバーログを取得</div>
              <div>• 「🔄 自動更新ON」: 10秒間隔でログを自動更新</div>
              <div>• 「📄 TXT」: ログをテキスト形式でダウンロード</div>
              <div>• 「📋 JSON」: ログを構造化JSON形式でダウンロード</div>
              <div>• エラーログ（赤）、警告ログ（黄）、情報ログ（青）で色分け表示</div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}