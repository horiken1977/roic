const axios = require('axios');
const xml2js = require('xml2js');
const logger = require('../config/logger');

class EdinetService {
    constructor() {
        this.baseURL = 'https://api.edinet-fsa.go.jp/api/v2';
        this.userAgent = 'ROIC-Analysis-App/1.0';
        this.timeout = 30000;
        
        this.axiosInstance = axios.create({
            baseURL: this.baseURL,
            timeout: this.timeout,
            headers: {
                'User-Agent': this.userAgent,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        this.setupInterceptors();
    }
    
    setupInterceptors() {
        this.axiosInstance.interceptors.request.use(
            (config) => {
                logger.info(`EDINET API Request: ${config.method?.toUpperCase()} ${config.url}`);
                return config;
            },
            (error) => {
                logger.error('EDINET API Request Error:', error);
                return Promise.reject(error);
            }
        );
        
        this.axiosInstance.interceptors.response.use(
            (response) => {
                logger.info(`EDINET API Response: ${response.status} ${response.config.url}`);
                return response;
            },
            (error) => {
                logger.error('EDINET API Response Error:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    url: error.config?.url,
                    message: error.message
                });
                return Promise.reject(error);
            }
        );
    }
    
    /**
     * 企業一覧を取得
     * @param {string} type - 企業種別 (1:上場企業, 2:非上場企業)
     * @param {string} date - 取得基準日 (YYYY-MM-DD)
     * @returns {Promise<Object>} 企業一覧データ
     */
    async getCompanyList(type = '1', date = null) {
        try {
            const params = {
                type: type
            };
            
            if (date) {
                params.Subscriptor = date;
            }
            
            const response = await this.axiosInstance.get('/documents.json', {
                params: params
            });
            
            logger.info(`企業一覧取得成功: ${response.data.results?.length || 0}件`);
            return response.data;
            
        } catch (error) {
            logger.error('企業一覧取得エラー:', error.message);
            throw new Error(`企業一覧取得に失敗しました: ${error.message}`);
        }
    }
    
    /**
     * 書類一覧を取得
     * @param {string} date - 取得対象日 (YYYY-MM-DD)
     * @param {string} type - 書類種別 (1:有価証券報告書, 2:四半期報告書, 3:半期報告書)
     * @returns {Promise<Object>} 書類一覧データ
     */
    async getDocumentList(date, type = '1') {
        try {
            const params = {
                date: date,
                type: type
            };
            
            const response = await this.axiosInstance.get('/documents.json', {
                params: params
            });
            
            logger.info(`書類一覧取得成功: ${response.data.results?.length || 0}件`);
            return response.data;
            
        } catch (error) {
            logger.error('書類一覧取得エラー:', error.message);
            throw new Error(`書類一覧取得に失敗しました: ${error.message}`);
        }
    }
    
    /**
     * 書類詳細を取得
     * @param {string} docId - 書類ID
     * @param {string} type - 取得タイプ (1:提出書類一覧, 2:PDF, 3:代替書面・添付文書, 4:英文ファイル, 5:CSV)
     * @returns {Promise<Object>} 書類詳細データ
     */
    async getDocument(docId, type = '5') {
        try {
            const response = await this.axiosInstance.get(`/documents/${docId}`, {
                params: {
                    type: type
                }
            });
            
            logger.info(`書類詳細取得成功: ${docId}`);
            return response.data;
            
        } catch (error) {
            logger.error(`書類詳細取得エラー (${docId}):`, error.message);
            throw new Error(`書類詳細取得に失敗しました: ${error.message}`);
        }
    }
    
    /**
     * XBRLデータを取得
     * @param {string} docId - 書類ID
     * @returns {Promise<Object>} XBRLデータ
     */
    async getXbrlData(docId) {
        try {
            const response = await this.axiosInstance.get(`/documents/${docId}`, {
                params: {
                    type: '1'
                },
                responseType: 'text'
            });
            
            // XMLをJSONに変換
            const parser = new xml2js.Parser({
                explicitArray: false,
                ignoreAttrs: false,
                attrkey: 'attributes'
            });
            
            const result = await parser.parseStringPromise(response.data);
            
            logger.info(`XBRLデータ取得成功: ${docId}`);
            return result;
            
        } catch (error) {
            logger.error(`XBRLデータ取得エラー (${docId}):`, error.message);
            throw new Error(`XBRLデータ取得に失敗しました: ${error.message}`);
        }
    }
    
    /**
     * 企業情報を取得
     * @param {string} edinetCode - EDINETコード
     * @returns {Promise<Object>} 企業情報
     */
    async getCompanyInfo(edinetCode) {
        try {
            const response = await this.axiosInstance.get(`/metadata/${edinetCode}.json`);
            
            logger.info(`企業情報取得成功: ${edinetCode}`);
            return response.data;
            
        } catch (error) {
            logger.error(`企業情報取得エラー (${edinetCode}):`, error.message);
            throw new Error(`企業情報取得に失敗しました: ${error.message}`);
        }
    }
    
    /**
     * 財務データを抽出
     * @param {Object} xbrlData - XBRLデータ
     * @returns {Promise<Object>} 財務データ
     */
    async extractFinancialData(xbrlData) {
        try {
            const financialData = {
                // 貸借対照表データ
                balanceSheet: {
                    totalAssets: this.extractValue(xbrlData, 'TotalAssets'),
                    currentAssets: this.extractValue(xbrlData, 'CurrentAssets'),
                    fixedAssets: this.extractValue(xbrlData, 'FixedAssets'),
                    totalLiabilities: this.extractValue(xbrlData, 'TotalLiabilities'),
                    currentLiabilities: this.extractValue(xbrlData, 'CurrentLiabilities'),
                    fixedLiabilities: this.extractValue(xbrlData, 'FixedLiabilities'),
                    totalEquity: this.extractValue(xbrlData, 'TotalEquity'),
                    retainedEarnings: this.extractValue(xbrlData, 'RetainedEarnings')
                },
                
                // 損益計算書データ
                incomeStatement: {
                    revenue: this.extractValue(xbrlData, 'Revenue'),
                    operatingIncome: this.extractValue(xbrlData, 'OperatingIncome'),
                    ordinaryIncome: this.extractValue(xbrlData, 'OrdinaryIncome'),
                    netIncome: this.extractValue(xbrlData, 'NetIncome'),
                    operatingExpenses: this.extractValue(xbrlData, 'OperatingExpenses'),
                    interestExpense: this.extractValue(xbrlData, 'InterestExpense'),
                    taxExpense: this.extractValue(xbrlData, 'TaxExpense')
                },
                
                // キャッシュフロー計算書データ
                cashFlowStatement: {
                    operatingCashFlow: this.extractValue(xbrlData, 'OperatingCashFlow'),
                    investingCashFlow: this.extractValue(xbrlData, 'InvestingCashFlow'),
                    financingCashFlow: this.extractValue(xbrlData, 'FinancingCashFlow'),
                    freeCashFlow: this.extractValue(xbrlData, 'FreeCashFlow')
                }
            };
            
            logger.info('財務データ抽出成功');
            return financialData;
            
        } catch (error) {
            logger.error('財務データ抽出エラー:', error.message);
            throw new Error(`財務データ抽出に失敗しました: ${error.message}`);
        }
    }
    
    /**
     * XBRLデータから値を抽出
     * @param {Object} xbrlData - XBRLデータ
     * @param {string} element - 抽出する要素名
     * @returns {number|null} 抽出した値
     */
    extractValue(xbrlData, element) {
        try {
            // XBRLの構造に基づいて値を抽出
            // 実際のXBRL構造に応じて調整が必要
            const value = this.findElementValue(xbrlData, element);
            return value ? parseFloat(value) : null;
        } catch (error) {
            logger.warn(`値抽出エラー (${element}):`, error.message);
            return null;
        }
    }
    
    /**
     * 要素の値を再帰的に検索
     * @param {Object} obj - 検索対象オブジェクト
     * @param {string} element - 検索する要素名
     * @returns {string|null} 見つかった値
     */
    findElementValue(obj, element) {
        if (!obj || typeof obj !== 'object') {
            return null;
        }
        
        for (const key in obj) {
            if (key.includes(element)) {
                return obj[key];
            }
            
            if (typeof obj[key] === 'object') {
                const result = this.findElementValue(obj[key], element);
                if (result !== null) {
                    return result;
                }
            }
        }
        
        return null;
    }
    
    /**
     * レート制限に対応した待機
     * @param {number} ms - 待機時間（ミリ秒）
     */
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = EdinetService;