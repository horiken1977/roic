/**
 * Vercel Serverless Function - EDINET財務データ取得プロキシ
 */

const https = require('https');

export default async function handler(req, res) {
  // CORS ヘッダーを設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

    // 実際のXBRL解析実装が必要 - 現在は未実装
    return res.status(501).json({
      success: false,
      error: 'XBRL_PARSING_NOT_IMPLEMENTED',
      message: 'XBRL財務データ解析機能は現在開発中です。実装完了までお待ちください。'
    });

  } catch (error) {
    console.error('財務データ取得エラー:', error);
    
    return res.status(500).json({
      success: false,
      error: 'FINANCIAL_DATA_ERROR',
      message: `財務データ取得中にエラーが発生しました: ${error.message}`
    });
  }
}

// サンプルデータは廃止 - 実データのみ使用