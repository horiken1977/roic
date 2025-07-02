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
  private fallbackToSample: boolean;

  constructor() {
    // バックエンドサーバーのURL
    this.backendBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    // GitHub Pagesなどの静的サイトではサンプルデータを使用
    this.fallbackToSample = process.env.NEXT_PUBLIC_STATIC_DEPLOY === 'true';
  }

  /**
   * バックエンドサーバーが利用可能かチェック
   */
  private async isBackendAvailable(): Promise<boolean> {
    try {
      // GitHub Pagesなどの静的デプロイ環境では常にfalse
      if (this.fallbackToSample) {
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
      // 1. GitHub Actions静的データを最優先で確認
      const staticDataAvailable = await staticDataService.isDataAvailable();
      
      if (staticDataAvailable) {
        console.log('GitHub Actions静的データを使用');
        const result = await staticDataService.searchCompanies(query);
        
        if (result.success && result.data) {
          return {
            success: true,
            data: result.data,
            message: result.message
          };
        }
      }

      // 2. バックエンドサーバーの利用可能性をチェック
      const backendAvailable = await this.isBackendAvailable();
      
      if (backendAvailable) {
        // バックエンドサーバー経由でEDINET APIにアクセス
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
        // 3. フォールバック: サンプルデータを使用
        console.log('フォールバック - サンプルデータを使用');
        return this.getSampleCompanies(query);
      }
    } catch (error) {
      console.error('企業検索エラー:', error);
      
      // エラーの場合はサンプルデータを返す
      return this.getSampleCompanies(query);
    }
  }

  /**
   * サンプル企業データを返す（フォールバック用）
   */
  private async getSampleCompanies(query: string): Promise<EDINETApiResponse<EDINETCompany[]>> {
    await this.delay(800); // API呼び出しをシミュレート

    const sampleCompanies: EDINETCompany[] = [
      {
        edinetCode: 'E02144',
        companyName: 'トヨタ自動車株式会社',
        tickerSymbol: '7203',
        industry: '輸送用機器',
        listingDate: '1949-05-16'
      },
      {
        edinetCode: 'E02513',
        companyName: 'ソニーグループ株式会社',
        tickerSymbol: '6758',
        industry: '電気機器',
        listingDate: '1958-12-01'
      },
      {
        edinetCode: 'E03568',
        companyName: '三菱UFJフィナンシャル・グループ',
        tickerSymbol: '8306',
        industry: '銀行業',
        listingDate: '2001-10-01'
      },
      {
        edinetCode: 'E03562',
        companyName: '株式会社ファーストリテイリング',
        tickerSymbol: '9983',
        industry: '小売業',
        listingDate: '1994-07-14'
      },
      {
        edinetCode: 'E02282',
        companyName: '株式会社キーエンス',
        tickerSymbol: '6861',
        industry: '電気機器',
        listingDate: '1995-10-26'
      },
      {
        edinetCode: 'E00990',
        companyName: 'ソフトバンクグループ株式会社',
        tickerSymbol: '9984',
        industry: '情報・通信業',
        listingDate: '1994-07-22'
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
      message: `${filtered.length}件の企業が見つかりました（サンプルデータ）`
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

      // 2. バックエンドサーバーの利用可能性をチェック
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
        // 3. フォールバック: サンプルデータを使用
        console.log('フォールバック - サンプルデータを使用');
        return this.getSampleFinancialData(edinetCode, fiscalYear);
      }
    } catch (error) {
      console.error('財務データ取得エラー:', error);
      
      // エラーの場合はサンプルデータを返す
      return this.getSampleFinancialData(edinetCode, fiscalYear);
    }
  }

  /**
   * サンプル財務データを返す（フォールバック用）
   */
  private async getSampleFinancialData(edinetCode: string, fiscalYear: number): Promise<EDINETApiResponse<FinancialDataFromEDINET>> {
    await this.delay(1500); // XBRL解析をシミュレート

    // 企業別のベースデータ（実際のおおよその値を参考）
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
      'E02513': { // ソニーグループ
        companyName: 'ソニーグループ株式会社',
        netSales: 12974000000000,
        grossProfit: 4200000000000,
        operatingIncome: 1308000000000,
        interestIncome: 45000000000,
        sellingAdminExpenses: 2892000000000,
        totalAssets: 24166000000000,
        cashAndEquivalents: 1820000000000,
        shareholdersEquity: 6835000000000,
        interestBearingDebt: 3244000000000,
        accountsPayable: 1400000000000,
        accruedExpenses: 800000000000,
        leaseExpense: 120000000000,
        leaseDebt: 950000000000,
        taxRate: 0.27
      },
      'E03568': { // 三菱UFJ
        companyName: '三菱UFJフィナンシャル・グループ',
        netSales: 5645000000000, // 銀行業では経常収益
        grossProfit: 3200000000000,
        operatingIncome: 1245000000000,
        interestIncome: 1850000000000,
        sellingAdminExpenses: 1955000000000,
        totalAssets: 362436000000000,
        cashAndEquivalents: 48200000000000,
        shareholdersEquity: 15485000000000,
        interestBearingDebt: 12800000000000, // 銀行業では預金等
        accountsPayable: 5600000000000,
        accruedExpenses: 2400000000000,
        leaseExpense: 85000000000,
        leaseDebt: 740000000000,
        taxRate: 0.25
      },
      'E03562': { // ファーストリテイリング
        companyName: '株式会社ファーストリテイリング',
        netSales: 2757000000000,
        grossProfit: 1388000000000,
        operatingIncome: 465000000000,
        interestIncome: 12000000000,
        sellingAdminExpenses: 923000000000,
        totalAssets: 1849000000000,
        cashAndEquivalents: 689000000000,
        shareholdersEquity: 1063000000000,
        interestBearingDebt: 245000000000,
        accountsPayable: 280000000000,
        accruedExpenses: 150000000000,
        leaseExpense: 240000000000,
        leaseDebt: 2100000000000,
        taxRate: 0.31
      },
      'E02282': { // キーエンス
        companyName: '株式会社キーエンス',
        netSales: 845000000000,
        grossProfit: 695000000000,
        operatingIncome: 402000000000,
        interestIncome: 8000000000,
        sellingAdminExpenses: 293000000000,
        totalAssets: 1205000000000,
        cashAndEquivalents: 512000000000,
        shareholdersEquity: 935000000000,
        interestBearingDebt: 45000000000,
        accountsPayable: 85000000000,
        accruedExpenses: 45000000000,
        leaseExpense: 25000000000,
        leaseDebt: 220000000000,
        taxRate: 0.30
      }
    };

    const baseData = companyBaseData[edinetCode];
    if (!baseData) {
      throw new Error('企業データが見つかりません');
    }

    // 年度による変動を加える（±10%程度のランダム変動）
    const yearVariation = 1 + (Math.random() - 0.5) * 0.2;
    const growthFactor = Math.pow(1.03, fiscalYear - 2022); // 年3%成長を仮定

    const financialData: FinancialDataFromEDINET = {
      ...baseData,
      fiscalYear,
      edinetCode,
      companyName: baseData.companyName || '',
      netSales: Math.round((baseData.netSales || 0) * yearVariation * growthFactor),
      grossProfit: Math.round((baseData.grossProfit || 0) * yearVariation * growthFactor),
      operatingIncome: Math.round((baseData.operatingIncome || 0) * yearVariation * growthFactor),
      interestIncome: Math.round((baseData.interestIncome || 0) * yearVariation),
      sellingAdminExpenses: Math.round((baseData.sellingAdminExpenses || 0) * yearVariation * growthFactor),
      totalAssets: Math.round((baseData.totalAssets || 0) * yearVariation * growthFactor),
      cashAndEquivalents: Math.round((baseData.cashAndEquivalents || 0) * yearVariation),
      shareholdersEquity: Math.round((baseData.shareholdersEquity || 0) * yearVariation * growthFactor),
      interestBearingDebt: Math.round((baseData.interestBearingDebt || 0) * yearVariation),
      accountsPayable: Math.round((baseData.accountsPayable || 0) * yearVariation * growthFactor),
      accruedExpenses: Math.round((baseData.accruedExpenses || 0) * yearVariation * growthFactor),
      leaseExpense: Math.round((baseData.leaseExpense || 0) * yearVariation),
      leaseDebt: Math.round((baseData.leaseDebt || 0) * yearVariation),
      taxRate: baseData.taxRate || 0.30
    } as FinancialDataFromEDINET;

    return {
      success: true,
      data: financialData,
      message: `${fiscalYear}年度の財務データを取得しました`
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

      // 2. バックエンドサーバーの利用可能性をチェック
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
        // 3. フォールバック: サンプルデータを使用
        console.log('フォールバック - サンプルデータを使用');
        
        const results: FinancialDataFromEDINET[] = [];
        
        for (let i = 0; i < years.length; i++) {
          const year = years[i];
          onProgress?.(i + 1, years.length, year);
          
          const response = await this.getSampleFinancialData(edinetCode, year);
          if (response.success && response.data) {
            results.push(response.data);
          } else {
            console.warn(`${year}年度のサンプルデータ取得に失敗:`, response.error);
          }
        }

        return {
          success: true,
          data: results,
          message: `${results.length}年分の財務データを取得しました（サンプルデータ）`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: '複数年度データ取得エラー',
        message: error instanceof Error ? error.message : '不明なエラー'
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