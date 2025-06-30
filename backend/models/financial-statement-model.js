const pool = require('../config/database');
const logger = require('../config/logger');

class FinancialStatementModel {
    /**
     * 財務諸表データを作成
     * @param {Object} financialData - 財務諸表データ
     * @returns {Promise<Object>} 作成された財務諸表データ
     */
    async create(financialData) {
        const client = await pool.connect();
        
        try {
            const query = `
                INSERT INTO financial_statements (
                    company_id,
                    fiscal_year,
                    fiscal_quarter,
                    report_type,
                    filing_date,
                    total_assets,
                    current_assets,
                    fixed_assets,
                    total_liabilities,
                    current_liabilities,
                    fixed_liabilities,
                    total_equity,
                    retained_earnings,
                    revenue,
                    operating_income,
                    ordinary_income,
                    net_income,
                    operating_expenses,
                    interest_expense,
                    tax_expense,
                    operating_cash_flow,
                    investing_cash_flow,
                    financing_cash_flow,
                    free_cash_flow,
                    created_at,
                    updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                    $21, $22, $23, $24, NOW(), NOW()
                )
                RETURNING *
            `;
            
            const values = [
                financialData.company_id,
                financialData.fiscal_year,
                financialData.fiscal_quarter || null,
                financialData.report_type,
                financialData.filing_date,
                financialData.total_assets || null,
                financialData.current_assets || null,
                financialData.fixed_assets || null,
                financialData.total_liabilities || null,
                financialData.current_liabilities || null,
                financialData.fixed_liabilities || null,
                financialData.total_equity || null,
                financialData.retained_earnings || null,
                financialData.revenue || null,
                financialData.operating_income || null,
                financialData.ordinary_income || null,
                financialData.net_income || null,
                financialData.operating_expenses || null,
                financialData.interest_expense || null,
                financialData.tax_expense || null,
                financialData.operating_cash_flow || null,
                financialData.investing_cash_flow || null,
                financialData.financing_cash_flow || null,
                financialData.free_cash_flow || null
            ];
            
            const result = await client.query(query, values);
            logger.info(`財務諸表作成成功: 企業ID ${financialData.company_id}, ${financialData.fiscal_year}年`);
            
            return result.rows[0];
            
        } catch (error) {
            logger.error('財務諸表作成エラー:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * 財務諸表データを更新（UPSERT）
     * @param {Object} financialData - 財務諸表データ
     * @returns {Promise<Object>} 更新された財務諸表データ
     */
    async upsert(financialData) {
        const client = await pool.connect();
        
        try {
            const query = `
                INSERT INTO financial_statements (
                    company_id,
                    fiscal_year,
                    fiscal_quarter,
                    report_type,
                    filing_date,
                    total_assets,
                    current_assets,
                    fixed_assets,
                    total_liabilities,
                    current_liabilities,
                    fixed_liabilities,
                    total_equity,
                    retained_earnings,
                    revenue,
                    operating_income,
                    ordinary_income,
                    net_income,
                    operating_expenses,
                    interest_expense,
                    tax_expense,
                    operating_cash_flow,
                    investing_cash_flow,
                    financing_cash_flow,
                    free_cash_flow,
                    created_at,
                    updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                    $21, $22, $23, $24, NOW(), NOW()
                )
                ON CONFLICT (company_id, fiscal_year, fiscal_quarter, report_type) 
                DO UPDATE SET
                    filing_date = EXCLUDED.filing_date,
                    total_assets = EXCLUDED.total_assets,
                    current_assets = EXCLUDED.current_assets,
                    fixed_assets = EXCLUDED.fixed_assets,
                    total_liabilities = EXCLUDED.total_liabilities,
                    current_liabilities = EXCLUDED.current_liabilities,
                    fixed_liabilities = EXCLUDED.fixed_liabilities,
                    total_equity = EXCLUDED.total_equity,
                    retained_earnings = EXCLUDED.retained_earnings,
                    revenue = EXCLUDED.revenue,
                    operating_income = EXCLUDED.operating_income,
                    ordinary_income = EXCLUDED.ordinary_income,
                    net_income = EXCLUDED.net_income,
                    operating_expenses = EXCLUDED.operating_expenses,
                    interest_expense = EXCLUDED.interest_expense,
                    tax_expense = EXCLUDED.tax_expense,
                    operating_cash_flow = EXCLUDED.operating_cash_flow,
                    investing_cash_flow = EXCLUDED.investing_cash_flow,
                    financing_cash_flow = EXCLUDED.financing_cash_flow,
                    free_cash_flow = EXCLUDED.free_cash_flow,
                    updated_at = NOW()
                RETURNING *
            `;
            
            const values = [
                financialData.company_id,
                financialData.fiscal_year,
                financialData.fiscal_quarter || null,
                financialData.report_type,
                financialData.filing_date,
                financialData.total_assets || null,
                financialData.current_assets || null,
                financialData.fixed_assets || null,
                financialData.total_liabilities || null,
                financialData.current_liabilities || null,
                financialData.fixed_liabilities || null,
                financialData.total_equity || null,
                financialData.retained_earnings || null,
                financialData.revenue || null,
                financialData.operating_income || null,
                financialData.ordinary_income || null,
                financialData.net_income || null,
                financialData.operating_expenses || null,
                financialData.interest_expense || null,
                financialData.tax_expense || null,
                financialData.operating_cash_flow || null,
                financialData.investing_cash_flow || null,
                financialData.financing_cash_flow || null,
                financialData.free_cash_flow || null
            ];
            
            const result = await client.query(query, values);
            logger.info(`財務諸表更新成功: 企業ID ${financialData.company_id}, ${financialData.fiscal_year}年`);
            
            return result.rows[0];
            
        } catch (error) {
            logger.error('財務諸表更新エラー:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * 企業の財務諸表データを取得
     * @param {number} companyId - 企業ID
     * @param {Object} options - 検索オプション
     * @returns {Promise<Array>} 財務諸表データ配列
     */
    async findByCompanyId(companyId, options = {}) {
        const client = await pool.connect();
        
        try {
            let query = `
                SELECT fs.*, c.company_name, c.edinet_code
                FROM financial_statements fs
                JOIN companies c ON fs.company_id = c.id
                WHERE fs.company_id = $1
            `;
            
            const conditions = [];
            const values = [companyId];
            let paramCounter = 2;
            
            // 年度範囲指定
            if (options.yearFrom) {
                conditions.push(`fs.fiscal_year >= $${paramCounter}`);
                values.push(options.yearFrom);
                paramCounter++;
            }
            
            if (options.yearTo) {
                conditions.push(`fs.fiscal_year <= $${paramCounter}`);
                values.push(options.yearTo);
                paramCounter++;
            }
            
            // 報告書種別指定
            if (options.reportType) {
                conditions.push(`fs.report_type = $${paramCounter}`);
                values.push(options.reportType);
                paramCounter++;
            }
            
            if (conditions.length > 0) {
                query += ' AND ' + conditions.join(' AND ');
            }
            
            // ソート
            query += ' ORDER BY fs.fiscal_year DESC, fs.fiscal_quarter DESC';
            
            // 制限
            if (options.limit) {
                query += ` LIMIT $${paramCounter}`;
                values.push(options.limit);
            }
            
            const result = await client.query(query, values);
            return result.rows;
            
        } catch (error) {
            logger.error(`財務諸表取得エラー (企業ID: ${companyId}):`, error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * 特定の財務諸表データを取得
     * @param {number} companyId - 企業ID
     * @param {number} fiscalYear - 年度
     * @param {number} fiscalQuarter - 四半期
     * @param {string} reportType - 報告書種別
     * @returns {Promise<Object|null>} 財務諸表データ
     */
    async findByKey(companyId, fiscalYear, fiscalQuarter, reportType) {
        const client = await pool.connect();
        
        try {
            const query = `
                SELECT fs.*, c.company_name, c.edinet_code
                FROM financial_statements fs
                JOIN companies c ON fs.company_id = c.id
                WHERE fs.company_id = $1 
                AND fs.fiscal_year = $2 
                AND fs.fiscal_quarter = $3 
                AND fs.report_type = $4
            `;
            
            const values = [companyId, fiscalYear, fiscalQuarter, reportType];
            const result = await client.query(query, values);
            
            return result.rows[0] || null;
            
        } catch (error) {
            logger.error('財務諸表取得エラー:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * 最新の財務諸表データを取得
     * @param {number} companyId - 企業ID
     * @param {string} reportType - 報告書種別
     * @returns {Promise<Object|null>} 財務諸表データ
     */
    async findLatest(companyId, reportType = 'annual') {
        const client = await pool.connect();
        
        try {
            const query = `
                SELECT fs.*, c.company_name, c.edinet_code
                FROM financial_statements fs
                JOIN companies c ON fs.company_id = c.id
                WHERE fs.company_id = $1 AND fs.report_type = $2
                ORDER BY fs.fiscal_year DESC, fs.fiscal_quarter DESC
                LIMIT 1
            `;
            
            const values = [companyId, reportType];
            const result = await client.query(query, values);
            
            return result.rows[0] || null;
            
        } catch (error) {
            logger.error('最新財務諸表取得エラー:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * 複数年度の財務諸表データを取得
     * @param {number} companyId - 企業ID
     * @param {number} years - 取得年数
     * @param {string} reportType - 報告書種別
     * @returns {Promise<Array>} 財務諸表データ配列
     */
    async findRecentYears(companyId, years = 5, reportType = 'annual') {
        const client = await pool.connect();
        
        try {
            const query = `
                SELECT fs.*, c.company_name, c.edinet_code
                FROM financial_statements fs
                JOIN companies c ON fs.company_id = c.id
                WHERE fs.company_id = $1 AND fs.report_type = $2
                ORDER BY fs.fiscal_year DESC, fs.fiscal_quarter DESC
                LIMIT $3
            `;
            
            const values = [companyId, reportType, years];
            const result = await client.query(query, values);
            
            return result.rows;
            
        } catch (error) {
            logger.error('複数年度財務諸表取得エラー:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * バッチで財務諸表データを作成
     * @param {Array} financialDataArray - 財務諸表データ配列
     * @returns {Promise<Array>} 作成された財務諸表データ配列
     */
    async bulkUpsert(financialDataArray) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            const results = [];
            
            for (const financialData of financialDataArray) {
                const query = `
                    INSERT INTO financial_statements (
                        company_id,
                        fiscal_year,
                        fiscal_quarter,
                        report_type,
                        filing_date,
                        total_assets,
                        current_assets,
                        fixed_assets,
                        total_liabilities,
                        current_liabilities,
                        fixed_liabilities,
                        total_equity,
                        retained_earnings,
                        revenue,
                        operating_income,
                        ordinary_income,
                        net_income,
                        operating_expenses,
                        interest_expense,
                        tax_expense,
                        operating_cash_flow,
                        investing_cash_flow,
                        financing_cash_flow,
                        free_cash_flow,
                        created_at,
                        updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                        $21, $22, $23, $24, NOW(), NOW()
                    )
                    ON CONFLICT (company_id, fiscal_year, fiscal_quarter, report_type) 
                    DO UPDATE SET
                        filing_date = EXCLUDED.filing_date,
                        total_assets = EXCLUDED.total_assets,
                        current_assets = EXCLUDED.current_assets,
                        fixed_assets = EXCLUDED.fixed_assets,
                        total_liabilities = EXCLUDED.total_liabilities,
                        current_liabilities = EXCLUDED.current_liabilities,
                        fixed_liabilities = EXCLUDED.fixed_liabilities,
                        total_equity = EXCLUDED.total_equity,
                        retained_earnings = EXCLUDED.retained_earnings,
                        revenue = EXCLUDED.revenue,
                        operating_income = EXCLUDED.operating_income,
                        ordinary_income = EXCLUDED.ordinary_income,
                        net_income = EXCLUDED.net_income,
                        operating_expenses = EXCLUDED.operating_expenses,
                        interest_expense = EXCLUDED.interest_expense,
                        tax_expense = EXCLUDED.tax_expense,
                        operating_cash_flow = EXCLUDED.operating_cash_flow,
                        investing_cash_flow = EXCLUDED.investing_cash_flow,
                        financing_cash_flow = EXCLUDED.financing_cash_flow,
                        free_cash_flow = EXCLUDED.free_cash_flow,
                        updated_at = NOW()
                    RETURNING *
                `;
                
                const values = [
                    financialData.company_id,
                    financialData.fiscal_year,
                    financialData.fiscal_quarter || null,
                    financialData.report_type,
                    financialData.filing_date,
                    financialData.total_assets || null,
                    financialData.current_assets || null,
                    financialData.fixed_assets || null,
                    financialData.total_liabilities || null,
                    financialData.current_liabilities || null,
                    financialData.fixed_liabilities || null,
                    financialData.total_equity || null,
                    financialData.retained_earnings || null,
                    financialData.revenue || null,
                    financialData.operating_income || null,
                    financialData.ordinary_income || null,
                    financialData.net_income || null,
                    financialData.operating_expenses || null,
                    financialData.interest_expense || null,
                    financialData.tax_expense || null,
                    financialData.operating_cash_flow || null,
                    financialData.investing_cash_flow || null,
                    financialData.financing_cash_flow || null,
                    financialData.free_cash_flow || null
                ];
                
                const result = await client.query(query, values);
                results.push(result.rows[0]);
            }
            
            await client.query('COMMIT');
            logger.info(`バッチ財務諸表作成成功: ${results.length}件`);
            
            return results;
            
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('バッチ財務諸表作成エラー:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    
    /**
     * 財務諸表データを削除
     * @param {number} id - 財務諸表ID
     * @returns {Promise<boolean>} 削除成功可否
     */
    async delete(id) {
        const client = await pool.connect();
        
        try {
            const query = 'DELETE FROM financial_statements WHERE id = $1';
            const result = await client.query(query, [id]);
            
            const deleted = result.rowCount > 0;
            if (deleted) {
                logger.info(`財務諸表削除成功: ID ${id}`);
            }
            
            return deleted;
            
        } catch (error) {
            logger.error(`財務諸表削除エラー (ID: ${id}):`, error);
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new FinancialStatementModel();