const xml2js = require('xml2js');
const logger = require('../config/logger');

class XbrlParser {
    constructor() {
        this.parser = new xml2js.Parser({
            explicitArray: false,
            ignoreAttrs: false,
            attrkey: 'attributes',
            normalize: true,
            normalizeTags: true,
            trim: true
        });
        
        // XBRL要素のマッピング定義
        this.elementMappings = {
            // 貸借対照表
            totalAssets: [
                'assets',
                'totalassets',
                'assetssum',
                'bs_totalassets'
            ],
            currentAssets: [
                'currentassets',
                'bs_currentassets',
                'shorttermassets'
            ],
            fixedAssets: [
                'noncurrentassets',
                'fixedassets',
                'bs_noncurrentassets'
            ],
            totalLiabilities: [
                'liabilities',
                'totalliabilities',
                'liabilitiessum',
                'bs_totalliabilities'
            ],
            currentLiabilities: [
                'currentliabilities',
                'bs_currentliabilities',
                'shorttermliabilities'
            ],
            fixedLiabilities: [
                'noncurrentliabilities',
                'longtermliabilities',
                'bs_noncurrentliabilities'
            ],
            totalEquity: [
                'netassets',
                'totalnetassets',
                'equity',
                'totalequity',
                'bs_totalequity'
            ],
            retainedEarnings: [
                'retainedearnings',
                'bs_retainedearnings',
                'accumulatedearnings'
            ],
            
            // 損益計算書
            revenue: [
                'netsales',
                'revenue',
                'operatingrevenue',
                'pl_netsales',
                'pl_revenue'
            ],
            operatingIncome: [
                'operatingincome',
                'operatingprofit',
                'pl_operatingincome'
            ],
            ordinaryIncome: [
                'ordinaryincome',
                'incomebeforeincometaxes',
                'pl_ordinaryincome'
            ],
            netIncome: [
                'netincome',
                'profitattributabletoownersofparent',
                'pl_netincome'
            ],
            operatingExpenses: [
                'operatingexpenses',
                'sellingandadministrativeexpenses',
                'pl_operatingexpenses'
            ],
            interestExpense: [
                'interestexpenses',
                'financecosts',
                'pl_interestexpenses'
            ],
            taxExpense: [
                'incometaxes',
                'incometaxexpense',
                'pl_incometaxes'
            ],
            
            // キャッシュフロー計算書
            operatingCashFlow: [
                'netcashprovidedbyusedinfromoperatingactivities',
                'cashflowsfromoperatingactivities',
                'cf_operatingactivities'
            ],
            investingCashFlow: [
                'netcashprovidedbyusedininvestingactivities',
                'cashflowsfrominvestingactivities',
                'cf_investingactivities'
            ],
            financingCashFlow: [
                'netcashprovidedbyusedinfinancingactivities',
                'cashflowsfromfinancingactivities',
                'cf_financingactivities'
            ]
        };
    }
    
    /**
     * XBRL XMLをパース
     * @param {string} xmlData - XBRL XMLデータ
     * @returns {Promise<Object>} パース結果
     */
    async parseXbrlXml(xmlData) {
        try {
            const result = await this.parser.parseStringPromise(xmlData);
            logger.info('XBRL XMLパース成功');
            return result;
        } catch (error) {
            logger.error('XBRL XMLパースエラー:', error);
            throw new Error(`XBRL XMLのパースに失敗しました: ${error.message}`);
        }
    }
    
