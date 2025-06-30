const EdinetService = require('../services/edinet-service');
const CompanyModel = require('../models/company-model');
const logger = require('../config/logger');
const { validationResult } = require('express-validator');

class CompaniesController {
    constructor() {
        this.edinetService = new EdinetService();
    }
    
    /**
     * 企業一覧を取得
     */
    async getCompanies(req, res) {
        try {
            const {
                page = 1,
                limit = 50,
                industryCode,
                marketSegment,
                companyName,
                sortBy = 'company_name',
                sortOrder = 'ASC'
            } = req.query;
            
            const offset = (page - 1) * limit;
            
            const options = {
                limit: parseInt(limit),
                offset: parseInt(offset),
                industryCode,
                marketSegment,
                companyName,
                sortBy,
                sortOrder
            };
            
            const [companies, totalCount] = await Promise.all([
                CompanyModel.findAll(options),
                CompanyModel.count(options)
            ]);
            
            const totalPages = Math.ceil(totalCount / limit);
            
            res.json({
                success: true,
                data: {
                    companies,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages,
                        totalCount,
                        limit: parseInt(limit),
                        hasNext: page < totalPages,
                        hasPrev: page > 1
                    }
                }
            });
            
        } catch (error) {
            logger.error('企業一覧取得エラー:', error);
            res.status(500).json({
                success: false,
                message: '企業一覧の取得に失敗しました',
                error: error.message
            });
        }
    }
    
    /**
     * 特定の企業を取得
     */
    async getCompany(req, res) {
        try {
            const { identifier } = req.params;
            
            // EDINETコードまたは証券コードで検索
            let company;
            if (identifier.length === 6 && identifier.match(/^E\d{5}$/)) {
                // EDINETコード形式
                company = await CompanyModel.findByEdinetCode(identifier);
            } else if (identifier.match(/^\d{4}$/)) {
                // 証券コード形式
                company = await CompanyModel.findBySecuritiesCode(identifier);
            } else {
                return res.status(400).json({
                    success: false,
                    message: '無効な企業識別子です。EDINETコード（E00000形式）または証券コード（4桁数字）を指定してください。'
                });
            }
            
            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: '企業が見つかりませんでした'
                });
            }
            
            res.json({
                success: true,
                data: company
            });
            
        } catch (error) {
            logger.error('企業取得エラー:', error);
            res.status(500).json({
                success: false,
                message: '企業情報の取得に失敗しました',
                error: error.message
            });
        }
    }
    
    /**
     * EDINETから企業データを同期
     */
    async syncCompaniesFromEdinet(req, res) {
        try {
            const { date, type = '1' } = req.query;
            
            logger.info('EDINET企業データ同期開始');
            
            // EDINETから企業一覧を取得
            const documentList = await this.edinetService.getDocumentList(
                date || new Date().toISOString().split('T')[0],
                type
            );
            
            if (!documentList.results || documentList.results.length === 0) {
                return res.json({
                    success: true,
                    message: '同期対象の企業データがありませんでした',
                    data: {
                        syncedCount: 0,
                        totalCount: 0
                    }
                });
            }
            
            // 企業データを変換
            const companiesData = [];
            for (const doc of documentList.results) {
                if (doc.filerName && doc.edinetCode) {
                    companiesData.push({
                        edinet_code: doc.edinetCode,
                        company_name: doc.filerName,
                        company_name_en: doc.filerNameEn || null,
                        securities_code: doc.secCode || null,
                        industry_code: this.extractIndustryCode(doc),
                        market_segment: this.extractMarketSegment(doc),
                        fiscal_year_end: null,
                        address: null,
                        phone_number: null,
                        website_url: null,
                        business_description: null
                    });
                }
            }
            
            // バッチで企業データを保存
            let syncedCompanies = [];
            if (companiesData.length > 0) {
                syncedCompanies = await CompanyModel.bulkUpsert(companiesData);
            }
            
            logger.info(`EDINET企業データ同期完了: ${syncedCompanies.length}件`);
            
            res.json({
                success: true,
                message: 'EDINET企業データの同期が完了しました',
                data: {
                    syncedCount: syncedCompanies.length,
                    totalCount: documentList.results.length
                }
            });
            
        } catch (error) {
            logger.error('EDINET企業データ同期エラー:', error);
            res.status(500).json({
                success: false,
                message: 'EDINET企業データの同期に失敗しました',
                error: error.message
            });
        }
    }
    
    /**
     * 企業を作成
     */
    async createCompany(req, res) {
        try {
            // バリデーションチェック
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'バリデーションエラー',
                    errors: errors.array()
                });
            }
            
            const company = await CompanyModel.create(req.body);
            
            res.status(201).json({
                success: true,
                message: '企業が作成されました',
                data: company
            });
            
        } catch (error) {
            logger.error('企業作成エラー:', error);
            
            if (error.code === '23505') { // 重複エラー
                return res.status(409).json({
                    success: false,
                    message: '既に存在する企業です'
                });
            }
            
            res.status(500).json({
                success: false,
                message: '企業の作成に失敗しました',
                error: error.message
            });
        }
    }
    
    /**
     * 企業を更新
     */
    async updateCompany(req, res) {
        try {
            const { edinetCode } = req.params;
            
            // バリデーションチェック
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'バリデーションエラー',
                    errors: errors.array()
                });
            }
            
            // 企業の存在確認
            const existingCompany = await CompanyModel.findByEdinetCode(edinetCode);
            if (!existingCompany) {
                return res.status(404).json({
                    success: false,
                    message: '企業が見つかりませんでした'
                });
            }
            
            const updatedData = {
                ...req.body,
                edinet_code: edinetCode
            };
            
            const company = await CompanyModel.upsert(updatedData);
            
            res.json({
                success: true,
                message: '企業情報が更新されました',
                data: company
            });
            
        } catch (error) {
            logger.error('企業更新エラー:', error);
            res.status(500).json({
                success: false,
                message: '企業情報の更新に失敗しました',
                error: error.message
            });
        }
    }
    
    /**
     * 企業を削除
     */
    async deleteCompany(req, res) {
        try {
            const { edinetCode } = req.params;
            
            const deleted = await CompanyModel.delete(edinetCode);
            
            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    message: '企業が見つかりませんでした'
                });
            }
            
            res.json({
                success: true,
                message: '企業が削除されました'
            });
            
        } catch (error) {
            logger.error('企業削除エラー:', error);
            res.status(500).json({
                success: false,
                message: '企業の削除に失敗しました',
                error: error.message
            });
        }
    }
    
    /**
     * 業界コードを抽出
     * @param {Object} doc - EDINET文書データ
     * @returns {string|null} 業界コード
     */
    extractIndustryCode(doc) {
        // EDINETデータから業界コードを抽出するロジック
        // 実際のデータ構造に応じて実装
        return doc.industryCode || null;
    }
    
    /**
     * 市場区分を抽出
     * @param {Object} doc - EDINET文書データ
     * @returns {string|null} 市場区分
     */
    extractMarketSegment(doc) {
        // EDINETデータから市場区分を抽出するロジック
        // 実際のデータ構造に応じて実装
        return doc.marketSegment || null;
    }
}

module.exports = new CompaniesController();