/**
 * Vercel Serverless Function - EDINET企業検索プロキシ
 * GitHub Pages + Vercel Functions でリアルタイムAPI統合
 */

const https = require('https');

// CORS設定
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  // 完全なCORS ヘッダーを設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'false');

  // CORS プリフライト対応
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // GET リクエストのみ許可
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { q: query } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '検索クエリが必要です',
        message: 'qパラメータを指定してください'
      });
    }

    console.log(`企業検索: ${query}`);

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

    // EDINET APIから企業検索
    const companies = await searchCompaniesFromEDINET(query, apiKey);

    // キャッシュ設定
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5分キャッシュ
    
    return res.status(200).json({
      success: true,
      data: companies,
      source: 'edinet_api_vercel',
      message: `${companies.length}件の企業が見つかりました（EDINET API - Vercel Functions）`
    });

  } catch (error) {
    console.error('企業検索エラー:', error);
    
    return res.status(500).json({
      success: false,
      error: 'SEARCH_ERROR',
      message: `企業検索中にエラーが発生しました: ${error.message}`
    });
  }
}

/**
 * EDINET APIから企業検索
 */
async function searchCompaniesFromEDINET(query, apiKey) {
  const companies = new Map();
  
  // 過去30営業日の日付を生成
  const dates = getRecentBusinessDates(30);
  
  // 最新10日分をチェック
  for (const date of dates.slice(0, 10)) {
    try {
      console.log(`日付 ${date} を検索中...`);
      
      const documents = await fetchDocumentsForDate(date, apiKey);
      
      // 有価証券報告書のみをフィルタリング
      const securitiesReports = documents.filter(doc => 
        doc.docTypeCode === '120' && 
        doc.xbrlFlag === '1'
      );

      // クエリに一致する企業を検索
      for (const doc of securitiesReports) {
        if (matchesQuery(doc, query)) {
          companies.set(doc.edinetCode, {
            edinetCode: doc.edinetCode,
            companyName: doc.filerName,
            tickerSymbol: doc.secCode,
            industry: estimateIndustry(doc.filerName),
            hasRecentData: true
          });
          
          console.log(`✓ 見つかりました: ${doc.filerName} (${doc.edinetCode})`);
        }
      }
      
      // 十分な結果が見つかったら終了
      if (companies.size >= 20) {
        break;
      }
      
    } catch (error) {
      console.warn(`日付 ${date} でエラー:`, error.message);
      continue;
    }
  }

  return Array.from(companies.values());
}

/**
 * 指定日の書類を取得
 */
function fetchDocumentsForDate(date, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `https://disclosure.edinet-fsa.go.jp/api/v2/documents.json?date=${date}&type=2&Subscription-Key=${apiKey}`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.results || []);
        } catch (error) {
          reject(new Error('JSONパースエラー'));
        }
      });
    }).on('error', reject);
  });
}

/**
 * 検索クエリとの一致判定
 */
function matchesQuery(document, query) {
  const searchTarget = query.toLowerCase();
  const filerName = document.filerName.toLowerCase();
  
  return (
    filerName.includes(searchTarget) ||
    (document.secCode && document.secCode.includes(query)) ||
    document.edinetCode.toLowerCase().includes(searchTarget)
  );
}

/**
 * 企業名から業界を推定
 */
function estimateIndustry(companyName) {
  const industryKeywords = {
    '証券業': ['證券', '証券', 'セキュリティーズ'],
    '銀行業': ['銀行', 'バンク', 'フィナンシャル'],
    '保険業': ['保険', '生命', '損害', 'インシュアランス'],
    '輸送用機器': ['自動車', 'トヨタ', 'ホンダ', '日産'],
    '電気機器': ['電気', '電子', 'エレクトロニクス', 'パナソニック', 'ソニー'],
    '情報・通信業': ['情報', '通信', 'システム', 'ソフト', 'IT'],
    '小売業': ['小売', 'リテール', '百貨店', 'ストア'],
    '不動産業': ['不動産', 'リアルティ', 'エステート'],
    '建設業': ['建設', '建築', 'コンストラクション'],
    '製薬・医療': ['製薬', '薬品', '医療', 'ファーマ', 'メディカル']
  };

  for (const [industry, keywords] of Object.entries(industryKeywords)) {
    if (keywords.some(keyword => companyName.includes(keyword))) {
      return industry;
    }
  }

  return '製造業'; // デフォルト
}

/**
 * 営業日のリストを生成
 */
function getRecentBusinessDates(days) {
  const dates = [];
  const today = new Date();
  let current = new Date(today);

  while (dates.length < days) {
    // 平日のみ（土日を除外）
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      dates.push(current.toISOString().split('T')[0]);
    }
    current.setDate(current.getDate() - 1);
  }

  return dates;
}

// サンプルデータは廃止 - 実データのみ使用