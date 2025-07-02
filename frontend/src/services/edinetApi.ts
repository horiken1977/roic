/**
 * EDINET API クライアント
 * 金融庁EDINET APIから企業の財務データを取得
 */

export interface EDINETCompany {
  edinetCode: string;
  companyName: string;
  tickerSymbol?: string;
  industry?: string;
  listingDate?: string;
}

export interface EDINETDocument {
  docId: string;
  edinetCode: string;
  documentType: string;
  fiscalYear: number;
  periodEnd: string;
  submittedDate: string;
  title: string;
}

export interface FinancialDataFromEDINET {
  // 損益計算書項目
  operatingIncome: number;
  interestIncome: number;
  netSales: number;
  grossProfit: number;
  sellingAdminExpenses: number;
  
  // 貸借対照表項目
  totalAssets: number;
  cashAndEquivalents: number;
  shareholdersEquity: number;
  interestBearingDebt: number;
  accountsPayable: number;
  accruedExpenses: number;
  
  // IFRS16対応項目
  leaseExpense?: number;
  leaseDebt?: number;
  
  // メタデータ
  fiscalYear: number;
  taxRate: number; // 推定実効税率
  companyName: string;
  edinetCode: string;
}

export interface EDINETApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * ハイブリッドEDINET API クライアント
 * 
 * 1. GitHub Actions静的データ（優先）
 * 2. バックエンドサーバー経由API
 * 3. サンプルデータ（フォールバック）
 */

import { staticDataService } from './staticDataService';

class EDINETApiClient {
  private backendBaseUrl: string;
  private vercelApiUrl: string;
  private fallbackToSample: boolean;

  constructor() {
    // バックエンドサーバーのURL
    this.backendBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    // Vercel Functions URL
    this.vercelApiUrl = process.env.NEXT_PUBLIC_VERCEL_API_URL || 'https://roic-api.vercel.app/api';
    // GitHub Pagesなどの静的サイトではサンプルデータを使用
    this.fallbackToSample = process.env.NEXT_PUBLIC_STATIC_DEPLOY === 'true';
  }

  /**
   * バックエンドサーバーが利用可能かチェック
   */
  private async isBackendAvailable(): Promise<boolean> {
    try {
      // GitHub Pagesや静的デプロイ環境では常にfalse
      if (this.fallbackToSample) {
        return false;
      }

      // GitHub Pages環境の判定
      if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
        console.log('GitHub Pages環境のためバックエンドAPI無効');
        return false;
      }

      // localhostでの開発環境のみバックエンドAPIを試行
      if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        console.log('非localhost環境のためバックエンドAPI無効');
        return false;
      }

      // バックエンドサーバーの状態確認
      const response = await fetch(`${this.backendBaseUrl}/edinet/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.success && result.data.apiConfigured;
    } catch {
      return false;
    }
  }

  /**
   * 企業検索（実際のEDINET APIまたはサンプルデータ）
   */
  async searchCompanies(query: string): Promise<EDINETApiResponse<EDINETCompany[]>> {
    try {
      // 1. GitHub Actions静的データを最優先で確認（キャッシュされた企業のみ）
      const staticDataAvailable = await staticDataService.isDataAvailable();
      
      if (staticDataAvailable) {
        console.log('GitHub Actions静的データを確認');
        const result = await staticDataService.searchCompanies(query);
        
        if (result.success && result.data && result.data.length > 0) {
          console.log('静的データで見つかりました');
          return {
            success: true,
            data: result.data,
            message: result.message
          };
        }
      }

      // 2. Vercel Functions（リアルタイムEDINET API）でリアルタイム検索
      console.log('Vercel Functions経由でリアルタイム検索');
      try {
        const response = await fetch(`${this.vercelApiUrl}/edinet/companies?q=${encodeURIComponent(query)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('Vercel Functions成功:', result.source);
          return result;
        }
      } catch (vercelError) {
        console.warn('Vercel Functions エラー:', vercelError);
      }

      // 3. バックエンドサーバーの利用可能性をチェック（localhost開発環境）
      const backendAvailable = await this.isBackendAvailable();
      
