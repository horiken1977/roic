/**
 * Vercel Serverless Function - EDINET財務データ取得プロキシ
 */

const https = require('https');
const SimpleXbrlParser = require('../utils/xbrl-parser');

export default async function handler(req, res) {
  // 完全なCORS ヘッダーを設定（関数の最初で設定）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Max-Age', '86400');

  // CORS プリフライト対応
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request received - sending CORS headers');
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
    if (isNaN(year) || year < 2000 || year > new Date().getFullYear()) {
      return res.status(400).json({
        success: false,
        error: '無効な年度です',
        message: '2000年以降の有効な年度を指定してください'
      });
    }

    console.log(`財務データ取得: ${edinetCode} ${year}年度`);

    // 環境変数からAPIキー取得
    const apiKey = process.env.EDINET_API_KEY;
    
    if (!apiKey) {
      console.log('EDINET_API_KEY未設定');
      return res.status(400).json({
        success: false,
        error: 'API_KEY_NOT_CONFIGURED',
        message: 'EDINET APIキーが設定されていません。管理者にお問い合わせください。'
      });
    }

    try {
      // 1. EDINET APIから企業の最新書類を検索
      console.log(`書類検索開始: ${edinetCode} ${year}年度`);
      const document = await findLatestFinancialDocument(edinetCode, year, apiKey);
      
      if (!document) {
        console.log(`書類検索失敗: ${edinetCode} ${year}年度 - 結果なし`);
        
        // より広範囲の年度で再試行
        console.log('より広範囲で再検索を試行');
        const alternativeYears = [year - 1, year + 1, year - 2];
        let alternativeDoc = null;
        
        for (const altYear of alternativeYears) {
          console.log(`代替年度で検索: ${altYear}年度`);
          alternativeDoc = await findLatestFinancialDocument(edinetCode, altYear, apiKey);
          if (alternativeDoc) {
            console.log(`代替書類発見: ${alternativeDoc.docId} (${altYear}年度)`);
            break;
          }
        }
        
        if (!alternativeDoc) {
          return res.status(404).json({
            success: false,
            error: 'DOCUMENT_NOT_FOUND',
            message: `${year}年度およびその前後の有価証券報告書が見つかりませんでした (${edinetCode})`
          });
        }
        
        document = alternativeDoc;
      }
      
      console.log(`書類検索成功: ${document.docId} (${document.periodEnd || '期間不明'})`);
      console.log(`書類詳細: ${document.docTypeName} - XBRL: ${document.xbrlFlag}`);

      // 2. XBRLデータを取得・解析
      const xbrlParser = new SimpleXbrlParser();
      const financialData = await xbrlParser.fetchAndParseXbrl(document.docId, apiKey);
      
      if (!financialData) {
        // フォールバック：サンプルデータ
        const sampleData = generateSampleFinancialData(edinetCode, year);
        return res.status(200).json({
          success: true,
          data: sampleData,
          source: 'edinet_api_fallback',
          message: `${year}年度の財務データ（XBRL解析失敗のためサンプルデータ使用）`
        });
      }

      // メタデータを追加
      financialData.edinetCode = edinetCode;
      financialData.dataSource = 'edinet_xbrl_realtime';
      financialData.lastUpdated = new Date().toISOString();
      
      // 実際に値が取得できているかチェック
      const extractedValues = Object.entries(financialData)
        .filter(([key, value]) => typeof value === 'number' && value !== 0)
        .length;
      
      console.log(`財務データ抽出完了: ${extractedValues}個の非ゼロ値を取得`);
      
      return res.status(200).json({
        success: true,
        data: financialData,
        source: 'edinet_xbrl_realtime',
        message: `${year}年度の財務データ（EDINET XBRL - リアルタイム解析、${extractedValues}項目抽出）`
      });

    } catch (xbrlError) {
      console.error('XBRL解析エラー:', xbrlError);
      
      // フォールバック：サンプルデータ
      const sampleData = generateSampleFinancialData(edinetCode, year);
      return res.status(200).json({
        success: true,
        data: sampleData,
        source: 'edinet_api_fallback',
        message: `${year}年度の財務データ（XBRL解析エラーのためサンプルデータ使用）`
      });
    }

  } catch (error) {
    console.error('財務データ取得エラー:', error);
    
    // エラー時もCORSヘッダーを確実に設定
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    return res.status(500).json({
      success: false,
      error: 'FINANCIAL_DATA_ERROR',
      message: `財務データ取得中にエラーが発生しました: ${error.message}`
    });
  }
}

