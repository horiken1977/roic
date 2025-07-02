/**
 * セキュアなEDINET API エンドポイント
 * フロントエンド ↔ バックエンド通信用
 */

const express = require('express');
const router = express.Router();
const SecureEDINETService = require('../services/secure-edinet-service');

// EDINET APIサービスのインスタンス化
const edinetService = new SecureEDINETService();

/**
 * 企業検索エンドポイント
 * GET /api/edinet/companies?q=検索クエリ
 */
router.get('/companies', async (req, res) => {
  try {
    const { q: query } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '検索クエリが必要です',
        message: 'qパラメータを指定してください'
      });
    }

    console.log(`企業検索リクエスト: "${query}"`);
    
    const result = await edinetService.searchCompanies(query.trim());
    
    // レスポンスヘッダーを設定
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5分間キャッシュ
    
    res.json(result);

  } catch (error) {
    console.error('企業検索エラー:', error);
    
    res.status(500).json({
      success: false,
      error: 'サーバー内部エラー',
      message: '企業検索中にエラーが発生しました'
    });
  }
});

/**
 * 財務データ取得エンドポイント
 * GET /api/edinet/financial?edinetCode=E02144&fiscalYear=2023
 */
router.get('/financial', async (req, res) => {
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

    console.log(`財務データ取得リクエスト: ${edinetCode} ${year}年度`);
    
    const result = await edinetService.getFinancialData(edinetCode, year);
    
    // レスポンスヘッダーを設定
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1時間キャッシュ
    
    res.json(result);

  } catch (error) {
    console.error('財務データ取得エラー:', error);
    
    res.status(500).json({
      success: false,
      error: 'サーバー内部エラー',
      message: '財務データ取得中にエラーが発生しました'
    });
  }
});

/**
 * 複数年度財務データ取得エンドポイント
 * POST /api/edinet/financial/multi-year
 * Body: { edinetCode: "E02144", years: [2023, 2022, 2021] }
 */
router.post('/financial/multi-year', async (req, res) => {
  try {
    const { edinetCode, years } = req.body;

    if (!edinetCode || !Array.isArray(years) || years.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'パラメータが不足しています',
        message: 'edinetCode と years配列 が必要です'
      });
    }

    // 年度の妥当性チェック
    const currentYear = new Date().getFullYear();
    const validYears = years.filter(year => 
      Number.isInteger(year) && year >= 2000 && year <= currentYear
    );

    if (validYears.length === 0) {
      return res.status(400).json({
        success: false,
        error: '無効な年度です',
        message: '2000年以降の有効な年度を指定してください'
      });
    }

    console.log(`複数年度データ取得: ${edinetCode} ${validYears.join(', ')}年度`);
    
    // 各年度のデータを並列取得
    const results = await Promise.all(
      validYears.map(year => edinetService.getFinancialData(edinetCode, year))
    );

    // 成功したデータのみを抽出
    const successfulResults = results
      .filter(result => result.success)
      .map(result => result.data);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1時間キャッシュ
    
    res.json({
      success: true,
      data: successfulResults,
      source: results[0]?.source || 'mixed',
      message: `${successfulResults.length}年分の財務データを取得しました`
    });

  } catch (error) {
    console.error('複数年度データ取得エラー:', error);
    
    res.status(500).json({
      success: false,
      error: 'サーバー内部エラー',
      message: '複数年度データ取得中にエラーが発生しました'
    });
  }
});

/**
 * APIキー設定状況確認エンドポイント（セキュリティ情報は返さない）
 * GET /api/edinet/status
 */
router.get('/status', (req, res) => {
  const hasApiKey = !!process.env.EDINET_API_KEY;
  const isDefaultKey = process.env.EDINET_API_KEY === 'your_edinet_api_key_here' ||
                       process.env.EDINET_API_KEY === '実際のAPIキーをここに入力してください';
  
  res.json({
    success: true,
    data: {
      apiConfigured: hasApiKey && !isDefaultKey,
      dataSource: hasApiKey && !isDefaultKey ? 'edinet_api' : 'sample_data',
      supportedFeatures: [
        'company_search',
        'financial_data',
        'multi_year_data',
        'roic_calculation'
      ]
    },
    message: hasApiKey && !isDefaultKey 
      ? 'EDINET API連携が有効です'
      : 'サンプルデータモードで動作中です'
  });
});

module.exports = router;