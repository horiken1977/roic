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
    const { edinetCode, fiscalYear, debug } = req.query;

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

    // 4. デバッグモード判定
    if (debug === 'true') {
      // デバッグ情報を詳細出力
      const debugInfo = await generateDebugInfo(xbrlData, edinetCode, year);
      
      return res.status(200).json({
        success: true,
        debug: debugInfo,
        message: 'XBRL詳細デバッグ情報'
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
  console.log(`🔍 書類検索開始: ${edinetCode} ${fiscalYear}年度`);
  
  const allDocuments = [];
  const submissionYear = fiscalYear + 1;
  
  // 段階1: 拡張検索範囲（既知の成功日付 + 拡張）
  const knownSuccessDates = [
    `${submissionYear}-06-18`, `${submissionYear}-06-19`, `${submissionYear}-06-20`,
    `${submissionYear}-06-25`, `${submissionYear}-06-26`, `${submissionYear}-06-27`
  ];
  
  // 拡張検索範囲（4月〜8月）
  const searchMonths = [4, 5, 6, 7, 8];
  const expandedDates = [];
  
  for (const month of searchMonths) {
    // 各月の代表的な日付を検索
    const daysToCheck = [1, 10, 15, 20, 25, 28];
    for (const day of daysToCheck) {
      const date = new Date(submissionYear, month - 1, day);
      if (date.getMonth() === month - 1) {
        expandedDates.push(date.toISOString().split('T')[0]);
      }
    }
  }
  
  // 既知の成功日付を優先し、その後拡張検索
  const searchDates = [...knownSuccessDates, ...expandedDates];
  
  console.log(`📅 検索日数: ${searchDates.length}日`);
  
  for (const date of searchDates) {
    try {
      const documents = await fetchDocumentList(date, apiKey);
      
      // 対象企業の有価証券報告書を検索
      const targetDocs = documents.filter(doc => 
        doc.edinetCode === edinetCode &&
        doc.docTypeCode === '120' && // 有価証券報告書
        doc.periodEnd && (
          // フォールバック: 既知の成功パターンも含める
          isTargetFiscalYear(doc.periodEnd, fiscalYear) ||
          doc.periodEnd.includes(`${fiscalYear + 1}-03-31`) // トヨタなど3月決算用
        )
      );
      
      if (targetDocs.length > 0) {
        console.log(`✅ ${date}: ${targetDocs.length}件発見`);
        allDocuments.push(...targetDocs);
      }
    } catch (error) {
      // エラーは無視して継続
    }
  }
  
  if (allDocuments.length === 0) {
    console.warn(`⚠️ ${edinetCode}の${fiscalYear}年度書類が見つかりません`);
  }
  
  // 提出日で降順ソート（最新のものを優先）
  return allDocuments.sort((a, b) => 
    new Date(b.submitDateTime) - new Date(a.submitDateTime)
  );
}

/**
 * 対象年度の判定（決算期に依存しない）
 */
function isTargetFiscalYear(periodEnd, fiscalYear) {
  const endDate = new Date(periodEnd);
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth() + 1;
  
  // 1-3月決算: fiscalYear + 1年
  // 4-12月決算: fiscalYear年
  if (endMonth >= 1 && endMonth <= 3) {
    return endYear === fiscalYear + 1;
  } else {
    return endYear === fiscalYear;
  }
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
      
      // 売上高 (IFRS対応)
      netSales: extractNumericValue(facts, [
        'TotalNetRevenuesIFRS',
        'SalesOfProductsIFRS',
        'OperatingRevenuesIFRSKeyFinancialData',
        'RevenueIFRS', 
        'NetSales',
        'NetSalesOfCompletedConstructionContracts', 
        'OperatingRevenue',
        'OrdinaryRevenues',
        'Revenues'
      ], currentPeriodContextId),
      
      // 営業利益 (IFRS対応)
      operatingIncome: extractNumericValue(facts, [
        'OperatingProfitLossIFRS',
        'ProfitLossFromOperatingActivitiesIFRS',
        'OperatingIncomeIFRS',
        'ProfitLossBeforeTaxIFRSSummaryOfBusinessResults',
        'OperatingIncome',
        'OperatingProfit'
      ], currentPeriodContextId),
      
      // 総資産 (IFRS対応) - Instantコンテキスト使用
      totalAssets: extractNumericValue(facts, [
        'AssetsIFRS',
        'TotalAssetsIFRSSummaryOfBusinessResults',
        'Assets',
        'TotalAssets'
      ], 'CurrentYearInstant'),
      
      // 現金及び現金同等物 (IFRS対応)
      cashAndEquivalents: extractNumericValue(facts, [
        'CashAndCashEquivalentsIFRSSummaryOfBusinessResults',
        'CashAndCashEquivalentsIFRS',
        'CashAndDeposits',
        'CashAndCashEquivalents'
      ], currentPeriodContextId),
      
      // 株主資本/純資産 (IFRS対応)
      shareholdersEquity: extractNumericValue(facts, [
        'EquityAttributableToOwnersOfParentIFRSSummaryOfBusinessResults',
        'EquityIFRS',
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
  // 当期用のコンテキストパターンを検索
  const contextPatterns = [
    'CurrentYearDuration',
    'CurrentYearInstant', 
    `${fiscalYear}Duration`,
    `FY${fiscalYear}Duration`
  ];
  
  // パターンマッチング
  for (const pattern of contextPatterns) {
    for (const [id, context] of Object.entries(contexts)) {
      if (id.includes(pattern) || id === pattern) {
        console.log(`✅ コンテキスト発見: ${id}`);
        return id;
      }
    }
  }
  
  // フォールバック: 日付ベース検索
  const targetEndDate = `${fiscalYear + 1}-03-31`;
  for (const [id, context] of Object.entries(contexts)) {
    if (context.endDate === targetEndDate && 
        context.startDate === `${fiscalYear}-04-01`) {
      console.log(`✅ 日付ベースコンテキスト: ${id}`);
      return id;
    }
  }
  
  // 最終手段: CurrentYearを含むものを探す
  for (const [id, context] of Object.entries(contexts)) {
    if (id.includes('CurrentYear')) {
      console.log(`⚠️ フォールバックコンテキスト: ${id}`);
      return id;
    }
  }
  
  console.warn('⚠️ 適切なコンテキストが見つかりません');
  return Object.keys(contexts)[0] || null;
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
  console.log(`🔍 数値抽出: ${possibleKeys[0]} (context: ${contextId})`);
  
  for (const key of possibleKeys) {
    // 完全一致を試す
    if (facts[key]) {
      const fact = facts[key].find(f => {
        // contextRefが配列の場合に対応
        const refValue = Array.isArray(f.contextRef) ? f.contextRef[0] : f.contextRef;
        return refValue === contextId;
      });
      if (fact && fact.value) {
        const value = parseFloat(fact.value.replace(/,/g, ''));
        console.log(`✅ 完全一致発見: ${key} = ${value}`);
        return value;
      }
    }
    
    // 部分一致を試す
    for (const [factKey, factValues] of Object.entries(facts)) {
      if (factKey.includes(key)) {
        const fact = factValues.find(f => {
          // contextRefが配列の場合に対応
          const refValue = Array.isArray(f.contextRef) ? f.contextRef[0] : f.contextRef;
          return refValue === contextId;
        });
        if (fact && fact.value) {
          const value = parseFloat(fact.value.replace(/,/g, ''));
          console.log(`✅ 部分一致発見: ${factKey} = ${value}`);
          return value;
        }
      }
    }
  }
  
  // デバッグ: 利用可能なコンテキストを表示
  console.log(`⚠️ ${possibleKeys[0]} の値が見つかりません`);
  const availableContexts = new Set();
  for (const [factKey, factValues] of Object.entries(facts)) {
    if (possibleKeys.some(key => factKey.includes(key))) {
      factValues.forEach(f => {
        const refValue = Array.isArray(f.contextRef) ? f.contextRef[0] : f.contextRef;
        availableContexts.add(refValue);
      });
    }
  }
  console.log(`利用可能なコンテキスト: ${Array.from(availableContexts).join(', ')}`);
  
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

/**
 * デバッグ情報生成
 */
async function generateDebugInfo(xbrlContent, edinetCode, fiscalYear) {
  try {
    // XMLをパース
    const result = await parseStringPromise(xbrlContent, {
      tagNameProcessors: [(name) => name.split(':').pop()],
      ignoreAttrs: false,
      mergeAttrs: true
    });
    
    const xbrl = result.xbrl || result;
    
    // コンテキストとファクトを抽出
    const contexts = extractContexts(xbrl);
    const facts = extractFacts(xbrl);
    
    // 当期のコンテキストIDを特定
    const currentPeriodContextId = findCurrentPeriodContext(contexts, fiscalYear);
    
    // 財務データ要素の検索
    const salesElements = findFinancialElements(facts, ['Sales', 'Revenue', 'Operating']);
    const profitElements = findFinancialElements(facts, ['Profit', 'Income', 'Operating']);
    const assetElements = findFinancialElements(facts, ['Assets', 'Total']);
    
    return {
      edinetCode,
      fiscalYear,
      xbrlStructure: {
        rootElements: Object.keys(result),
        xbrlChildCount: Object.keys(xbrl).length,
        firstFewElements: Object.keys(xbrl).slice(0, 20)
      },
      contexts: {
        total: Object.keys(contexts).length,
        currentPeriodContextId: currentPeriodContextId,
        availableContextIds: Object.keys(contexts).slice(0, 15),
        currentPeriodContext: contexts[currentPeriodContextId]
      },
      facts: {
        total: Object.keys(facts).length,
        salesRelated: salesElements.slice(0, 10),
        profitRelated: profitElements.slice(0, 10),
        assetRelated: assetElements.slice(0, 10)
      },
      extractionTest: {
        netSales: testValueExtraction(facts, [
          'OperatingRevenuesIFRSKeyFinancialData',
          'RevenueIFRS', 
          'NetSales'
        ], currentPeriodContextId),
        operatingIncome: testValueExtraction(facts, [
          'ProfitLossFromOperatingActivitiesIFRS',
          'OperatingIncomeIFRS',
          'ProfitLossBeforeTaxIFRSSummaryOfBusinessResults'
        ], currentPeriodContextId),
        totalAssets: testValueExtraction(facts, [
          'TotalAssetsIFRSSummaryOfBusinessResults',
          'AssetsIFRS',
          'Assets'
        ], currentPeriodContextId)
      }
    };
    
  } catch (error) {
    return {
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * 財務要素検索
 */
function findFinancialElements(facts, searchTerms) {
  const elements = [];
  
  for (const [key, factArray] of Object.entries(facts)) {
    if (searchTerms.some(term => key.toLowerCase().includes(term.toLowerCase()))) {
      elements.push({
        key: key,
        count: factArray.length,
        contexts: factArray.map(f => f.contextRef).slice(0, 3),
        sampleValue: factArray[0]?.value
      });
    }
  }
  
  return elements;
}

/**
 * 値抽出テスト
 */
function testValueExtraction(facts, possibleKeys, contextId) {
  const results = {
    targetContext: contextId,
    searchKeys: possibleKeys,
    matches: [],
    allAvailableContexts: new Set()
  };
  
  for (const key of possibleKeys) {
    // 完全一致
    if (facts[key]) {
      const contextRefs = facts[key].map(f => f.contextRef);
      contextRefs.forEach(ref => results.allAvailableContexts.add(ref));
      
      const fact = facts[key].find(f => f.contextRef === contextId);
      if (fact && fact.value) {
        results.matches.push({
          key: key,
          value: fact.value,
          contextRef: fact.contextRef,
          matchType: 'exact'
        });
      }
    }
    
    // 部分一致
    for (const [factKey, factValues] of Object.entries(facts)) {
      if (factKey.includes(key)) {
        const contextRefs = factValues.map(f => f.contextRef);
        contextRefs.forEach(ref => results.allAvailableContexts.add(ref));
        
        const fact = factValues.find(f => f.contextRef === contextId);
        if (fact && fact.value) {
          results.matches.push({
            key: factKey,
            value: fact.value,
            contextRef: fact.contextRef,
            matchType: 'partial'
          });
        }
      }
    }
  }
  
  results.allAvailableContexts = Array.from(results.allAvailableContexts);
  return results;
}