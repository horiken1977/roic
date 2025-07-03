/**
 * Vercelログ取得API クライアント
 */

export interface VercelLogEntry {
  id: string;
  timestamp: number;
  type: string;
  payload: unknown;
  level: string;
  message: string;
  source: string;
  deploymentId: string;
}

export interface VercelLogsResponse {
  success: boolean;
  data?: {
    deploymentId: string;
    logs: VercelLogEntry[];
    totalCount: number;
    query: {
      since?: string;
      until?: string;
      limit: number;
    };
  };
  source: string;
  message: string;
  error?: string;
}

class VercelLogsApiClient {
  private baseUrl = '/api/vercel';

  /**
   * Vercelログを取得
   */
  async getLogs(options: {
    deploymentId?: string;
    since?: string;
    until?: string;
    limit?: number;
  } = {}): Promise<VercelLogsResponse> {
    try {
      const params = new URLSearchParams();
      
      if (options.deploymentId) params.append('deploymentId', options.deploymentId);
      if (options.since) params.append('since', options.since);
      if (options.until) params.append('until', options.until);
      if (options.limit) params.append('limit', options.limit.toString());

      const url = `${this.baseUrl}/logs?${params.toString()}`;
      console.log('Vercelログ取得API呼び出し:', url);

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${data.message || 'Unknown error'}`);
      }

      return data;
    } catch (error) {
      console.error('Vercelログ取得エラー:', error);
      return {
        success: false,
        source: 'vercel_logs_api_client',
        message: `ログ取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 最近のログを取得（過去1時間）
   */
  async getRecentLogs(limit = 100): Promise<VercelLogsResponse> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    return this.getLogs({
      since: oneHourAgo,
      limit
    });
  }

  /**
   * 指定期間のログを取得
   */
  async getLogsByTimeRange(
    startTime: Date, 
    endTime: Date, 
    limit = 500
  ): Promise<VercelLogsResponse> {
    return this.getLogs({
      since: startTime.toISOString(),
      until: endTime.toISOString(),
      limit
    });
  }

  /**
   * 特定デプロイメントのログを取得
   */
  async getDeploymentLogs(
    deploymentId: string, 
    limit = 200
  ): Promise<VercelLogsResponse> {
    return this.getLogs({
      deploymentId,
      limit
    });
  }

  /**
   * ログをテキスト形式でフォーマット
   */
  formatLogsAsText(logs: VercelLogEntry[]): string {
    const header = `=== Vercelサーバーログ ===
取得時刻: ${new Date().toLocaleString('ja-JP')}
ログ件数: ${logs.length}件

`;

    const logText = logs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleString('ja-JP');
      const level = log.level.toUpperCase().padEnd(7);
      return `[${timestamp}] ${level} ${log.message}`;
    }).join('\n');

    return header + logText;
  }

  /**
   * ログをファイルとしてダウンロード
   */
  downloadLogs(logs: VercelLogEntry[], format: 'txt' | 'json' = 'txt'): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `vercel-logs-${timestamp}.${format}`;
    
    const content = format === 'json' 
      ? JSON.stringify({ 
          metadata: {
            exportTime: new Date().toISOString(),
            logCount: logs.length
          },
          logs 
        }, null, 2)
      : this.formatLogsAsText(logs);
    
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

    console.log(`📥 Vercelログを ${filename} としてダウンロードしました`);
  }
}

export const vercelLogsApiClient = new VercelLogsApiClient();