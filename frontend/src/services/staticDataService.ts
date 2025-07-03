/**
 * 静的データサービス
 * GitHub Actionsで生成された静的データファイルを読み込み
 */

export interface StaticEDINETMetadata {
  lastUpdated: string;
  dataSource: string;
  companiesCount: number;
  yearsRange: number[];
  generatedBy: string;
}

export interface StaticCompanyData {
  metadata: StaticEDINETMetadata;
  companies: Array<{
    edinetCode: string;
    companyName: string;
    tickerSymbol?: string;
    industry?: string;
    latestDocumentDate?: string;
    hasRecentData: boolean;
  }>;
}

export interface StaticFinancialData {
  metadata: StaticEDINETMetadata;
  data: Record<string, Record<number, {
    fiscalYear: number;
    edinetCode: string;
    companyName: string;
    netSales: number;
    grossProfit: number;
    operatingIncome: number;
    interestIncome: number;
    sellingAdminExpenses: number;
    totalAssets: number;
    cashAndEquivalents: number;
    shareholdersEquity: number;
    interestBearingDebt: number;
    accountsPayable: number;
    accruedExpenses: number;
    leaseExpense?: number;
    leaseDebt?: number;
    taxRate: number;
    dataSource: string;
    lastUpdated: string;
  }>>;
}

export class StaticDataService {
  private baseUrl: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cache: Map<string, any> = new Map();

  constructor() {
    // 実行環境に応じてパスを設定
    if (typeof window !== 'undefined') {
      const isGitHubPages = window.location.hostname.includes('github.io');
      const isLocalhost = window.location.hostname === 'localhost';
      
      if (isGitHubPages) {
        this.baseUrl = '/roic/data/edinet';
      } else if (isLocalhost) {
        this.baseUrl = '/data/edinet';
      } else {
        // その他の環境（開発サーバーなど）
        this.baseUrl = '/data/edinet';
      }
    } else {
      // サーバーサイドレンダリング時
      this.baseUrl = '/data/edinet';
    }
    
    console.log('StaticDataService initialized with baseUrl:', this.baseUrl);
  }

  /**
   * データの利用可能性をチェック
   */
  async isDataAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/metadata.json`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * メタデータ取得
   */
  async getMetadata(): Promise<StaticEDINETMetadata | null> {
    try {
      if (this.cache.has('metadata')) {
        return this.cache.get('metadata');
      }

      const response = await fetch(`${this.baseUrl}/metadata.json`);
      if (!response.ok) {
        throw new Error(`メタデータ取得エラー: ${response.status}`);
      }

      const metadata: StaticEDINETMetadata = await response.json();
      this.cache.set('metadata', metadata);
      
      return metadata;
    } catch (error) {
      console.error('メタデータ取得エラー:', error);
      return null;
    }
  }

  /**
   * 企業一覧データ取得
   */
  async getCompanies(): Promise<StaticCompanyData | null> {
    try {
      if (this.cache.has('companies')) {
        return this.cache.get('companies');
      }

      const response = await fetch(`${this.baseUrl}/companies.json`);
      if (!response.ok) {
        throw new Error(`企業データ取得エラー: ${response.status}`);
      }

      const data: StaticCompanyData = await response.json();
      this.cache.set('companies', data);
      
      return data;
    } catch (error) {
      console.error('企業データ取得エラー:', error);
      return null;
    }
  }

  /**
   * 財務データ取得
   */
  async getFinancialData(): Promise<StaticFinancialData | null> {
    try {
      if (this.cache.has('financial')) {
        return this.cache.get('financial');
      }

      const response = await fetch(`${this.baseUrl}/financial-data.json`);
      if (!response.ok) {
        throw new Error(`財務データ取得エラー: ${response.status}`);
      }

      const data: StaticFinancialData = await response.json();
      this.cache.set('financial', data);
      
      return data;
    } catch (error) {
      console.error('財務データ取得エラー:', error);
      return null;
    }
  }

  /**
   * 企業検索（静的データから）
   */
  async searchCompanies(query: string): Promise<{
    success: boolean;
    data?: Array<{
      edinetCode: string;
      companyName: string;
      tickerSymbol?: string;
      industry?: string;
      hasRecentData: boolean;
    }>;
    source?: string;
    message?: string;
    error?: string;
  }> {
    try {
      const companiesData = await this.getCompanies();
      
      if (!companiesData) {
        throw new Error('企業データが利用できません');
      }

      // クエリでフィルタリング
      const filtered = companiesData.companies.filter(company => 
        company.companyName.toLowerCase().includes(query.toLowerCase()) ||
        company.tickerSymbol?.includes(query) ||
        company.edinetCode.toLowerCase().includes(query.toLowerCase())
      );

      return {
        success: true,
        data: filtered,
        source: 'static_data_github_actions',
        message: `${filtered.length}件の企業が見つかりました（GitHub Actions取得データ）`
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '企業検索エラー',
        message: '静的データから企業検索に失敗しました'
      };
    }
  }

  /**
   * 特定企業の財務データ取得
   */
  async getCompanyFinancialData(edinetCode: string, fiscalYear: number): Promise<{
    success: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
    source?: string;
    message?: string;
    error?: string;
  }> {
    try {
      const financialData = await this.getFinancialData();
      
      if (!financialData) {
        throw new Error('財務データが利用できません');
      }

      const companyData = financialData.data[edinetCode];
      if (!companyData) {
        throw new Error(`企業コード ${edinetCode} のデータが見つかりません`);
      }

      const yearData = companyData[fiscalYear];
      if (!yearData) {
        throw new Error(`${fiscalYear}年度のデータが見つかりません`);
      }

      return {
        success: true,
        data: yearData,
        source: 'static_data_github_actions',
        message: `${fiscalYear}年度の財務データを取得しました（GitHub Actions取得データ）`
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '財務データ取得エラー',
        message: '静的データから財務データ取得に失敗しました'
      };
    }
  }

  /**
   * 複数年度財務データ取得
   */
  async getMultipleYearFinancialData(
    edinetCode: string, 
    years: number[]
  ): Promise<{
    success: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any[];
    source?: string;
    message?: string;
    error?: string;
  }> {
    try {
      const financialData = await this.getFinancialData();
      
      if (!financialData) {
        throw new Error('財務データが利用できません');
      }

      const companyData = financialData.data[edinetCode];
      if (!companyData) {
        throw new Error(`企業コード ${edinetCode} のデータが見つかりません`);
      }

      const results = years
        .filter(year => companyData[year])
        .map(year => companyData[year]);

      return {
        success: true,
        data: results,
        source: 'static_data_github_actions',
        message: `${results.length}年分の財務データを取得しました（GitHub Actions取得データ）`
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '複数年度データ取得エラー',
        message: '静的データから複数年度データ取得に失敗しました'
      };
    }
  }

  /**
   * データ更新時刻取得
   */
  async getLastUpdated(): Promise<string | null> {
    const metadata = await this.getMetadata();
    return metadata?.lastUpdated || null;
  }

  /**
   * キャッシュクリア
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// シングルトンインスタンス
export const staticDataService = new StaticDataService();