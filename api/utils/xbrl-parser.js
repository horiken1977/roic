/**
 * Vercel Functions対応 XBRL Parser
 * 軽量版 - 必要最小限のXBRL解析機能
 */

const https = require('https');
const zlib = require('zlib');

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

    // 日本語勘定科目名のCSV用マッピング（追加）
    this.csvMappings = {
      netSales: [
        '売上高', '営業収益', '純売上高', '売上収益', '総売上高',
        'Revenue', 'Sales', 'NetSales', 'OperatingRevenue'
      ],
      operatingIncome: [
        '営業利益', '営業損益', '事業利益', '営業収益',
        'OperatingIncome', 'OperatingProfit', 'OperatingEarnings'
      ],
      ordinaryIncome: [
        '経常利益', '経常損益', '税引前利益',
        'OrdinaryIncome', 'IncomeBeforeIncomeTaxes', 'ProfitBeforeTax'
      ],
      netIncome: [
        '当期純利益', '純利益', '最終利益', '親会社株主に帰属する当期純利益',
        'NetIncome', 'NetProfit', 'ProfitForThePeriod'
      ],
      totalAssets: [
        '資産合計', '総資産', '資産の部合計', '資産総額',
        'Assets', 'TotalAssets', 'AssetsTotal'
      ],
      cashAndEquivalents: [
        '現金及び預金', '現金預金', '現金及び現金同等物',
        'CashAndCashEquivalents', 'CashAndDeposits', 'Cash'
      ],
      shareholdersEquity: [
        '株主資本', '純資産', '株主資本合計', '純資産合計', '親会社株主持分',
        'ShareholdersEquity', 'NetAssets', 'TotalEquity'
      ],
      interestBearingDebt: [
        '有利子負債', '借入金', '長期借入金', '短期借入金', '社債',
        'InterestBearingDebt', 'Borrowings', 'BorrowingsAndBonds'
      ],
      accountsPayable: [
        '買掛金', '仕入債務', '支払手形及び買掛金', '営業債務',
        'AccountsPayable', 'TradePayables', 'TradeAndOtherPayables'
      ],
      accruedExpenses: [
        '未払費用', '未払金', '未払法人税等', 'その他流動負債',
        'AccruedExpenses', 'AccruedLiabilities', 'OtherCurrentLiabilities'
      ],
      interestIncome: [
        '受取利息', '受取利息配当金', '金融収益', '受取配当金',
        'InterestIncome', 'InterestRevenue', 'FinancialIncome'
      ]
    };
  }

  /**
   * ZIPファイルからCSVを抽出（新機能）
   */
  async extractCsvFromZip(zipBuffer) {
    try {
      console.log('=== ZIP解析開始 ===');
      console.log(`ZIPファイルサイズ: ${zipBuffer.length} bytes`);
      
      // ZIP magic bytes確認
      const isZip = zipBuffer[0] === 0x50 && zipBuffer[1] === 0x4B;
      if (!isZip) {
        throw new Error('有効なZIPファイルではありません');
      }
      
      console.log('✓ 有効なZIPファイルを確認');
      
      // ZIP内のファイルを解析
      const files = await this.parseZipDirectory(zipBuffer);
      console.log(`ZIP内ファイル数: ${files.length}`);
      
      // CSVファイルを検索
      const csvFiles = files.filter(f => 
        f.name.toLowerCase().includes('.csv') && 
        (f.name.toLowerCase().includes('xbrl') || f.name.toLowerCase().includes('to_csv'))
      );
      
      console.log(`CSVファイル数: ${csvFiles.length}`);
      csvFiles.forEach(f => console.log(`  - ${f.name}`));
      
      if (csvFiles.length === 0) {
        throw new Error('ZIP内にXBRL CSVファイルが見つかりません');
      }
      
      // 最初のCSVファイルを展開
      const csvFile = csvFiles[0];
      const csvData = await this.extractFileFromZip(zipBuffer, csvFile);
      const csvContent = csvData.toString('utf8');
      
      console.log(`✓ CSVファイル展開成功: ${csvFile.name}`);
      console.log(`CSV サイズ: ${csvContent.length} 文字`);
      
      return csvContent;
      
    } catch (error) {
      console.error('ZIP解析エラー:', error);
      throw error;
    }
  }

  /**
   * ZIP内のファイル一覧を取得
   */
  async parseZipDirectory(zipBuffer) {
    const files = [];
    let offset = 0;
    
    while (offset < zipBuffer.length - 30) {
      // ローカルファイルヘッダー検索 (PK\x03\x04)
      if (zipBuffer[offset] === 0x50 && zipBuffer[offset + 1] === 0x4B && 
          zipBuffer[offset + 2] === 0x03 && zipBuffer[offset + 3] === 0x04) {
        
        // ファイル情報を読み取り
        const fileNameLength = zipBuffer[offset + 26] + (zipBuffer[offset + 27] << 8);
        const extraFieldLength = zipBuffer[offset + 28] + (zipBuffer[offset + 29] << 8);
        const compressedSize = zipBuffer[offset + 18] + (zipBuffer[offset + 19] << 8) + 
                             (zipBuffer[offset + 20] << 16) + (zipBuffer[offset + 21] << 24);
        const compressionMethod = zipBuffer[offset + 8] + (zipBuffer[offset + 9] << 8);
        
        // ファイル名取得
        const fileNameStart = offset + 30;
        const fileName = zipBuffer.subarray(fileNameStart, fileNameStart + fileNameLength).toString('utf8');
        
        files.push({
          name: fileName,
          offset: offset,
          compressedSize: compressedSize,
          dataOffset: fileNameStart + fileNameLength + extraFieldLength,
          compressionMethod: compressionMethod
        });
        
        offset = fileNameStart + fileNameLength + extraFieldLength + compressedSize;
      } else {
        offset++;
      }
    }
    
    return files;
  }

  /**
   * ZIP内の特定ファイルを展開
   */
  async extractFileFromZip(zipBuffer, fileInfo) {
    const compressedData = zipBuffer.subarray(
      fileInfo.dataOffset, 
      fileInfo.dataOffset + fileInfo.compressedSize
    );
    
    if (fileInfo.compressionMethod === 0) {
      // 無圧縮
      return compressedData;
    } else if (fileInfo.compressionMethod === 8) {
      // Deflate圧縮
      return new Promise((resolve, reject) => {
        zlib.inflateRaw(compressedData, (err, decompressed) => {
          if (err) {
            reject(err);
          } else {
            resolve(decompressed);
          }
        });
      });
    } else {
      throw new Error(`未対応の圧縮形式: ${fileInfo.compressionMethod}`);
    }
  }

  /**
   * CSVから財務データを抽出（新機能）
   */
  parseCsvFinancialData(csvContent) {
    try {
      console.log('=== CSV解析開始 ===');
      const lines = csvContent.split('\n');
      console.log(`CSV行数: ${lines.length}`);
      
      const financialData = {
        fiscalYear: new Date().getFullYear(),
        companyName: '企業名未取得',
        netSales: null,
        operatingIncome: null,
        ordinaryIncome: null,
        netIncome: null,
        interestIncome: null,
        grossProfit: null,
        sellingAdminExpenses: null,
        totalAssets: null,
        cashAndEquivalents: null,
        shareholdersEquity: null,
        interestBearingDebt: null,
        accountsPayable: null,
        accruedExpenses: null,
        leaseExpense: null,
        leaseDebt: null,
        taxRate: 0.30
      };
      
      let extractedCount = 0;
      
      // 各行を解析
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // CSV行を解析（カンマ区切り、クォートを考慮）
        const fields = this.parseCsvLine(line);
        if (fields.length < 5) continue;
        
        // 通常のEDINET CSV形式: 勘定科目名, コード, コンテキスト, 単位, 金額
        const accountName = fields[0];
        const contextRef = fields[2];
        const unit = fields[3];
        const rawValue = fields[4];
        
        // 連結データを優先（CurrentYearInstant_ConsolidatedMemberなど）
        const isConsolidated = contextRef.toLowerCase().includes('consolidated') || 
                             contextRef.toLowerCase().includes('連結');
        
        // 金額を数値に変換
        const value = this.parseJapaneseNumber(rawValue);
        if (value === null || value === 0) continue;
        
        // 勘定科目をマッピング
        const mappedField = this.mapAccountToField(accountName);
        if (mappedField && (financialData[mappedField] === null || 
            (isConsolidated && Math.abs(value) > Math.abs(financialData[mappedField] || 0)))) {
          
          financialData[mappedField] = value;
          extractedCount++;
          
          console.log(`✓ ${mappedField}: ${value.toLocaleString()} (${accountName})`);
        }
      }
      
      console.log(`=== CSV解析完了: ${extractedCount}項目抽出 ===`);
      
      // 派生値計算
      this.calculateDerivedValues(financialData);
      
      return financialData;
      
    } catch (error) {
      console.error('CSV解析エラー:', error);
      throw error;
    }
  }

  /**
   * CSV行を解析（クォート対応）
   */
  parseCsvLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      
      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        if (line[i + 1] === '"') {
          // エスケープされたクォート
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
      
      i++;
    }
    
    fields.push(current.trim());
    return fields;
  }

  /**
   * 勘定科目名をフィールドにマッピング
   */
  mapAccountToField(accountName) {
    const cleanName = accountName.replace(/[「」\s]/g, '');
    
    for (const [field, mappings] of Object.entries(this.csvMappings)) {
      for (const mapping of mappings) {
        if (cleanName.includes(mapping) || mapping.includes(cleanName)) {
          return field;
        }
      }
    }
    
    return null;
  }

  /**
   * 日本語数値を解析（改善版）
   */
  parseJapaneseNumber(value) {
    if (!value || value === '-') return null;
    
    try {
      let strValue = value.toString().trim();
      
      // 単位変換
      const units = {
        '千円': 1000,
        '百万円': 1000000,
        '十億円': 1000000000,
        '兆円': 1000000000000,
        '千': 1000,
        '万': 10000,
        '億': 100000000,
        '兆': 1000000000000
      };
      
      let multiplier = 1;
      for (const [unit, factor] of Object.entries(units)) {
        if (strValue.includes(unit)) {
          multiplier = factor;
          strValue = strValue.replace(unit, '');
          break;
        }
      }
      
      // 文字クリーニング
      strValue = strValue.replace(/[,\s　円]/g, '');
      strValue = strValue.replace(/[−－‐]/g, '-');
      
      // 全角数字を半角に変換
      strValue = strValue.replace(/[０-９]/g, function(s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
      });
      
      const number = parseFloat(strValue);
      if (isNaN(number)) return null;
      
      return number * multiplier;
      
    } catch (error) {
      console.warn('数値解析エラー:', error.message, 'value:', value);
      return null;
    }
  }

  /**
   * EDINET APIからXBRLドキュメントを取得してパース
   */
  async fetchAndParseXbrl(docId, apiKey) {
    try {
      console.log(`XBRLドキュメント取得開始: ${docId}`);

      // XBRLファイルを取得
      const xbrlDataResult = await this.fetchXbrlDocument(docId, apiKey);
      
      if (!xbrlDataResult) {
        console.error('XBRLデータが空またはnull');
        throw new Error('XBRLデータの取得に失敗しました');
      }
      
      console.log(`取得したXBRLデータサイズ: ${xbrlDataResult.length} bytes/文字`);
      console.log(`XBRLデータタイプ: ${typeof xbrlDataResult}`);
      
      // バイナリデータ（Buffer）かテキストデータかを判定
      const isBuffer = Buffer.isBuffer(xbrlDataResult);
      console.log(`データ形式: ${isBuffer ? 'Buffer (バイナリ)' : 'String (テキスト)'}`);
      
      let financialData;
      
      if (isBuffer) {
        // Bufferの場合、ZIPファイルかどうかチェック
        const isZip = xbrlDataResult[0] === 0x50 && xbrlDataResult[1] === 0x4B;
        console.log(`ZIP形式チェック: ${isZip}`);
        
        if (isZip) {
          console.log('🎯 ZIPファイルを検出 - CSVパーサーを使用');
          
          try {
            // 新しいZIP/CSV処理を使用
            const csvContent = await this.extractCsvFromZip(xbrlDataResult);
            financialData = this.parseCsvFinancialData(csvContent);
            
            console.log('✅ ZIP/CSV処理成功');
          } catch (zipError) {
            console.warn('ZIP/CSV処理失敗、XMLパーサーにフォールバック:', zipError.message);
            // フォールバック: 既存のXMLパーサーを試す
            const xbrlString = xbrlDataResult.toString('utf8');
            financialData = await this.parseXbrlData(xbrlString);
          }
        } else {
          // ZIPではないバイナリデータの場合、テキストとして解釈
          const xbrlString = xbrlDataResult.toString('utf8');
          financialData = await this.parseXbrlData(xbrlString);
        }
      } else {
        // 文字列データの場合、既存のパーサーを使用
        console.log(`XBRLデータの最初の200文字: ${xbrlDataResult.substring(0, 200)}`);
        
        // XMLかどうかの基本チェック
        const isXml = xbrlDataResult.includes('<?xml') || xbrlDataResult.includes('<xbrl') || xbrlDataResult.includes('<XBRL');
        console.log(`XML形式チェック: ${isXml}`);

        financialData = await this.parseXbrlData(xbrlDataResult);
      }
      
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
            
            // ZIP magic bytes チェック（Content-Typeに関係なく）
            const isZipData = data.length >= 4 && data[0] === 0x50 && data[1] === 0x4B && 
                             data[2] === 0x03 && data[3] === 0x04;
            
            if (contentType.includes('application/zip') || isZipData) {
              // ZIPファイルの場合 - 新しいパーサーで処理するためBufferをそのまま返す
              console.log('ZIP形式を検出しました。新しいZIP/CSVパーサーで処理します。');
              console.log('ZIPファイルサイズ:', data.length);
              
              // ZIPの最初の数バイトを確認してZIPファイルかチェック
              const zipHeader = data.subarray(0, 4);
              const isZip = zipHeader[0] === 0x50 && zipHeader[1] === 0x4B;
              
              if (isZip) {
                console.log('有効なZIPファイルを確認しました - Bufferを返します');
                resolve(data); // Buffer をそのまま返す
                return;
              }
              
              // ZIP形式でない場合はnullを返す
              console.log('ZIPヘッダーが無効です');
              resolve(null);
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