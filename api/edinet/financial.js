/**
 * Vercel Serverless Function - EDINET財務データ取得プロキシ
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

    // 暫定的な財務データを生成（実際のXBRL解析実装までの仮実装）
    const sampleFinancialData = generateSampleFinancialData(edinetCode, year);
    
    return res.status(200).json({
      success: true,
      data: sampleFinancialData,
      source: 'edinet_api_sample',
      message: `${year}年度の財務データ（開発中のためサンプルデータ）`
    });

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