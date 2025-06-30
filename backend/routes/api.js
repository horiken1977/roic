const express = require('express');
const { body, param, query } = require('express-validator');
const companiesController = require('../controllers/companies-controller');
const roicController = require('../controllers/roic-controller');

const router = express.Router();

// ===========================================
// 企業関連のルート
// ===========================================

/**
 * 企業一覧を取得
 * GET /api/companies
 */
router.get('/companies', 
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('industryCode').optional().isLength({ min: 1, max: 10 }),
    query('marketSegment').optional().isLength({ min: 1, max: 50 }),
    query('companyName').optional().isLength({ min: 1, max: 100 }),
    query('sortBy').optional().isIn(['company_name', 'securities_code', 'industry_code', 'created_at']),
    query('sortOrder').optional().isIn(['ASC', 'DESC']),
    companiesController.getCompanies
);

/**
 * 特定の企業を取得
 * GET /api/companies/:identifier
 */
router.get('/companies/:identifier',
    param('identifier').notEmpty().withMessage('企業識別子は必須です'),
    companiesController.getCompany
);

/**
 * 企業を作成
 * POST /api/companies
 */
router.post('/companies',
    body('edinet_code').notEmpty().withMessage('EDINETコードは必須です')
        .matches(/^E\d{5}$/).withMessage('EDINETコードの形式が正しくありません'),
    body('company_name').notEmpty().withMessage('企業名は必須です')
        .isLength({ max: 200 }).withMessage('企業名は200文字以下で入力してください'),
    body('company_name_en').optional().isLength({ max: 200 }),
    body('securities_code').optional().matches(/^\d{4}$/).withMessage('証券コードは4桁の数字で入力してください'),
    body('industry_code').optional().isLength({ max: 10 }),
    body('market_segment').optional().isLength({ max: 50 }),
    body('address').optional().isLength({ max: 500 }),
    body('phone_number').optional().isLength({ max: 20 }),
    body('website_url').optional().isURL().withMessage('正しいURLを入力してください'),
    body('business_description').optional().isLength({ max: 2000 }),
    companiesController.createCompany
);

/**
 * 企業を更新
 * PUT /api/companies/:edinetCode
 */
router.put('/companies/:edinetCode',
    param('edinetCode').matches(/^E\d{5}$/).withMessage('EDINETコードの形式が正しくありません'),
    body('company_name').optional().isLength({ min: 1, max: 200 }),
    body('company_name_en').optional().isLength({ max: 200 }),
    body('securities_code').optional().matches(/^\d{4}$/).withMessage('証券コードは4桁の数字で入力してください'),
    body('industry_code').optional().isLength({ max: 10 }),
    body('market_segment').optional().isLength({ max: 50 }),
    body('address').optional().isLength({ max: 500 }),
    body('phone_number').optional().isLength({ max: 20 }),
    body('website_url').optional().isURL().withMessage('正しいURLを入力してください'),
    body('business_description').optional().isLength({ max: 2000 }),
    companiesController.updateCompany
);

/**
 * 企業を削除
 * DELETE /api/companies/:edinetCode
 */
router.delete('/companies/:edinetCode',
    param('edinetCode').matches(/^E\d{5}$/).withMessage('EDINETコードの形式が正しくありません'),
    companiesController.deleteCompany
);

/**
 * EDINETから企業データを同期
 * POST /api/companies/sync
 */
router.post('/companies/sync',
    body('date').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('日付はYYYY-MM-DD形式で入力してください'),
    body('type').optional().isIn(['1', '2']).withMessage('種別は1または2を指定してください'),
    companiesController.syncCompaniesFromEdinet
);

// ===========================================
// ROIC関連のルート
// ===========================================

/**
 * 企業のROIC計算を実行
 * POST /api/roic/:companyId/calculate
 */
router.post('/roic/:companyId/calculate',
    param('companyId').notEmpty().withMessage('企業IDは必須です'),
    body('fiscalYear').isInt({ min: 2000, max: 2030 }).withMessage('有効な年度を入力してください'),
    body('fiscalQuarter').optional().isInt({ min: 1, max: 4 }).withMessage('四半期は1-4の値を入力してください'),
    body('calculationMethod').optional().isIn(['standard', 'adjusted', 'conservative', 'aggressive'])
        .withMessage('計算方法は standard, adjusted, conservative, aggressive のいずれかを指定してください'),
    roicController.calculateRoic
);

