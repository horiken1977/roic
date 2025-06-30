const cron = require('node-cron');
const EdinetService = require('../services/edinet-service');
const XbrlParser = require('../services/xbrl-parser');
const RoicCalculator = require('../services/roic-calculator');
const CompanyModel = require('../models/company-model');
const FinancialStatementModel = require('../models/financial-statement-model');
const RoicCalculationModel = require('../models/roic-calculation-model');
const logger = require('../config/logger');

class DataSyncJob {
    constructor() {
        this.edinetService = new EdinetService();
        this.xbrlParser = new XbrlParser();
        this.roicCalculator = new RoicCalculator();
        this.isRunning = false;
        this.lastSyncDate = null;
        
        // バッチ処理設定
        this.batchSize = 10; // 同時処理する企業数
        this.retryAttempts = 3; // リトライ回数
        this.retryDelay = 5000; // リトライ間隔（ミリ秒）
    }
    
    /**
     * バッチジョブを開始
     */
    start() {
        logger.info('データ同期ジョブを開始します');
        
        // 毎日午前2時に実行
        cron.schedule('0 2 * * *', async () => {
            await this.runDailySync();
        });
        
        // 毎週日曜日午前3時に週次同期
        cron.schedule('0 3 * * 0', async () => {
            await this.runWeeklySync();
        });
        
        // 毎月1日午前4時に月次同期
        cron.schedule('0 4 1 * *', async () => {
            await this.runMonthlySync();
        });
        
        logger.info('データ同期ジョブのスケジュールを設定しました');
    }
    
    /**
     * 日次同期処理
     */
    async runDailySync() {
        if (this.isRunning) {
            logger.warn('データ同期ジョブが既に実行中です');
            return;
        }
        
        try {
            this.isRunning = true;
            logger.info('日次データ同期を開始します');
            
            const today = new Date().toISOString().split('T')[0];
            
            // 新しい財務データの同期
            await this.syncNewFinancialData(today);
            
            // ROIC計算の更新
            await this.updateRecentRoicCalculations();
            
            this.lastSyncDate = new Date();
            logger.info('日次データ同期が完了しました');
            
        } catch (error) {
            logger.error('日次データ同期エラー:', error);
        } finally {
            this.isRunning = false;
        }
    }
    
    /**
     * 週次同期処理
     */
    async runWeeklySync() {
        try {
            logger.info('週次データ同期を開始します');
            
            // 企業マスタの更新
            await this.syncCompanyMasterData();
            
            // 過去1週間のデータを再チェック
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            
            await this.syncFinancialDataRange(weekAgo, new Date());
            
            logger.info('週次データ同期が完了しました');
            
        } catch (error) {
            logger.error('週次データ同期エラー:', error);
        }
    }
    
    /**
     * 月次同期処理
     */
    async runMonthlySync() {
        try {
            logger.info('月次データ同期を開始します');
            
            // 全企業のROIC再計算
            await this.recalculateAllRoic();
            
            // データ整合性チェック
            await this.performDataIntegrityCheck();
            
            logger.info('月次データ同期が完了しました');
            
        } catch (error) {
            logger.error('月次データ同期エラー:', error);
        }
    }
    
