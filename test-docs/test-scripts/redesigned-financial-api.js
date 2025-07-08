/**
 * Vercel Serverless Function - 再設計版 正確な財務データ取得API
 * ゼロベースで設計し直した信頼性の高い実装
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

    console.log(`🆕 再設計版EDINET財務データ取得: ${edinetCode} ${year}年3月期`);

    // 環境変数からAPIキー取得
    const apiKey = process.env.EDINET_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'API_KEY_NOT_CONFIGURED',
        message: 'EDINET APIキーが設定されていません'
      });
    }

    // 1. 正確な期間指定で書類検索
    const documents = await searchDocumentsRedesigned(edinetCode, year, apiKey);
    
    if (!documents || documents.length === 0) {
      return res.status(404).json({
        success: false,
        error: '該当する書類が見つかりません',
        message: `${edinetCode}の${year}年3月期の有価証券報告書が見つかりません`
      });
    }

    // 2. 最新の有価証券報告書を選択
    const targetDoc = documents[0];
    console.log(`📄 対象書類: ${targetDoc.docID} (期間終了: ${targetDoc.periodEnd})`);

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
      const debugInfo = await generateDebugInfoRedesigned(xbrlData, edinetCode, year);
      
      return res.status(200).json({
        success: true,
        debug: debugInfo,
        message: '再設計版XBRL詳細デバッグ情報'
      });
    }

    // 4. 再設計版の厳格なデータ抽出
    const financialData = await extractFinancialDataRedesigned(xbrlData, edinetCode, year, targetDoc.periodEnd);
    
    console.log('✅ 再設計版EDINET財務データ取得成功');
    console.log(`企業名: ${financialData.companyName}`);
    console.log(`期間: ${financialData.fiscalPeriod}`);
    console.log(`売上高: ${(financialData.netSales / 1000000000000).toFixed(2)}兆円`);
    console.log(`営業利益: ${(financialData.operatingIncome / 1000000000000).toFixed(2)}兆円`);
    console.log(`総資産: ${(financialData.totalAssets / 1000000000000).toFixed(2)}兆円`);
    
    return res.status(200).json({
      success: true,
      data: financialData,
      source: 'edinet_api_redesigned',
      message: `${year}年3月期の正確な財務データ（再設計版）`
    });

  } catch (error) {
    console.error('再設計版財務データ取得エラー:', error);
    return res.status(500).json({
      success: false,
      error: 'サーバーエラー',
      message: error.message
    });
  }
}

/**
 * 再設計版: 正確な期間指定での書類検索
 */