/**
 * 指定企業・年度の最新財務書類を検索
 */
async function findLatestFinancialDocument(edinetCode, fiscalYear, apiKey) {
  try {
    // 検索対象期間を設定（指定年度の前後6ヶ月）
    const searchDates = getFinancialReportDates(fiscalYear);
    
    console.log(`書類検索: ${edinetCode} ${fiscalYear}年度 (${searchDates.length}日分)`);
    
    for (const date of searchDates.slice(0, 50)) { // 最初の50日分を検索して確率向上
      try {
        const documents = await fetchDocumentsForDate(date, apiKey);
        console.log(`${date}: ${documents.length}件の書類をチェック中...`);
        
        // 指定企業の書類があるかチェック
        const companyDocs = documents.filter(doc => doc.edinetCode === edinetCode);
        if (companyDocs.length > 0) {
          console.log(`${date}: ${edinetCode}の書類${companyDocs.length}件発見`);
          companyDocs.forEach(doc => {
            console.log(`  - DocID: ${doc.docId}`);
            console.log(`  - Type: ${doc.docTypeCode} ${doc.docTypeName}`);
            console.log(`  - XBRL: ${doc.xbrlFlag}, Period: ${doc.periodEnd}`);
            console.log(`  - Submitted: ${doc.submitDate}`);
          });
        } else if (documents.length > 0) {
          // 三菱電機関連の企業コードを探す
          const mitsubishiRelated = documents.filter(doc => 
            doc.filerName && doc.filerName.includes('三菱')
          );
          if (mitsubishiRelated.length > 0) {
            console.log(`${date}: 三菱関連企業${mitsubishiRelated.length}件発見`);
            mitsubishiRelated.forEach(doc => {
              console.log(`  - ${doc.edinetCode}: ${doc.filerName} (${doc.docTypeName})`);
            });
          }
        }
        
        // 指定企業の財務関連書類を検索（条件を大幅に緩和）
        const allCompanyDocs = documents.filter(doc => doc.edinetCode === edinetCode);
        const potentialDocs = allCompanyDocs.filter(doc => 
          doc.xbrlFlag === '1' // XBRLがあるもの全て
        );
        
        if (allCompanyDocs.length > 0) {
          console.log(`${date}: ${edinetCode}の全書類${allCompanyDocs.length}件`);
          allCompanyDocs.forEach((doc, idx) => {
            console.log(`  ${idx+1}. ${doc.docTypeCode} (XBRL:${doc.xbrlFlag}) ${doc.docTypeName}`);
          });
        }
        
        if (potentialDocs.length > 0) {
          console.log(`${date}: ${edinetCode}の候補書類${potentialDocs.length}件`);
          potentialDocs.forEach(doc => {
            console.log(`  - ${doc.docTypeCode} ${doc.docTypeName} (期間終了: ${doc.periodEnd})`);
          });
        }
        
        // 書類の優先順位を設定（有価証券報告書 > 四半期報告書 > その他）
        const financialDoc = potentialDocs.find(doc => doc.docTypeCode === '120') ||  // 有価証券報告書
                            potentialDocs.find(doc => doc.docTypeCode === '130') ||  // 四半期報告書
                            potentialDocs.find(doc => doc.docTypeCode === '140') ||  // 半期報告書
                            potentialDocs.find(doc => doc.docTypeCode === '110') ||  // 臨時報告書
                            potentialDocs[0]; // 他にXBRLがあるもの
        
        if (financialDoc) {
          console.log(`✓ 見つかりました: ${financialDoc.docId} (${date})`);
          return financialDoc;
        }
      } catch (dateError) {
        console.warn(`日付 ${date} の検索エラー:`, dateError.message);
        continue;
      }
    }
    
    console.log(`書類が見つかりませんでした: ${edinetCode} ${fiscalYear}年度`);
    return null;
    
  } catch (error) {
    console.error('書類検索エラー:', error);
    return null;
  }
}