/**
 * 企業のROIC履歴を取得
 * GET /api/roic/:identifier/history
 */
router.get('/roic/:identifier/history',
    param('identifier').notEmpty().withMessage('企業識別子は必須です'),
    query('yearFrom').optional().isInt({ min: 2000, max: 2030 }),
    query('yearTo').optional().isInt({ min: 2000, max: 2030 }),
    query('calculationMethod').optional().isIn(['standard', 'adjusted', 'conservative', 'aggressive']),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    roicController.getRoicHistory
);

/**
 * 最新のROIC情報を取得
 * GET /api/roic/:identifier/latest
 */
router.get('/roic/:identifier/latest',
    param('identifier').notEmpty().withMessage('企業識別子は必須です'),
    query('calculationMethod').optional().isIn(['standard', 'adjusted', 'conservative', 'aggressive']),
    roicController.getLatestRoic
);

/**
 * 業界平均ROICを取得
 * GET /api/roic/industry/:industryCode/average
 */
router.get('/roic/industry/:industryCode/average',
    param('industryCode').notEmpty().withMessage('業界コードは必須です'),
    query('fiscalYear').optional().isInt({ min: 2000, max: 2030 }),
    query('calculationMethod').optional().isIn(['standard', 'adjusted', 'conservative', 'aggressive']),
    roicController.getIndustryAverage
);

/**
 * ROIC上位企業を取得
 * GET /api/roic/top-performers
 */
router.get('/roic/top-performers',
    query('fiscalYear').optional().isInt({ min: 2000, max: 2030 }),
    query('industryCode').optional().isLength({ min: 1, max: 10 }),
    query('calculationMethod').optional().isIn(['standard', 'adjusted', 'conservative', 'aggressive']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    roicController.getTopPerformers
);

/**
 * 複数企業のROIC比較
 * POST /api/roic/compare
 */
router.post('/roic/compare',
    body('companyIds').isArray({ min: 2, max: 10 }).withMessage('比較企業は2-10社を指定してください'),
    body('companyIds.*').notEmpty().withMessage('企業IDは必須です'),
    body('fiscalYear').optional().isInt({ min: 2000, max: 2030 }),
    body('calculationMethod').optional().isIn(['standard', 'adjusted', 'conservative', 'aggressive']),
    roicController.compareRoic
);

/**
 * バッチROIC計算
 * POST /api/roic/bulk-calculate
 */
router.post('/roic/bulk-calculate',
    body('fiscalYear').optional().isInt({ min: 2000, max: 2030 }),
    body('calculationMethod').optional().isIn(['standard', 'adjusted', 'conservative', 'aggressive']),
    body('industryCode').optional().isLength({ min: 1, max: 10 }),
    roicController.bulkCalculateRoic
);

// ===========================================
// ヘルスチェック
// ===========================================

/**
 * APIヘルスチェック
 * GET /api/health
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

/**
 * データベース接続チェック
 * GET /api/health/database
 */
router.get('/health/database', async (req, res) => {
    try {
        const pool = require('../config/database');
        const client = await pool.connect();
        
        const result = await client.query('SELECT NOW() as current_time');
        client.release();
        
        res.json({
            success: true,
            message: 'Database connection is healthy',
            timestamp: new Date().toISOString(),
            database_time: result.rows[0].current_time
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Database connection failed',
            error: error.message
        });
    }
});

/**
 * EDINET API接続チェック
 * GET /api/health/edinet
 */
router.get('/health/edinet', async (req, res) => {
    try {
        const EdinetService = require('../services/edinet-service');
        const edinetService = new EdinetService();
        
        // 簡単なテスト呼び出し
        const today = new Date().toISOString().split('T')[0];
        await edinetService.getDocumentList(today);
        
        res.json({
            success: true,
            message: 'EDINET API connection is healthy',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'EDINET API connection failed',
            error: error.message
        });
    }
});

module.exports = router;