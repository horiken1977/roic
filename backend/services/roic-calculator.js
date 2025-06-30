const logger = require('../config/logger');
const FinancialStatementModel = require('../models/financial-statement-model');
const RoicCalculationModel = require('../models/roic-calculation-model');

class RoicCalculator {
    constructor() {
        // デフォルトの税率設定
        this.defaultTaxRate = 0.3; // 30%
        
        // 計算方法の定義
        this.calculationMethods = {
            standard: 'スタンダード',
            adjusted: '調整済み',
            conservative: '保守的',
            aggressive: '積極的'
        };
    }
    
    /**
     * 企業のROICを計算
     * @param {number} companyId - 企業ID
     * @param {number} fiscalYear - 年度
     * @param {number} fiscalQuarter - 四半期
     * @param {string} calculationMethod - 計算方法
     * @returns {Promise<Object>} ROIC計算結果
     */
    async calculateRoic(companyId, fiscalYear, fiscalQuarter = null, calculationMethod = 'standard') {
        try {
            logger.info(`ROIC計算開始: 企業ID ${companyId}, ${fiscalYear}年, 計算方法: ${calculationMethod}`);
            
            // 財務諸表データを取得
            const financialData = await FinancialStatementModel.findByKey(
                companyId, 
                fiscalYear, 
                fiscalQuarter, 
                fiscalQuarter ? 'quarterly' : 'annual'
            );
            
            if (!financialData) {
                throw new Error(`財務諸表データが見つかりません: 企業ID ${companyId}, ${fiscalYear}年`);
            }
            
            // NOPATを計算
            const nopat = this.calculateNopat(financialData, calculationMethod);
            
            // 投下資本を計算
            const investedCapital = this.calculateInvestedCapital(financialData, calculationMethod);
            
            // ROICを計算
            const roicPercentage = this.calculateRoicPercentage(nopat, investedCapital);
            
            // 補助的な計算値
            const calculations = this.calculateAuxiliaryMetrics(financialData, calculationMethod);
            
            // ROIC計算結果を作成
            const roicData = {
                company_id: companyId,
                financial_statement_id: financialData.id,
                calculation_date: new Date(),
                fiscal_year: fiscalYear,
                fiscal_quarter: fiscalQuarter,
                nopat: nopat,
                invested_capital: investedCapital,
                roic_percentage: roicPercentage,
                operating_income: financialData.operating_income,
                tax_rate: calculations.taxRate,
                effective_tax_rate: calculations.effectiveTaxRate,
                working_capital: calculations.workingCapital,
                fixed_assets: calculations.fixedAssets,
                goodwill: calculations.goodwill,
                intangible_assets: calculations.intangibleAssets,
                calculation_method: calculationMethod,
                notes: this.generateCalculationNotes(financialData, calculations, calculationMethod)
            };
            
            // データベースに保存
            const savedRoic = await RoicCalculationModel.upsert(roicData);
            
            logger.info(`ROIC計算完了: 企業ID ${companyId}, ROIC ${roicPercentage}%`);
            
            return {
                ...savedRoic,
                calculations: calculations,
                breakdown: this.createRoicBreakdown(financialData, calculations, nopat, investedCapital)
            };
            
        } catch (error) {
            logger.error(`ROIC計算エラー: 企業ID ${companyId}, ${fiscalYear}年:`, error);
            throw new Error(`ROIC計算に失敗しました: ${error.message}`);
        }
    }
    
