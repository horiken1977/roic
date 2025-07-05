/**
 * ローカルテスト用APIサーバー
 * 10社のROIC計算End-to-Endテスト用
 */

const http = require('http');
const url = require('url');

// 1000社データ（最初の10社分）
const companiesData = {
  'E02144': {
    companyName: "トヨタ自動車",
    industry: "自動車",
    scale: "large",
    netSales: 50000000000000,
    operatingIncome: 4000000000000,
    totalAssets: 66666666666667,
    cashAndEquivalents: 10000000000000,
    shareholdersEquity: 20000000000000,
    interestBearingDebt: 13333333333333,
    taxRate: 0.3
  },
  'E02142': {
    companyName: "本田技研工業",
    industry: "自動車",
    scale: "large",
    netSales: 45000000000000,
    operatingIncome: 3600000000000,
    totalAssets: 60000000000000,
    cashAndEquivalents: 9000000000000,
    shareholdersEquity: 18000000000000,
    interestBearingDebt: 12000000000000,
    taxRate: 0.3
  },
  'E02362': {
    companyName: "日産自動車",
    industry: "自動車",
    scale: "large",
    netSales: 42000000000000,
    operatingIncome: 3200000000000,
    totalAssets: 56000000000000,
    cashAndEquivalents: 8400000000000,
    shareholdersEquity: 16800000000000,
    interestBearingDebt: 11200000000000,
    taxRate: 0.3
  },
  'E03595': {
    companyName: "SUBARU",
    industry: "自動車",
    scale: "large",
    netSales: 30000000000000,
    operatingIncome: 2400000000000,
    totalAssets: 40000000000000,
    cashAndEquivalents: 6000000000000,
    shareholdersEquity: 12000000000000,
    interestBearingDebt: 8000000000000,
    taxRate: 0.3
  },
  'E03581': {
    companyName: "スズキ",
    industry: "自動車",
    scale: "large",
    netSales: 35000000000000,
    operatingIncome: 2800000000000,
    totalAssets: 46666666666667,
    cashAndEquivalents: 7000000000000,
    shareholdersEquity: 14000000000000,
    interestBearingDebt: 9333333333333,
    taxRate: 0.3
  },
  'E03582': {
    companyName: "マツダ",
    industry: "自動車",
    scale: "large",
    netSales: 32000000000000,
    operatingIncome: 2560000000000,
    totalAssets: 42666666666667,
    cashAndEquivalents: 6400000000000,
    shareholdersEquity: 12800000000000,
    interestBearingDebt: 8533333333333,
    taxRate: 0.3
  },
  'E03533': {
    companyName: "日野自動車",
    industry: "自動車",
    scale: "large",
    netSales: 18000000000000,
    operatingIncome: 1440000000000,
    totalAssets: 24000000000000,
    cashAndEquivalents: 3600000000000,
    shareholdersEquity: 7200000000000,
    interestBearingDebt: 4800000000000,
    taxRate: 0.3
  },
  'E03565': {
    companyName: "いすゞ自動車",
    industry: "自動車",
    scale: "large",
    netSales: 22000000000000,
    operatingIncome: 1760000000000,
    totalAssets: 29333333333333,
    cashAndEquivalents: 4400000000000,
    shareholdersEquity: 8800000000000,
    interestBearingDebt: 5866666666667,
    taxRate: 0.3
  },
  'E03355': {
    companyName: "豊田自動織機",
    industry: "自動車",
    scale: "large",
    netSales: 25000000000000,
    operatingIncome: 2000000000000,
    totalAssets: 33333333333333,
    cashAndEquivalents: 5000000000000,
    shareholdersEquity: 10000000000000,
    interestBearingDebt: 6666666666667,
    taxRate: 0.3
  },
  'E03116': {
    companyName: "デンソー",
    industry: "自動車",
    scale: "large",
    netSales: 28000000000000,
    operatingIncome: 2240000000000,
    totalAssets: 37333333333333,
    cashAndEquivalents: 5600000000000,
    shareholdersEquity: 11200000000000,
    interestBearingDebt: 7466666666667,
    taxRate: 0.3
  }
};

/**
 * APIサーバー
 */
const server = http.createServer((req, res) => {
  // CORS ヘッダー設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Content-Type', 'application/json');

  // CORS プリフライト対応
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const { pathname, query } = parsedUrl;

  console.log(`${req.method} ${pathname} - ${JSON.stringify(query)}`);

  // 企業検索API
  if (pathname === '/api/edinet/companies' && req.method === 'GET') {
    const searchQuery = query.q;
    if (!searchQuery) {
      res.writeHead(400);
      res.end(JSON.stringify({
        success: false,
        error: '検索クエリが必要です',
        message: 'qパラメータを指定してください'
      }));
      return;
    }

    // 企業名で検索
    const results = [];
    for (const [edinetCode, data] of Object.entries(companiesData)) {
      if (data.companyName.includes(searchQuery)) {
        results.push({
          edinetCode: edinetCode,
          companyName: data.companyName,
          industry: data.industry,
          hasRecentData: true
        });
      }
    }

    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      data: results,
      source: 'local_test_server',
      message: `${results.length}件の企業が見つかりました`
    }));
    return;
  }

  // 財務データ取得API
  if (pathname === '/api/edinet/financial-1000' && req.method === 'GET') {
    const { edinetCode, fiscalYear } = query;
    
    if (!edinetCode || !fiscalYear) {
      res.writeHead(400);
      res.end(JSON.stringify({
        success: false,
        error: 'パラメータが不足しています',
        message: 'edinetCode と fiscalYear が必要です'
      }));
      return;
    }

    const companyData = companiesData[edinetCode];
    if (!companyData) {
      res.writeHead(404);
      res.end(JSON.stringify({
        success: false,
        error: '企業が見つかりません',
        message: `EDINETコード ${edinetCode} の企業データが見つかりません`
      }));
      return;
    }

    const response = {
      success: true,
      data: {
        ...companyData,
        edinetCode: edinetCode,
        fiscalYear: parseInt(fiscalYear),
        dataSource: 'local_test_server',
        lastUpdated: new Date().toISOString(),
        estimationNote: '10社実企業データ（テスト用ローカルサーバー）'
      },
      source: 'local_test_server',
      message: `${fiscalYear}年度の財務データ（${companyData.companyName}・ローカルテスト）`
    };

    console.log(`✅ ${companyData.companyName}データ取得成功`);
    res.writeHead(200);
    res.end(JSON.stringify(response));
    return;
  }

  // その他のリクエスト
  res.writeHead(404);
  res.end(JSON.stringify({
    success: false,
    error: 'Not Found',
    message: 'このエンドポイントは存在しません'
  }));
});

const PORT = 3001;

server.listen(PORT, () => {
  console.log('🚀 ローカルテスト用APIサーバー起動');
  console.log(`📡 http://localhost:${PORT}`);
  console.log('==========================================');
  console.log('📊 利用可能なエンドポイント:');
  console.log(`   GET /api/edinet/companies?q=トヨタ`);
  console.log(`   GET /api/edinet/financial-1000?edinetCode=E02144&fiscalYear=2023`);
  console.log('==========================================');
  console.log('📄 対象企業データ: 10社（主要自動車メーカー）');
  console.log(`✅ テスト準備完了 - Node.jsクライアントからテスト可能`);
});

module.exports = server;