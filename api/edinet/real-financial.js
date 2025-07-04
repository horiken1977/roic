/**
 * Vercel Serverless Function - 実際のEDINET APIから財務データ取得
 * 真の財務データを取得するための実装
 */

const https = require('https');
const unzipper = require('unzipper');
const { parseStringPromise } = require('xml2js');

module.exports = async function handler(req, res) {
  // CORS ヘッダーを設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Max-Age', '86400');

  // CORS プリフライト対応
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
    const { edinetCode, fiscalYear } = req.query;

    if (!edinetCode || !fiscalYear) {
      return res.status(400).json({
        success: false,
        error: 'パラメータが不足しています',
        message: 'edinetCode と fiscalYear が必要です'
      });
    }

    const year = parseInt(fiscalYear);
    if (isNaN(year) || year < 2018 || year > new Date().getFullYear()) {
      return res.status(400).json({
        success: false,
        error: '無効な年度です',
        message: '2018年以降の有効な年度を指定してください'
      });
    }

    console.log(`実EDINET財務データ取得: ${edinetCode} ${year}年度`);

    // 環境変数からAPIキー取得
    const apiKey = process.env.EDINET_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'API_KEY_NOT_CONFIGURED',
        message: 'EDINET APIキーが設定されていません'
      });
    }

    // 1. まず書類一覧を取得して該当年度の有価証券報告書を特定
    const documents = await searchDocuments(edinetCode, year, apiKey);
    
    if (!documents || documents.length === 0) {
      return res.status(404).json({
        success: false,
        error: '該当する書類が見つかりません',
        message: `${edinetCode}の${year}年度の有価証券報告書が見つかりません`
      });
    }

    // 2. 最新の有価証券報告書を選択
    const targetDoc = documents[0];
    console.log(`対象書類: ${targetDoc.docID} (${targetDoc.periodEnd})`);

    // 3. XBRLデータを取得
    const xbrlData = await fetchXBRLData(targetDoc.docID, apiKey);
    
    if (!xbrlData) {
      return res.status(500).json({
        success: false,
        error: 'XBRLデータの取得に失敗しました',
        message: '財務データの取得中にエラーが発生しました'
      });
    }

    // 4. XBRLから財務データを抽出
    const financialData = await extractFinancialData(xbrlData, edinetCode, year);
    
    console.log('✅ 実EDINET財務データ取得成功');
    console.log(`企業名: ${financialData.companyName}`);
    console.log(`売上高: ${(financialData.netSales / 1000000).toFixed(0)}百万円`);
    console.log(`営業利益: ${(financialData.operatingIncome / 1000000).toFixed(0)}百万円`);
    
    return res.status(200).json({
      success: true,
      data: financialData,
      source: 'edinet_api_real',
      message: `${year}年度の実際の財務データ（EDINET API）`
    });

  } catch (error) {
    console.error('財務データ取得エラー:', error);
    return res.status(500).json({
      success: false,
      error: 'サーバーエラー',
      message: error.message
    });
  }
}

/**
 * EDINET APIから書類を検索
 */
async function searchDocuments(edinetCode, fiscalYear, apiKey) {
  // 対象期間の設定（決算期末は3月と仮定）
  const targetPeriodStart = `${fiscalYear}-04-01`;
  const targetPeriodEnd = `${fiscalYear + 1}-03-31`;
  
  // 検索日付の範囲（決算発表は通常5-6月）
  const searchDates = [];
  
  // 2024年度の書類は2025年に提出される
  const submissionYear = fiscalYear + 1;
  const targetDates = [
    `${submissionYear}-06-28`, `${submissionYear}-06-27`, `${submissionYear}-06-26`, `${submissionYear}-06-25`, `${submissionYear}-06-24`,
    `${submissionYear}-06-21`, `${submissionYear}-06-20`, `${submissionYear}-06-19`, `${submissionYear}-06-18`, `${submissionYear}-06-17`,
    `${submissionYear}-06-16`, `${submissionYear}-06-13`, `${submissionYear}-06-12`, `${submissionYear}-06-11`, `${submissionYear}-06-10`,
    `${submissionYear}-05-31`, `${submissionYear}-05-30`, `${submissionYear}-05-29`, `${submissionYear}-05-28`, `${submissionYear}-05-27`
  ];
  
  searchDates.push(...targetDates);
  
  const allDocuments = [];
  
  for (const date of searchDates) {
    try {
      const documents = await fetchDocumentList(date, apiKey);
      
      // 対象企業の有価証券報告書のみフィルタ
      const targetDocs = documents.filter(doc => 
        doc.edinetCode === edinetCode &&
        doc.docTypeCode === '120' && // 有価証券報告書
        doc.periodEnd && doc.periodEnd.includes(`${fiscalYear + 1}-03-31`)
      );
      
      allDocuments.push(...targetDocs);
    } catch (error) {
      console.warn(`${date}の書類取得エラー: ${error.message}`);
    }
  }
  
  // 提出日で降順ソート（最新のものを優先）
  return allDocuments.sort((a, b) => 
    new Date(b.submitDateTime) - new Date(a.submitDateTime)
  );
}

