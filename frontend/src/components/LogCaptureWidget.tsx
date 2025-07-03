'use client'

import React, { useState, useEffect } from 'react'
import { logCapture } from '@/utils/logCapture'
import { useLogCaptureShortcuts } from '@/hooks/useLogCaptureShortcuts'
import VercelLogViewer from './VercelLogViewer'

/**
 * ログキャプチャウィジェット
 * F12ログの自動取得・ダウンロード機能を提供
 */
export default function LogCaptureWidget() {
  useLogCaptureShortcuts() // キーボードショートカットを有効化
  const [isCapturing, setIsCapturing] = useState(false)
  const [logCount, setLogCount] = useState(0)
  const [stats, setStats] = useState<{
    total: number
    byLevel: Record<string, number>
    timeRange: { start: string; end: string } | null
  } | null>(null)

  useEffect(() => {
    // 定期的にログ統計を更新
    const interval = setInterval(() => {
      const currentStats = logCapture.getLogStats()
      setStats(currentStats)
      setLogCount(currentStats.total)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleStartCapture = () => {
    logCapture.startCapture()
    setIsCapturing(true)
  }

  const handleStopCapture = () => {
    logCapture.stopCapture()
    setIsCapturing(false)
  }

  const handleDownloadTxt = () => {
    logCapture.downloadLogs('txt')
  }

  const handleDownloadJson = () => {
    logCapture.downloadLogs('json')
  }

  const handleClearLogs = () => {
    logCapture.clearLogs()
    setLogCount(0)
    setStats(null)
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ja-JP')
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm space-y-4">
      {/* Vercelログビューアー */}
      <VercelLogViewer />
      
      {/* ブラウザログキャプチャ */}
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎯</span>
        <h3 className="font-semibold text-gray-800">ログキャプチャ</h3>
        <div className={`w-2 h-2 rounded-full ${
          isCapturing ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
        }`} />
      </div>

      {/* 統計情報 */}
      {stats && (
        <div className="bg-gray-50 rounded p-2 mb-3 text-xs">
          <div className="grid grid-cols-2 gap-1">
            <div>📊 総数: {stats.total}</div>
            <div>❌ エラー: {stats.byLevel.error}</div>
            <div>⚠️ 警告: {stats.byLevel.warn}</div>
            <div>ℹ️ 情報: {stats.byLevel.info + stats.byLevel.log}</div>
          </div>
          {stats.timeRange && (
            <div className="mt-1 text-gray-600">
              {formatTime(stats.timeRange.start)} ～ {formatTime(stats.timeRange.end)}
            </div>
          )}
        </div>
      )}

      {/* コントロールボタン */}
      <div className="space-y-2">
        {!isCapturing ? (
          <button
            onClick={handleStartCapture}
            className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
          >
            🎯 キャプチャ開始
          </button>
        ) : (
          <button
            onClick={handleStopCapture}
            className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
          >
            ⏹️ キャプチャ停止
          </button>
        )}

        {logCount > 0 && (
          <>
            <div className="flex gap-1">
              <button
                onClick={handleDownloadTxt}
                className="flex-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              >
                📄 TXT
              </button>
              <button
                onClick={handleDownloadJson}
                className="flex-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              >
                📋 JSON
              </button>
            </div>
            <button
              onClick={handleClearLogs}
              className="w-full px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
            >
              🗑️ クリア
            </button>
          </>
        )}
      </div>

      {/* ショートカット情報 */}
      <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-800">
        <div className="font-medium mb-1">⌨️ ショートカット</div>
        <div className="space-y-1">
          <div><kbd className="bg-white px-1 rounded">Ctrl+Shift+L</kbd> 開始/停止</div>
          <div><kbd className="bg-white px-1 rounded">Ctrl+Shift+D</kbd> ダウンロード</div>
          <div><kbd className="bg-white px-1 rounded">F12</kbd> 詳細ヘルプ</div>
        </div>
      </div>

      {/* 使用方法 */}
      <details className="mt-2">
        <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
          📖 使用方法
        </summary>
        <div className="mt-1 text-xs text-gray-600 space-y-1">
          <div>1. 「キャプチャ開始」をクリック</div>
          <div>2. アプリを操作してログを収集</div>
          <div>3. 「TXT」または「JSON」でダウンロード</div>
          <div>4. F12コンソールから直接操作も可能</div>
        </div>
      </details>
      </div>
    </div>
  )
}