    /**
     * 新しい財務データを同期
     * @param {string} date - 対象日（YYYY-MM-DD）
     */
    async syncNewFinancialData(date) {
        try {
            logger.info(`財務データ同期開始: ${date}`);
            
            // EDINETから書類一覧を取得
            const documentList = await this.edinetService.getDocumentList(date);
            
            if (!documentList.results || documentList.results.length === 0) {
                logger.info('同期対象の書類がありません');
                return;
            }
            
            logger.info(`同期対象書類数: ${documentList.results.length}`);
            
            // バッチ処理で財務データを同期
            const batches = this.createBatches(documentList.results, this.batchSize);
            
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                logger.info(`バッチ ${i + 1}/${batches.length} を処理中 (${batch.length}件)`);
                
                await this.processBatch(batch);
                
                // バッチ間の待機時間
                if (i < batches.length - 1) {
                    await this.sleep(2000);
                }
            }
            
            logger.info('財務データ同期完了');
            
        } catch (error) {
            logger.error('財務データ同期エラー:', error);
            throw error;
        }
    }
    
    /**
     * バッチを処理
     * @param {Array} batch - 処理対象の書類バッチ
     */
    async processBatch(batch) {
        const promises = batch.map(doc => this.processDocument(doc));
        const results = await Promise.allSettled(promises);
        
        // 結果の集計
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        logger.info(`バッチ処理完了: 成功 ${successful}件, 失敗 ${failed}件`);
        
        // 失敗したものをログに記録
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                logger.error(`書類処理失敗 (${batch[index].docId}):`, result.reason);
            }
        });
    }
    
    /**
     * 書類を処理
     * @param {Object} doc - 書類データ
     */
    async processDocument(doc) {
        let retryCount = 0;
        
        while (retryCount < this.retryAttempts) {
            try {
                // 企業情報の確認・作成
                await this.ensureCompanyExists(doc);
                
                // XBRLデータの取得と解析
                const financialData = await this.extractFinancialDataFromDocument(doc);
                
                if (financialData) {
                    // 財務諸表データの保存
                    await FinancialStatementModel.upsert(financialData);
                    
                    // ROIC計算
                    await this.calculateRoicForDocument(financialData);
                }
                
                return { success: true, docId: doc.docId };
                
            } catch (error) {
                retryCount++;
                logger.warn(`書類処理リトライ ${retryCount}/${this.retryAttempts} (${doc.docId}):`, error.message);
                
                if (retryCount < this.retryAttempts) {
                    await this.sleep(this.retryDelay * retryCount);
                } else {
                    throw error;
                }
            }
        }
    }
    
    /**
     * 企業の存在を確認し、必要に応じて作成
     * @param {Object} doc - 書類データ
     */
    async ensureCompanyExists(doc) {
        if (!doc.edinetCode || !doc.filerName) {
            return;
        }
        
        const existingCompany = await CompanyModel.findByEdinetCode(doc.edinetCode);
        
        if (!existingCompany) {
            const companyData = {
                edinet_code: doc.edinetCode,
                company_name: doc.filerName,
                company_name_en: doc.filerNameEn || null,
                securities_code: doc.secCode || null,
                industry_code: null,
                market_segment: null,
                fiscal_year_end: null,
                address: null,
                phone_number: null,
                website_url: null,
                business_description: null
            };
            
            await CompanyModel.create(companyData);
            logger.info(`新規企業作成: ${doc.filerName} (${doc.edinetCode})`);
        }
    }
    
    /**
     * 書類から財務データを抽出
     * @param {Object} doc - 書類データ
     * @returns {Promise<Object|null>} 財務データ
     */
    async extractFinancialDataFromDocument(doc) {
        try {
            // XBRLデータを取得
            const xbrlData = await this.edinetService.getXbrlData(doc.docId);
            
            // 財務データを抽出
            const extractedData = await this.xbrlParser.extractFinancialData(xbrlData);
            
            // 企業IDを取得
            const company = await CompanyModel.findByEdinetCode(doc.edinetCode);
            if (!company) {
                logger.warn(`企業が見つかりません: ${doc.edinetCode}`);
                return null;
            }
            
            // 財務諸表データを構築
            const financialData = {
                company_id: company.id,
                fiscal_year: extractedData.fiscal_year,
                fiscal_quarter: extractedData.fiscal_quarter,
                report_type: extractedData.report_type,
                filing_date: extractedData.filing_date,
                total_assets: extractedData.total_assets,
                current_assets: extractedData.current_assets,
                fixed_assets: extractedData.fixed_assets,
                total_liabilities: extractedData.total_liabilities,
                current_liabilities: extractedData.current_liabilities,
                fixed_liabilities: extractedData.fixed_liabilities,
                total_equity: extractedData.total_equity,
                retained_earnings: extractedData.retained_earnings,
                revenue: extractedData.revenue,
                operating_income: extractedData.operating_income,
                ordinary_income: extractedData.ordinary_income,
                net_income: extractedData.net_income,
                operating_expenses: extractedData.operating_expenses,
                interest_expense: extractedData.interest_expense,
                tax_expense: extractedData.tax_expense,
                operating_cash_flow: extractedData.operating_cash_flow,
                investing_cash_flow: extractedData.investing_cash_flow,
                financing_cash_flow: extractedData.financing_cash_flow,
                free_cash_flow: extractedData.free_cash_flow
            };
            
            return financialData;
            
        } catch (error) {
            logger.error(`財務データ抽出エラー (${doc.docId}):`, error.message);
            return null;
        }
    }
    
    /**
     * 財務データのROICを計算
     * @param {Object} financialData - 財務データ
     */
    async calculateRoicForDocument(financialData) {
        try {
            await this.roicCalculator.calculateRoic(
                financialData.company_id,
                financialData.fiscal_year,
                financialData.fiscal_quarter
            );
        } catch (error) {
            logger.error(`ROIC計算エラー (企業ID: ${financialData.company_id}):`, error.message);
        }
    }
    
    /**
     * 企業マスタデータを同期
     */
    async syncCompanyMasterData() {
        try {
            logger.info('企業マスタデータ同期開始');
            
            const today = new Date().toISOString().split('T')[0];
            const documentList = await this.edinetService.getCompanyList('1', today);
            
            if (!documentList.results) {
                return;
            }
            
            const companiesData = documentList.results
                .filter(doc => doc.filerName && doc.edinetCode)
                .map(doc => ({
                    edinet_code: doc.edinetCode,
                    company_name: doc.filerName,
                    company_name_en: doc.filerNameEn || null,
                    securities_code: doc.secCode || null,
                    industry_code: null,
                    market_segment: null,
                    fiscal_year_end: null,
                    address: null,
                    phone_number: null,
                    website_url: null,
                    business_description: null
                }));
            
            if (companiesData.length > 0) {
                await CompanyModel.bulkUpsert(companiesData);
                logger.info(`企業マスタデータ同期完了: ${companiesData.length}件`);
            }
            
        } catch (error) {
            logger.error('企業マスタデータ同期エラー:', error);
        }
    }
    
    /**
     * 最近のROIC計算を更新
     */
    async updateRecentRoicCalculations() {
        try {
            logger.info('最近のROIC計算更新開始');
            
            // 過去30日以内に更新された財務諸表を取得
            const recentFinancials = await this.getRecentFinancialStatements(30);
            
            for (const financial of recentFinancials) {
                try {
                    await this.roicCalculator.calculateRoic(
                        financial.company_id,
                        financial.fiscal_year,
                        financial.fiscal_quarter
                    );
                } catch (error) {
                    logger.error(`ROIC計算更新エラー (${financial.company_id}):`, error.message);
                }
            }
            
            logger.info(`ROIC計算更新完了: ${recentFinancials.length}件`);
            
        } catch (error) {
            logger.error('ROIC計算更新エラー:', error);
        }
    }
    
    /**
     * 全企業のROICを再計算
     */
    async recalculateAllRoic() {
        try {
            logger.info('全企業ROIC再計算開始');
            
            const companies = await CompanyModel.findAll();
            const currentYear = new Date().getFullYear();
            
            for (const company of companies) {
                try {
                    // 過去5年分のROICを再計算
                    for (let year = currentYear - 4; year <= currentYear; year++) {
                        await this.roicCalculator.calculateRoic(company.id, year);
                    }
                } catch (error) {
                    logger.error(`企業 ${company.id} のROIC再計算エラー:`, error.message);
                }
            }
            
            logger.info('全企業ROIC再計算完了');
            
        } catch (error) {
            logger.error('全企業ROIC再計算エラー:', error);
        }
    }
    
    /**
     * データ整合性チェック
     */
    async performDataIntegrityCheck() {
        try {
            logger.info('データ整合性チェック開始');
            
            // TODO: データ整合性チェックの実装
            // - 孤立した財務データの検出
            // - 異常値の検出
            // - 重複データの検出
            
            logger.info('データ整合性チェック完了');
            
        } catch (error) {
            logger.error('データ整合性チェックエラー:', error);
        }
    }
    
    /**
     * 期間内の財務データを同期
     * @param {Date} startDate - 開始日
     * @param {Date} endDate - 終了日
     */
    async syncFinancialDataRange(startDate, endDate) {
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            
            try {
                await this.syncNewFinancialData(dateStr);
            } catch (error) {
                logger.error(`期間同期エラー (${dateStr}):`, error.message);
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }
    
    /**
     * 最近の財務諸表を取得
     * @param {number} days - 日数
     * @returns {Promise<Array>} 財務諸表配列
     */
    async getRecentFinancialStatements(days) {
        // TODO: 実装
        return [];
    }
    
    /**
     * 配列をバッチに分割
     * @param {Array} array - 分割する配列
     * @param {number} batchSize - バッチサイズ
     * @returns {Array} バッチ配列
     */
    createBatches(array, batchSize) {
        const batches = [];
        for (let i = 0; i < array.length; i += batchSize) {
            batches.push(array.slice(i, i + batchSize));
        }
        return batches;
    }
    
    /**
     * 待機
     * @param {number} ms - 待機時間（ミリ秒）
     */
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * ジョブの停止
     */
    stop() {
        logger.info('データ同期ジョブを停止します');
        // TODO: cron ジョブの停止実装
    }
    
    /**
     * ジョブの状態を取得
     * @returns {Object} ジョブ状態
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastSyncDate: this.lastSyncDate,
            batchSize: this.batchSize,
            retryAttempts: this.retryAttempts
        };
    }
}

module.exports = DataSyncJob;