    /**
     * NOPAT（税引き後営業利益）を計算
     * @param {Object} financialData - 財務諸表データ
     * @param {string} calculationMethod - 計算方法
     * @returns {number|null} NOPAT
     */
    calculateNopat(financialData, calculationMethod = 'standard') {
        try {
            const operatingIncome = financialData.operating_income;
            const taxExpense = financialData.tax_expense;
            const netIncome = financialData.net_income;
            const revenue = financialData.revenue;
            
            if (!operatingIncome) {
                logger.warn('営業利益データがないためNOPAT計算をスキップ');
                return null;
            }
            
            let taxRate = this.defaultTaxRate;
            let nopat = null;
            
            switch (calculationMethod) {
                case 'standard':
                    // 標準計算: 営業利益 × (1 - 実効税率)
                    taxRate = this.calculateEffectiveTaxRate(financialData);
                    nopat = operatingIncome * (1 - taxRate);
                    break;
                    
                case 'adjusted':
                    // 調整済み計算: 特別損益を除外した営業利益で計算
                    const adjustedOperatingIncome = this.adjustOperatingIncome(financialData);
                    taxRate = this.calculateEffectiveTaxRate(financialData);
                    nopat = adjustedOperatingIncome * (1 - taxRate);
                    break;
                    
                case 'conservative':
                    // 保守的計算: 高い税率を適用
                    taxRate = Math.max(this.calculateEffectiveTaxRate(financialData), 0.35);
                    nopat = operatingIncome * (1 - taxRate);
                    break;
                    
                case 'aggressive':
                    // 積極的計算: 低い税率を適用
                    taxRate = Math.min(this.calculateEffectiveTaxRate(financialData), 0.25);
                    nopat = operatingIncome * (1 - taxRate);
                    break;
                    
                default:
                    taxRate = this.calculateEffectiveTaxRate(financialData);
                    nopat = operatingIncome * (1 - taxRate);
            }
            
            logger.debug(`NOPAT計算: 営業利益 ${operatingIncome}, 税率 ${(taxRate * 100).toFixed(2)}%, NOPAT ${nopat}`);
            
            return Math.round(nopat);
            
        } catch (error) {
            logger.error('NOPAT計算エラー:', error);
            return null;
        }
    }
    
    /**
     * 投下資本を計算
     * @param {Object} financialData - 財務諸表データ
     * @param {string} calculationMethod - 計算方法
     * @returns {number|null} 投下資本
     */
    calculateInvestedCapital(financialData, calculationMethod = 'standard') {
        try {
            const totalAssets = financialData.total_assets;
            const currentLiabilities = financialData.current_liabilities;
            const totalEquity = financialData.total_equity;
            const fixedAssets = financialData.fixed_assets;
            
            if (!totalAssets && !totalEquity) {
                logger.warn('資産・純資産データがないため投下資本計算をスキップ');
                return null;
            }
            
            let investedCapital = null;
            
            switch (calculationMethod) {
                case 'standard':
                    // 標準計算: 総資産 - 流動負債（無利子負債除く）
                    const nonInterestBearingCurrentLiabilities = this.estimateNonInterestBearingLiabilities(financialData);
                    investedCapital = totalAssets - nonInterestBearingCurrentLiabilities;
                    break;
                    
                case 'adjusted':
                    // 調整済み計算: 純資産 + 有利子負債
                    const interestBearingDebt = this.calculateInterestBearingDebt(financialData);
                    investedCapital = totalEquity + interestBearingDebt;
                    break;
                    
                case 'conservative':
                    // 保守的計算: より厳格な投下資本計算
                    investedCapital = this.calculateConservativeInvestedCapital(financialData);
                    break;
                    
                case 'aggressive':
                    // 積極的計算: より寛大な投下資本計算
                    investedCapital = this.calculateAggressiveInvestedCapital(financialData);
                    break;
                    
                default:
                    investedCapital = totalAssets - (currentLiabilities || 0) * 0.7; // 概算
            }
            
            // 投下資本が負の値になる場合の調整
            if (investedCapital < 0) {
                investedCapital = totalEquity || totalAssets * 0.3; // フォールバック
            }
            
            logger.debug(`投下資本計算: ${investedCapital}`);
            
            return Math.round(investedCapital);
            
        } catch (error) {
            logger.error('投下資本計算エラー:', error);
            return null;
        }
    }
    
    /**
     * ROICパーセンテージを計算
     * @param {number} nopat - NOPAT
     * @param {number} investedCapital - 投下資本
     * @returns {number|null} ROICパーセンテージ
     */
    calculateRoicPercentage(nopat, investedCapital) {
        if (!nopat || !investedCapital || investedCapital === 0) {
            return null;
        }
        
        const roicDecimal = nopat / investedCapital;
        const roicPercentage = roicDecimal * 100;
        
        return Math.round(roicPercentage * 100) / 100; // 小数点以下2桁まで
    }
    
