/**
 * Vercel Serverless Function - EDINET企業検索プロキシ
 * 正しいEDINET API v2実装
 */

const https = require('https');

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

    // EDINET APIから企業検索（正しい方法）
    const companies = await searchCompaniesFromEDINET(query, apiKey);

    // キャッシュ設定
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5分キャッシュ
    
    return res.status(200).json({
      success: true,
      data: companies,
      source: 'edinet_api_vercel',
      message: `${companies.length}件の企業が見つかりました（EDINET API v2 - リアルタイム）`
    });

  } catch (error) {
    console.error('企業検索エラー:', error);
    
    // エラー時もCORSヘッダーを確実に設定
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    return res.status(500).json({
      success: false,
      error: 'SEARCH_ERROR',
      message: `企業検索中にエラーが発生しました: ${error.message}`
    });
  }
}

/**
 * EDINET APIから企業検索（正しい実装）
 * 提出書類一覧APIを使用して企業を検索
 */
async function searchCompaniesFromEDINET(query, apiKey) {
  const companies = new Map();
  const maxResults = 50; // 最大検索結果数
  
  try {
    // 最近の営業日リストを取得
    const recentDates = getRecentBusinessDates(60); // 過去60営業日
    
    console.log(`${recentDates.length}日分の書類を検索します`);
    
    // 複数の日付で検索（最大15日分）
    for (let i = 0; i < Math.min(recentDates.length, 15) && companies.size < maxResults; i++) {
      const date = recentDates[i];
      
      try {
        console.log(`日付 ${date} の書類を取得中...`);
        
        // EDINET API v2 提出書類一覧取得
        const documents = await fetchDocumentsForDate(date, apiKey);
        
        if (!documents || documents.length === 0) {
          console.log(`日付 ${date}: 書類なし`);
          continue;
        }
        
        // 三菱電機のケースを詳しく調査
        if (query.includes('三菱電機')) {
          console.log(`🔍 三菱電機検索 - ${date}の全書類詳細:`);
          documents.forEach((doc, idx) => {
            if (doc.filerName && doc.filerName.includes('三菱')) {
              console.log(`  ${idx+1}. ${doc.filerName}`);
              console.log(`     - docId: ${doc.docId}`);
              console.log(`     - docTypeCode: ${doc.docTypeCode}`);
              console.log(`     - periodEnd: ${doc.periodEnd}`);
              console.log(`     - submitDateTime: ${doc.submitDateTime}`);
              console.log(`     - edinetCode: ${doc.edinetCode}`);
              console.log(`     - xbrlFlag: ${doc.xbrlFlag}`);
            }
          });
        }
        
        // 有価証券報告書、四半期報告書、半期報告書をフィルタ
        const relevantDocs = documents.filter(doc => 
          doc.docTypeCode && 
          ['120', '130', '140', '150'].includes(doc.docTypeCode) && // 有価証券報告書系
          doc.filerName && 
          doc.edinetCode &&
          doc.filerName.toLowerCase().includes(query.toLowerCase())
        );
        
        console.log(`日付 ${date}: ${documents.length}件中${relevantDocs.length}件がクエリにマッチ`);
        
        // マッチした企業を追加
        for (const doc of relevantDocs) {
          if (companies.size >= maxResults) break;
          
          console.log(`📄 書類詳細 - ${doc.filerName}:`);
          console.log(`  - docId: ${doc.docId}`);
          console.log(`  - docTypeCode: ${doc.docTypeCode}`);
          console.log(`  - periodEnd: ${doc.periodEnd}`);
          console.log(`  - submitDateTime: ${doc.submitDateTime}`);
          console.log(`  - edinetCode: ${doc.edinetCode}`);
          console.log(`  - secCode: ${doc.secCode}`);
          
          const company = {
            edinetCode: doc.edinetCode,
            companyName: doc.filerName,
            tickerSymbol: doc.secCode || null,
            industry: estimateIndustry(doc.filerName),
            hasRecentData: true,
            lastDocument: {
              docId: doc.docId,
              docTypeCode: doc.docTypeCode,
              periodEnd: doc.periodEnd,
              submitDateTime: doc.submitDateTime
            }
          };
          
          // 同じ企業の重複を避ける（より新しい書類を優先）
          if (!companies.has(doc.edinetCode)) {
            companies.set(doc.edinetCode, company);
            console.log(`✓ 追加: ${doc.filerName} (${doc.edinetCode}) - docId: ${doc.docId}`);
          }
        }
        
        // 十分な結果が得られたら終了
        if (companies.size >= 20) {
          console.log(`十分な結果が得られました: ${companies.size}件`);
          break;
        }
        
      } catch (dateError) {
        console.warn(`日付 ${date} でエラー:`, dateError.message);
        continue;
      }
    }
    
    const result = Array.from(companies.values());
    console.log(`検索完了: ${result.length}件の企業が見つかりました`);
    
    return result;
    
  } catch (error) {
    console.error('EDINET検索エラー:', error);
    throw new Error(`EDINET API検索に失敗しました: ${error.message}`);
  }
}

