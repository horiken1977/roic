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
        console.error('XBRLデータが空またはnull');
        throw new Error('XBRLデータの取得に失敗しました');
      }
      
      console.log(`取得したXBRLデータサイズ: ${xbrlData.length} 文字`);
      console.log(`XBRLデータタイプ: ${typeof xbrlData}`);
      console.log(`XBRLデータの最初の200文字: ${xbrlData.substring(0, 200)}`);
      
      // XMLかどうかの基本チェック
      const isXml = xbrlData.includes('<?xml') || xbrlData.includes('<xbrl') || xbrlData.includes('<XBRL');
      console.log(`XML形式チェック: ${isXml}`);

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
      // EDINET API v2の正しいエンドポイント
      const url = `https://disclosure.edinet-fsa.go.jp/api/v2/documents/${docId}?type=1&Subscription-Key=${apiKey}`;
      
      console.log(`XBRL取得URL確認: ${url.replace(apiKey, '[API_KEY]')}`);
      console.log(`DocID詳細: ${docId}`);
      
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
              console.error(`XBRL取得HTTPエラー: ${res.statusCode} ${res.statusMessage}`);
              console.error(`URL: ${url.replace(apiKey, '***')}`);
              console.error(`Response body: ${data.toString('utf8').substring(0, 500)}`);
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
                  // ZIP展開を試行（簡易的な実装）
                  console.log('ZIP展開を試行します');
                  
                  try {
                    // ZIP内の最初のXMLファイルを探す試行
                    const zipString = data.toString('binary');
                    
                    // PKZipヘッダーを探して、ファイルエントリを解析
                    // 簡易的なZIP解析（完全ではないが、多くの場合動作する）
                    let xmlContent = null;
                    
                    // PK\x03\x04 (ローカルファイルヘッダー) を探す
                    let offset = 0;
                    while (offset < data.length - 30) {
                      if (data[offset] === 0x50 && data[offset + 1] === 0x4B && 
                          data[offset + 2] === 0x03 && data[offset + 3] === 0x04) {
                        // ファイル名の長さを読む
                        const fileNameLength = data[offset + 26] + (data[offset + 27] << 8);
                        const extraFieldLength = data[offset + 28] + (data[offset + 29] << 8);
                        const compressedSize = data[offset + 18] + (data[offset + 19] << 8) + 
                                             (data[offset + 20] << 16) + (data[offset + 21] << 24);
                        
                        // ファイル名を読む
                        const fileNameStart = offset + 30;
                        const fileName = data.subarray(fileNameStart, fileNameStart + fileNameLength).toString('utf8');
                        
                        console.log(`ZIP内ファイル発見: ${fileName} (${compressedSize} bytes)`);
                        
                        // XMLファイルまたはCSVファイルかチェック
                        if (fileName.toLowerCase().includes('.xml') || fileName.toLowerCase().includes('xbrl') || fileName.toLowerCase().includes('.csv')) {
                          const dataStart = fileNameStart + fileNameLength + extraFieldLength;
                          const fileData = data.subarray(dataStart, dataStart + compressedSize);
                          
                          // CSVファイルの場合は特別な処理
                          if (fileName.toLowerCase().includes('.csv')) {
                            console.log(`CSVファイル発見: ${fileName}`);
                            const csvContent = fileData.toString('utf8');
                            console.log('CSV内容の最初の500文字:', csvContent.substring(0, 500));
                            
                            // CSVからXBRL形式のデータに変換を試みる
                            xmlContent = this.convertCsvToXbrlFormat(csvContent, fileName);
                            if (xmlContent) {
                              console.log(`CSVファイルからのデータ変換成功: ${fileName}`);
                              break;
                            }
                          } else {
                            xmlContent = fileData.toString('utf8');
                            console.log(`XMLファイル抽出成功: ${fileName}`);
                            break;
                          }
                        }
                        
                        offset = fileNameStart + fileNameLength + extraFieldLength + compressedSize;
                      } else {
                        offset++;
                      }
                    }
                    
                    if (xmlContent) {
                      console.log('ZIP内XMLの最初の500文字:', xmlContent.substring(0, 500));
                      resolve(xmlContent);
                    } else {
                      console.log('ZIP内にXMLファイルが見つかりませんでした');
                      resolve(this.fetchXbrlAsXml(docId, apiKey));
                    }
                  } catch (zipError) {
                    console.error('ZIP展開エラー:', zipError);
                    resolve(this.fetchXbrlAsXml(docId, apiKey));
                  }
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
              console.log('XMLの最後の200文字:', xmlString.substring(Math.max(0, xmlString.length - 200)));
              
              // XMLの基本構造チェック
              const hasXmlDeclaration = xmlString.includes('<?xml');
              const hasXbrlTag = xmlString.includes('<xbrl') || xmlString.includes('<XBRL');
              const hasNamespace = xmlString.includes('jpcrp_cor') || xmlString.includes('jppfs_cor');
              console.log(`XML構造チェック - Declaration: ${hasXmlDeclaration}, XBRL: ${hasXbrlTag}, Namespace: ${hasNamespace}`);
              
              resolve(xmlString);
            } else {
              // その他の形式
              const textData = data.toString('utf8');
              console.log('テキスト形式として処理します');
              console.log('データの最初の500文字:', textData.substring(0, 500));
              console.log('Content-Type詳細:', contentType);
              
              // バイナリデータかどうかチェック
              const isBinary = data.some(byte => byte === 0 || byte > 127);
              console.log('バイナリデータ判定:', isBinary);
              
              if (isBinary) {
                console.log('バイナリデータが検出されました - ZIP展開が必要の可能性');
                // ZIP展開の代替手段を試行
                resolve(this.fetchXbrlAsXml(docId, apiKey));
              } else {
                resolve(textData);
              }
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
        console.log(`${key}: ${value}`);
      });

      // 実際のXBRLデータ構造をサンプル出力
      console.log('=== XBRL実データサンプル ===');
      const sampleLines = xbrlString.split('\n').slice(0, 20).join('\n');
      console.log('XBRLの最初の20行:', sampleLines);
      
      // ファイル全体の統計
      console.log('=== XBRL統計情報 ===');
      console.log(`全体サイズ: ${xbrlString.length} 文字`);
      console.log(`行数: ${xbrlString.split('\n').length} 行`);
      console.log(`XMLタグ数: ${(xbrlString.match(/<[^>]+>/g) || []).length} 個`);
      
      // 数値を含むタグを検索
      const numericTags = xbrlString.match(/<[^>]*>[^<]*[\d,]+[^<]*<\/[^>]*>/g) || [];
      console.log(`数値を含むタグ数: ${numericTags.length} 個`);
      if (numericTags.length > 0) {
        console.log('数値タグの例（最初の5つ）:');
        numericTags.slice(0, 5).forEach((tag, i) => {
          console.log(`${i+1}: ${tag}`);
        });
      }
      
      // 主要な財務タグを検索
      console.log('=== 主要タグ検索結果 ===');
      const searchTags = ['NetSales', 'Sales', '売上高', 'Assets', '資産合計', 'OperatingIncome', '営業利益'];
      searchTags.forEach(tag => {
        const regex = new RegExp(`<[^>]*${tag}[^>]*>([^<]+)<`, 'gi');
        const matches = xbrlString.match(regex);
        if (matches) {
          console.log(`"${tag}" マッチ数: ${matches.length}, 例: ${matches.slice(0, 3).join(', ')}`);
        } else {
          console.log(`"${tag}" マッチなし`);
        }
      });
      
      // 名前空間を含むタグのパターンも検索
      console.log('=== 名前空間付きタグ検索 ===');
      const namespaceTags = ['jpcrp_cor:', 'jppfs_cor:', 'jp:', 'ifrs:', 'us-gaap:'];
      namespaceTags.forEach(ns => {
        const regex = new RegExp(`<${ns}[^>]*>([^<]*\\d[^<]*)</${ns}[^>]*>`, 'gi');
        const matches = xbrlString.match(regex);
        if (matches && matches.length > 0) {
          console.log(`"${ns}" 名前空間タグ: ${matches.length}件, 例: ${matches.slice(0, 2).join(', ')}`);
        } else {
          console.log(`"${ns}" 名前空間タグ: なし`);
        }
      });

      // 計算値を補完
      this.calculateDerivedValues(financialData);
      
      console.log('=== XBRL解析完了 ===');
      
      // デバッグ情報を財務データに追加
      const debugInfo = {
        xbrlSize: xbrlString ? xbrlString.length : 0,
        xbrlSample: xbrlString ? xbrlString.substring(0, 300) : 'No XBRL data',
        tagCount: xbrlString ? (xbrlString.match(/<[^>]+>/g) || []).length : 0,
        numericTagCount: xbrlString ? (xbrlString.match(/<[^>]*>[^<]*[\d,]+[^<]*<\/[^>]*>/g) || []).length : 0,
        isXml: xbrlString ? (xbrlString.includes('<?xml') || xbrlString.includes('<xbrl') || xbrlString.includes('<XBRL')) : false,
        extractedValueCount: Object.values(financialData).filter(v => typeof v === 'number' && v !== 0).length,
        timestamp: new Date().toISOString()
      };
      
      console.log('デバッグ情報作成:', debugInfo);
      financialData.debug = debugInfo;
      
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

        for (let i = 0; i < allPatterns.length; i++) {
          const pattern = allPatterns[i];
          const matches = Array.from(xbrlString.matchAll(pattern));
          
          if (matches.length > 0) {
            console.log(`  パターン${i+1}で${matches.length}件ヒット: ${pattern.source.substring(0, 50)}...`);
          }
          
          for (const match of matches) {
            const rawValue = match[1];
            const value = this.parseNumber(rawValue);
            console.log(`    生値: "${rawValue}" → 解析後: ${value}`);
            
            if (value !== null && Math.abs(value) > 0) {
              foundValues.push({
                tag: tag,
                value: value,
                context: match[0].substring(0, 150) + '...'
              });
              console.log(`  ✓ 採用: ${tag} = ${value} (from "${rawValue}")`);
            } else if (value === null) {
              console.log(`    数値解析失敗: "${rawValue}"`);
            } else {
              console.log(`    ゼロ値のためスキップ: ${value}`);
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

  /**
   * CSVファイルからXBRL形式のデータを抽出
   */
  convertCsvToXbrlFormat(csvContent, fileName) {
    try {
      console.log('CSVファイルからデータ抽出を開始:', fileName);
      
      // CSVファイルの構造を分析
      const lines = csvContent.split('\n');
      console.log(`CSV行数: ${lines.length}`);
      
      if (lines.length < 2) {
        console.log('CSVファイルが空または行数不足');
        return null;
      }
      
      // CSVデータから財務情報を抽出するためのマッピング
      const financialData = {
        netSales: null,
        operatingIncome: null,
        totalAssets: null,
        cashAndEquivalents: null,
        shareholdersEquity: null,
        interestBearingDebt: null,
        accountsPayable: null,
        accruedExpenses: null,
        interestIncome: null,
        grossProfit: null,
        sellingAdminExpenses: null,
        leaseExpense: null,
        leaseDebt: null
      };
      
      // EDINETのCSVフォーマットに基づいて解析
      // 各行を解析して、勘定科目名と金額を抽出
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // CSVの各フィールドを解析
        const fields = line.split(',');
        if (fields.length < 2) continue;
        
        // 勘定科目名と金額を抽出（EDINETのCSV形式に対応）
        const accountName = fields[0].replace(/"/g, '').trim();
        const value = this.parseNumber(fields[fields.length - 1]);
        
        if (value === null) continue;
        
        // 勘定科目名をマッチング
        if (accountName.includes('売上高') || accountName.includes('営業収益') || accountName.toLowerCase().includes('revenue')) {
          if (!financialData.netSales || Math.abs(value) > Math.abs(financialData.netSales)) {
            financialData.netSales = value;
            console.log(`売上高を検出: ${value}`);
          }
        } else if (accountName.includes('営業利益') || accountName.toLowerCase().includes('operating income')) {
          financialData.operatingIncome = value;
          console.log(`営業利益を検出: ${value}`);
        } else if (accountName.includes('資産合計') || accountName.includes('総資産') || accountName.toLowerCase().includes('total assets')) {
          financialData.totalAssets = value;
          console.log(`総資産を検出: ${value}`);
        } else if (accountName.includes('現金及び預金') || accountName.toLowerCase().includes('cash')) {
          financialData.cashAndEquivalents = value;
          console.log(`現金及び預金を検出: ${value}`);
        } else if (accountName.includes('株主資本') || accountName.includes('純資産') || accountName.toLowerCase().includes('equity')) {
          financialData.shareholdersEquity = value;
          console.log(`株主資本を検出: ${value}`);
        } else if (accountName.includes('有利子負債') || accountName.includes('借入金') || accountName.toLowerCase().includes('debt')) {
          financialData.interestBearingDebt = value;
          console.log(`有利子負債を検出: ${value}`);
        }
      }
      
      // 疑似的なXBRL形式のXMLを生成
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<xbrl xmlns="http://www.xbrl.org/2003/instance">
  ${financialData.netSales !== null ? `<jpcrp_cor:NetSales>${financialData.netSales}</jpcrp_cor:NetSales>` : ''}
  ${financialData.operatingIncome !== null ? `<jpcrp_cor:OperatingIncome>${financialData.operatingIncome}</jpcrp_cor:OperatingIncome>` : ''}
  ${financialData.totalAssets !== null ? `<jpcrp_cor:Assets>${financialData.totalAssets}</jpcrp_cor:Assets>` : ''}
  ${financialData.cashAndEquivalents !== null ? `<jpcrp_cor:CashAndDeposits>${financialData.cashAndEquivalents}</jpcrp_cor:CashAndDeposits>` : ''}
  ${financialData.shareholdersEquity !== null ? `<jpcrp_cor:ShareholdersEquity>${financialData.shareholdersEquity}</jpcrp_cor:ShareholdersEquity>` : ''}
  ${financialData.interestBearingDebt !== null ? `<jpcrp_cor:InterestBearingDebt>${financialData.interestBearingDebt}</jpcrp_cor:InterestBearingDebt>` : ''}
</xbrl>`;
      
      console.log('生成されたXML:', xmlContent);
      return xmlContent;
      
    } catch (error) {
      console.error('CSV変換エラー:', error);
      return null;
    }
  }
}

module.exports = SimpleXbrlParser;