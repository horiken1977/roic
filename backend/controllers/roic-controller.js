const RoicCalculator = require('../services/roic-calculator');
const RoicCalculationModel = require('../models/roic-calculation-model');
const CompanyModel = require('../models/company-model');
const logger = require('../config/logger');
const { validationResult } = require('express-validator');

class RoicController {
    constructor() {
        this.roicCalculator = new RoicCalculator();
    }
    
    /**
     * 企業のROIC計算を実行
     */
    async calculateRoic(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'バリデーションエラー',
                    errors: errors.array()
                });
            }
            
            const { companyId } = req.params;
            const { 
                fiscalYear, 
                fiscalQuarter = null, 
                calculationMethod = 'standard' 
            } = req.body;
            
            // 企業の存在確認
            const company = await CompanyModel.findByEdinetCode(companyId);
            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: '企業が見つかりませんでした'
                });
            }
            
            // ROIC計算を実行
            const roicResult = await this.roicCalculator.calculateRoic(
                company.id,
                fiscalYear,
                fiscalQuarter,
                calculationMethod
            );
            
            res.json({
                success: true,
                message: 'ROIC計算が完了しました',
                data: roicResult
            });
            
        } catch (error) {
            logger.error('ROIC計算エラー:', error);
            res.status(500).json({
                success: false,
                message: 'ROIC計算に失敗しました',
                error: error.message
            });
        }
    }
    
    /**
     * 企業のROIC履歴を取得
     */
    async getRoicHistory(req, res) {
        try {
            const { identifier } = req.params;
            const {
                yearFrom,
                yearTo,
                calculationMethod = 'standard',
                limit = 10
            } = req.query;
            
            // 企業を取得
            let company;
            if (identifier.length === 6 && identifier.match(/^E\d{5}$/)) {
                company = await CompanyModel.findByEdinetCode(identifier);
            } else if (identifier.match(/^\d{4}$/)) {
                company = await CompanyModel.findBySecuritiesCode(identifier);
            } else {
                return res.status(400).json({
                    success: false,
                    message: '無効な企業識別子です'
                });
            }
            
            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: '企業が見つかりませんでした'
                });
            }
            
            // ROIC履歴を取得
            const options = {
                yearFrom: yearFrom ? parseInt(yearFrom) : null,
                yearTo: yearTo ? parseInt(yearTo) : null,
                calculationMethod,
                limit: parseInt(limit)
            };
            
            const roicHistory = await RoicCalculationModel.findByCompanyId(company.id, options);
            
            res.json({
                success: true,
                data: {
                    company: {
                        id: company.id,
                        name: company.company_name,
                        edinetCode: company.edinet_code,
                        securitiesCode: company.securities_code
                    },
                    roicHistory: roicHistory,
                    summary: this.createHistorySummary(roicHistory)
                }
            });
            
        } catch (error) {
            logger.error('ROIC履歴取得エラー:', error);
            res.status(500).json({
                success: false,
                message: 'ROIC履歴の取得に失敗しました',
                error: error.message
            });
        }
    }
    
    /**
     * 最新のROIC情報を取得
     */
    async getLatestRoic(req, res) {
        try {
            const { identifier } = req.params;
            const { calculationMethod = 'standard' } = req.query;
            
            // 企業を取得
            let company;
            if (identifier.length === 6 && identifier.match(/^E\d{5}$/)) {
                company = await CompanyModel.findByEdinetCode(identifier);
            } else if (identifier.match(/^\d{4}$/)) {
                company = await CompanyModel.findBySecuritiesCode(identifier);
            } else {
                return res.status(400).json({
                    success: false,
                    message: '無効な企業識別子です'
                });
            }
            
            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: '企業が見つかりませんでした'
                });
            }
            
            // 最新のROIC情報を取得
            const latestRoic = await RoicCalculationModel.findLatest(company.id, calculationMethod);
            
            if (!latestRoic) {
                return res.status(404).json({
                    success: false,
                    message: 'ROIC計算結果が見つかりませんでした'
                });
            }
            
            res.json({
                success: true,
                data: latestRoic
            });
            
        } catch (error) {
            logger.error('最新ROIC取得エラー:', error);
            res.status(500).json({
                success: false,
                message: '最新ROIC情報の取得に失敗しました',
                error: error.message
            });
        }
    }
    
    /**
     * 業界平均ROICを取得
     */
    async getIndustryAverage(req, res) {
        try {
            const { industryCode } = req.params;
            const { 
                fiscalYear = new Date().getFullYear() - 1,
                calculationMethod = 'standard'
            } = req.query;
            
            const industryAverage = await RoicCalculationModel.getIndustryAverage(
                industryCode,
                parseInt(fiscalYear),
                calculationMethod
            );
            
            if (!industryAverage || !industryAverage.company_count) {
                return res.status(404).json({
                    success: false,
                    message: '業界平均データが見つかりませんでした'
                });
            }
            
            res.json({
                success: true,
                data: {
                    industryCode: industryCode,
                    fiscalYear: parseInt(fiscalYear),
                    calculationMethod: calculationMethod,
                    averageRoic: parseFloat(industryAverage.avg_roic),
                    medianRoic: parseFloat(industryAverage.median_roic),
                    minRoic: parseFloat(industryAverage.min_roic),
                    maxRoic: parseFloat(industryAverage.max_roic),
                    companyCount: parseInt(industryAverage.company_count)
                }
            });
            
        } catch (error) {
            logger.error('業界平均ROIC取得エラー:', error);
            res.status(500).json({
                success: false,
                message: '業界平均ROICの取得に失敗しました',
                error: error.message
            });
        }
    }
    
    /**
     * ROIC上位企業を取得
     */
    async getTopPerformers(req, res) {
        try {
            const {
                fiscalYear = new Date().getFullYear() - 1,
                industryCode,
                calculationMethod = 'standard',
                limit = 20
            } = req.query;
            
            const options = {
                fiscalYear: fiscalYear ? parseInt(fiscalYear) : null,
                industryCode,
                calculationMethod,
                limit: parseInt(limit)
            };
            
            const topPerformers = await RoicCalculationModel.getTopPerformers(options);
            
            res.json({
                success: true,
                data: {
                    criteria: options,
                    topPerformers: topPerformers,
                    summary: {
                        totalCount: topPerformers.length,
                        averageRoic: topPerformers.length > 0 
                            ? topPerformers.reduce((sum, item) => sum + item.roic_percentage, 0) / topPerformers.length 
                            : 0
                    }
                }
            });
            
        } catch (error) {
            logger.error('ROIC上位企業取得エラー:', error);
            res.status(500).json({
                success: false,
                message: 'ROIC上位企業の取得に失敗しました',
                error: error.message
            });
        }
    }
    
    /**
     * 複数企業のROIC比較
     */
    async compareRoic(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'バリデーションエラー',
                    errors: errors.array()
                });
            }
            
            const { 
                companyIds, 
                fiscalYear = new Date().getFullYear() - 1,
                calculationMethod = 'standard'
            } = req.body;
            
            if (!Array.isArray(companyIds) || companyIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '比較する企業を指定してください'
                });
            }
            
            const comparisons = [];
            
            for (const companyId of companyIds) {
                try {
                    // 企業情報を取得
                    let company;
                    if (companyId.length === 6 && companyId.match(/^E\d{5}$/)) {
                        company = await CompanyModel.findByEdinetCode(companyId);
                    } else if (companyId.match(/^\d{4}$/)) {
                        company = await CompanyModel.findBySecuritiesCode(companyId);
                    }
                    
                    if (!company) {
                        comparisons.push({
                            companyId: companyId,
                            error: '企業が見つかりませんでした'
                        });
                        continue;
                    }
                    
                    // ROIC情報を取得
                    const roicData = await RoicCalculationModel.findByKey(
                        company.id,
                        parseInt(fiscalYear),
                        null,
                        calculationMethod
                    );
                    
                    comparisons.push({
                        company: {
                            id: company.id,
                            name: company.company_name,
                            edinetCode: company.edinet_code,
                            securitiesCode: company.securities_code,
                            industryCode: company.industry_code
                        },
                        roic: roicData || null
                    });
                    
                } catch (error) {
                    comparisons.push({
                        companyId: companyId,
                        error: error.message
                    });
                }
            }
            
            res.json({
                success: true,
                data: {
                    fiscalYear: parseInt(fiscalYear),
                    calculationMethod: calculationMethod,
                    comparisons: comparisons,
                    summary: this.createComparisonSummary(comparisons)
                }
            });
            
        } catch (error) {
            logger.error('ROIC比較エラー:', error);
            res.status(500).json({
                success: false,
                message: 'ROIC比較に失敗しました',
                error: error.message
            });
        }
    }
    
    /**
     * バッチROIC計算
     */
    async bulkCalculateRoic(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'バリデーションエラー',
                    errors: errors.array()
                });
            }
            
            const { 
                fiscalYear = new Date().getFullYear() - 1,
                calculationMethod = 'standard',
                industryCode
            } = req.body;
            
            // 対象企業を取得
            const options = industryCode ? { industryCode } : {};
            const companies = await CompanyModel.findAll(options);
            
            if (companies.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '対象企業が見つかりませんでした'
                });
            }
            
            // バッチ計算を実行
            const results = await this.roicCalculator.bulkCalculateRoic(
                companies,
                parseInt(fiscalYear),
                calculationMethod
            );
            
            const successCount = results.filter(r => !r.error).length;
            const errorCount = results.filter(r => r.error).length;
            
            res.json({
                success: true,
                message: `バッチROIC計算完了: 成功 ${successCount}件、失敗 ${errorCount}件`,
                data: {
                    totalCount: results.length,
                    successCount: successCount,
                    errorCount: errorCount,
                    results: results
                }
            });
            
        } catch (error) {
            logger.error('バッチROIC計算エラー:', error);
            res.status(500).json({
                success: false,
                message: 'バッチROIC計算に失敗しました',
                error: error.message
            });
        }
    }
    
    /**
     * ROIC履歴のサマリーを作成
     * @param {Array} roicHistory - ROIC履歴
     * @returns {Object} サマリー
     */
    createHistorySummary(roicHistory) {
        if (!roicHistory || roicHistory.length === 0) {
            return null;
        }
        
        const roicValues = roicHistory
            .filter(item => item.roic_percentage !== null)
            .map(item => item.roic_percentage);
        
        if (roicValues.length === 0) {
            return null;
        }
        
        const averageRoic = roicValues.reduce((sum, val) => sum + val, 0) / roicValues.length;
        const maxRoic = Math.max(...roicValues);
        const minRoic = Math.min(...roicValues);
        
        return {
            periodCount: roicHistory.length,
            averageRoic: Math.round(averageRoic * 100) / 100,
            maxRoic: maxRoic,
            minRoic: minRoic,
            latestRoic: roicHistory[0]?.roic_percentage || null,
            trend: this.calculateTrend(roicValues)
        };
    }
    
    /**
     * 比較サマリーを作成
     * @param {Array} comparisons - 比較データ
     * @returns {Object} サマリー
     */
    createComparisonSummary(comparisons) {
        const validComparisons = comparisons.filter(c => c.roic && c.roic.roic_percentage !== null);
        
        if (validComparisons.length === 0) {
            return null;
        }
        
        const roicValues = validComparisons.map(c => c.roic.roic_percentage);
        const averageRoic = roicValues.reduce((sum, val) => sum + val, 0) / roicValues.length;
        
        return {
            totalCompanies: comparisons.length,
            validComparisons: validComparisons.length,
            averageRoic: Math.round(averageRoic * 100) / 100,
            maxRoic: Math.max(...roicValues),
            minRoic: Math.min(...roicValues),
            topPerformer: validComparisons.reduce((max, current) => 
                current.roic.roic_percentage > (max.roic?.roic_percentage || -Infinity) ? current : max
            )
        };
    }
    
    /**
     * トレンドを計算
     * @param {Array} values - 値の配列（時系列順）
     * @returns {string} トレンド（'improving', 'declining', 'stable'）
     */
    calculateTrend(values) {
        if (values.length < 2) {
            return 'stable';
        }
        
        const recent = values.slice(0, Math.min(3, values.length));
        const older = values.slice(-Math.min(3, values.length));
        
        const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
        const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
        
        const threshold = 0.5; // 0.5%の閾値
        
        if (recentAvg - olderAvg > threshold) {
            return 'improving';
        } else if (olderAvg - recentAvg > threshold) {
            return 'declining';
        } else {
            return 'stable';
        }
    }
}

module.exports = new RoicController();