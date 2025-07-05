/**
 * 汎用EDINET財務データ取得API
 * 任意の企業・決算期に対応する適応的実装
 */

const https = require('https');
const unzipper = require('unzipper');
const { parseStringPromise } = require('xml2js');

module.exports = async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { edinetCode, fiscalYear, debug } = req.query;

    if (!edinetCode || !fiscalYear) {
      return res.status(400).json({
        success: false,
        error: 'パラメータが不足しています',
        message: 'edinetCode と fiscalYear が必要です'
      });
    }

    const year = parseInt(fiscalYear);
    const apiKey = process.env.EDINET_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'API_KEY_NOT_CONFIGURED'
      });
    }

    console.log(`🔍 汎用EDINET財務データ取得: ${edinetCode} ${year}年度`);

    // 1. 企業情報を事前取得
    const companyInfo = await getCompanyInfo(edinetCode, apiKey);
    
    // 2. 適応的書類検索
    const documents = await searchDocumentsAdaptive(edinetCode, year, companyInfo, apiKey);
    
    if (!documents || documents.length === 0) {
      return res.status(404).json({
        success: false,
        error: '該当する書類が見つかりません',
        message: `${edinetCode}の${year}年度の有価証券報告書が見つかりません`,
        searchInfo: {
          companyInfo,
          searchStrategy: 'adaptive_date_range'
        }
      });
    }

    const targetDoc = documents[0];
    console.log(`📄 対象書類: ${targetDoc.docID} (${targetDoc.periodEnd})`);

    // 3. XBRLデータ取得
    const xbrlData = await fetchXBRLData(targetDoc.docID, apiKey);
    
    // 4. デバッグモード判定
    if (debug === 'true') {
      const debugInfo = await generateUniversalDebugInfo(xbrlData, edinetCode, year, companyInfo);
      return res.status(200).json({
        success: true,
        debug: debugInfo,
        message: '汎用XBRL詳細デバッグ情報'
      });
    }

    // 5. 適応的財務データ抽出
    const financialData = await extractFinancialDataAdaptive(xbrlData, edinetCode, year, companyInfo);
    
    console.log('✅ 汎用EDINET財務データ取得成功');
    console.log(`企業名: ${financialData.companyName}`);
    console.log(`決算期: ${financialData.fiscalPeriodEnd}`);
    console.log(`会計基準: ${financialData.accountingStandard}`);
    console.log(`売上高: ${(financialData.netSales / 1000000).toFixed(0)}百万円`);
    
    return res.status(200).json({
      success: true,
      data: financialData,
      source: 'edinet_api_universal',
      message: `${year}年度の実際の財務データ（汎用EDINET API）`
    });

  } catch (error) {
    console.error('汎用財務データ取得エラー:', error);
    return res.status(500).json({
      success: false,
      error: 'サーバーエラー',
      message: error.message
    });
  }
}

/**
 * 企業情報事前取得
 */
async function getCompanyInfo(edinetCode, apiKey) {
  try {
    // 直近2年分の提出書類を調査
    const currentYear = new Date().getFullYear();
    const searchYears = [currentYear, currentYear - 1];
    
    let companyInfo = {
      fiscalYearEnd: null,
      accountingStandard: 'unknown',
      submissionPattern: [],
      periodEndPattern: []
    };
    
    for (const year of searchYears) {
      // 広範囲での書類検索（4-8月）
      const searchDates = generateSearchDates(year, 4, 8);
      
      for (const date of searchDates.slice(0, 30)) { // 最初の30日のみ
        try {
          const documents = await fetchDocumentList(date, apiKey);
          const companyDocs = documents.filter(doc => 
            doc.edinetCode === edinetCode && doc.docTypeCode === '120'
          );
          
          if (companyDocs.length > 0) {
            const doc = companyDocs[0];
            companyInfo.submissionPattern.push({
              fiscalYear: year - 1,
              submitDate: doc.submitDateTime,
              periodEnd: doc.periodEnd
            });
            
            // 決算期推定
            if (doc.periodEnd) {
              const month = new Date(doc.periodEnd).getMonth() + 1;
              companyInfo.fiscalYearEnd = month;
            }
          }
        } catch (error) {
          // 個別日付エラーは無視
        }
      }
    }
    
    return companyInfo;
  } catch (error) {
    console.warn('企業情報取得エラー:', error.message);
    return {
      fiscalYearEnd: 3, // デフォルト3月決算
      accountingStandard: 'unknown',
      submissionPattern: [],
      periodEndPattern: []
    };
  }
}

/**
 * 適応的書類検索
 */
