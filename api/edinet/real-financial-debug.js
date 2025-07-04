/**
 * Real Financial Debug - エラー特定用の簡易版
 */

module.exports = async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-Requested-With');

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

    // パラメータ検証
    if (!edinetCode || !fiscalYear) {
      return res.status(400).json({
        success: false,
        error: 'パラメータが不足しています',
        message: 'edinetCode と fiscalYear が必要です',
        received: { edinetCode, fiscalYear }
      });
    }

    // APIキー確認
    const apiKey = process.env.EDINET_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'API_KEY_NOT_CONFIGURED',
        message: 'EDINET APIキーが設定されていません'
      });
    }

    // 基本情報を返す
    return res.status(200).json({
      success: true,
      debug: {
        edinetCode,
        fiscalYear,
        apiKeyPresent: !!apiKey,
        apiKeyLength: apiKey ? apiKey.length : 0,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'unknown'
      },
      message: 'デバッグ情報取得成功'
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'サーバーエラー',
      message: error.message,
      stack: error.stack
    });
  }
};