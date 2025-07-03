/**
 * ブラウザコンソールログ自動取得ユーティリティ
 * F12開発者ツールのログを自動でキャプチャし、ダウンロード可能にする
 */

interface LogEntry {
  timestamp: string;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  args: unknown[];
  stack?: string;
}

class LogCapture {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // 最大ログ保存数
  private isCapturing = false;
  private originalConsole: {
    log: typeof console.log;
    info: typeof console.info;
    warn: typeof console.warn;
    error: typeof console.error;
    debug: typeof console.debug;
  };

  constructor() {
    // オリジナルのconsoleメソッドを保存
    this.originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };
  }

  /**
   * ログキャプチャを開始
   */
  startCapture(): void {
    if (this.isCapturing) return;
    
    this.isCapturing = true;
    this.logs = [];
    
    // consoleメソッドをオーバーライド
    console.log = this.createLogInterceptor('log');
    console.info = this.createLogInterceptor('info');
    console.warn = this.createLogInterceptor('warn');
    console.error = this.createLogInterceptor('error');
    console.debug = this.createLogInterceptor('debug');

    // window.onerrorとunhandledrejectionもキャプチャ
    window.addEventListener('error', this.handleWindowError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);

    console.info('🎯 ログキャプチャ開始 - F12ログが自動取得されます');
  }

  /**
   * ログキャプチャを停止
   */
  stopCapture(): void {
    if (!this.isCapturing) return;

    // オリジナルのconsoleメソッドを復元
    console.log = this.originalConsole.log;
    console.info = this.originalConsole.info;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.debug = this.originalConsole.debug;

    // イベントリスナーを削除
    window.removeEventListener('error', this.handleWindowError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);

    this.isCapturing = false;
    console.info('⏹️ ログキャプチャ停止');
  }

  /**
   * ログインターセプターを作成
   */
  private createLogInterceptor(level: LogEntry['level']) {
    return (...args: unknown[]) => {
      // オリジナルのconsoleメソッドを実行
      this.originalConsole[level](...args);

      // ログエントリを記録
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '),
        args,
        stack: level === 'error' ? new Error().stack : undefined
      };

      this.addLogEntry(entry);
    };
  }

  /**
   * window.errorハンドラ
   */
  private handleWindowError = (event: ErrorEvent) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: `❌ Window Error: ${event.message}`,
      args: [event],
      stack: event.error?.stack
    };
    this.addLogEntry(entry);
  };

  /**
   * unhandledrejectionハンドラ
   */
  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: `🚫 Unhandled Promise Rejection: ${event.reason}`,
      args: [event.reason],
      stack: event.reason?.stack
    };
    this.addLogEntry(entry);
  };

  /**
   * ログエントリを追加
   */
  private addLogEntry(entry: LogEntry): void {
    this.logs.push(entry);
    
    // 最大ログ数を超えた場合、古いログを削除
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * 現在のログを取得
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * ログをクリア
   */
  clearLogs(): void {
    this.logs = [];
    console.info('🗑️ ログをクリアしました');
  }

  /**
   * ログをテキスト形式でエクスポート
   */
  exportLogsAsText(): string {
    const header = `=== ブラウザログ出力 ===
取得時刻: ${new Date().toLocaleString('ja-JP')}
ログ件数: ${this.logs.length}件
URL: ${window.location.href}
UserAgent: ${navigator.userAgent}

`;

    const logText = this.logs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleTimeString('ja-JP');
      const level = log.level.toUpperCase().padEnd(5);
      let output = `[${timestamp}] ${level} ${log.message}`;
      
      if (log.stack && log.level === 'error') {
        output += `\nStack Trace:\n${log.stack}`;
      }
      
      return output;
    }).join('\n\n');

    return header + logText;
  }

  /**
   * ログをJSON形式でエクスポート
   */
  exportLogsAsJSON(): string {
    const exportData = {
      metadata: {
        exportTime: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        logCount: this.logs.length
      },
      logs: this.logs
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * ログをファイルとしてダウンロード
   */
  downloadLogs(format: 'txt' | 'json' = 'txt'): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `browser-logs-${timestamp}.${format}`;
    
    const content = format === 'json' 
      ? this.exportLogsAsJSON()
      : this.exportLogsAsText();
    
    const blob = new Blob([content], { 
      type: format === 'json' ? 'application/json' : 'text/plain' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.info(`📥 ログを ${filename} としてダウンロードしました`);
  }

  /**
   * ログ統計を取得
   */
  getLogStats(): {
    total: number;
    byLevel: Record<LogEntry['level'], number>;
    timeRange: { start: string; end: string } | null;
  } {
    const byLevel: Record<LogEntry['level'], number> = {
      log: 0,
      info: 0,
      warn: 0,
      error: 0,
      debug: 0
    };

    this.logs.forEach(log => {
      byLevel[log.level]++;
    });

    const timeRange = this.logs.length > 0 ? {
      start: this.logs[0].timestamp,
      end: this.logs[this.logs.length - 1].timestamp
    } : null;

    return {
      total: this.logs.length,
      byLevel,
      timeRange
    };
  }
}

// シングルトンインスタンス
export const logCapture = new LogCapture();

// グローバルアクセス用
declare global {
  interface Window {
    logCapture: typeof logCapture;
  }
}

// windowオブジェクトに追加（開発者ツールからアクセス可能）
if (typeof window !== 'undefined') {
  window.logCapture = logCapture;
}