      if (backendAvailable) {
        console.log('バックエンドサーバー経由でEDINET APIにアクセス');
        const response = await fetch(`${this.backendBaseUrl}/edinet/companies?q=${encodeURIComponent(query)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`バックエンドAPI呼び出しエラー: ${response.status}`);
        }
        
        const result = await response.json();
        return result;
      } else {
        // 4. エラー: 利用可能なデータソースなし
        return {
          success: false,
          error: 'NO_DATA_SOURCE_AVAILABLE',
          message: 'EDINET APIへの接続ができません。ネットワーク接続を確認するか、管理者にお問い合わせください。'
        };
      }
    } catch (error) {
      console.error('企業検索エラー:', error);
      
      // エラーの場合もエラーレスポンスを返す
      return {
        success: false,
        error: 'SEARCH_ERROR',
        message: `企業検索中にエラーが発生しました: ${error.message}`
      };
    }
  }

  // サンプルデータは廃止 - 実データのみ使用

  /**
   * 企業の書類一覧取得（デモ用）
   */
  async getDocuments(edinetCode: string, years: number[]): Promise<EDINETApiResponse<EDINETDocument[]>> {
    try {
      await this.delay(1000);

      const documents: EDINETDocument[] = years.map(year => ({
        docId: `S100${edinetCode.slice(-3)}${year}`,
        edinetCode,
        documentType: '有価証券報告書',
        fiscalYear: year,
        periodEnd: `${year}-03-31`,
        submittedDate: `${year}-06-30`,
        title: `有価証券報告書（第${year - 1990}期）`
      }));

      return {
        success: true,
        data: documents,
        message: `${documents.length}件の書類が見つかりました`
      };
    } catch (error) {
      return {
        success: false,
        error: '書類取得エラー',
        message: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }

  /**
   * 財務データ取得（実際のEDINET APIまたはサンプルデータ）
   */
  async getFinancialData(edinetCode: string, fiscalYear: number): Promise<EDINETApiResponse<FinancialDataFromEDINET>> {
    try {
      // 1. GitHub Actions静的データを最優先で確認
      const staticDataAvailable = await staticDataService.isDataAvailable();
      
      if (staticDataAvailable) {
        console.log('GitHub Actions静的データを使用');
        const result = await staticDataService.getCompanyFinancialData(edinetCode, fiscalYear);
        
        if (result.success && result.data) {
          return {
            success: true,
            data: result.data,
            message: result.message
          };
        }
      }

      // 2. Vercel Functions（リアルタイムEDINET API）でリアルタイム取得
      console.log('Vercel Functions経由でリアルタイム財務データ取得');
      try {
        const response = await fetch(`${this.vercelApiUrl}/edinet/financial?edinetCode=${encodeURIComponent(edinetCode)}&fiscalYear=${fiscalYear}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('Vercel Functions財務データ成功:', result.source);
          return result;
        }
      } catch (vercelError) {
        console.warn('Vercel Functions財務データエラー:', vercelError);
      }

      // 3. バックエンドサーバーの利用可能性をチェック
      const backendAvailable = await this.isBackendAvailable();
      
