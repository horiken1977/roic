const pool = require('../config/database');
const logger = require('../config/logger');

class CompanyModel {
    /**
     * 企業を作成
     * @param {Object} companyData - 企業データ
     * @returns {Promise<Object>} 作成された企業データ
     */
    async create(companyData) {
        const client = await pool.connect();
        
        try {
            const query = `
                INSERT INTO companies (
                    edinet_code, 
                    company_name, 
                    company_name_en, 
                    securities_code, 
                    industry_code, 
                    market_segment, 
                    fiscal_year_end, 
                    address, 
                    phone_number, 
                    website_url, 
                    business_description,
                    created_at,
                    updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
                RETURNING *
            `;
            
            const values = [
                companyData.edinet_code,
                companyData.company_name,
                companyData.company_name_en || null,
                companyData.securities_code || null,
                companyData.industry_code || null,
                companyData.market_segment || null,
                companyData.fiscal_year_end || null,
                companyData.address || null,
                companyData.phone_number || null,
                companyData.website_url || null,
                companyData.business_description || null
            ];
            
            const result = await client.query(query, values);
            logger.info(`企業作成成功: ${companyData.company_name} (${companyData.edinet_code})`);
            
            return result.rows[0];
            
        } catch (error) {
            logger.error('企業作成エラー:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * 企業を更新（UPSERT）
     * @param {Object} companyData - 企業データ
     * @returns {Promise<Object>} 更新された企業データ
     */
    async upsert(companyData) {
        const client = await pool.connect();
        
        try {
            const query = `
                INSERT INTO companies (
                    edinet_code, 
                    company_name, 
                    company_name_en, 
                    securities_code, 
                    industry_code, 
                    market_segment, 
                    fiscal_year_end, 
                    address, 
                    phone_number, 
                    website_url, 
                    business_description,
                    created_at,
                    updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
                ON CONFLICT (edinet_code) 
                DO UPDATE SET
                    company_name = EXCLUDED.company_name,
                    company_name_en = EXCLUDED.company_name_en,
                    securities_code = EXCLUDED.securities_code,
                    industry_code = EXCLUDED.industry_code,
                    market_segment = EXCLUDED.market_segment,
                    fiscal_year_end = EXCLUDED.fiscal_year_end,
                    address = EXCLUDED.address,
                    phone_number = EXCLUDED.phone_number,
                    website_url = EXCLUDED.website_url,
                    business_description = EXCLUDED.business_description,
                    updated_at = NOW()
                RETURNING *
            `;
            
            const values = [
                companyData.edinet_code,
                companyData.company_name,
                companyData.company_name_en || null,
                companyData.securities_code || null,
                companyData.industry_code || null,
                companyData.market_segment || null,
                companyData.fiscal_year_end || null,
                companyData.address || null,
                companyData.phone_number || null,
                companyData.website_url || null,
                companyData.business_description || null
            ];
            
            const result = await client.query(query, values);
            logger.info(`企業更新成功: ${companyData.company_name} (${companyData.edinet_code})`);
            
            return result.rows[0];
            
        } catch (error) {
            logger.error('企業更新エラー:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * EDINETコードで企業を取得
     * @param {string} edinetCode - EDINETコード
     * @returns {Promise<Object|null>} 企業データ
     */
    async findByEdinetCode(edinetCode) {
        const client = await pool.connect();
        
        try {
            const query = 'SELECT * FROM companies WHERE edinet_code = $1';
            const result = await client.query(query, [edinetCode]);
            
            return result.rows[0] || null;
            
        } catch (error) {
            logger.error(`企業取得エラー (${edinetCode}):`, error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * 証券コードで企業を取得
     * @param {string} securitiesCode - 証券コード
     * @returns {Promise<Object|null>} 企業データ
     */
    async findBySecuritiesCode(securitiesCode) {
        const client = await pool.connect();
        
        try {
            const query = 'SELECT * FROM companies WHERE securities_code = $1';
            const result = await client.query(query, [securitiesCode]);
            
            return result.rows[0] || null;
            
        } catch (error) {
            logger.error(`企業取得エラー (証券コード: ${securitiesCode}):`, error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * 企業一覧を取得
     * @param {Object} options - 検索オプション
     * @returns {Promise<Array>} 企業一覧
     */
    async findAll(options = {}) {
        const client = await pool.connect();
        
        try {
            let query = 'SELECT * FROM companies';
            const conditions = [];
            const values = [];
            let paramCounter = 1;
            
            // 業界コード条件
            if (options.industryCode) {
                conditions.push(`industry_code = $${paramCounter}`);
                values.push(options.industryCode);
                paramCounter++;
            }
            
            // 市場区分条件
            if (options.marketSegment) {
                conditions.push(`market_segment = $${paramCounter}`);
                values.push(options.marketSegment);
                paramCounter++;
            }
            
            // 会社名検索条件
            if (options.companyName) {
                conditions.push(`company_name ILIKE $${paramCounter}`);
                values.push(`%${options.companyName}%`);
                paramCounter++;
            }
            
            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }
            
            // ソート
            const sortBy = options.sortBy || 'company_name';
            const sortOrder = options.sortOrder || 'ASC';
            query += ` ORDER BY ${sortBy} ${sortOrder}`;
            
            // ページング
            if (options.limit) {
                query += ` LIMIT $${paramCounter}`;
                values.push(options.limit);
                paramCounter++;
                
                if (options.offset) {
                    query += ` OFFSET $${paramCounter}`;
                    values.push(options.offset);
                }
            }
            
            const result = await client.query(query, values);
            return result.rows;
            
        } catch (error) {
            logger.error('企業一覧取得エラー:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * 企業数を取得
     * @param {Object} options - 検索オプション
     * @returns {Promise<number>} 企業数
     */
    async count(options = {}) {
        const client = await pool.connect();
        
        try {
            let query = 'SELECT COUNT(*) FROM companies';
            const conditions = [];
            const values = [];
            let paramCounter = 1;
            
            // 業界コード条件
            if (options.industryCode) {
                conditions.push(`industry_code = $${paramCounter}`);
                values.push(options.industryCode);
                paramCounter++;
            }
            
            // 市場区分条件
            if (options.marketSegment) {
                conditions.push(`market_segment = $${paramCounter}`);
                values.push(options.marketSegment);
                paramCounter++;
            }
            
            // 会社名検索条件
            if (options.companyName) {
                conditions.push(`company_name ILIKE $${paramCounter}`);
                values.push(`%${options.companyName}%`);
                paramCounter++;
            }
            
            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }
            
            const result = await client.query(query, values);
            return parseInt(result.rows[0].count);
            
        } catch (error) {
            logger.error('企業数取得エラー:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * 企業を削除
     * @param {string} edinetCode - EDINETコード
     * @returns {Promise<boolean>} 削除成功可否
     */
    async delete(edinetCode) {
        const client = await pool.connect();
        
        try {
            const query = 'DELETE FROM companies WHERE edinet_code = $1';
            const result = await client.query(query, [edinetCode]);
            
            const deleted = result.rowCount > 0;
            if (deleted) {
                logger.info(`企業削除成功: ${edinetCode}`);
            }
            
            return deleted;
            
        } catch (error) {
            logger.error(`企業削除エラー (${edinetCode}):`, error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * バッチで企業を作成
     * @param {Array} companiesData - 企業データ配列
     * @returns {Promise<Array>} 作成された企業データ配列
     */
    async bulkUpsert(companiesData) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            const results = [];
            
            for (const companyData of companiesData) {
                const query = `
                    INSERT INTO companies (
                        edinet_code, 
                        company_name, 
                        company_name_en, 
                        securities_code, 
                        industry_code, 
                        market_segment, 
                        fiscal_year_end, 
                        address, 
                        phone_number, 
                        website_url, 
                        business_description,
                        created_at,
                        updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
                    ON CONFLICT (edinet_code) 
                    DO UPDATE SET
                        company_name = EXCLUDED.company_name,
                        company_name_en = EXCLUDED.company_name_en,
                        securities_code = EXCLUDED.securities_code,
                        industry_code = EXCLUDED.industry_code,
                        market_segment = EXCLUDED.market_segment,
                        fiscal_year_end = EXCLUDED.fiscal_year_end,
                        address = EXCLUDED.address,
                        phone_number = EXCLUDED.phone_number,
                        website_url = EXCLUDED.website_url,
                        business_description = EXCLUDED.business_description,
                        updated_at = NOW()
                    RETURNING *
                `;
                
                const values = [
                    companyData.edinet_code,
                    companyData.company_name,
                    companyData.company_name_en || null,
                    companyData.securities_code || null,
                    companyData.industry_code || null,
                    companyData.market_segment || null,
                    companyData.fiscal_year_end || null,
                    companyData.address || null,
                    companyData.phone_number || null,
                    companyData.website_url || null,
                    companyData.business_description || null
                ];
                
                const result = await client.query(query, values);
                results.push(result.rows[0]);
            }
            
            await client.query('COMMIT');
            logger.info(`バッチ企業作成成功: ${results.length}件`);
            
            return results;
            
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('バッチ企業作成エラー:', error);
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new CompanyModel();