    /**
     * XBRLデータから財務データを抽出
     * @param {Object} xbrlData - パース済みXBRLデータ
     * @param {Object} context - 抽出コンテキスト
     * @returns {Promise<Object>} 抽出された財務データ
     */
    async extractFinancialData(xbrlData, context = {}) {
        try {
            const financialData = {
                // メタデータ
                fiscal_year: this.extractFiscalYear(xbrlData, context),
                fiscal_quarter: this.extractFiscalQuarter(xbrlData, context),
                report_type: this.extractReportType(xbrlData, context),
                filing_date: this.extractFilingDate(xbrlData, context),
                
                // 貸借対照表
                total_assets: this.extractValue(xbrlData, 'totalAssets', context),
                current_assets: this.extractValue(xbrlData, 'currentAssets', context),
                fixed_assets: this.extractValue(xbrlData, 'fixedAssets', context),
                total_liabilities: this.extractValue(xbrlData, 'totalLiabilities', context),
                current_liabilities: this.extractValue(xbrlData, 'currentLiabilities', context),
                fixed_liabilities: this.extractValue(xbrlData, 'fixedLiabilities', context),
                total_equity: this.extractValue(xbrlData, 'totalEquity', context),
                retained_earnings: this.extractValue(xbrlData, 'retainedEarnings', context),
                
                // 損益計算書
                revenue: this.extractValue(xbrlData, 'revenue', context),
                operating_income: this.extractValue(xbrlData, 'operatingIncome', context),
                ordinary_income: this.extractValue(xbrlData, 'ordinaryIncome', context),
                net_income: this.extractValue(xbrlData, 'netIncome', context),
                operating_expenses: this.extractValue(xbrlData, 'operatingExpenses', context),
                interest_expense: this.extractValue(xbrlData, 'interestExpense', context),
                tax_expense: this.extractValue(xbrlData, 'taxExpense', context),
                
                // キャッシュフロー計算書
                operating_cash_flow: this.extractValue(xbrlData, 'operatingCashFlow', context),
                investing_cash_flow: this.extractValue(xbrlData, 'investingCashFlow', context),
                financing_cash_flow: this.extractValue(xbrlData, 'financingCashFlow', context),
                
                // 計算値
                free_cash_flow: null // 後で計算
            };
            
            // フリーキャッシュフローの計算
            if (financialData.operating_cash_flow && financialData.investing_cash_flow) {
                financialData.free_cash_flow = 
                    financialData.operating_cash_flow + financialData.investing_cash_flow;
            }
            
            // 固定資産の計算（総資産 - 流動資産）
            if (financialData.total_assets && financialData.current_assets && !financialData.fixed_assets) {
                financialData.fixed_assets = 
                    financialData.total_assets - financialData.current_assets;
            }
            
            // 固定負債の計算（総負債 - 流動負債）
            if (financialData.total_liabilities && financialData.current_liabilities && !financialData.fixed_liabilities) {
                financialData.fixed_liabilities = 
                    financialData.total_liabilities - financialData.current_liabilities;
            }
            
            logger.info('財務データ抽出成功');
            return financialData;
            
        } catch (error) {
            logger.error('財務データ抽出エラー:', error);
            throw new Error(`財務データの抽出に失敗しました: ${error.message}`);
        }
    }
    
    /**
     * 特定の財務項目の値を抽出
     * @param {Object} xbrlData - XBRLデータ
     * @param {string} itemKey - 項目キー
     * @param {Object} context - コンテキスト
     * @returns {number|null} 抽出した値
     */
    extractValue(xbrlData, itemKey, context = {}) {
        try {
            const mappings = this.elementMappings[itemKey];
            if (!mappings) {
                logger.warn(`未定義の項目キー: ${itemKey}`);
                return null;
            }
            
            // 各マッピングを試行
            for (const mapping of mappings) {
                const value = this.findElementValue(xbrlData, mapping, context);
                if (value !== null) {
                    return this.parseNumericValue(value);
                }
            }
            
            logger.debug(`値が見つかりませんでした: ${itemKey}`);
            return null;
            
        } catch (error) {
            logger.warn(`値抽出エラー (${itemKey}):`, error.message);
            return null;
        }
    }
    
    /**
     * 要素の値を検索
     * @param {Object} obj - 検索対象オブジェクト
     * @param {string} elementName - 要素名
     * @param {Object} context - コンテキスト
     * @returns {string|null} 見つかった値
     */
    findElementValue(obj, elementName, context = {}) {
        if (!obj || typeof obj !== 'object') {
            return null;
        }
        
        // 直接マッチ
        const directKey = Object.keys(obj).find(key => 
            key.toLowerCase().includes(elementName.toLowerCase()) ||
            elementName.toLowerCase().includes(key.toLowerCase())
        );
        
        if (directKey && obj[directKey]) {
            const value = this.extractContextualValue(obj[directKey], context);
            if (value !== null) {
                return value;
            }
        }
        
        // 再帰検索
        for (const key in obj) {
            if (typeof obj[key] === 'object') {
                const result = this.findElementValue(obj[key], elementName, context);
                if (result !== null) {
                    return result;
                }
            }
        }
        
        return null;
    }
    
    /**
     * コンテキストに基づいて値を抽出
     * @param {any} element - 要素
     * @param {Object} context - コンテキスト
     * @returns {string|null} 抽出した値
     */
    extractContextualValue(element, context) {
        // 単純な値の場合
        if (typeof element === 'string' || typeof element === 'number') {
            return element.toString();
        }
        
        // 配列の場合
        if (Array.isArray(element)) {
            // 最初の有効な値を返す
            for (const item of element) {
                const value = this.extractContextualValue(item, context);
                if (value !== null) {
                    return value;
                }
            }
            return null;
        }
        
        // オブジェクトの場合
        if (typeof element === 'object' && element !== null) {
            // テキスト値を探す
            if (element._text || element._ || element['#text']) {
                return element._text || element._ || element['#text'];
            }
            
            // コンテキスト指定がある場合
            if (context.contextRef) {
                const contextKey = Object.keys(element).find(key => 
                    key.includes(context.contextRef)
                );
                if (contextKey && element[contextKey]) {
                    return this.extractContextualValue(element[contextKey], context);
                }
            }
            
            // 属性から値を取得
            if (element.attributes && element.attributes.value) {
                return element.attributes.value;
            }
            
            // 最初の数値的な値を返す
            for (const key in element) {
                const value = element[key];
                if (typeof value === 'string' || typeof value === 'number') {
                    const numValue = this.parseNumericValue(value);
                    if (numValue !== null) {
                        return value.toString();
                    }
                }
            }
        }
        
        return null;
    }
    