    /**
     * 実効税率を計算
     * @param {Object} financialData - 財務諸表データ
     * @returns {number} 実効税率
     */
    calculateEffectiveTaxRate(financialData) {
        try {
            const taxExpense = financialData.tax_expense;
            const ordinaryIncome = financialData.ordinary_income;
            const netIncome = financialData.net_income;
            
            // 税金費用と税引前利益がある場合
            if (taxExpense && ordinaryIncome && ordinaryIncome > 0) {
                const effectiveRate = taxExpense / ordinaryIncome;
                // 合理的な範囲内の税率のみ採用（0%〜50%）
                if (effectiveRate >= 0 && effectiveRate <= 0.5) {
                    return effectiveRate;
                }
            }
            
            // 純利益と営業利益から推定
            if (netIncome && financialData.operating_income && financialData.operating_income > 0) {
                const impliedTaxRate = (financialData.operating_income - netIncome) / financialData.operating_income;
                if (impliedTaxRate >= 0 && impliedTaxRate <= 0.5) {
                    return impliedTaxRate;
                }
            }
            
            // デフォルト税率を使用
            return this.defaultTaxRate;
            
        } catch (error) {
            logger.warn('実効税率計算エラー:', error.message);
            return this.defaultTaxRate;
        }
    }
    
    /**
     * 補助的な指標を計算
     * @param {Object} financialData - 財務諸表データ
     * @param {string} calculationMethod - 計算方法
     * @returns {Object} 補助指標
     */
    calculateAuxiliaryMetrics(financialData, calculationMethod) {
        const workingCapital = this.calculateWorkingCapital(financialData);
        const taxRate = this.calculateEffectiveTaxRate(financialData);
        
        return {
            workingCapital: workingCapital,
            taxRate: taxRate,
            effectiveTaxRate: taxRate,
            fixedAssets: financialData.fixed_assets || null,
            goodwill: this.estimateGoodwill(financialData),
            intangibleAssets: this.estimateIntangibleAssets(financialData),
            assetTurnover: this.calculateAssetTurnover(financialData),
            profitMargin: this.calculateProfitMargin(financialData)
        };
    }
    
    /**
     * 運転資本を計算
     * @param {Object} financialData - 財務諸表データ
     * @returns {number|null} 運転資本
     */
    calculateWorkingCapital(financialData) {
        const currentAssets = financialData.current_assets;
        const currentLiabilities = financialData.current_liabilities;
        
        if (currentAssets && currentLiabilities) {
            return currentAssets - currentLiabilities;
        }
        
        return null;
    }
    
    /**
     * 営業利益を調整
     * @param {Object} financialData - 財務諸表データ
     * @returns {number} 調整後営業利益
     */
    adjustOperatingIncome(financialData) {
        let adjustedIncome = financialData.operating_income || 0;
        
        // 特別損益の除外（概算）
        // 実際の実装では、より詳細な調整が必要
        
        return adjustedIncome;
    }
    
    /**
     * 無利子負債を推定
     * @param {Object} financialData - 財務諸表データ
     * @returns {number} 無利子負債
     */
    estimateNonInterestBearingLiabilities(financialData) {
        const currentLiabilities = financialData.current_liabilities || 0;
        
        // 流動負債の約70%が無利子負債と仮定（買掛金、未払金等）
        return currentLiabilities * 0.7;
    }
    
    /**
     * 有利子負債を計算
     * @param {Object} financialData - 財務諸表データ
     * @returns {number} 有利子負債
     */
    calculateInterestBearingDebt(financialData) {
        const totalLiabilities = financialData.total_liabilities || 0;
        const currentLiabilities = financialData.current_liabilities || 0;
        const fixedLiabilities = financialData.fixed_liabilities || 0;
        
        // 固定負債の約80%と流動負債の約30%が有利子負債と仮定
        const interestBearingDebt = (fixedLiabilities * 0.8) + (currentLiabilities * 0.3);
        
        return interestBearingDebt;
    }
    
    /**
     * 保守的な投下資本を計算
     * @param {Object} financialData - 財務諸表データ
     * @returns {number} 保守的投下資本
     */
    calculateConservativeInvestedCapital(financialData) {
        const totalEquity = financialData.total_equity || 0;
        const interestBearingDebt = this.calculateInterestBearingDebt(financialData);
        
        // 保守的: のれんや無形資産を除外
        const goodwill = this.estimateGoodwill(financialData);
        const intangibles = this.estimateIntangibleAssets(financialData);
        
        return totalEquity + interestBearingDebt - goodwill - intangibles;
    }
    
    /**
     * 積極的な投下資本を計算
     * @param {Object} financialData - 財務諸表データ
     * @returns {number} 積極的投下資本
     */
    calculateAggressiveInvestedCapital(financialData) {
        const totalAssets = financialData.total_assets || 0;
        const currentLiabilities = financialData.current_liabilities || 0;
        
        // 積極的: 流動負債をより多く除外
        return totalAssets - (currentLiabilities * 0.9);
    }
    