async function searchDocumentsAdaptive(edinetCode, fiscalYear, companyInfo, apiKey) {
  // 決算期に基づく検索範囲計算
  const fiscalEndMonth = companyInfo.fiscalYearEnd || 3;
  const submissionYear = fiscalYear + (fiscalEndMonth <= 3 ? 1 : 0);
  
  // 提出パターンに基づく検索日付生成
  const searchDates = generateAdaptiveSearchDates(submissionYear, fiscalEndMonth, companyInfo.submissionPattern);
  
  const allDocuments = [];
  
  for (const date of searchDates) {
    try {
      const documents = await fetchDocumentList(date, apiKey);
      const targetDocs = documents.filter(doc => 
        doc.edinetCode === edinetCode &&
        doc.docTypeCode === '120' &&
        isTargetFiscalYear(doc.periodEnd, fiscalYear, fiscalEndMonth)
      );
      
      allDocuments.push(...targetDocs);
    } catch (error) {
      console.warn(`${date}の書類取得エラー: ${error.message}`);
    }
  }
  
  return allDocuments.sort((a, b) => 
    new Date(b.submitDateTime) - new Date(a.submitDateTime)
  );
}

/**
 * 適応的検索日付生成
 */
function generateAdaptiveSearchDates(year, fiscalEndMonth, submissionPattern) {
  const dates = [];
  
  // 過去の提出パターンがある場合
  if (submissionPattern.length > 0) {
    const avgSubmissionMonth = Math.round(
      submissionPattern.reduce((sum, p) => sum + new Date(p.submitDate).getMonth() + 1, 0) / submissionPattern.length
    );
    
    // 平均提出月の前後1ヶ月を重点的に検索
    const targetMonths = [avgSubmissionMonth - 1, avgSubmissionMonth, avgSubmissionMonth + 1]
      .map(m => m < 1 ? m + 12 : m > 12 ? m - 12 : m);
    
    for (const month of targetMonths) {
      dates.push(...generateMonthDates(year, month));
    }
  } else {
    // デフォルト検索パターン
    const defaultMonths = fiscalEndMonth <= 3 ? [4, 5, 6, 7, 8] : [1, 2, 3, 4];
    for (const month of defaultMonths) {
      dates.push(...generateMonthDates(year, month));
    }
  }
  
  return [...new Set(dates)].sort(); // 重複削除・ソート
}

/**
 * 適応的財務データ抽出
 */
async function extractFinancialDataAdaptive(xbrlContent, edinetCode, fiscalYear, companyInfo) {
  try {
    const result = await parseStringPromise(xbrlContent, {
      tagNameProcessors: [(name) => name.split(':').pop()],
      ignoreAttrs: false,
      mergeAttrs: true
    });
    
    const xbrl = result.xbrl || result;
    
    // XBRLフォーマット判定
    const format = detectXBRLFormat(xbrl);
    
    // コンテキストとファクトを抽出
    const contexts = extractContexts(xbrl);
    const facts = extractFacts(xbrl);
    
    // 適応的コンテキスト特定
    const contextIds = findAdaptiveContexts(contexts, fiscalYear, companyInfo);
    
    // 適応的要素名マッピング
    const elementMapping = generateElementMapping(facts, format);
    
    const financialData = {
      edinetCode: edinetCode,
      fiscalYear: fiscalYear,
      fiscalPeriodEnd: companyInfo.fiscalYearEnd ? `${fiscalYear + 1}-${String(companyInfo.fiscalYearEnd).padStart(2, '0')}-31` : `${fiscalYear + 1}-03-31`,
      accountingStandard: format.standard,
      companyName: extractCompanyNameAdaptive(xbrl) || `企業 ${edinetCode}`,
      
      // 売上高（適応的抽出）
      netSales: extractAdaptiveNumericValue(facts, elementMapping.revenue, contextIds.duration),
      
      // 営業利益（適応的抽出）
      operatingIncome: extractAdaptiveNumericValue(facts, elementMapping.operatingIncome, contextIds.duration),
      
      // 総資産（適応的抽出）
      totalAssets: extractAdaptiveNumericValue(facts, elementMapping.totalAssets, contextIds.instant),
      
      // 現金及び現金同等物
      cashAndEquivalents: extractAdaptiveNumericValue(facts, elementMapping.cash, contextIds.instant),
      
      // 株主資本
      shareholdersEquity: extractAdaptiveNumericValue(facts, elementMapping.equity, contextIds.instant),
      
      // 有利子負債
      interestBearingDebt: calculateAdaptiveDebt(facts, elementMapping, contextIds.instant),
      
      // 税率
      taxRate: calculateAdaptiveTaxRate(facts, elementMapping, contextIds.duration),
      
      dataSource: 'edinet_xbrl_adaptive',
      lastUpdated: new Date().toISOString(),
      extractionMeta: {
        format: format,
        contextIds: contextIds,
        elementMapping: Object.keys(elementMapping).reduce((acc, key) => {
          acc[key] = elementMapping[key].slice(0, 3); // 最初の3つのみ
          return acc;
        }, {})
      }
    };
    
    return financialData;
    
  } catch (error) {
    console.error('適応的XBRL解析エラー:', error);
    throw new Error('XBRLデータの適応的解析に失敗しました');
  }
}