      if (backendAvailable) {
        // バックエンドサーバー経由でEDINET APIにアクセス
        console.log('バックエンドサーバー経由でEDINET APIにアクセス');
        const response = await fetch(
          `${this.backendBaseUrl}/edinet/financial?edinetCode=${encodeURIComponent(edinetCode)}&fiscalYear=${fiscalYear}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (!response.ok) {
          throw new Error(`財務データAPI呼び出しエラー: ${response.status}`);
        }
        
        const result = await response.json();
        return result;
      } else {
        // 4. エラー: 利用可能なデータソースなし
        return {
          success: false,
          error: 'NO_DATA_SOURCE_AVAILABLE',
          message: 'EDINET APIへの接続ができません。ネットワーク接続を確認するか、管理者にお問い合わせください。'
        };
      }
    } catch (error) {
      console.error('財務データ取得エラー:', error);
      
      // エラーの場合もエラーレスポンスを返す
      return {
        success: false,
        error: 'FINANCIAL_DATA_ERROR',
        message: `財務データ取得中にエラーが発生しました: ${error.message}`
      };
    }
  }

  // サンプルデータは廃止 - 実データのみ使用

  /**
   * 複数年度の財務データを一括取得
   */
  async getMultipleYearFinancialData(
    edinetCode: string, 
    years: number[],
    onProgress?: (current: number, total: number, year: number) => void
  ): Promise<EDINETApiResponse<FinancialDataFromEDINET[]>> {
    try {
      // 1. GitHub Actions静的データを最優先で確認
      const staticDataAvailable = await staticDataService.isDataAvailable();
      
      if (staticDataAvailable) {
        console.log('GitHub Actions静的データを使用');
        const result = await staticDataService.getMultipleYearFinancialData(edinetCode, years);
        
        if (result.success && result.data) {
          // プログレス更新をシミュレート
          if (onProgress) {
            onProgress(years.length, years.length, years[years.length - 1]);
          }
          
          return {
            success: true,
            data: result.data,
            message: result.message
          };
        }
      }

      // 2. Vercel Functions（リアルタイムEDINET API）で複数年データ取得
      console.log('Vercel Functions経由で複数年度データ取得');
      try {
        const results: FinancialDataFromEDINET[] = [];
        
        for (let i = 0; i < years.length; i++) {
          const year = years[i];
          onProgress?.(i + 1, years.length, year);
          
          const response = await fetch(`${this.vercelApiUrl}/edinet/financial?edinetCode=${encodeURIComponent(edinetCode)}&fiscalYear=${year}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              results.push(result.data);
            }
          }
        }
        
        if (results.length > 0) {
          return {
            success: true,
            data: results,
            message: `${results.length}年分の財務データを取得しました（Vercel Functions）`
          };
        }
      } catch (vercelError) {
        console.warn('Vercel Functions複数年度データエラー:', vercelError);
      }

      // 3. バックエンドサーバーの利用可能性をチェック
      const backendAvailable = await this.isBackendAvailable();
      
      if (backendAvailable) {
        // バックエンドサーバー経由で一括取得（効率的）
        console.log('バックエンドサーバー経由でEDINET APIにアクセス');
        const response = await fetch(`${this.backendBaseUrl}/edinet/financial/multi-year`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            edinetCode,
            years
          }),
        });
        
        if (!response.ok) {
          throw new Error(`複数年度データAPI呼び出しエラー: ${response.status}`);
        }
        
        const result = await response.json();
        
        // プログレス更新をシミュレート
        if (onProgress) {
          onProgress(years.length, years.length, years[years.length - 1]);
        }
        
        return result;
      } else {
        // 4. エラー: 利用可能なデータソースなし
        return {
          success: false,
          error: 'NO_DATA_SOURCE_AVAILABLE',
          message: 'EDINET APIへの接続ができません。ネットワーク接続を確認するか、管理者にお問い合わせください。'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'MULTI_YEAR_DATA_ERROR',
        message: `複数年度データ取得中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// シングルトンインスタンス
export const edinetApiClient = new EDINETApiClient();

/**
 * EDINET財務データをROIC計算用のFinancialDataに変換
 */
export function convertEDINETDataToFinancialData(edinetData: FinancialDataFromEDINET) {
  return {
    // 損益計算書項目
    operatingIncome: edinetData.operatingIncome,
    interestIncome: edinetData.interestIncome,
    taxRate: edinetData.taxRate,
    
    // 貸借対照表項目
    totalAssets: edinetData.totalAssets,
    cashAndEquivalents: edinetData.cashAndEquivalents,
    shareholdersEquity: edinetData.shareholdersEquity,
    interestBearingDebt: edinetData.interestBearingDebt,
    accountsPayable: edinetData.accountsPayable,
    accruedExpenses: edinetData.accruedExpenses,
    
    // IFRS16対応項目
    leaseExpense: edinetData.leaseExpense,
    leaseDebt: edinetData.leaseDebt
  };
}