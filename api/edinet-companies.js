/**
 * Netlify Function - EDINET企業検索プロキシ
 * 正しいEDINET API v2実装
 */

const https = require('https');

exports.handler = async (event, context) => {
  // CORSヘッダーを設定
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'false',
    'Access-Control-Max-Age': '86400'
  };

  // プリフライトリクエスト対応
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed'
      })
    };
  }

  try {
    const query = event.queryStringParameters?.q;

    if (!query || query.trim().length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: '検索クエリが必要です',
          message: 'qパラメータを指定してください'
        })
      };
    }

    console.log(`企業検索: ${query}`);

    // 環境変数からAPIキー取得
    const apiKey = process.env.EDINET_API_KEY;
    
    if (!apiKey) {
      console.log('EDINET_API_KEY未設定');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'API_KEY_NOT_CONFIGURED',
          message: 'EDINET APIキーが設定されていません。管理者にお問い合わせください。'
        })
      };
    }

    // EDINET APIから企業検索
    const companies = await searchCompaniesFromEDINET(query, apiKey);

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Cache-Control': 'public, max-age=300'
      },
      body: JSON.stringify({
        success: true,
        data: companies,
        source: 'edinet_api_netlify',
        message: `${companies.length}件の企業が見つかりました（EDINET API v2 - Netlify Functions）`
      })
    };

  } catch (error) {
    console.error('企業検索エラー:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: 'SEARCH_ERROR',
        message: `企業検索中にエラーが発生しました: ${error.message}`
      })
    };
  }
};

/**
 * EDINET APIから企業検索（正しい実装）
 */
async function searchCompaniesFromEDINET(query, apiKey) {
  const companies = new Map();
  const maxResults = 50;
  
  try {
    const recentDates = getRecentBusinessDates(60);
    
    console.log(`${recentDates.length}日分の書類を検索します`);
    
    for (let i = 0; i < Math.min(recentDates.length, 15) && companies.size < maxResults; i++) {
      const date = recentDates[i];
      
      try {
        console.log(`日付 ${date} の書類を取得中...`);
        
        const documents = await fetchDocumentsForDate(date, apiKey);
        
        if (!documents || documents.length === 0) {
          console.log(`日付 ${date}: 書類なし`);
          continue;
        }
        
        const relevantDocs = documents.filter(doc => 
          doc.docTypeCode && 
          ['120', '130', '140', '150'].includes(doc.docTypeCode) &&
          doc.filerName && 
          doc.edinetCode &&
          doc.filerName.toLowerCase().includes(query.toLowerCase())
        );
        
        console.log(`日付 ${date}: ${documents.length}件中${relevantDocs.length}件がクエリにマッチ`);
        
        for (const doc of relevantDocs) {
          if (companies.size >= maxResults) break;
          
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
          
          if (!companies.has(doc.edinetCode)) {
            companies.set(doc.edinetCode, company);
            console.log(`✓ 追加: ${doc.filerName} (${doc.edinetCode})`);
          }
        }
        
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

function fetchDocumentsForDate(date, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `https://disclosure.edinet-fsa.go.jp/api/v2/documents.json?date=${date}&type=2&Subscription-Key=${apiKey}`;
    
    console.log(`API呼び出し: ${url.replace(apiKey, '***')}`);
    
    const options = {
      headers: {
        'User-Agent': 'ROIC-Analysis-App/1.0',
        'Accept': 'application/json'
      },
      timeout: 10000
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

  return '製造業';
}

function getRecentBusinessDates(days) {
  const dates = [];
  const today = new Date();
  let current = new Date(today);

  while (dates.length < days) {
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      dates.push(current.toISOString().split('T')[0]);
    }
    current.setDate(current.getDate() - 1);
  }

  return dates;
}