/**
 * XBRL詳細デバッグエンドポイント
 * real-financial.jsの内部動作を詳細に可視化
 */

const https = require('https');
const unzipper = require('unzipper');
const { parseStringPromise } = require('xml2js');

module.exports = async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
    const { edinetCode = 'E02144', fiscalYear = '2024' } = req.query;
    const year = parseInt(fiscalYear);
    
    console.log(`🔍 XBRL詳細デバッグ開始: ${edinetCode} ${year}年度`);

    const apiKey = process.env.EDINET_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'API_KEY_NOT_CONFIGURED'
      });
    }

    // 1. 書類検索
    const documents = await searchDocuments(edinetCode, year, apiKey);
    
    if (!documents || documents.length === 0) {
      return res.status(404).json({
        success: false,
        error: '書類が見つかりません',
        debugInfo: { edinetCode, year, searchResults: documents }
      });
    }

    const targetDoc = documents[0];
    console.log(`📄 対象書類: ${targetDoc.docID}`);

    // 2. XBRLデータ取得
    const xbrlData = await fetchXBRLData(targetDoc.docID, apiKey);
    console.log(`📏 XBRLサイズ: ${xbrlData.length} 文字`);

    // 3. XBRL解析
    const result = await parseStringPromise(xbrlData, {
      tagNameProcessors: [(name) => name.split(':').pop()],
      ignoreAttrs: false,
      mergeAttrs: true
    });

    const xbrl = result.xbrl || result;
    
    // 4. コンテキスト抽出
    const contexts = extractContexts(xbrl);
    console.log(`📅 コンテキスト数: ${Object.keys(contexts).length}`);
    
    // 5. ファクト抽出
    const facts = extractFacts(xbrl);
    console.log(`💰 ファクト数: ${Object.keys(facts).length}`);
    
    // 6. 当期コンテキスト特定
    const currentPeriodContextId = findCurrentPeriodContext(contexts, year);
    console.log(`🎯 当期コンテキスト: ${currentPeriodContextId}`);
    
    // 7. 財務データ抽出テスト
    const debugResults = {
      document: {
        docID: targetDoc.docID,
        docDescription: targetDoc.docDescription,
        periodEnd: targetDoc.periodEnd
      },
      xbrlStructure: {
        rootElements: Object.keys(result),
        xbrlChildElements: Object.keys(xbrl).slice(0, 20), // 最初の20個のみ
        totalChildElements: Object.keys(xbrl).length
      },
      contexts: {
        total: Object.keys(contexts).length,
        currentPeriodContextId: currentPeriodContextId,
        availableContexts: Object.keys(contexts).slice(0, 10), // 最初の10個
        currentPeriodContext: contexts[currentPeriodContextId]
      },
      facts: {
        total: Object.keys(facts).length,
        salesRelated: findFactsContaining(facts, ['Sales', 'Revenue', 'Operating']),
        profitRelated: findFactsContaining(facts, ['Profit', 'Income', 'Operating']),
        assetRelated: findFactsContaining(facts, ['Assets', 'Total'])
      },
      extractionTests: {
        netSales: testExtraction(facts, [
          'OperatingRevenuesIFRSKeyFinancialData',
          'RevenueIFRS', 
          'NetSales'
        ], currentPeriodContextId),
        operatingIncome: testExtraction(facts, [
          'ProfitLossFromOperatingActivitiesIFRS',
          'OperatingIncomeIFRS',
          'ProfitLossBeforeTaxIFRSSummaryOfBusinessResults'
        ], currentPeriodContextId),
        totalAssets: testExtraction(facts, [
          'TotalAssetsIFRSSummaryOfBusinessResults',
          'AssetsIFRS',
          'Assets'
        ], currentPeriodContextId)
      }
    };

    return res.status(200).json({
      success: true,
      debugInfo: debugResults,
      message: 'XBRL詳細デバッグ情報'
    });

  } catch (error) {
    console.error('デバッグエラー:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}

// 書類検索
async function searchDocuments(edinetCode, fiscalYear, apiKey) {
  const submissionYear = fiscalYear + 1;
  const targetDates = [
    `${submissionYear}-06-18`, `${submissionYear}-06-19`, `${submissionYear}-06-20`
  ];
  
  const allDocuments = [];
  
  for (const date of targetDates) {
    try {
      const documents = await fetchDocumentList(date, apiKey);
      const targetDocs = documents.filter(doc => 
        doc.edinetCode === edinetCode &&
        doc.docTypeCode === '120'
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

// 書類一覧取得
function fetchDocumentList(date, apiKey) {
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

// XBRL取得
function fetchXBRLData(docID, apiKey) {
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

// ZIP解凍
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

// コンテキスト抽出
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

// ファクト抽出
function extractFacts(xbrl) {
  const facts = {};
  
  function collectFacts(obj, path = '') {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'object' && item.contextRef) {
            if (!facts[key]) facts[key] = [];
            facts[key].push({
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

// 要素検索
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

// 当期コンテキスト特定
function findCurrentPeriodContext(contexts, fiscalYear) {
  const contextPatterns = [
    'CurrentYearDuration',
    'CurrentYearInstant', 
    `${fiscalYear}Duration`,
    `FY${fiscalYear}Duration`
  ];
  
  for (const pattern of contextPatterns) {
    for (const [id] of Object.entries(contexts)) {
      if (id.includes(pattern) || id === pattern) {
        return id;
      }
    }
  }
  
  // フォールバック
  for (const [id] of Object.entries(contexts)) {
    if (id.includes('CurrentYear')) {
      return id;
    }
  }
  
  return Object.keys(contexts)[0] || null;
}

// ファクト検索
function findFactsContaining(facts, searchTerms) {
  const results = [];
  
  for (const [key, factArray] of Object.entries(facts)) {
    if (searchTerms.some(term => key.toLowerCase().includes(term.toLowerCase()))) {
      results.push({
        key: key,
        count: factArray.length,
        contexts: factArray.map(f => f.contextRef),
        sampleValue: factArray[0]?.value
      });
    }
  }
  
  return results.slice(0, 10); // 最初の10個
}

// 抽出テスト
function testExtraction(facts, possibleKeys, contextId) {
  const results = {
    contextId: contextId,
    searchKeys: possibleKeys,
    matches: []
  };
  
  for (const key of possibleKeys) {
    if (facts[key]) {
      const fact = facts[key].find(f => f.contextRef === contextId);
      if (fact && fact.value) {
        results.matches.push({
          key: key,
          value: fact.value,
          contextRef: fact.contextRef,
          status: 'exact_match'
        });
        return results;
      }
    }
    
    // 部分一致
    for (const [factKey, factValues] of Object.entries(facts)) {
      if (factKey.includes(key)) {
        const fact = factValues.find(f => f.contextRef === contextId);
        if (fact && fact.value) {
          results.matches.push({
            key: factKey,
            value: fact.value,
            contextRef: fact.contextRef,
            status: 'partial_match'
          });
        }
      }
    }
  }
  
  return results;
}