/**
 * 指定日の書類一覧を取得
 */
function fetchDocumentList(date, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `https://disclosure.edinet-fsa.go.jp/api/v2/documents.json?date=${date}&type=2&Subscription-Key=${apiKey}`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
            return;
          }
          
          const result = JSON.parse(data);
          resolve(result.results || []);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

/**
 * XBRLデータを取得
 */
function fetchXBRLData(docID, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `https://disclosure.edinet-fsa.go.jp/api/v2/documents/${docID}?type=1&Subscription-Key=${apiKey}`;
    
    console.log(`XBRLデータ取得中: ${docID}`);
    
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }
      
      const chunks = [];
      
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      res.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          
          // ZIPファイルを解凍してXBRLファイルを探す
          const xbrlContent = await extractXBRLFromZip(buffer);
          resolve(xbrlContent);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

/**
 * ZIPファイルからXBRLファイルを抽出
 */
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
        
        // PublicDoc配下のXBRLファイルを探す
        if (fileName.includes('PublicDoc') && fileName.endsWith('.xbrl')) {
          console.log(`XBRLファイル発見: ${fileName}`);
          
          const chunks = [];
          entry.on('data', (chunk) => chunks.push(chunk));
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

/**
 * XBRLから財務データを抽出
 */
async function extractFinancialData(xbrlContent, edinetCode, fiscalYear) {
  try {
    // XMLをパース
    const result = await parseStringPromise(xbrlContent, {
      tagNameProcessors: [(name) => name.split(':').pop()],
      ignoreAttrs: false,
      mergeAttrs: true
    });
    
    // XBRLデータ構造を解析
    const xbrl = result.xbrl || result;
    
    // コンテキストとファクトを抽出
    const contexts = extractContexts(xbrl);
    const facts = extractFacts(xbrl);
    
    // 当期のコンテキストIDを特定
    const currentPeriodContextId = findCurrentPeriodContext(contexts, fiscalYear);
    
    // 財務データを抽出
    const financialData = {
      edinetCode: edinetCode,
      fiscalYear: fiscalYear,
      companyName: extractCompanyName(xbrl) || `企業 ${edinetCode}`,
      
      // 売上高
      netSales: extractNumericValue(facts, [
        'NetSales',
        'NetSalesOfCompletedConstructionContracts', 
        'OperatingRevenue',
        'OrdinaryRevenues',
        'Revenues'
      ], currentPeriodContextId),
      
      // 営業利益
      operatingIncome: extractNumericValue(facts, [
        'OperatingIncome',
        'OperatingProfit'
      ], currentPeriodContextId),
      
      // 総資産
      totalAssets: extractNumericValue(facts, [
        'Assets',
        'TotalAssets'
      ], currentPeriodContextId),
      
      // 現金及び現金同等物
      cashAndEquivalents: extractNumericValue(facts, [
        'CashAndDeposits',
        'CashAndCashEquivalents'
      ], currentPeriodContextId),
      
      // 株主資本/純資産
      shareholdersEquity: extractNumericValue(facts, [
        'NetAssets',
        'ShareholdersEquity',
        'TotalNetAssets'
      ], currentPeriodContextId),
      
      // 有利子負債
      interestBearingDebt: calculateInterestBearingDebt(facts, currentPeriodContextId),
      
      // 税率（法人税等/税引前利益）
      taxRate: calculateTaxRate(facts, currentPeriodContextId),
      
      dataSource: 'edinet_xbrl_real',
      lastUpdated: new Date().toISOString()
    };
    
    return financialData;
    
  } catch (error) {
    console.error('XBRL解析エラー:', error);
    throw new Error('XBRLデータの解析に失敗しました');
  }
}

/**
 * コンテキスト情報を抽出
 */
function extractContexts(xbrl) {
  const contexts = {};
  const contextElements = findElements(xbrl, 'context');
  
  contextElements.forEach(ctx => {
    const id = ctx.id;
    const period = ctx.period?.[0];
    
    if (period) {
      contexts[id] = {
        startDate: period.startDate?.[0],
        endDate: period.endDate?.[0],
        instant: period.instant?.[0]
      };
    }
  });
  
  return contexts;
}

/**
 * ファクト（数値データ）を抽出
 */
function extractFacts(xbrl) {
  const facts = {};
  
  // すべての要素を走査してファクトを収集
  function collectFacts(obj, path = '') {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'object' && item.contextRef) {
            // ファクトを発見
            const factKey = path ? `${path}.${key}` : key;
            if (!facts[factKey]) facts[factKey] = [];
            facts[factKey].push({
              value: item._ || item.$text || item,
              contextRef: item.contextRef,
              unitRef: item.unitRef,
              decimals: item.decimals
            });
          } else {
            collectFacts(item, `${path}.${key}[${index}]`);
          }
        });
      } else {
        collectFacts(value, path ? `${path}.${key}` : key);
      }
    }
  }
  
  collectFacts(xbrl);
  return facts;
}

