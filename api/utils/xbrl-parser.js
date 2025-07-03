/**
 * Vercel Functions対応 XBRL Parser
 * 軽量版 - 必要最小限のXBRL解析機能
 */

const https = require('https');

class SimpleXbrlParser {
  constructor() {
    // ROIC計算に必要な主要財務項目のマッピング
    this.financialMappings = {
      // 損益計算書
      netSales: [
        'NetSales', 'Sales', 'Revenue', 'OperatingRevenue',
        'jppfs_cor:NetSales', 'jppfs_cor:OperatingRevenue'
      ],
      operatingIncome: [
        'OperatingIncome', 'OperatingProfit', 
        'jppfs_cor:OperatingIncome', 'jppfs_cor:OperatingProfit'
      ],
      ordinaryIncome: [
        'OrdinaryIncome', 'IncomeBeforeIncomeTaxes',
        'jppfs_cor:OrdinaryIncome', 'jppfs_cor:IncomeBeforeIncomeTaxes'
      ],
      interestIncome: [
        'InterestIncome', 'jppfs_cor:InterestIncome'
      ],
      
      // 貸借対照表
      totalAssets: [
        'Assets', 'TotalAssets', 'AssetsTotal',
        'jppfs_cor:Assets', 'jppfs_cor:TotalAssets'
      ],
      cashAndEquivalents: [
        'CashAndCashEquivalents', 'CashAndDeposits',
        'jppfs_cor:CashAndCashEquivalents', 'jppfs_cor:CashAndDeposits'
      ],
      shareholdersEquity: [
        'NetAssets', 'TotalNetAssets', 'ShareholdersEquity',
        'jppfs_cor:NetAssets', 'jppfs_cor:TotalNetAssets'
      ],
      interestBearingDebt: [
        'InterestBearingDebt', 'BorrowingsAndBonds',
        'jppfs_cor:InterestBearingDebt', 'jppfs_cor:BorrowingsAndBonds'
      ],
      accountsPayable: [
        'TradeAndOtherPayables', 'AccountsPayable',
        'jppfs_cor:TradeAndOtherPayables', 'jppfs_cor:AccountsPayable'
      ],
      accruedExpenses: [
        'AccruedExpenses', 'OtherCurrentLiabilities',
        'jppfs_cor:AccruedExpenses', 'jppfs_cor:OtherCurrentLiabilities'
      ]
    };
  }

  /**
   * EDINET APIからXBRLドキュメントを取得してパース
   */
  async fetchAndParseXbrl(docId, apiKey) {
    try {
      console.log(`XBRLドキュメント取得開始: ${docId}`);

      // XBRLファイルを取得
      const xbrlData = await this.fetchXbrlDocument(docId, apiKey);
      
      if (!xbrlData) {
        throw new Error('XBRLデータの取得に失敗しました');
      }

      // 財務データを抽出
      const financialData = await this.parseXbrlData(xbrlData);
      
      console.log(`XBRLパース完了: ${Object.keys(financialData).length}項目抽出`);
      return financialData;

    } catch (error) {
      console.error('XBRL取得・パースエラー:', error);
      throw error;
    }
  }