/**
 * 指定日の提出書類一覧を取得
 */
function fetchDocumentsForDate(date, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `https://disclosure.edinet-fsa.go.jp/api/v2/documents.json?date=${date}&type=2&Subscription-Key=${apiKey}`;
    
    const req = https.get(url, {
      headers: {
        'User-Agent': 'ROIC-Analysis-App/1.0',
        'Accept': 'application/json'
      },
      timeout: 15000
    }, (res) => {
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
        } catch (parseError) {
          reject(new Error(`JSONパースエラー: ${parseError.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`リクエストエラー: ${error.message}`));
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('APIリクエストタイムアウト'));
    });
  });
}

/**
 * 財務レポートの可能性がある日付リストを生成
 * より広範囲な検索期間を設定
 */
function getFinancialReportDates(fiscalYear) {
  const dates = [];
  const currentDate = new Date();
  
  // 過去2年間の範囲で検索（より確実にカバー）
  const startYear = fiscalYear - 1;
  const endYear = fiscalYear + 2;
  
  for (let year = startYear; year <= endYear; year++) {
    // 各年の主要な決算発表月
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    
    for (const month of months) {
      // 各月の15日と月末付近をチェック
      const checkDays = [15, 20, 25, 28, 30, 31];
      
      for (const day of checkDays) {
        const date = new Date(year, month - 1, day);
        
        // 未来の日付は除外
        if (date <= currentDate) {
          const dateStr = date.toISOString().split('T')[0];
          if (!dates.includes(dateStr)) {
            dates.push(dateStr);
          }
        }
      }
    }
  }
  
  // 日付順でソート（新しい順）
  return dates.sort((a, b) => new Date(b) - new Date(a)).slice(0, 100); // 最大100日分
}

/**
 * 暫定的なサンプル財務データ生成
 * 実際のXBRL解析実装までの仮実装
 */
function generateSampleFinancialData(edinetCode, fiscalYear) {
  // 企業ごとに異なる基準値を設定
  const seed = edinetCode.charCodeAt(edinetCode.length - 1);
  const multiplier = 1 + (seed % 10) / 10; // 1.0 ~ 1.9の範囲
  
  const baseData = {
    // 損益計算書項目（単位：百万円）
    netSales: Math.floor(500000 * multiplier),
    operatingIncome: Math.floor(50000 * multiplier),
    grossProfit: Math.floor(150000 * multiplier),
    sellingAdminExpenses: Math.floor(100000 * multiplier),
    interestIncome: Math.floor(1000 * multiplier),
    
    // 貸借対照表項目（単位：百万円）
    totalAssets: Math.floor(600000 * multiplier),
    cashAndEquivalents: Math.floor(80000 * multiplier),
    shareholdersEquity: Math.floor(300000 * multiplier),
    interestBearingDebt: Math.floor(150000 * multiplier),
    accountsPayable: Math.floor(50000 * multiplier),
    accruedExpenses: Math.floor(20000 * multiplier),
    
    // IFRS16対応項目
    leaseExpense: Math.floor(5000 * multiplier),
    leaseDebt: Math.floor(30000 * multiplier),
    
    // メタデータ
    fiscalYear: fiscalYear,
    taxRate: 0.30, // 実効税率30%
    companyName: `企業 ${edinetCode}`,
    edinetCode: edinetCode
  };
  
  return baseData;
}