/**
 * 要素を再帰的に検索
 */
function findElements(obj, elementName, results = []) {
  if (typeof obj !== 'object' || obj === null) return results;
  
  for (const [key, value] of Object.entries(obj)) {
    if (key === elementName || key.endsWith(`:${elementName}`)) {
      if (Array.isArray(value)) {
        results.push(...value);
      } else {
        results.push(value);
      }
    }
    
    if (Array.isArray(value)) {
      value.forEach(item => findElements(item, elementName, results));
    } else if (typeof value === 'object') {
      findElements(value, elementName, results);
    }
  }
  
  return results;
}

/**
 * 当期のコンテキストIDを特定
 */
function findCurrentPeriodContext(contexts, fiscalYear) {
  const targetEndDate = `${fiscalYear + 1}-03-31`;
  
  for (const [id, context] of Object.entries(contexts)) {
    if (context.endDate === targetEndDate && 
        context.startDate === `${fiscalYear}-04-01`) {
      return id;
    }
  }
  
  // 見つからない場合は近い日付を探す
  for (const [id, context] of Object.entries(contexts)) {
    if (context.endDate && 
        context.endDate.startsWith(`${fiscalYear + 1}`) &&
        context.startDate && 
        context.startDate.startsWith(`${fiscalYear}`)) {
      return id;
    }
  }
  
  return null;
}

/**
 * 企業名を抽出
 */
function extractCompanyName(xbrl) {
  const nameElements = findElements(xbrl, 'CompanyName');
  if (nameElements.length > 0) {
    return nameElements[0]._ || nameElements[0].$text || nameElements[0];
  }
  
  // 別のタグ名も試す
  const filerNameElements = findElements(xbrl, 'FilerName');
  if (filerNameElements.length > 0) {
    return filerNameElements[0]._ || filerNameElements[0].$text || filerNameElements[0];
  }
  
  return null;
}

/**
 * 数値を抽出
 */
function extractNumericValue(facts, possibleKeys, contextId) {
  for (const key of possibleKeys) {
    // 完全一致を試す
    if (facts[key]) {
      const fact = facts[key].find(f => f.contextRef === contextId);
      if (fact && fact.value) {
        return parseFloat(fact.value.replace(/,/g, ''));
      }
    }
    
    // 部分一致を試す
    for (const [factKey, factValues] of Object.entries(facts)) {
      if (factKey.includes(key)) {
        const fact = factValues.find(f => f.contextRef === contextId);
        if (fact && fact.value) {
          return parseFloat(fact.value.replace(/,/g, ''));
        }
      }
    }
  }
  
  return 0;
}

/**
 * 有利子負債を計算
 */
function calculateInterestBearingDebt(facts, contextId) {
  const shortTermDebt = extractNumericValue(facts, [
    'ShortTermLoansPayable',
    'ShortTermBorrowings',
    'CurrentPortionOfLongTermLoansPayable'
  ], contextId);
  
  const longTermDebt = extractNumericValue(facts, [
    'LongTermLoansPayable',
    'LongTermDebt',
    'LongTermBorrowings'
  ], contextId);
  
  const bonds = extractNumericValue(facts, [
    'BondsPayable',
    'CorporateBonds'
  ], contextId);
  
  return shortTermDebt + longTermDebt + bonds;
}

/**
 * 実効税率を計算
 */
function calculateTaxRate(facts, contextId) {
  const incomeTaxes = extractNumericValue(facts, [
    'IncomeTaxes',
    'IncomeTaxesCurrent',
    'CorporateIncomeTaxes'
  ], contextId);
  
  const incomeBeforeTax = extractNumericValue(facts, [
    'IncomeBeforeIncomeTaxes',
    'ProfitBeforeIncomeTaxes',
    'IncomeBeforeTax'
  ], contextId);
  
  if (incomeBeforeTax > 0) {
    return incomeTaxes / incomeBeforeTax;
  }
  
  return 0.3; // デフォルト30%
}