// 以下、ユーティリティ関数群...

function detectXBRLFormat(xbrl) {
  const elements = Object.keys(xbrl);
  
  if (elements.some(e => e.includes('IFRS'))) {
    return { standard: 'IFRS', version: 'unknown' };
  } else if (elements.some(e => e.includes('jpigp') || e.includes('jppfs'))) {
    return { standard: 'J-GAAP', version: 'unknown' };
  } else {
    return { standard: 'unknown', version: 'unknown' };
  }
}

function generateElementMapping(facts, format) {
  const mapping = {
    revenue: [],
    operatingIncome: [],
    totalAssets: [],
    cash: [],
    equity: []
  };
  
  // フォーマットに応じた要素名マッピング
  for (const [key] of Object.entries(facts)) {
    if (key.toLowerCase().includes('revenue') || key.toLowerCase().includes('sales') || key.includes('売上')) {
      mapping.revenue.push(key);
    } else if (key.toLowerCase().includes('operating') && (key.toLowerCase().includes('income') || key.toLowerCase().includes('profit'))) {
      mapping.operatingIncome.push(key);
    } else if (key.toLowerCase().includes('assets') && key.toLowerCase().includes('total')) {
      mapping.totalAssets.push(key);
    } else if (key.toLowerCase().includes('cash')) {
      mapping.cash.push(key);
    } else if (key.toLowerCase().includes('equity') || key.includes('資本')) {
      mapping.equity.push(key);
    }
  }
  
  // 優先順位付け
  for (const category of Object.keys(mapping)) {
    mapping[category].sort((a, b) => {
      if (format.standard === 'IFRS') {
        return a.includes('IFRS') ? -1 : 1;
      }
      return a.length - b.length; // 短い名前を優先
    });
  }
  
  return mapping;
}

// 他の関数は実装継続...
function generateSearchDates(year, startMonth, endMonth) {
  const dates = [];
  for (let month = startMonth; month <= endMonth; month++) {
    for (let day = 1; day <= 31; day++) {
      const date = new Date(year, month - 1, day);
      if (date.getMonth() === month - 1) { // 有効な日付のみ
        dates.push(date.toISOString().split('T')[0]);
      }
    }
  }
  return dates;
}

function generateMonthDates(year, month) {
  const dates = [];
  for (let day = 1; day <= 31; day++) {
    const date = new Date(year, month - 1, day);
    if (date.getMonth() === month - 1) {
      dates.push(date.toISOString().split('T')[0]);
    }
  }
  return dates;
}

function isTargetFiscalYear(periodEnd, fiscalYear, fiscalEndMonth) {
  if (!periodEnd) return false;
  
  const endDate = new Date(periodEnd);
  const expectedYear = fiscalYear + (fiscalEndMonth <= 3 ? 1 : 0);
  const expectedMonth = fiscalEndMonth;
  
  return endDate.getFullYear() === expectedYear && 
         endDate.getMonth() + 1 === expectedMonth;
}

// 必要な共通関数をインポート（既存のreal-financial.jsから）
async function fetchDocumentList(date, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `https://disclosure.edinet-fsa.go.jp/api/v2/documents.json?date=${date}&type=2&Subscription-Key=${apiKey}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.results || []);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

async function fetchXBRLData(docID, apiKey) {
  // real-financial.jsと同じ実装
  return new Promise((resolve, reject) => {
    const url = `https://disclosure.edinet-fsa.go.jp/api/v2/documents/${docID}?type=1&Subscription-Key=${apiKey}`;
    
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const xbrlContent = await extractXBRLFromZip(buffer);
          resolve(xbrlContent);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

async function extractXBRLFromZip(buffer) {
  return new Promise((resolve, reject) => {
    const stream = require('stream');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    
    let xbrlContent = null;
    
    bufferStream
      .pipe(unzipper.Parse())
      .on('entry', async (entry) => {
        const fileName = entry.path;
        
        if (fileName.includes('PublicDoc') && fileName.endsWith('.xbrl')) {
          const chunks = [];
          entry.on('data', chunk => chunks.push(chunk));
          entry.on('end', () => {
            xbrlContent = Buffer.concat(chunks).toString('utf-8');
          });
        } else {
          entry.autodrain();
        }
      })
      .on('finish', () => {
        if (xbrlContent) {
          resolve(xbrlContent);
        } else {
          reject(new Error('XBRLファイルが見つかりません'));
        }
      })
      .on('error', reject);
  });
}

// 他の必要な関数も同様に実装...