/**
 * 指定日の提出書類一覧を取得
 * EDINET API v2 documents.json エンドポイント
 */
function fetchDocumentsForDate(date, apiKey) {
  return new Promise((resolve, reject) => {
    // EDINET API v2 URL
    const url = `https://disclosure.edinet-fsa.go.jp/api/v2/documents.json?date=${date}&type=2&Subscription-Key=${apiKey}`;
    
    console.log(`API呼び出し: ${url.replace(apiKey, '***')}`);
    
    const options = {
      headers: {
        'User-Agent': 'ROIC-Analysis-App/1.0',
        'Accept': 'application/json'
      },
      timeout: 10000 // 10秒タイムアウト
    };
    
    const req = https.get(url, options, (res) => {
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
          
          // EDINET API v2のレスポンス構造に対応
          if (result.results && Array.isArray(result.results)) {
            resolve(result.results);
          } else if (Array.isArray(result)) {
            resolve(result);
          } else {
            console.warn('予期しないレスポンス構造:', result);
            resolve([]);
          }
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
 * 企業名から業界を推定
 */
function estimateIndustry(companyName) {
  const industryKeywords = {
    '証券業': ['證券', '証券', 'セキュリティーズ', '投資', 'キャピタル'],
    '銀行業': ['銀行', 'バンク', 'フィナンシャル', '金融'],
    '保険業': ['保険', '生命', '損害', 'インシュアランス'],
    '輸送用機器': ['自動車', 'トヨタ', 'ホンダ', '日産', 'マツダ', 'スバル'],
    '電気機器': ['電気', '電子', 'エレクトロニクス', 'パナソニック', 'ソニー', '東芝'],
    '情報・通信業': ['情報', '通信', 'システム', 'ソフト', 'IT', 'テクノロジー'],
    '小売業': ['小売', 'リテール', '百貨店', 'ストア'],
    '不動産業': ['不動産', 'リアルティ', 'エステート'],
    '建設業': ['建設', '建築', 'コンストラクション', '工業'],
    '製薬・医療': ['製薬', '薬品', '医療', 'ファーマ', 'メディカル'],
    '出版・メディア': ['出版', '新聞', 'メディア', '放送', '講談社', '集英社', '小学館']
  };

  for (const [industry, keywords] of Object.entries(industryKeywords)) {
    if (keywords.some(keyword => companyName.includes(keyword))) {
      return industry;
    }
  }

  return '製造業'; // デフォルト
}

/**
 * 営業日のリストを生成（土日祝日を除外）
 */
function getRecentBusinessDates(days) {
  const dates = [];
  const today = new Date();
  let current = new Date(today);

  while (dates.length < days) {
    // 土日を除外（0=日曜日, 6=土曜日）
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      dates.push(current.toISOString().split('T')[0]);
    }
    current.setDate(current.getDate() - 1);
  }

  return dates;
}