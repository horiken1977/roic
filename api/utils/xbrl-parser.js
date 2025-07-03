/**
 * Vercel Functions対応 XBRL Parser
 * 軽量版 - 必要最小限のXBRL解析機能
 */

const https = require('https');

class SimpleXbrlParser {
  constructor() {
    // 実際のEDINET XBRLに基づいた詳細なマッピング
    this.financialMappings = {
      // 損益計算書項目
      netSales: [
        // EDINET標準タグ（完全名）
        'jpcrp_cor:NetSales', 'jppfs_cor:NetSales', 'jpcrp_cor:OperatingRevenues',
        'jpcrp_cor:SalesJPCRP', 'jppfs_cor:SalesJPPFS', 'jpcrp_cor:RevenuesJPCRP',
        'jpcei_cor:NetSales', 'jpdei_cor:NetSales', 'jp_cor:NetSales',
        // 日本語タグ
        '売上高', '営業収益', '純売上高', '売上収益', '総売上高',
        // 英語タグ
        'NetSales', 'Sales', 'Revenue', 'OperatingRevenue', 'OperatingRevenues',
        'SalesRevenue', 'TotalRevenue', 'GrossRevenue', 'NetSalesOfCompletedConstructionContracts',
        // 小文字・変形
        'netsales', 'sales', 'revenue', 'operatingrevenue',
        // 名前空間付きの様々なパターン
        'jpfr:NetSales', 'us:NetSales', 'ifrs:Revenue', 'gaap:Revenue'
      ],
      operatingIncome: [
        // EDINET標準タグ（完全名）
        'jpcrp_cor:OperatingIncome', 'jppfs_cor:OperatingIncome',
        'jpcrp_cor:OperatingProfitLoss', 'jppfs_cor:OperatingProfitLoss',
        'jpcrp_cor:OperatingIncomeJPCRP', 'jppfs_cor:OperatingIncomeJPPFS',
        'jpcei_cor:OperatingIncome', 'jpdei_cor:OperatingIncome',
        // 日本語タグ
        '営業利益', '営業損益', '事業利益', '営業収益',
        // 英語タグ
        'OperatingIncome', 'OperatingProfit', 'OperatingEarnings', 'OperatingProfitLoss',
        'EarningsFromOperations', 'IncomeFromOperations', 'OperatingGain',
        // 小文字・変形
        'operatingincome', 'operatingprofit', 'operatingearnings',
        // 名前空間付きの様々なパターン
        'jpfr:OperatingIncome', 'us:OperatingIncome', 'ifrs:OperatingIncome'
      ],
      ordinaryIncome: [
        'OrdinaryIncome', 'IncomeBeforeIncomeTaxes', 'ProfitBeforeTax',
        '経常利益', 'OrdinaryProfitLoss',
        'jpcrp_cor:OrdinaryIncome', 'jppfs_cor:OrdinaryIncome',
        'jpcrp_cor:OrdinaryProfitLoss', 'jppfs_cor:OrdinaryProfitLoss',
        'ordinaryincome', 'incomebeforeincometaxes'
      ],
      interestIncome: [
        'InterestIncome', 'InterestRevenue', 'InterestAndDividendIncome',
        '受取利息', 'InterestAndDividends',
        'jpcrp_cor:InterestIncome', 'jppfs_cor:InterestIncome',
        'interestincome', 'interestrevenue'
      ],
      
      // 貸借対照表項目
      totalAssets: [
        // EDINET標準タグ（完全名）
        'jpcrp_cor:Assets', 'jppfs_cor:Assets', 'jpcrp_cor:TotalAssets',
        'jppfs_cor:TotalAssets', 'jpcrp_cor:AssetsTotal', 'jppfs_cor:AssetsTotal',
        'jpcrp_cor:AssetsTotalJPCRP', 'jppfs_cor:AssetsTotalJPPFS',
        'jpcei_cor:Assets', 'jpdei_cor:Assets', 'jp_cor:Assets',
        // 日本語タグ
        '資産合計', '総資産', '資産の部合計', '資産総額', '全資産',
        // 英語タグ
        'Assets', 'TotalAssets', 'AssetsTotal', 'GrossAssets', 'AssetSum',
        'AssetsSum', 'TotalAssetAmount', 'AssetsTotalAmount',
        // 小文字・変形
        'assets', 'totalassets', 'assetstotal', 'assetsum',
        // 名前空間付きの様々なパターン
        'jpfr:Assets', 'us:Assets', 'ifrs:Assets', 'gaap:Assets'
      ],
      cashAndEquivalents: [
        'CashAndCashEquivalents', 'CashAndDeposits', 'Cash',
        '現金及び預金', '現金預金', 'CashOnHandAndInBanks',
        'jpcrp_cor:CashAndCashEquivalents', 'jppfs_cor:CashAndCashEquivalents',
        'jpcrp_cor:CashAndDeposits', 'jppfs_cor:CashAndDeposits',
        'cashandcashequivalents', 'cashanddeposits', 'cash'
      ],
      shareholdersEquity: [
        'NetAssets', 'TotalNetAssets', 'ShareholdersEquity', 'Equity',
        '純資産', '株主資本', 'NetAssetsTotal', 'TotalEquity',
        'jpcrp_cor:NetAssets', 'jppfs_cor:NetAssets', 
        'jpcrp_cor:TotalNetAssets', 'jppfs_cor:TotalNetAssets',
        'jpcrp_cor:ShareholdersEquity', 'jppfs_cor:ShareholdersEquity',
        'netassets', 'totalnetassets', 'shareholdersequity', 'equity'
      ],
      interestBearingDebt: [
        'InterestBearingDebt', 'BorrowingsAndBonds', 'Borrowings',
        '有利子負債', '借入金', 'DebtWithInterest',
        'jpcrp_cor:InterestBearingDebt', 'jppfs_cor:InterestBearingDebt',
        'jpcrp_cor:BorrowingsAndBonds', 'jppfs_cor:BorrowingsAndBonds',
        'interestbearingdebt', 'borrowingsandbonds', 'borrowings'
      ],
      accountsPayable: [
        'TradeAndOtherPayables', 'AccountsPayable', 'TradePayables',
        '買掛金', '仕入債務', 'AccountsPayableOther',
        'jpcrp_cor:TradeAndOtherPayables', 'jppfs_cor:TradeAndOtherPayables',
        'jpcrp_cor:AccountsPayable', 'jppfs_cor:AccountsPayable',
        'tradeandotherpayables', 'accountspayable', 'tradepayables'
      ],
      accruedExpenses: [
        'AccruedExpenses', 'OtherCurrentLiabilities', 'AccruedLiabilities',
        '未払費用', '未払金', 'AccruedExpensesOther',
        'jpcrp_cor:AccruedExpenses', 'jppfs_cor:AccruedExpenses',
        'jpcrp_cor:OtherCurrentLiabilities', 'jppfs_cor:OtherCurrentLiabilities',
        'accruedexpenses', 'othercurrentliabilities', 'accruedliabilities'
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
  /**
   * XML形式でXBRLを直接取得（ZIP展開のフォールバック）
   */
  async fetchXbrlAsXml(docId, apiKey) {
    return new Promise((resolve, reject) => {
      const url = `https://disclosure.edinet-fsa.go.jp/api/v2/documents/${docId}?type=5&Subscription-Key=${apiKey}`;
      
      console.log(`XBRL XML直接取得: ${url.replace(apiKey, '***')}`);

      const req = https.get(url, {
        headers: {
          'User-Agent': 'ROIC-Analysis-App/1.0',
          'Accept': 'application/xml, text/xml'
        },
        timeout: 30000
      }, (res) => {
        let data = Buffer.alloc(0);
        
        res.on('data', (chunk) => {
          data = Buffer.concat([data, chunk]);
        });
        
        res.on('end', () => {
          try {
            console.log(`XML直接取得完了: ${res.statusCode} ${res.statusMessage}`);
            console.log(`Content-Type: ${res.headers['content-type']}`);
            console.log(`データサイズ: ${data.length} bytes`);
            
            if (res.statusCode !== 200) {
              reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
              return;
            }

            const xmlString = data.toString('utf8');
            console.log('XMLデータ直接取得成功');
            console.log('XMLの最初の500文字:', xmlString.substring(0, 500));
            resolve(xmlString);
          } catch (parseError) {
            reject(new Error(`XML処理エラー: ${parseError.message}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(new Error(`XML取得エラー: ${error.message}`));
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('XML取得がタイムアウトしました'));
      });
    });
  }

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
            console.log(`XBRL取得完了: ${res.statusCode} ${res.statusMessage}`);
            console.log(`Content-Type: ${res.headers['content-type']}`);
            console.log(`データサイズ: ${data.length} bytes`);
            
            if (res.statusCode !== 200) {
              reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
              return;
            }

            // Content-Typeでデータ形式を判定
            const contentType = res.headers['content-type'] || '';
            
            if (contentType.includes('application/zip')) {
              // ZIPファイルの場合 - 実際のZIP展開を試行
              console.log('ZIP形式を検出しました。展開を試行します。');
              console.log('ZIPファイルサイズ:', data.length);
              
              try {
                // ZIPの最初の数バイトを確認してZIPファイルかチェック
                const zipHeader = data.subarray(0, 4);
                const isZip = zipHeader[0] === 0x50 && zipHeader[1] === 0x4B;
                
                if (isZip) {
                  console.log('有効なZIPファイルを確認しました');
                  // 現在はZIP展開ライブラリが未実装のため、type=1でXML直接要求に変更
                  console.log('ZIP展開ライブラリ未実装のため、XML直接要求にフォールバック');
                  resolve(this.fetchXbrlAsXml(docId, apiKey));
                } else {
                  console.log('ZIPヘッダーが無効です');
                  resolve(null);
                }
              } catch (zipError) {
                console.error('ZIP処理エラー:', zipError);
                resolve(null);
              }
            } else if (contentType.includes('xml')) {
              // XMLの場合
              const xmlString = data.toString('utf8');
              console.log('XML形式として処理します');
              console.log('XMLの最初の500文字:', xmlString.substring(0, 500));
              resolve(xmlString);
            } else {
              // その他の形式
              const textData = data.toString('utf8');
              console.log('テキスト形式として処理します');
              console.log('データの最初の500文字:', textData.substring(0, 500));
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
      console.log('=== XBRL解析開始 ===');
      console.log(`XBRLデータサイズ: ${xbrlString ? xbrlString.length : 0} 文字`);
      
      if (!xbrlString || xbrlString.length < 100) {
        console.warn('XBRLデータが空または小さすぎます');
        return null;
      }

      // XBRLの最初の1000文字をログ出力（デバッグ用）
      console.log('XBRLサンプル（最初の1000文字）:');
      console.log(xbrlString.substring(0, 1000));
      
      // タグの総数をカウント
      const tagCount = (xbrlString.match(/<[^>]+>/g) || []).length;
      console.log(`XMLタグ総数: ${tagCount}`);

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

      console.log('=== 抽出結果サマリー ===');
      Object.entries(financialData).forEach(([key, value]) => {
        if (typeof value === 'number') {
          console.log(`${key}: ${value}`);
        }
      });

      // 計算値を補完
      this.calculateDerivedValues(financialData);
      
      console.log('=== XBRL解析完了 ===');
      return financialData;

    } catch (error) {
      console.error('XBRLパースエラー:', error);
      throw new Error(`XBRLパースに失敗しました: ${error.message}`);
    }
  }

  /**
   * 財務項目の値を抽出（改善版）
   */
  extractFinancialValue(xbrlString, itemKey) {
    try {
      const mappings = this.financialMappings[itemKey];
      if (!mappings) return null;

      console.log(`財務項目抽出開始: ${itemKey}`);
      const foundValues = [];

      for (const tag of mappings) {
        // 1. 完全一致パターン（名前空間なし）
        const exactPatterns = [
          new RegExp(`<${this.escapeRegex(tag)}[^>]*>([\\d,\\-\\.\\s]+)</${this.escapeRegex(tag)}>`, 'gi'),
          new RegExp(`<${this.escapeRegex(tag)}[^>]*>([\\d,\\-\\.\\s]+)</`, 'gi'),
          // contextRef付きパターン
          new RegExp(`<${this.escapeRegex(tag)}[^>]*contextRef="[^"]*"[^>]*>([\\d,\\-\\.\\s]+)</${this.escapeRegex(tag)}>`, 'gi'),
          // unitRef付きパターン  
          new RegExp(`<${this.escapeRegex(tag)}[^>]*unitRef="[^"]*"[^>]*>([\\d,\\-\\.\\s]+)</${this.escapeRegex(tag)}>`, 'gi')
        ];

        // 2. 名前空間付きパターン（より具体的）
        const namespacePatterns = [
          new RegExp(`<[^:]*:${this.escapeRegex(tag)}[^>]*>([\\d,\\-\\.\\s]+)</[^:]*:${this.escapeRegex(tag)}>`, 'gi'),
          new RegExp(`<[^:]*:${this.escapeRegex(tag)}[^>]*contextRef="[^"]*"[^>]*>([\\d,\\-\\.\\s]+)</[^:]*:${this.escapeRegex(tag)}>`, 'gi'),
          // 名前空間が含まれているタグの場合はそのまま検索
          ...(tag.includes(':') ? [
            new RegExp(`<${this.escapeRegex(tag)}[^>]*>([\\d,\\-\\.\\s]+)</${this.escapeRegex(tag)}>`, 'gi'),
            new RegExp(`<${this.escapeRegex(tag)}[^>]*contextRef="[^"]*"[^>]*>([\\d,\\-\\.\\s]+)</${this.escapeRegex(tag)}>`, 'gi')
          ] : [])
        ];

        // 3. 部分一致パターン（タグ名の一部を含む）
        const partialPatterns = [
          new RegExp(`<[^>]*${this.escapeRegex(tag)}[^>]*>([\\d,\\-\\.\\s]+)</`, 'gi'),
          new RegExp(`<[^>]*${this.escapeRegex(tag.toLowerCase())}[^>]*>([\\d,\\-\\.\\s]+)</`, 'gi'),
          // 大文字小文字を区別しない検索
          new RegExp(`<[^>]*${this.escapeRegex(tag)}[^>]*>([\\d,\\-\\.\\s]+)</`, 'gmi'),
          // カスタム区切り文字対応
          new RegExp(`<[^>]*${this.escapeRegex(tag)}[^>]*>([\\d,\\-\\.\\s千万億兆]+)</`, 'gi')
        ];

        // 4. 日本語タグパターン
        if (tag.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/)) {
          const japanesePatterns = [
            new RegExp(`<[^>]*>${this.escapeRegex(tag)}</[^>]*>([\\d,\\-\\.\\s]+)</`, 'gi'),
            new RegExp(`title="${this.escapeRegex(tag)}"[^>]*>([\\d,\\-\\.\\s]+)</`, 'gi')
          ];
          partialPatterns.push(...japanesePatterns);
        }

        const allPatterns = [...exactPatterns, ...namespacePatterns, ...partialPatterns];

        for (const pattern of allPatterns) {
          const matches = Array.from(xbrlString.matchAll(pattern));
          
          for (const match of matches) {
            const value = this.parseNumber(match[1]);
            if (value !== null && Math.abs(value) > 0) {
              foundValues.push({
                tag: tag,
                value: value,
                context: match[0].substring(0, 100) + '...'
              });
              console.log(`  ✓ 見つかりました: ${tag} = ${value}`);
            }
          }
        }
      }

      if (foundValues.length > 0) {
        // 最大の絶対値を持つ値を採用（通常は連結ベース）
        const bestValue = foundValues.reduce((prev, curr) => 
          Math.abs(curr.value) > Math.abs(prev.value) ? curr : prev
        );
        
        console.log(`  → 採用値: ${bestValue.value} (from ${bestValue.tag})`);
        return bestValue.value;
      }

      console.log(`  ❌ 見つかりませんでした: ${itemKey}`);
      return null;

    } catch (error) {
      console.warn(`値抽出エラー (${itemKey}):`, error.message);
      return null;
    }
  }

  /**
   * 正規表現用エスケープ
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
   * 数値を解析（改善版）
   */
  parseNumber(value) {
    if (!value) return null;
    
    try {
      // 文字列に変換
      let strValue = value.toString().trim();
      
      // HTMLエンティティをデコード
      strValue = strValue.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      
      // 日本語の数値表記を処理
      strValue = strValue.replace(/円/g, '').replace(/千円/g, '000').replace(/百万円/g, '000000').replace(/十億円/g, '000000000');
      strValue = strValue.replace(/千/g, '000').replace(/万/g, '0000').replace(/億/g, '00000000').replace(/兆/g, '000000000000');
      
      // カンマ、空白、その他の非数値文字を除去
      strValue = strValue.replace(/[,\s　]/g, '');
      
      // 全角数字を半角に変換
      strValue = strValue.replace(/[０-９]/g, function(s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
      });
      
      // マイナス記号の正規化
      strValue = strValue.replace(/[−－‐]/g, '-');
      
      // 数値部分のみを抽出
      const numberMatch = strValue.match(/^[+-]?[\d\.]+/);
      if (!numberMatch) return null;
      
      const number = parseFloat(numberMatch[0]);
      
      // 有効な数値かチェック
      if (isNaN(number) || !isFinite(number)) return null;
      
      // 極端に小さい値は0として扱う
      if (Math.abs(number) < 0.01) return null;
      
      return number;
    } catch (error) {
      console.warn('数値解析エラー:', error.message, 'value:', value);
      return null;
    }
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