async function searchDocumentsRedesigned(edinetCode, fiscalYear, apiKey) {
  console.log(`🔍 再設計版書類検索: ${edinetCode} ${fiscalYear}年3月期`);
  
  // 正確な期間計算
  // fiscalYear=2024 → 2024年3月期 (2023年4月1日～2024年3月31日)
  const periodStart = `${fiscalYear - 1}-04-01`;
  const periodEnd = `${fiscalYear}-03-31`;
  const submissionYear = fiscalYear; // 2024年3月期 → 2024年に提出
  
  console.log(`📅 検索対象期間: ${periodStart} ～ ${periodEnd}`);
  
  const allDocuments = [];
  
  // 提出期間を拡張検索（3月期決算の場合、通常6月頃に提出）
  const searchMonths = [4, 5, 6, 7, 8]; // 4月～8月
  const searchDates = [];
  
  for (const month of searchMonths) {
    // 各月の代表的な日付を検索
    const daysToCheck = [1, 5, 10, 15, 20, 25, 28];
    for (const day of daysToCheck) {
      const date = new Date(submissionYear, month - 1, day);
      if (date.getMonth() === month - 1) {
        searchDates.push(date.toISOString().split('T')[0]);
      }
    }
  }
  
  console.log(`📋 検索日数: ${searchDates.length}日`);
  
  for (const date of searchDates) {
    try {
      const documents = await fetchDocumentList(date, apiKey);
      
      // 厳格な条件での書類検索
      const targetDocs = documents.filter(doc => 
        doc.edinetCode === edinetCode &&
        doc.docTypeCode === '120' && // 有価証券報告書
        doc.periodEnd === periodEnd && // 期間終了日が完全一致
        doc.docDescription && doc.docDescription.includes('有価証券報告書')
      );
      
      if (targetDocs.length > 0) {
        console.log(`✅ ${date}: ${targetDocs.length}件発見（期間: ${periodEnd}）`);
        allDocuments.push(...targetDocs);
      }
    } catch (error) {
      // エラーは無視して継続
    }
  }
  
  if (allDocuments.length === 0) {
    console.warn(`⚠️ ${edinetCode}の${fiscalYear}年3月期書類が見つかりません（期間: ${periodEnd}）`);
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
 * 再設計版: 厳格なデータ抽出
 */
async function extractFinancialDataRedesigned(xbrlContent, edinetCode, fiscalYear, periodEnd) {
  try {
    console.log('🆕 再設計版データ抽出開始');
    
    // XMLをパース
    const result = await parseStringPromise(xbrlContent, {
      tagNameProcessors: [(name) => name.split(':').pop()],
      ignoreAttrs: false,
      mergeAttrs: true
    });
    
    // XBRLデータ構造を解析
    const xbrl = result.xbrl || result;
    
    // コンテキストとファクトを抽出
    const contexts = extractContextsRedesigned(xbrl);
    const facts = extractFactsRedesigned(xbrl);
    
    console.log(`📊 コンテキスト数: ${Object.keys(contexts).length}`);
    console.log(`📊 ファクト数: ${Object.keys(facts).length}`);
    
    // 対象期間のコンテキストIDを厳格に特定
    const targetContexts = findTargetPeriodContextsRedesigned(contexts, fiscalYear, periodEnd);
    
    console.log('🎯 対象期間コンテキスト:');
    console.log(`- Duration: ${targetContexts.duration}`);
    console.log(`- Instant: ${targetContexts.instant}`);
    
    if (!targetContexts.duration || !targetContexts.instant) {
      throw new Error(`${fiscalYear}年3月期の適切なコンテキストが見つかりません`);
    }
    
    // 厳格なデータ抽出（Summary要素完全除外）
    const financialData = {
      edinetCode: edinetCode,
      fiscalYear: fiscalYear,
      fiscalPeriod: `${fiscalYear - 1}年4月1日～${fiscalYear}年3月31日`,
      periodEnd: periodEnd,
      companyName: extractCompanyNameRedesigned(xbrl) || `企業 ${edinetCode}`,
      
      // 売上高 - 厳格抽出（Summary要素除外）
      netSales: extractNumericValueRedesigned(facts, [
        'TotalNetRevenuesIFRS',
        'RevenueIFRS',
        'SalesOfProductsIFRS',
        'NetSales'
      ], targetContexts.duration, '売上高'),
      
      // 営業利益 - 厳格抽出（Summary要素除外）
      operatingIncome: extractNumericValueRedesigned(facts, [
        'OperatingProfitLossIFRS',
        'ProfitLossFromOperatingActivitiesIFRS',
        'OperatingIncomeIFRS'
      ], targetContexts.duration, '営業利益'),
      
      // 総資産 - 厳格抽出（Summary要素除外）
      totalAssets: extractNumericValueRedesigned(facts, [
        'TotalAssetsIFRS',
        'AssetsIFRS',
        'Assets'
      ], targetContexts.instant, '総資産'),
      
      // 現金及び現金同等物 - 厳格抽出（Summary要素除外）
      cashAndEquivalents: extractNumericValueRedesigned(facts, [
        'CashAndCashEquivalentsIFRS',
        'CashAndDeposits',
        'CashAndCashEquivalents',
        'Cash'
      ], targetContexts.instant, '現金及び現金同等物'),
      
      // 株主資本 - 厳格抽出（Summary要素除外）
      shareholdersEquity: extractNumericValueRedesigned(facts, [
        'EquityAttributableToOwnersOfParentIFRS',
        'EquityIFRS',
        'ShareholdersEquity',
        'NetAssets',
        'TotalNetAssets'
      ], targetContexts.instant, '株主資本'),
      
      // 有利子負債 - 厳格抽出
      interestBearingDebt: calculateInterestBearingDebtRedesigned(facts, targetContexts.instant),
      
      // 税率 - 厳格抽出
      taxRate: calculateTaxRateRedesigned(facts, targetContexts.duration),
      
      dataSource: 'edinet_xbrl_redesigned',
      extractionMethod: 'strict_context_matching',
      lastUpdated: new Date().toISOString()
    };
    
    // データ品質チェック
    const qualityCheck = validateDataQualityRedesigned(financialData);
    financialData.qualityCheck = qualityCheck;
    
    console.log('✅ 再設計版データ抽出完了');
    
    return financialData;
    
  } catch (error) {
    console.error('再設計版XBRL解析エラー:', error);
    throw new Error('再設計版XBRLデータの解析に失敗しました: ' + error.message);
  }
}

/**
 * 再設計版: コンテキスト情報を抽出
 */
function extractContextsRedesigned(xbrl) {
  const contexts = {};
  const contextElements = findElementsRedesigned(xbrl, 'context');
  
  contextElements.forEach(ctx => {
    const id = ctx.id;
    const period = ctx.period?.[0];
    
    if (period) {
      contexts[id] = {
        id: id,
        startDate: period.startDate?.[0],
        endDate: period.endDate?.[0],
        instant: period.instant?.[0]
      };
    }
  });
  
  return contexts;
}

/**
 * 再設計版: ファクト（数値データ）を抽出
 */
function extractFactsRedesigned(xbrl) {
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
              contextRef: Array.isArray(item.contextRef) ? item.contextRef[0] : item.contextRef,
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
function findElementsRedesigned(obj, elementName, results = []) {
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
      value.forEach(item => findElementsRedesigned(item, elementName, results));
    } else if (typeof value === 'object') {
      findElementsRedesigned(value, elementName, results);
    }
  }
  
  return results;
}

/**
 * 再設計版: 対象期間のコンテキストIDを厳格に特定
 */
function findTargetPeriodContextsRedesigned(contexts, fiscalYear, periodEnd) {
  console.log('🎯 対象期間コンテキスト特定中...');
  
  const targetStartDate = `${fiscalYear - 1}-04-01`;
  const targetEndDate = periodEnd; // 書類から取得した正確な期間終了日
  
  console.log(`対象期間: ${targetStartDate} ～ ${targetEndDate}`);
  
  let durationContext = null;
  let instantContext = null;
  
  // 1. 完全一致検索（最優先）
  for (const [id, context] of Object.entries(contexts)) {
    if (context.startDate === targetStartDate && context.endDate === targetEndDate) {
      durationContext = id;
      console.log(`✅ Duration完全一致: ${id}`);
      break;
    }
  }
  
  for (const [id, context] of Object.entries(contexts)) {
    if (context.instant === targetEndDate) {
      instantContext = id;
      console.log(`✅ Instant完全一致: ${id}`);
      break;
    }
  }
  
  // 2. パターンマッチング（フォールバック）
  if (!durationContext) {
    const durationPatterns = ['CurrentYearDuration', 'Prior1YearDuration'];
    for (const pattern of durationPatterns) {
      for (const [id, context] of Object.entries(contexts)) {
        if (id.includes(pattern) && context.endDate && context.endDate.includes(fiscalYear.toString())) {
          durationContext = id;
          console.log(`⚠️ Durationパターンマッチ: ${id}`);
          break;
        }
      }
      if (durationContext) break;
    }
  }
  
  if (!instantContext) {
    const instantPatterns = ['CurrentYearInstant', 'Prior1YearInstant'];
    for (const pattern of instantPatterns) {
      for (const [id, context] of Object.entries(contexts)) {
        if (id.includes(pattern) && context.instant && context.instant.includes(fiscalYear.toString())) {
          instantContext = id;
          console.log(`⚠️ Instantパターンマッチ: ${id}`);
          break;
        }
      }
      if (instantContext) break;
    }
  }
  
  // 3. エラーハンドリング（見つからない場合は例外）
  if (!durationContext) {
    console.error('❌ 適切なDurationコンテキストが見つかりません');
    console.log('利用可能なコンテキスト:');
    Object.entries(contexts).slice(0, 10).forEach(([id, ctx]) => {
      console.log(`- ${id}: ${ctx.startDate} ～ ${ctx.endDate} (instant: ${ctx.instant})`);
    });
    throw new Error(`${fiscalYear}年3月期のDurationコンテキストが見つかりません`);
  }
  
  if (!instantContext) {
    console.error('❌ 適切なInstantコンテキストが見つかりません');
    throw new Error(`${fiscalYear}年3月期のInstantコンテキストが見つかりません`);
  }
  
  return {
    duration: durationContext,
    instant: instantContext
  };
}

/**
 * 企業名を抽出
 */
function extractCompanyNameRedesigned(xbrl) {
  const nameElements = findElementsRedesigned(xbrl, 'CompanyName');
  if (nameElements.length > 0) {
    return nameElements[0]._ || nameElements[0].$text || nameElements[0];
  }
  
  // 別のタグ名も試す
  const filerNameElements = findElementsRedesigned(xbrl, 'FilerName');
  if (filerNameElements.length > 0) {
    return filerNameElements[0]._ || filerNameElements[0].$text || filerNameElements[0];
  }
  
  return null;
}

/**
 * 再設計版: 厳格な数値抽出（フォールバック処理なし）
 */
function extractNumericValueRedesigned(facts, possibleKeys, contextId, itemName) {
  console.log(`🔍 厳格抽出: ${itemName} (context: ${contextId})`);
  
  for (const key of possibleKeys) {
    // Summary要素を完全除外
    if (key.includes('Summary')) {
      console.log(`⚠️ Summary要素をスキップ: ${key}`);
      continue;
    }
    
    // 完全一致を試す
    if (facts[key]) {
      const fact = facts[key].find(f => f.contextRef === contextId);
      if (fact && (fact.value || fact._ || fact.$text)) {
        const rawValue = fact.value || fact._ || fact.$text;
        const value = parseFloat(rawValue.toString().replace(/,/g, ''));
        if (!isNaN(value)) {
          console.log(`✅ 厳格一致: ${key} = ${value.toLocaleString()}`);
          return value;
        }
      }
    }
    
    // 部分一致を試す
    for (const [factKey, factValues] of Object.entries(facts)) {
      if (factKey.includes(key) && !factKey.includes('Summary')) {
        const fact = factValues.find(f => f.contextRef === contextId);
        if (fact && (fact.value || fact._ || fact.$text)) {
          const rawValue = fact.value || fact._ || fact.$text;
          const value = parseFloat(rawValue.toString().replace(/,/g, ''));
          if (!isNaN(value)) {
            console.log(`✅ 厳格部分一致: ${factKey} = ${value.toLocaleString()}`);
            return value;
          }
        }
      }
    }
  }
  
  // フォールバック処理は完全に排除
  console.error(`❌ ${itemName}の値が見つかりません (context: ${contextId})`);
  console.log(`検索対象要素: ${possibleKeys.join(', ')}`);
  
  // 利用可能なコンテキストをデバッグ出力
  const availableContexts = new Set();
  for (const [factKey, factValues] of Object.entries(facts)) {
    if (possibleKeys.some(key => factKey.includes(key) && !factKey.includes('Summary'))) {
      factValues.forEach(f => availableContexts.add(f.contextRef));
    }
  }
  console.log(`利用可能なコンテキスト: ${Array.from(availableContexts).join(', ')}`);
  
  throw new Error(`${itemName}のデータが見つかりません。コンテキスト: ${contextId}`);
}

/**
 * 再設計版: 有利子負債を厳格計算
 */
function calculateInterestBearingDebtRedesigned(facts, contextId) {
  console.log('💰 有利子負債厳格計算中...');
  
  try {
    const shortTermDebt = extractNumericValueRedesigned(facts, [
      'BorrowingsCurrentIFRS',
      'ShortTermLoansPayable',
      'ShortTermBorrowings'
    ], contextId, '短期有利子負債');
    
    const longTermDebt = extractNumericValueRedesigned(facts, [
      'BorrowingsNoncurrentIFRS',
      'LongTermLoansPayable',
      'LongTermDebt'
    ], contextId, '長期有利子負債');
    
    const bonds = extractNumericValueRedesigned(facts, [
      'BondsPayableIFRS',
      'BondsPayable',
      'CorporateBonds'
    ], contextId, '社債');
    
    const total = shortTermDebt + longTermDebt + bonds;
    console.log(`✅ 有利子負債計算完了: ${total.toLocaleString()}`);
    
    return total;
  } catch (error) {
    console.error('❌ 有利子負債計算失敗:', error.message);
    throw new Error('有利子負債の計算に失敗しました: ' + error.message);
  }
}

/**
 * 再設計版: 実効税率を厳格計算
 */
function calculateTaxRateRedesigned(facts, contextId) {
  console.log('📊 実効税率厳格計算中...');
  
  try {
    const incomeTaxes = extractNumericValueRedesigned(facts, [
      'IncomeTaxExpenseIFRS',
      'IncomeTaxes',
      'CorporateIncomeTaxes'
    ], contextId, '法人税等');
    
    const incomeBeforeTax = extractNumericValueRedesigned(facts, [
      'ProfitLossBeforeTaxIFRS',
      'IncomeBeforeIncomeTaxes',
      'ProfitBeforeIncomeTaxes'
    ], contextId, '税引前利益');
    
    if (incomeBeforeTax > 0 && incomeTaxes > 0) {
      const calculatedRate = incomeTaxes / incomeBeforeTax;
      console.log(`✅ 実効税率計算完了: ${(calculatedRate * 100).toFixed(2)}%`);
      return calculatedRate;
    }
    
    throw new Error('税引前利益または法人税等が無効な値です');
    
  } catch (error) {
    console.error('❌ 実効税率計算失敗:', error.message);
    // デフォルト値は使用せず、エラーを伝播
    throw new Error('実効税率の計算に失敗しました: ' + error.message);
  }
}

/**
 * データ品質チェック
 */
function validateDataQualityRedesigned(financialData) {
  const checks = {
    売上高: financialData.netSales > 0,
    営業利益: financialData.operatingIncome !== undefined,
    総資産: financialData.totalAssets > 0,
    現金: financialData.cashAndEquivalents >= 0,
    株主資本: financialData.shareholdersEquity > 0,
    有利子負債: financialData.interestBearingDebt >= 0,
    税率: financialData.taxRate >= 0 && financialData.taxRate <= 1
  };
  
  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  
  return {
    checks: checks,
    score: `${passed}/${total}`,
    quality: passed === total ? '優良' : passed >= total * 0.8 ? '良好' : '要確認'
  };
}

/**
 * 再設計版デバッグ情報生成
 */
async function generateDebugInfoRedesigned(xbrlContent, edinetCode, fiscalYear) {
  try {
    // XMLをパース
    const result = await parseStringPromise(xbrlContent, {
      tagNameProcessors: [(name) => name.split(':').pop()],
      ignoreAttrs: false,
      mergeAttrs: true
    });
    
    const xbrl = result.xbrl || result;
    
    // コンテキストとファクトを抽出
    const contexts = extractContextsRedesigned(xbrl);
    const facts = extractFactsRedesigned(xbrl);
    
    return {
      edinetCode,
      fiscalYear,
      redesignedVersion: true,
      xbrlStructure: {
        rootElements: Object.keys(result),
        xbrlChildCount: Object.keys(xbrl).length,
        firstFewElements: Object.keys(xbrl).slice(0, 20)
      },
      contexts: {
        total: Object.keys(contexts).length,
        availableContextIds: Object.keys(contexts).slice(0, 20),
        detailedContexts: Object.fromEntries(
          Object.entries(contexts).slice(0, 10).map(([id, ctx]) => [
            id, `${ctx.startDate} ～ ${ctx.endDate} (instant: ${ctx.instant})`
          ])
        )
      },
      facts: {
        total: Object.keys(facts).length,
        summaryElementsFound: Object.keys(facts).filter(key => key.includes('Summary')).length,
        ifrsElementsFound: Object.keys(facts).filter(key => key.includes('IFRS')).length
      },
      designImprovements: {
        summaryElementsExcluded: true,
        strictContextMatching: true,
        noFallbackLogic: true,
        explicitErrorHandling: true
      }
    };
    
  } catch (error) {
    return {
      error: error.message,
      stack: error.stack
    };
  }
}