    /**
     * 数値を解析
     * @param {any} value - 値
     * @returns {number|null} 解析した数値
     */
    parseNumericValue(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        
        const strValue = value.toString().replace(/[,\s]/g, '');
        const numValue = parseFloat(strValue);
        
        return isNaN(numValue) ? null : numValue;
    }
    
    /**
     * 年度を抽出
     * @param {Object} xbrlData - XBRLデータ
     * @param {Object} context - コンテキスト
     * @returns {number|null} 年度
     */
    extractFiscalYear(xbrlData, context) {
        try {
            // コンテキストから年度を抽出
            const yearValue = this.findElementValue(xbrlData, 'fiscalyear', context) ||
                             this.findElementValue(xbrlData, 'period', context) ||
                             this.findElementValue(xbrlData, 'year', context);
            
            if (yearValue) {
                const year = parseInt(yearValue);
                if (year > 1900 && year < 2100) {
                    return year;
                }
            }
            
            // ファイル名やメタデータから推定
            const currentYear = new Date().getFullYear();
            return currentYear;
            
        } catch (error) {
            logger.warn('年度抽出エラー:', error.message);
            return new Date().getFullYear();
        }
    }
    
    /**
     * 四半期を抽出
     * @param {Object} xbrlData - XBRLデータ
     * @param {Object} context - コンテキスト
     * @returns {number|null} 四半期
     */
    extractFiscalQuarter(xbrlData, context) {
        try {
            const quarterValue = this.findElementValue(xbrlData, 'quarter', context) ||
                                this.findElementValue(xbrlData, 'q', context);
            
            if (quarterValue) {
                const quarter = parseInt(quarterValue);
                if (quarter >= 1 && quarter <= 4) {
                    return quarter;
                }
            }
            
            // 期間から四半期を推定
            const periodValue = this.findElementValue(xbrlData, 'period', context);
            if (periodValue && periodValue.includes('Q')) {
                const quarterMatch = periodValue.match(/Q(\d)/);
                if (quarterMatch) {
                    return parseInt(quarterMatch[1]);
                }
            }
            
            return null;
            
        } catch (error) {
            logger.warn('四半期抽出エラー:', error.message);
            return null;
        }
    }
    
    /**
     * 報告書種別を抽出
     * @param {Object} xbrlData - XBRLデータ
     * @param {Object} context - コンテキスト
     * @returns {string} 報告書種別
     */
    extractReportType(xbrlData, context) {
        try {
            const typeValue = this.findElementValue(xbrlData, 'reporttype', context) ||
                             this.findElementValue(xbrlData, 'type', context);
            
            if (typeValue) {
                const lowerType = typeValue.toLowerCase();
                if (lowerType.includes('annual') || lowerType.includes('年次')) {
                    return 'annual';
                } else if (lowerType.includes('quarter') || lowerType.includes('四半期')) {
                    return 'quarterly';
                } else if (lowerType.includes('interim') || lowerType.includes('中間')) {
                    return 'interim';
                }
            }
            
            // 四半期が設定されている場合
            const quarter = this.extractFiscalQuarter(xbrlData, context);
            if (quarter) {
                return 'quarterly';
            }
            
            return 'annual';
            
        } catch (error) {
            logger.warn('報告書種別抽出エラー:', error.message);
            return 'annual';
        }
    }
    
    /**
     * 提出日を抽出
     * @param {Object} xbrlData - XBRLデータ
     * @param {Object} context - コンテキスト
     * @returns {Date|null} 提出日
     */
    extractFilingDate(xbrlData, context) {
        try {
            const dateValue = this.findElementValue(xbrlData, 'filingdate', context) ||
                             this.findElementValue(xbrlData, 'date', context) ||
                             this.findElementValue(xbrlData, 'submissiondate', context);
            
            if (dateValue) {
                const date = new Date(dateValue);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
            
            return new Date();
            
        } catch (error) {
            logger.warn('提出日抽出エラー:', error.message);
            return new Date();
        }
    }
}

module.exports = XbrlParser;