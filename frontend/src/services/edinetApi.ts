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
  lastDocument?: {
    docId: string;
    docTypeCode: string;
    periodEnd: string;
    submitDateTime: string;
  };
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
    // Vercel Functions URL（複数候補）
    this.vercelApiUrl = process.env.NEXT_PUBLIC_VERCEL_API_URL || 'https://roic-horikens-projects.vercel.app/api';
    // GitHub Pagesなどの静的サイトではサンプルデータを使用
    this.fallbackToSample = process.env.NEXT_PUBLIC_STATIC_DEPLOY === 'true';
  }

  /**
   * 複数のAPI URLを試行
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async tryMultipleApiUrls(path: string, query: string): Promise<any> {
    const apiUrls = [
      'https://roic-horikens-projects.vercel.app/api'
    ];

    for (const baseUrl of apiUrls) {
      try {
        console.log(`API試行: ${baseUrl}${path}`);
        const response = await fetch(`${baseUrl}${path}?q=${encodeURIComponent(query)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`API成功: ${baseUrl} - ${result.source}`);
          return result;
        } else {
          console.warn(`API HTTPエラー ${baseUrl}: ${response.status}`);
        }
      } catch (error) {
        console.warn(`API接続エラー ${baseUrl}:`, error.message);
      }
    }
    
    return null;
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
      // 1. 複数のAPI URLを試行（リアルタイムEDINET API）
      console.log('複数API経由でリアルタイム検索（最優先）');
      const apiResult = await this.tryMultipleApiUrls('/edinet/companies', query);
      
      if (apiResult) {
        return apiResult;
      } else {
        // すべてのAPIが失敗した場合のエラーメッセージ
        console.error('すべてのAPIエンドポイントが利用できません');
      }

      // 2. GitHub Actions静的データ（Vercel Functionsが失敗した場合のフォールバック）
      const staticDataAvailable = await staticDataService.isDataAvailable();
      
      if (staticDataAvailable) {
        console.log('GitHub Actions静的データを確認');
        const result = await staticDataService.searchCompanies(query);
        
        if (result.success && result.data && result.data.length > 0) {
          console.log('静的データで見つかりました');
          return {
            success: true,
            data: result.data,
            message: `${result.message}（Vercel APIエラーのため静的データ使用）`
          };
        }
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
        // 4. エラー: 全てのAPIデータソースが利用不可
        return {
          success: false,
          error: 'ALL_DATA_SOURCES_UNAVAILABLE',
          message: 'すべてのデータソース（Vercel Functions、GitHub Actions、バックエンドAPI）が利用できません。ネットワーク接続またはAPI設定を確認してください。'
        };
      }
    } catch (error) {
      console.error('企業検索エラー:', error);
      
      // catchブロックでもエラーレスポンスを返す
      return {
        success: false,
        error: 'SEARCH_SYSTEM_ERROR',
        message: `検索システムエラー: ${error.message}`
      };
    }
  }

  /**
   * 最小限のサンプル企業データ（デバッグ・テスト用）
   */
  private async getMinimalSampleCompanies(query: string): Promise<EDINETApiResponse<EDINETCompany[]>> {
    await this.delay(500); // API呼び出しをシミュレート

    const sampleCompanies: EDINETCompany[] = [
      {
        edinetCode: 'E02144',
        companyName: 'トヨタ自動車株式会社',
        tickerSymbol: '7203',
        industry: '輸送用機器'
      },
      {
        edinetCode: 'E02150',
        companyName: '日産自動車株式会社',
        tickerSymbol: '7201',
        industry: '輸送用機器'
      },
      {
        edinetCode: 'E04430',
        companyName: '野村ホールディングス株式会社',
        tickerSymbol: '8604',
        industry: '証券業'
      }
    ];

    // クエリでフィルタリング
    const filtered = sampleCompanies.filter(company => 
      company.companyName.toLowerCase().includes(query.toLowerCase()) ||
      company.tickerSymbol?.includes(query) ||
      company.edinetCode.includes(query)
    );

    return {
      success: true,
      data: filtered,
      message: `${filtered.length}件の企業が見つかりました（テストデータ）`
    };
  }

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
  async getFinancialData(edinetCode: string, fiscalYear: number, docId?: string): Promise<EDINETApiResponse<FinancialDataFromEDINET>> {
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
        // DocIDが利用可能な場合はそれを使用
        let apiUrl = `${this.vercelApiUrl}/edinet/financial?edinetCode=${encodeURIComponent(edinetCode)}&fiscalYear=${fiscalYear}`;
        
        // 特定のdocIDがある場合はパラメータに追加
        if (docId) {
          apiUrl += `&docId=${encodeURIComponent(docId)}`;
          console.log(`指定docIDを使用: ${docId}`);
        }
        
        const response = await fetch(apiUrl, {
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
        let backendUrl = `${this.backendBaseUrl}/edinet/financial?edinetCode=${encodeURIComponent(edinetCode)}&fiscalYear=${fiscalYear}`;
        if (docId) {
          backendUrl += `&docId=${encodeURIComponent(docId)}`;
        }
        const response = await fetch(backendUrl, {
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
        // 4. フォールバック: Vercel Functions の汎用システムから取得試行
        console.log('フォールバック - Vercel Functions汎用システムから直接取得');
        try {
          const response = await fetch(
            `https://roic-horikens-projects.vercel.app/api/edinet/financial?edinetCode=${edinetCode}&fiscalYear=${fiscalYear}${docId ? `&docId=${docId}` : ''}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
          
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              return result;
            }
          }
        } catch (fallbackError) {
          console.warn('Vercel Functions汎用システムエラー:', fallbackError);
        }
        
        // 最終フォールバック: 制限されたサンプルデータ
        console.log('最終フォールバック - 最小限のサンプル財務データを使用');
        return this.getMinimalSampleFinancialData(edinetCode, fiscalYear);
      }
    } catch (error) {
      console.error('財務データ取得エラー:', error);
      
      // エラーの場合は直接Vercel Functions汎用システムを試行
      try {
        console.log('エラー時フォールバック - Vercel Functions汎用システム試行');
        const response = await fetch(
          `https://roic-horikens-projects.vercel.app/api/edinet/financial?edinetCode=${edinetCode}&fiscalYear=${fiscalYear}${docId ? `&docId=${docId}` : ''}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            return result;
          }
        }
      } catch (fallbackError) {
        console.warn('エラー時Vercel Functions汎用システムエラー:', fallbackError);
      }
      
      // 最終フォールバック
      return this.getMinimalSampleFinancialData(edinetCode, fiscalYear);
    }
  }

  /**
   * 最小限のサンプル財務データ（デバッグ・テスト用）
   */
  private async getMinimalSampleFinancialData(edinetCode: string, fiscalYear: number): Promise<EDINETApiResponse<FinancialDataFromEDINET>> {
    await this.delay(800); // XBRL解析をシミュレート

    // 企業別のベースデータ（最小限）
    const companyBaseData: Record<string, Partial<FinancialDataFromEDINET>> = {
      'E02144': { // トヨタ自動車
        companyName: 'トヨタ自動車株式会社',
        netSales: 31379500000000,
        grossProfit: 5980000000000,
        operatingIncome: 2725000000000,
        interestIncome: 95000000000,
        sellingAdminExpenses: 3255000000000,
        totalAssets: 53713000000000,
        cashAndEquivalents: 4885000000000,
        shareholdersEquity: 23913000000000,
        interestBearingDebt: 8826000000000,
        accountsPayable: 2800000000000,
        accruedExpenses: 1200000000000,
        leaseExpense: 180000000000,
        leaseDebt: 1600000000000,
        taxRate: 0.28
      },
      'E02150': { // 日産自動車
        companyName: '日産自動車株式会社',
        netSales: 10600000000000,
        grossProfit: 2120000000000,
        operatingIncome: 250000000000,
        interestIncome: 53000000000,
        sellingAdminExpenses: 1870000000000,
        totalAssets: 14800000000000,
        cashAndEquivalents: 1200000000000,
        shareholdersEquity: 4200000000000,
        interestBearingDebt: 3200000000000,
        accountsPayable: 800000000000,
        accruedExpenses: 600000000000,
        leaseExpense: 120000000000,
        leaseDebt: 900000000000,
        taxRate: 0.30
      },
      'E04430': { // 野村ホールディングス
        companyName: '野村ホールディングス株式会社',
        netSales: 1854000000000,
        grossProfit: 1200000000000,
        operatingIncome: 156000000000,
        interestIncome: 280000000000,
        sellingAdminExpenses: 1044000000000,
        totalAssets: 49120000000000,
        cashAndEquivalents: 2400000000000,
        shareholdersEquity: 3890000000000,
        interestBearingDebt: 1200000000000,
        accountsPayable: 800000000000,
        accruedExpenses: 400000000000,
        leaseExpense: 45000000000,
        leaseDebt: 320000000000,
        taxRate: 0.30
      }
    };

    const baseData = companyBaseData[edinetCode];
    if (!baseData) {
      // 特定企業データがない場合は汎用的な推定データを生成
      console.log(`${edinetCode}: 直接データなし - 汎用推定データ生成`);
      
      // 企業規模を推定（EDINETコードから）
      const estimateCompanyScale = (code: string) => {
        const codeNum = parseInt(code.replace('E', ''));
        if (codeNum < 5000) return 'large';      // 大企業
        if (codeNum < 15000) return 'medium';    // 中堅企業
        return 'small';                          // 中小企業
      };

      const scale = estimateCompanyScale(edinetCode);
      const seed = edinetCode.charCodeAt(edinetCode.length - 1);
      const randomFactor = 0.8 + (seed % 40) / 100; // 0.8-1.2の範囲

      // 規模別の基準値設定
      const baseValues = {
        large: {
          netSales: 1000000000000,    // 1兆円
          operatingIncome: 80000000000, // 800億円
          totalAssets: 1500000000000,   // 1.5兆円
          cashAndEquivalents: 200000000000, // 2000億円
          shareholdersEquity: 600000000000, // 6000億円
          interestBearingDebt: 300000000000 // 3000億円
        },
        medium: {
          netSales: 200000000000,     // 2000億円
          operatingIncome: 15000000000, // 150億円
          totalAssets: 300000000000,    // 3000億円
          cashAndEquivalents: 40000000000, // 400億円
          shareholdersEquity: 120000000000, // 1200億円
          interestBearingDebt: 60000000000  // 600億円
        },
        small: {
          netSales: 50000000000,      // 500億円
          operatingIncome: 3000000000,  // 30億円
          totalAssets: 80000000000,     // 800億円
          cashAndEquivalents: 10000000000, // 100億円
          shareholdersEquity: 30000000000,  // 300億円
          interestBearingDebt: 15000000000  // 150億円
        }
      };

      const base = baseValues[scale];
      
      const estimatedData = {
        companyName: `企業 ${edinetCode}`,
        netSales: Math.floor(base.netSales * randomFactor),
        operatingIncome: Math.floor(base.operatingIncome * randomFactor),
        grossProfit: Math.floor(base.netSales * randomFactor * 0.25),
        sellingAdminExpenses: Math.floor(base.operatingIncome * randomFactor * 2.5),
        interestIncome: Math.floor(base.operatingIncome * randomFactor * 0.05),
        totalAssets: Math.floor(base.totalAssets * randomFactor),
        cashAndEquivalents: Math.floor(base.cashAndEquivalents * randomFactor),
        shareholdersEquity: Math.floor(base.shareholdersEquity * randomFactor),
        interestBearingDebt: Math.floor(base.interestBearingDebt * randomFactor),
        accountsPayable: Math.floor(base.netSales * randomFactor * 0.08),
        accruedExpenses: Math.floor(base.netSales * randomFactor * 0.05),
        leaseExpense: Math.floor(base.operatingIncome * randomFactor * 0.15),
        leaseDebt: Math.floor(base.totalAssets * randomFactor * 0.03),
        taxRate: 0.30
      };

      console.log(`推定データ生成: ${scale}企業規模, 売上${(estimatedData.netSales / 1000000000000).toFixed(1)}兆円`);
      
      const financialData: FinancialDataFromEDINET = {
        ...estimatedData,
        fiscalYear,
        edinetCode,
        dataSource: `universal_estimation_${scale}`,
        lastUpdated: new Date().toISOString(),
        estimationNote: `${scale}企業規模に基づく推定データ`
      };

      return {
        success: true,
        data: financialData,
        source: `universal_estimation_${scale}`,
        message: `${fiscalYear}年度の財務データ（${scale}企業規模推定データ）`
      };
    }

    const financialData: FinancialDataFromEDINET = {
      ...baseData,
      fiscalYear,
      edinetCode,
      companyName: baseData.companyName || '',
      netSales: baseData.netSales || 0,
      grossProfit: baseData.grossProfit || 0,
      operatingIncome: baseData.operatingIncome || 0,
      interestIncome: baseData.interestIncome || 0,
      sellingAdminExpenses: baseData.sellingAdminExpenses || 0,
      totalAssets: baseData.totalAssets || 0,
      cashAndEquivalents: baseData.cashAndEquivalents || 0,
      shareholdersEquity: baseData.shareholdersEquity || 0,
      interestBearingDebt: baseData.interestBearingDebt || 0,
      accountsPayable: baseData.accountsPayable || 0,
      accruedExpenses: baseData.accruedExpenses || 0,
      leaseExpense: baseData.leaseExpense || 0,
      leaseDebt: baseData.leaseDebt || 0,
      taxRate: baseData.taxRate || 0.30
    } as FinancialDataFromEDINET;

    return {
      success: true,
      data: financialData,
      message: `${fiscalYear}年度の財務データを取得しました（テストデータ）`
    };
  }

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
        // 4. フォールバック: 最小限のサンプルデータ（デバッグ用）
        console.log('フォールバック - 複数年度サンプルデータを使用');
        
        const results: FinancialDataFromEDINET[] = [];
        
        for (let i = 0; i < years.length; i++) {
          const year = years[i];
          onProgress?.(i + 1, years.length, year);
          
          const response = await this.getMinimalSampleFinancialData(edinetCode, year);
          if (response.success && response.data) {
            results.push(response.data);
          } else {
            console.warn(`${year}年度のサンプルデータ取得に失敗:`, response.error);
          }
        }

        return {
          success: true,
          data: results,
          message: `${results.length}年分の財務データを取得しました（テストデータ）`
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
    // 損益計算書項目（必須項目）
    netSales: edinetData.netSales || 0, // 売上高
    operatingIncome: edinetData.operatingIncome || 0, // 営業利益
    grossProfit: edinetData.grossProfit || (edinetData.netSales * 0.2) || 0, // 売上総利益（推定20%）
    sellingAdminExpenses: edinetData.sellingAdminExpenses || (edinetData.netSales * 0.1) || 0, // 販管費（推定10%）
    interestIncome: edinetData.interestIncome || 0,
    taxRate: edinetData.taxRate || 0.30, // 実効税率
    
    // 貸借対照表項目（必須項目）
    totalAssets: edinetData.totalAssets || 0,
    cashAndEquivalents: edinetData.cashAndEquivalents || 0,
    shareholdersEquity: edinetData.shareholdersEquity || 0,
    interestBearingDebt: edinetData.interestBearingDebt || 0,
    accountsPayable: edinetData.accountsPayable || 0,
    accruedExpenses: edinetData.accruedExpenses || 0,
    
    // IFRS16対応項目
    leaseExpense: edinetData.leaseExpense || (edinetData.netSales * 0.006) || 0, // 推定0.6%
    leaseDebt: edinetData.leaseDebt || (edinetData.totalAssets * 0.03) || 0 // 推定3%
  };
}