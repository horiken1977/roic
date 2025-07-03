'use client'

import { useEffect } from 'react'
import { logCapture } from '@/utils/logCapture'

/**
 * ログキャプチャ用キーボードショートカット
 */
export function useLogCaptureShortcuts() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+L: ログキャプチャ開始/停止
      if (event.ctrlKey && event.shiftKey && event.key === 'L') {
        event.preventDefault()
        const stats = logCapture.getLogStats()
        
        if (stats.total === 0) {
          logCapture.startCapture()
          console.info('🎯 ログキャプチャ開始 (Ctrl+Shift+L)')
        } else {
          logCapture.stopCapture()
          console.info('⏹️ ログキャプチャ停止 (Ctrl+Shift+L)')
        }
      }
      
      // Ctrl+Shift+D: ログダウンロード
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault()
        const stats = logCapture.getLogStats()
        
        if (stats.total > 0) {
          logCapture.downloadLogs('txt')
          console.info('📥 ログダウンロード (Ctrl+Shift+D)')
        } else {
          console.warn('⚠️ ダウンロードするログがありません')
        }
      }
      
      // Ctrl+Shift+C: ログクリア
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault()
        logCapture.clearLogs()
        console.info('🗑️ ログクリア (Ctrl+Shift+C)')
      }
      
      // F12: 開発者ツールのF12キーを検知してメッセージ表示
      if (event.key === 'F12') {
        setTimeout(() => {
          console.info(`
🎯 ログキャプチャ機能が利用可能です！

【キーボードショートカット】
  Ctrl+Shift+L : ログキャプチャ開始/停止
  Ctrl+Shift+D : ログダウンロード (TXT形式)
  Ctrl+Shift+C : ログクリア

【コンソールコマンド】
  window.logCapture.startCapture()     - キャプチャ開始
  window.logCapture.stopCapture()      - キャプチャ停止
  window.logCapture.downloadLogs()     - TXTダウンロード
  window.logCapture.downloadLogs('json') - JSONダウンロード
  window.logCapture.getLogStats()      - ログ統計表示
  window.logCapture.clearLogs()        - ログクリア

【便利な使い方】
  1. Ctrl+Shift+L でキャプチャ開始
  2. アプリを操作してエラーや動作を確認
  3. Ctrl+Shift+D でログをダウンロード
  4. ログファイルをサポートチームに共有
        `)
        }, 100)
      }
    }

    // ショートカット情報を初回表示
    console.info(`
💡 ログキャプチャショートカット:
  Ctrl+Shift+L : キャプチャ開始/停止
  Ctrl+Shift+D : ログダウンロード
  Ctrl+Shift+C : ログクリア
  F12          : 詳細ヘルプ表示
    `)

    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
}