  /**
   * EDINET APIからXBRLドキュメントを取得
   */
  async fetchXbrlDocument(docId, apiKey) {
    return new Promise((resolve, reject) => {
      const url = `https://disclosure.edinet-fsa.go.jp/api/v2/documents/${docId}?type=1&Subscription-Key=${apiKey}`;
      
      console.log(`XBRL取得: ${url.replace(apiKey, '***')}`);

      const req = https.get(url, {
        headers: {
          'User-Agent': 'ROIC-Analysis-App/1.0',
          'Accept': 'application/zip, application/xml, text/xml'
        },
        timeout: 30000
      }, (res) => {
        let data = Buffer.alloc(0);
        
        res.on('data', (chunk) => {
          data = Buffer.concat([data, chunk]);
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
              return;
            }

            // Content-Typeでデータ形式を判定
            const contentType = res.headers['content-type'] || '';
            
            if (contentType.includes('application/zip')) {
              // ZIPファイルの場合（実際の実装では展開が必要）
              console.warn('ZIP形式は現在未対応です。XML形式を要求してください。');
              resolve(null);
            } else if (contentType.includes('xml')) {
              // XMLの場合
              const xmlString = data.toString('utf8');
              resolve(xmlString);
            } else {
              // その他の形式
              const textData = data.toString('utf8');
              resolve(textData);
            }
          } catch (parseError) {
            reject(new Error(`レスポンス処理エラー: ${parseError.message}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(new Error(`XBRL取得エラー: ${error.message}`));
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('XBRL取得がタイムアウトしました'));
      });
    });
  }

  /**
   * XBRLデータをパースして財務データを抽出
   */
  async parseXbrlData(xbrlString) {
    try {
      // 簡易XMLパース（正規表現ベース）
      const financialData = {
        fiscalYear: this.extractFiscalYear(xbrlString),
        companyName: this.extractCompanyName(xbrlString),
        
        // 損益計算書項目
        netSales: this.extractFinancialValue(xbrlString, 'netSales'),
        operatingIncome: this.extractFinancialValue(xbrlString, 'operatingIncome'),
        ordinaryIncome: this.extractFinancialValue(xbrlString, 'ordinaryIncome'),
        interestIncome: this.extractFinancialValue(xbrlString, 'interestIncome'),
        grossProfit: null,
        sellingAdminExpenses: null,
        
        // 貸借対照表項目
        totalAssets: this.extractFinancialValue(xbrlString, 'totalAssets'),
        cashAndEquivalents: this.extractFinancialValue(xbrlString, 'cashAndEquivalents'),
        shareholdersEquity: this.extractFinancialValue(xbrlString, 'shareholdersEquity'),
        interestBearingDebt: this.extractFinancialValue(xbrlString, 'interestBearingDebt'),
        accountsPayable: this.extractFinancialValue(xbrlString, 'accountsPayable'),
        accruedExpenses: this.extractFinancialValue(xbrlString, 'accruedExpenses'),
        
        // 計算項目
        leaseExpense: null,
        leaseDebt: null,
        taxRate: 0.30 // デフォルト実効税率
      };

      // 計算値を補完
      this.calculateDerivedValues(financialData);
      
      return financialData;

    } catch (error) {
      console.error('XBRLパースエラー:', error);
      throw new Error(`XBRLパースに失敗しました: ${error.message}`);
    }
  }

  /**
   * 財務項目の値を抽出
   */
  extractFinancialValue(xbrlString, itemKey) {
    try {
      const mappings = this.financialMappings[itemKey];
      if (!mappings) return null;

      for (const tag of mappings) {
        // 各タグパターンを試行
        const patterns = [
          // 単純なタグ
          new RegExp(`<${tag}[^>]*>([\\d,\\-\\.]+)</`, 'gi'),
          // 名前空間付きタグ
          new RegExp(`<[^:]+:${tag}[^>]*>([\\d,\\-\\.]+)</`, 'gi'),
          // contextRef付きタグ
          new RegExp(`<${tag}[^>]*contextRef="[^"]*"[^>]*>([\\d,\\-\\.]+)</`, 'gi')
        ];

        for (const pattern of patterns) {
          const matches = Array.from(xbrlString.matchAll(pattern));
          if (matches.length > 0) {
            // 最大値を取得（通常は最新の値）
            const values = matches.map(m => this.parseNumber(m[1])).filter(v => v !== null);
            if (values.length > 0) {
              const maxValue = Math.max(...values.map(Math.abs));
              return values.find(v => Math.abs(v) === maxValue);
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.warn(`値抽出エラー (${itemKey}):`, error.message);
      return null;
    }
  }

  /**
   * 決算年度を抽出
   */
  extractFiscalYear(xbrlString) {
    try {
      // 決算年度のパターンを検索
      const patterns = [
        /FiscalYear[^>]*>(\d{4})</gi,
        /Period[^>]*>.*?(\d{4})-\d{2}-\d{2}/gi,
        /<.*?year[^>]*>(\d{4})</gi
      ];

      for (const pattern of patterns) {
        const match = xbrlString.match(pattern);
        if (match) {
          const year = parseInt(match[1]);
          if (year > 2000 && year <= new Date().getFullYear() + 1) {
            return year;
          }
        }
      }

      // フォールバック：現在年度
      return new Date().getFullYear();
    } catch (error) {
      return new Date().getFullYear();
    }
  }

  /**
   * 企業名を抽出
   */
  extractCompanyName(xbrlString) {
    try {
      const patterns = [
        /<.*?CompanyName[^>]*>([^<]+)</gi,
        /<.*?FilerName[^>]*>([^<]+)</gi,
        /<.*?EntityName[^>]*>([^<]+)</gi
      ];

      for (const pattern of patterns) {
        const match = xbrlString.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }

      return '企業名未取得';
    } catch (error) {
      return '企業名未取得';
    }
  }

  /**
   * 数値を解析
   */
  parseNumber(value) {
    if (!value) return null;
    
    // カンマと空白を除去
    const cleanValue = value.toString().replace(/[,\s]/g, '');
    const number = parseFloat(cleanValue);
    
    return isNaN(number) ? null : number;
  }

  /**
   * 派生値を計算
   */
  calculateDerivedValues(data) {
    // 売上総利益の推定（売上高の20%と仮定）
    if (data.netSales && !data.grossProfit) {
      data.grossProfit = Math.round(data.netSales * 0.20);
    }

    // 販管費の推定（売上高の10%と仮定）
    if (data.netSales && !data.sellingAdminExpenses) {
      data.sellingAdminExpenses = Math.round(data.netSales * 0.10);
    }

    // リース項目の推定
    if (data.totalAssets && !data.leaseDebt) {
      data.leaseDebt = Math.round(data.totalAssets * 0.03); // 総資産の3%
    }

    if (data.netSales && !data.leaseExpense) {
      data.leaseExpense = Math.round(data.netSales * 0.006); // 売上高の0.6%
    }

    return data;
  }
}

module.exports = SimpleXbrlParser;