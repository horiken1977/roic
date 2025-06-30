const pool = require('../config/database');
const logger = require('../config/logger');

class RoicCalculationModel {
    /**
     * ROIC計算結果を作成
     * @param {Object} roicData - ROIC計算データ
     * @returns {Promise<Object>} 作成されたROIC計算データ
     */
    async create(roicData) {
        const client = await pool.connect();
        
        try {
            const query = `
                INSERT INTO roic_calculations (
                    company_id,
                    financial_statement_id,
                    calculation_date,
                    fiscal_year,
                    fiscal_quarter,
                    nopat,
                    invested_capital,
                    roic_percentage,
                    operating_income,
                    tax_rate,
                    effective_tax_rate,
                    working_capital,
                    fixed_assets,
                    goodwill,
                    intangible_assets,
                    calculation_method,
                    notes,
                    created_at,
                    updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()
                )
                RETURNING *
            `;
            
            const values = [
                roicData.company_id,
                roicData.financial_statement_id,
                roicData.calculation_date || new Date(),
                roicData.fiscal_year,
                roicData.fiscal_quarter || null,
                roicData.nopat,
                roicData.invested_capital,
                roicData.roic_percentage,
                roicData.operating_income || null,
                roicData.tax_rate || null,
                roicData.effective_tax_rate || null,
                roicData.working_capital || null,
                roicData.fixed_assets || null,
                roicData.goodwill || null,
                roicData.intangible_assets || null,
                roicData.calculation_method || 'standard',
                roicData.notes || null
            ];
            
            const result = await client.query(query, values);
            logger.info(`ROIC計算結果作成成功: 企業ID ${roicData.company_id}, ${roicData.fiscal_year}年`);
            
            return result.rows[0];
            
        } catch (error) {
            logger.error('ROIC計算結果作成エラー:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * ROIC計算結果を更新（UPSERT）
     * @param {Object} roicData - ROIC計算データ
     * @returns {Promise<Object>} 更新されたROIC計算データ
     */
    async upsert(roicData) {
        const client = await pool.connect();
        
        try {
            const query = `
                INSERT INTO roic_calculations (
                    company_id,
                    financial_statement_id,
                    calculation_date,
                    fiscal_year,
                    fiscal_quarter,
                    nopat,
                    invested_capital,
                    roic_percentage,
                    operating_income,
                    tax_rate,
                    effective_tax_rate,
                    working_capital,
                    fixed_assets,
                    goodwill,
                    intangible_assets,
                    calculation_method,
                    notes,
                    created_at,
                    updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()
                )
                ON CONFLICT (company_id, fiscal_year, fiscal_quarter, calculation_method) 
                DO UPDATE SET
                    financial_statement_id = EXCLUDED.financial_statement_id,
                    calculation_date = EXCLUDED.calculation_date,
                    nopat = EXCLUDED.nopat,
                    invested_capital = EXCLUDED.invested_capital,
                    roic_percentage = EXCLUDED.roic_percentage,
                    operating_income = EXCLUDED.operating_income,
                    tax_rate = EXCLUDED.tax_rate,
                    effective_tax_rate = EXCLUDED.effective_tax_rate,
                    working_capital = EXCLUDED.working_capital,
                    fixed_assets = EXCLUDED.fixed_assets,
                    goodwill = EXCLUDED.goodwill,
                    intangible_assets = EXCLUDED.intangible_assets,
                    notes = EXCLUDED.notes,
                    updated_at = NOW()
                RETURNING *
            `;
            
            const values = [
                roicData.company_id,
                roicData.financial_statement_id,
                roicData.calculation_date || new Date(),
                roicData.fiscal_year,
                roicData.fiscal_quarter || null,
                roicData.nopat,
                roicData.invested_capital,
                roicData.roic_percentage,
                roicData.operating_income || null,
                roicData.tax_rate || null,
                roicData.effective_tax_rate || null,
                roicData.working_capital || null,
                roicData.fixed_assets || null,
                roicData.goodwill || null,
                roicData.intangible_assets || null,
                roicData.calculation_method || 'standard',
                roicData.notes || null
            ];
            
            const result = await client.query(query, values);
            logger.info(`ROIC計算結果更新成功: 企業ID ${roicData.company_id}, ${roicData.fiscal_year}年`);
            
            return result.rows[0];
            
        } catch (error) {
            logger.error('ROIC計算結果更新エラー:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * 企業のROIC計算結果を取得
     * @param {number} companyId - 企業ID
     * @param {Object} options - 検索オプション
     * @returns {Promise<Array>} ROIC計算結果配列
     */
    async findByCompanyId(companyId, options = {}) {
        const client = await pool.connect();
        
        try {
            let query = `
                SELECT 
                    r.*,
                    c.company_name,
                    c.edinet_code,
                    c.securities_code,
                    fs.total_assets,
                    fs.total_equity,
                    fs.revenue
                FROM roic_calculations r
                JOIN companies c ON r.company_id = c.id
                LEFT JOIN financial_statements fs ON r.financial_statement_id = fs.id
                WHERE r.company_id = $1
            `;
            
            const conditions = [];
            const values = [companyId];
            let paramCounter = 2;
            
            // 年度範囲指定
            if (options.yearFrom) {
                conditions.push(`r.fiscal_year >= $${paramCounter}`);
                values.push(options.yearFrom);
                paramCounter++;
            }
            
            if (options.yearTo) {
                conditions.push(`r.fiscal_year <= $${paramCounter}`);
                values.push(options.yearTo);
                paramCounter++;
            }
            
            // 計算方法指定
            if (options.calculationMethod) {
                conditions.push(`r.calculation_method = $${paramCounter}`);
                values.push(options.calculationMethod);
                paramCounter++;
            }
            
            if (conditions.length > 0) {
                query += ' AND ' + conditions.join(' AND ');
            }
            
            // ソート
            query += ' ORDER BY r.fiscal_year DESC, r.fiscal_quarter DESC';
            
            // 制限
            if (options.limit) {
                query += ` LIMIT $${paramCounter}`;
                values.push(options.limit);
            }
            
            const result = await client.query(query, values);
            return result.rows;
            
        } catch (error) {
            logger.error(`ROIC計算結果取得エラー (企業ID: ${companyId}):`, error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * 特定のROIC計算結果を取得
     * @param {number} companyId - 企業ID
     * @param {number} fiscalYear - 年度
     * @param {number} fiscalQuarter - 四半期
     * @param {string} calculationMethod - 計算方法
     * @returns {Promise<Object|null>} ROIC計算結果
     */
    async findByKey(companyId, fiscalYear, fiscalQuarter, calculationMethod = 'standard') {
        const client = await pool.connect();
        
        try {
            const query = `
                SELECT 
                    r.*,
                    c.company_name,
                    c.edinet_code,
                    c.securities_code,
                    fs.total_assets,
                    fs.total_equity,
                    fs.revenue
                FROM roic_calculations r
                JOIN companies c ON r.company_id = c.id
                LEFT JOIN financial_statements fs ON r.financial_statement_id = fs.id
                WHERE r.company_id = $1 
                AND r.fiscal_year = $2 
                AND r.fiscal_quarter = $3 
                AND r.calculation_method = $4
            `;
            
            const values = [companyId, fiscalYear, fiscalQuarter, calculationMethod];
            const result = await client.query(query, values);
            
            return result.rows[0] || null;
            
        } catch (error) {
            logger.error('ROIC計算結果取得エラー:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * 最新のROIC計算結果を取得
     * @param {number} companyId - 企業ID
     * @param {string} calculationMethod - 計算方法
     * @returns {Promise<Object|null>} ROIC計算結果
     */
    async findLatest(companyId, calculationMethod = 'standard') {
        const client = await pool.connect();
        
        try {
            const query = `
                SELECT 
                    r.*,
                    c.company_name,
                    c.edinet_code,
                    c.securities_code,
                    fs.total_assets,
                    fs.total_equity,
                    fs.revenue
                FROM roic_calculations r
                JOIN companies c ON r.company_id = c.id
                LEFT JOIN financial_statements fs ON r.financial_statement_id = fs.id
                WHERE r.company_id = $1 AND r.calculation_method = $2
                ORDER BY r.fiscal_year DESC, r.fiscal_quarter DESC
                LIMIT 1
            `;
            
            const values = [companyId, calculationMethod];
            const result = await client.query(query, values);
            
            return result.rows[0] || null;
            
        } catch (error) {
            logger.error('最新ROIC計算結果取得エラー:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * 複数年度のROIC計算結果を取得
     * @param {number} companyId - 企業ID
     * @param {number} years - 取得年数
     * @param {string} calculationMethod - 計算方法
     * @returns {Promise<Array>} ROIC計算結果配列
     */
    async findRecentYears(companyId, years = 5, calculationMethod = 'standard') {
        const client = await pool.connect();
        
        try {
            const query = `
                SELECT 
                    r.*,
                    c.company_name,
                    c.edinet_code,
                    c.securities_code,
                    fs.total_assets,
                    fs.total_equity,
                    fs.revenue
                FROM roic_calculations r
                JOIN companies c ON r.company_id = c.id
                LEFT JOIN financial_statements fs ON r.financial_statement_id = fs.id
                WHERE r.company_id = $1 AND r.calculation_method = $2
                ORDER BY r.fiscal_year DESC, r.fiscal_quarter DESC
                LIMIT $3
            `;
            
            const values = [companyId, calculationMethod, years];
            const result = await client.query(query, values);
            
            return result.rows;
            
        } catch (error) {
            logger.error('複数年度ROIC計算結果取得エラー:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * 業界平均ROICを取得
     * @param {string} industryCode - 業界コード
     * @param {number} fiscalYear - 年度
     * @param {string} calculationMethod - 計算方法
     * @returns {Promise<Object|null>} 業界平均ROIC
     */
    async getIndustryAverage(industryCode, fiscalYear, calculationMethod = 'standard') {
        const client = await pool.connect();
        
        try {
            const query = `
                SELECT 
                    AVG(r.roic_percentage) as avg_roic,
                    COUNT(*) as company_count,
                    MIN(r.roic_percentage) as min_roic,
                    MAX(r.roic_percentage) as max_roic,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r.roic_percentage) as median_roic
                FROM roic_calculations r
                JOIN companies c ON r.company_id = c.id
                WHERE c.industry_code = $1 
                AND r.fiscal_year = $2 
                AND r.calculation_method = $3
                AND r.roic_percentage IS NOT NULL
            `;
            
            const values = [industryCode, fiscalYear, calculationMethod];
            const result = await client.query(query, values);
            
            return result.rows[0] || null;
            
        } catch (error) {
            logger.error('業界平均ROIC取得エラー:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * ROIC上位企業を取得
     * @param {Object} options - 検索オプション
     * @returns {Promise<Array>} ROIC上位企業配列
     */
    async getTopPerformers(options = {}) {
        const client = await pool.connect();
        
        try {
            let query = `
                SELECT 
                    r.*,
                    c.company_name,
                    c.edinet_code,
                    c.securities_code,
                    c.industry_code,
                    fs.total_assets,
                    fs.revenue
                FROM roic_calculations r
                JOIN companies c ON r.company_id = c.id
                LEFT JOIN financial_statements fs ON r.financial_statement_id = fs.id
                WHERE r.roic_percentage IS NOT NULL
            `;
            
            const conditions = [];
            const values = [];
            let paramCounter = 1;
            
            // 年度指定
            if (options.fiscalYear) {
                conditions.push(`r.fiscal_year = $${paramCounter}`);
                values.push(options.fiscalYear);
                paramCounter++;
            }
            
            // 業界指定
            if (options.industryCode) {
                conditions.push(`c.industry_code = $${paramCounter}`);
                values.push(options.industryCode);
                paramCounter++;
            }
            
            // 計算方法指定
            const calculationMethod = options.calculationMethod || 'standard';
            conditions.push(`r.calculation_method = $${paramCounter}`);
            values.push(calculationMethod);
            paramCounter++;
            
            if (conditions.length > 0) {
                query += ' AND ' + conditions.join(' AND ');
            }
            
            query += ' ORDER BY r.roic_percentage DESC';
            
            // 制限
            const limit = options.limit || 20;
            query += ` LIMIT $${paramCounter}`;
            values.push(limit);
            
            const result = await client.query(query, values);
            return result.rows;
            
        } catch (error) {
            logger.error('ROIC上位企業取得エラー:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * バッチでROIC計算結果を作成
     * @param {Array} roicDataArray - ROIC計算データ配列
     * @returns {Promise<Array>} 作成されたROIC計算データ配列
     */
    async bulkUpsert(roicDataArray) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            const results = [];
            
            for (const roicData of roicDataArray) {
                const result = await this.upsert(roicData);
                results.push(result);
            }
            
            await client.query('COMMIT');
            logger.info(`バッチROIC計算結果作成成功: ${results.length}件`);
            
            return results;
            
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('バッチROIC計算結果作成エラー:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * ROIC計算結果を削除
     * @param {number} id - ROIC計算ID
     * @returns {Promise<boolean>} 削除成功可否
     */
    async delete(id) {
        const client = await pool.connect();
        
        try {
            const query = 'DELETE FROM roic_calculations WHERE id = $1';
            const result = await client.query(query, [id]);
            
            const deleted = result.rowCount > 0;
            if (deleted) {
                logger.info(`ROIC計算結果削除成功: ID ${id}`);
            }
            
            return deleted;
            
        } catch (error) {
            logger.error(`ROIC計算結果削除エラー (ID: ${id}):`, error);
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new RoicCalculationModel();