    /**
     * のれんを推定
     * @param {Object} financialData - 財務諸表データ
     * @returns {number} のれん推定値
     */
    estimateGoodwill(financialData) {
        // 簡易推定: 固定資産の5%をのれんと仮定
        const fixedAssets = financialData.fixed_assets || 0;
        return fixedAssets * 0.05;
    }
    
    /**
     * 無形資産を推定
     * @param {Object} financialData - 財務諸表データ
     * @returns {number} 無形資産推定値
     */
    estimateIntangibleAssets(financialData) {
        // 簡易推定: 固定資産の10%を無形資産と仮定
        const fixedAssets = financialData.fixed_assets || 0;
        return fixedAssets * 0.1;
    }
    
    /**
     * 資産回転率を計算
     * @param {Object} financialData - 財務諸表データ
     * @returns {number|null} 資産回転率
     */
    calculateAssetTurnover(financialData) {
        const revenue = financialData.revenue;
        const totalAssets = financialData.total_assets;
        
        if (revenue && totalAssets && totalAssets > 0) {
            return revenue / totalAssets;
        }
        
        return null;
    }
    
    /**
     * 利益率を計算
     * @param {Object} financialData - 財務諸表データ
     * @returns {number|null} 利益率
     */
    calculateProfitMargin(financialData) {
        const operatingIncome = financialData.operating_income;
        const revenue = financialData.revenue;
        
        if (operatingIncome && revenue && revenue > 0) {
            return operatingIncome / revenue;
        }
        
        return null;
    }
    
    /**
     * 計算ノートを生成
     * @param {Object} financialData - 財務諸表データ
     * @param {Object} calculations - 計算結果
     * @param {string} calculationMethod - 計算方法
     * @returns {string} 計算ノート
     */
    generateCalculationNotes(financialData, calculations, calculationMethod) {
        const notes = [];
        
        notes.push(`計算方法: ${this.calculationMethods[calculationMethod] || calculationMethod}`);
        notes.push(`税率: ${(calculations.taxRate * 100).toFixed(2)}%`);
        
        if (calculations.workingCapital) {
            notes.push(`運転資本: ${calculations.workingCapital.toLocaleString()}百万円`);
        }
        
        if (calculations.assetTurnover) {
            notes.push(`資産回転率: ${calculations.assetTurnover.toFixed(2)}回`);
        }
        
        if (calculations.profitMargin) {
            notes.push(`営業利益率: ${(calculations.profitMargin * 100).toFixed(2)}%`);
        }
        
        return notes.join('; ');
    }
    
    /**
     * ROIC分解を作成
     * @param {Object} financialData - 財務諸表データ
     * @param {Object} calculations - 計算結果
     * @param {number} nopat - NOPAT
     * @param {number} investedCapital - 投下資本
     * @returns {Object} ROIC分解
     */
    createRoicBreakdown(financialData, calculations, nopat, investedCapital) {
        return {
            nopat: {
                value: nopat,
                components: {
                    operatingIncome: financialData.operating_income,
                    taxRate: calculations.taxRate,
                    taxAmount: financialData.operating_income * calculations.taxRate
                }
            },
            investedCapital: {
                value: investedCapital,
                components: {
                    totalAssets: financialData.total_assets,
                    currentLiabilities: financialData.current_liabilities,
                    workingCapital: calculations.workingCapital,
                    fixedAssets: calculations.fixedAssets
                }
            },
            profitability: {
                assetTurnover: calculations.assetTurnover,
                profitMargin: calculations.profitMargin,
                roicFromDuPont: calculations.assetTurnover * calculations.profitMargin
            }
        };
    }
    
    /**
     * 複数企業のROICを一括計算
     * @param {Array} companies - 企業配列
     * @param {number} fiscalYear - 年度
     * @param {string} calculationMethod - 計算方法
     * @returns {Promise<Array>} ROIC計算結果配列
     */
    async bulkCalculateRoic(companies, fiscalYear, calculationMethod = 'standard') {
        const results = [];
        
        for (const company of companies) {
            try {
                const roicResult = await this.calculateRoic(
                    company.id, 
                    fiscalYear, 
                    null, 
                    calculationMethod
                );
                results.push(roicResult);
            } catch (error) {
                logger.error(`企業 ${company.id} のROIC計算エラー:`, error.message);
                results.push({
                    company_id: company.id,
                    error: error.message
                });
            }
        }
        
        logger.info(`一括ROIC計算完了: ${results.length}件中 ${results.filter(r => !r.error).length}件成功`);
        
        return results;
    }
}

module.exports = RoicCalculator;