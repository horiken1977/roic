-- ROIC分析アプリケーション データベーススキーマ
-- PostgreSQL 15+ 対応
-- 作成日: 2025-06-30
-- 更新日: 2025-06-30

-- データベース作成（実行時は必要に応じてコメントアウト）
-- CREATE DATABASE roic_analysis;
-- \c roic_analysis;

-- 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- 全文検索用

-- ============================================
-- 1. 企業マスタテーブル
-- ============================================

CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    edinet_code VARCHAR(6) UNIQUE NOT NULL,           -- EDINETコード（E00001等）
    ticker_symbol VARCHAR(10) UNIQUE,                 -- 証券コード（1234.T等）
    company_name VARCHAR(255) NOT NULL,               -- 企業名
    company_name_en VARCHAR(255),                     -- 英語企業名
    company_name_kana VARCHAR(255),                   -- カナ企業名
    
    -- 業界分類
    industry_code VARCHAR(10),                        -- 業種コード
    industry_name VARCHAR(100),                       -- 業種名
    sector_code VARCHAR(10),                          -- セクターコード
    
    -- 企業基本情報
    market_cap DECIMAL(15,2),                         -- 時価総額（百万円）
    listing_market VARCHAR(20),                       -- 上場市場（東証一部等）
    established_date DATE,                            -- 設立年月日
    fiscal_year_end VARCHAR(5),                       -- 決算月（MM-DD形式）
    
    -- メタデータ
    is_active BOOLEAN DEFAULT true,                   -- アクティブフラグ
    last_updated_edinet TIMESTAMP,                    -- EDINET最終更新日時
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- インデックス対象カラムのコメント
    CONSTRAINT chk_edinet_code CHECK (edinet_code ~ '^E[0-9]{5}$'),
    CONSTRAINT chk_ticker_symbol CHECK (ticker_symbol IS NULL OR ticker_symbol ~ '^[0-9]{4}$')
);

-- 企業マスタテーブルのインデックス
CREATE INDEX idx_companies_edinet_code ON companies(edinet_code);
CREATE INDEX idx_companies_ticker_symbol ON companies(ticker_symbol);
CREATE INDEX idx_companies_industry_code ON companies(industry_code);
CREATE INDEX idx_companies_company_name ON companies USING gin(company_name gin_trgm_ops);
CREATE INDEX idx_companies_active ON companies(is_active) WHERE is_active = true;

-- ============================================
-- 2. EDINET書類管理テーブル
-- ============================================

CREATE TABLE edinet_documents (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- EDINET書類情報
    doc_id VARCHAR(50) UNIQUE NOT NULL,               -- EDINET書類管理番号
    edinet_code VARCHAR(6) NOT NULL,                  -- EDINETコード
    document_type VARCHAR(50) NOT NULL,               -- 書類種別
    document_type_code VARCHAR(10),                   -- 書類種別コード
    
    -- 決算情報
    fiscal_year INTEGER NOT NULL,                     -- 決算年度
    period_start DATE,                                -- 決算期開始日
    period_end DATE,                                  -- 決算期末日
    quarter INTEGER CHECK (quarter IN (1,2,3,4)),    -- 四半期（年次は4）
    
    -- 提出情報
    submitted_date DATE NOT NULL,                     -- 提出日
    submitted_datetime TIMESTAMP,                     -- 提出日時
    
    -- ファイル情報
    xbrl_file_path TEXT,                             -- XBRLファイル保存パス
    pdf_file_path TEXT,                              -- PDFファイル保存パス
    file_size_bytes BIGINT,                          -- ファイルサイズ
    
    -- 処理状況
    processing_status VARCHAR(20) DEFAULT 'pending'   -- pending/processing/completed/error
        CHECK (processing_status IN ('pending', 'processing', 'completed', 'error')),
    error_message TEXT,                               -- エラーメッセージ
    retry_count INTEGER DEFAULT 0,                   -- リトライ回数
    
    -- 会計基準
    accounting_standard VARCHAR(20),                  -- JGAAP/IFRS/US-GAAP
    consolidation_type VARCHAR(20),                   -- 連結/単体
    
    -- メタデータ
    processing_metadata JSONB,                        -- 処理時のメタデータ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 複合UNIQUE制約
    CONSTRAINT unique_company_fiscal_quarter UNIQUE(company_id, fiscal_year, quarter)
);

-- EDINET書類管理テーブルのインデックス
CREATE INDEX idx_edinet_documents_company_id ON edinet_documents(company_id);
CREATE INDEX idx_edinet_documents_doc_id ON edinet_documents(doc_id);
CREATE INDEX idx_edinet_documents_fiscal_year ON edinet_documents(fiscal_year);
CREATE INDEX idx_edinet_documents_status ON edinet_documents(processing_status);
CREATE INDEX idx_edinet_documents_submitted_date ON edinet_documents(submitted_date);

-- ============================================
-- 3. 財務データテーブル
-- ============================================

CREATE TABLE financial_statements (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    document_id INTEGER NOT NULL REFERENCES edinet_documents(id) ON DELETE CASCADE,
    
    -- 基本情報
    fiscal_year INTEGER NOT NULL,                     -- 決算年度
    quarter INTEGER CHECK (quarter IN (1,2,3,4)),    -- 四半期（年次は4）
    
    -- === 損益計算書項目（P/L） ===
    -- 売上・利益関連
    net_sales DECIMAL(15,2),                          -- 売上高
    cost_of_sales DECIMAL(15,2),                      -- 売上原価
    gross_profit DECIMAL(15,2),                       -- 売上総利益
    
    -- 費用関連
    selling_admin_expenses DECIMAL(15,2),             -- 販売費及び一般管理費
    selling_expenses DECIMAL(15,2),                   -- 販売費
    admin_expenses DECIMAL(15,2),                     -- 一般管理費
    
    -- 営業損益
    operating_income DECIMAL(15,2),                   -- 営業利益
    non_operating_income DECIMAL(15,2),               -- 営業外収益
    non_operating_expenses DECIMAL(15,2),             -- 営業外費用
    ordinary_income DECIMAL(15,2),                    -- 経常利益
    
    -- 特別損益・税金
    extraordinary_income DECIMAL(15,2),               -- 特別利益
    extraordinary_expenses DECIMAL(15,2),             -- 特別損失
    income_before_tax DECIMAL(15,2),                  -- 税引前当期純利益
    income_tax DECIMAL(15,2),                         -- 法人税等
    net_income DECIMAL(15,2),                         -- 当期純利益
    
    -- === 貸借対照表項目（B/S） ===
    -- 流動資産
    current_assets DECIMAL(15,2),                     -- 流動資産
    cash_and_deposits DECIMAL(15,2),                  -- 現金及び預金
    trade_receivables DECIMAL(15,2),                  -- 売上債権（受取手形・売掛金）
    notes_receivable DECIMAL(15,2),                   -- 受取手形
    accounts_receivable DECIMAL(15,2),                -- 売掛金
    inventories DECIMAL(15,2),                        -- 棚卸資産
    merchandise DECIMAL(15,2),                        -- 商品
    finished_goods DECIMAL(15,2),                     -- 製品
    work_in_progress DECIMAL(15,2),                   -- 仕掛品
    raw_materials DECIMAL(15,2),                      -- 原材料
    
    -- 固定資産
    non_current_assets DECIMAL(15,2),                 -- 固定資産
    property_plant_equipment DECIMAL(15,2),           -- 有形固定資産
    buildings DECIMAL(15,2),                          -- 建物
    machinery_equipment DECIMAL(15,2),                -- 機械装置
    land DECIMAL(15,2),                               -- 土地
    intangible_assets DECIMAL(15,2),                  -- 無形固定資産
    investments_securities DECIMAL(15,2),             -- 投資有価証券
    
    -- 資産合計
    total_assets DECIMAL(15,2),                       -- 総資産
    
    -- 流動負債
    current_liabilities DECIMAL(15,2),                -- 流動負債
    trade_payables DECIMAL(15,2),                     -- 仕入債務（支払手形・買掛金）
    notes_payable DECIMAL(15,2),                      -- 支払手形
    accounts_payable DECIMAL(15,2),                   -- 買掛金
    short_term_borrowings DECIMAL(15,2),              -- 短期借入金
    
    -- 固定負債
    non_current_liabilities DECIMAL(15,2),            -- 固定負債
    long_term_borrowings DECIMAL(15,2),               -- 長期借入金
    bonds_payable DECIMAL(15,2),                      -- 社債
    
    -- 負債合計
    total_liabilities DECIMAL(15,2),                  -- 負債合計
    
    -- 純資産
    shareholders_equity DECIMAL(15,2),                -- 株主資本
    capital_stock DECIMAL(15,2),                      -- 資本金
    retained_earnings DECIMAL(15,2),                  -- 利益剰余金
    total_equity DECIMAL(15,2),                       -- 純資産合計
    
    -- === キャッシュフロー計算書項目（C/F） ===
    operating_cash_flow DECIMAL(15,2),                -- 営業キャッシュフロー
    investing_cash_flow DECIMAL(15,2),                -- 投資キャッシュフロー
    financing_cash_flow DECIMAL(15,2),                -- 財務キャッシュフロー
    free_cash_flow DECIMAL(15,2),                     -- フリーキャッシュフロー
    
    -- === 計算項目 ===
    -- 有利子負債（計算用）
    interest_bearing_debt DECIMAL(15,2),              -- 有利子負債合計
    
    -- データ品質・メタデータ
    data_quality_score DECIMAL(3,2),                  -- データ品質スコア（0.00-1.00）
    missing_fields JSONB,                             -- 欠損フィールド情報
    accounting_standard VARCHAR(20),                   -- 会計基準
    consolidation_type VARCHAR(20),                    -- 連結区分
    currency_code VARCHAR(3) DEFAULT 'JPY',           -- 通貨コード
    amount_unit VARCHAR(20) DEFAULT 'million_yen',     -- 金額単位
    
    -- XBRL抽出情報
    extraction_metadata JSONB,                        -- 抽出時のメタデータ
    xbrl_taxonomy_version VARCHAR(50),                -- XBRLタクソノミバージョン
    
    -- タイムスタンプ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT unique_company_fiscal_quarter_fs UNIQUE(company_id, fiscal_year, quarter),
    CONSTRAINT chk_data_quality_score CHECK (data_quality_score >= 0 AND data_quality_score <= 1)
);

-- 財務データテーブルのインデックス
CREATE INDEX idx_financial_statements_company_id ON financial_statements(company_id);
CREATE INDEX idx_financial_statements_fiscal_year ON financial_statements(fiscal_year);
CREATE INDEX idx_financial_statements_quarter ON financial_statements(quarter);
CREATE INDEX idx_financial_statements_document_id ON financial_statements(document_id);
CREATE INDEX idx_financial_statements_quality ON financial_statements(data_quality_score);

-- ============================================
-- 4. ROIC計算結果テーブル
-- ============================================

CREATE TABLE roic_calculations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    financial_statement_id INTEGER NOT NULL REFERENCES financial_statements(id) ON DELETE CASCADE,
    
    -- 基本情報
    fiscal_year INTEGER NOT NULL,                     -- 決算年度
    quarter INTEGER CHECK (quarter IN (1,2,3,4)),    -- 四半期（年次は4）
    
    -- === ROIC主要指標 ===
    roic_percentage DECIMAL(8,4) NOT NULL,            -- ROIC（%）
    
    -- ROIC構成要素
    invested_capital DECIMAL(15,2) NOT NULL,          -- 投下資本
    capital_turnover DECIMAL(8,4),                    -- 投下資本回転率
    operating_margin DECIMAL(8,4),                    -- 営業利益率
    
    -- === ROIC詳細分解 ===
    -- 営業利益率の分解
    gross_margin DECIMAL(8,4),                        -- 粗利率
    admin_expense_ratio DECIMAL(8,4),                 -- 販管費率
    
    -- 資本回転率の分解
    working_capital DECIMAL(15,2),                    -- 運転資本
    working_capital_turnover DECIMAL(8,4),            -- 運転資本回転率
    fixed_asset_turnover DECIMAL(8,4),                -- 固定資産回転率
    
    -- === 補助指標 ===
    -- 効率性指標
    total_asset_turnover DECIMAL(8,4),                -- 総資産回転率
    inventory_turnover DECIMAL(8,4),                  -- 棚卸資産回転率
    receivables_turnover DECIMAL(8,4),                -- 売上債権回転率
    payables_turnover DECIMAL(8,4),                   -- 仕入債務回転率
    
    -- 収益性指標
    roa_percentage DECIMAL(8,4),                      -- ROA（%）
    roe_percentage DECIMAL(8,4),                      -- ROE（%）
    
    -- 安全性指標
    equity_ratio DECIMAL(8,4),                        -- 自己資本比率
    debt_equity_ratio DECIMAL(8,4),                   -- 負債資本比率
    current_ratio DECIMAL(8,4),                       -- 流動比率
    
    -- === 業界比較用 ===
    industry_roic_rank INTEGER,                       -- 業界内ROICランキング
    industry_roic_percentile DECIMAL(5,2),            -- 業界内パーセンタイル
    industry_average_roic DECIMAL(8,4),               -- 業界平均ROIC
    
    -- === 計算品質・メタデータ ===
    calculation_method VARCHAR(50) DEFAULT 'standard', -- 計算方法
    calculation_confidence DECIMAL(3,2),              -- 計算信頼度（0.00-1.00）
    data_completeness DECIMAL(3,2),                   -- データ完全性（0.00-1.00）
    calculation_metadata JSONB,                       -- 計算詳細メタデータ
    
    -- 異常値検知
    outlier_flag BOOLEAN DEFAULT false,               -- 異常値フラグ
    outlier_reason TEXT,                              -- 異常値理由
    
    -- タイムスタンプ
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT unique_company_fiscal_quarter_roic UNIQUE(company_id, fiscal_year, quarter),
    CONSTRAINT chk_calculation_confidence CHECK (calculation_confidence >= 0 AND calculation_confidence <= 1),
    CONSTRAINT chk_data_completeness CHECK (data_completeness >= 0 AND data_completeness <= 1)
);

-- ROIC計算結果テーブルのインデックス
CREATE INDEX idx_roic_calculations_company_id ON roic_calculations(company_id);
CREATE INDEX idx_roic_calculations_fiscal_year ON roic_calculations(fiscal_year);
CREATE INDEX idx_roic_calculations_roic_percentage ON roic_calculations(roic_percentage);
CREATE INDEX idx_roic_calculations_quarter ON roic_calculations(quarter);
CREATE INDEX idx_roic_calculations_outlier ON roic_calculations(outlier_flag) WHERE outlier_flag = true;
CREATE INDEX idx_roic_calculations_confidence ON roic_calculations(calculation_confidence);

-- ============================================
-- 5. 業界マスタテーブル
-- ============================================

CREATE TABLE industries (
    id SERIAL PRIMARY KEY,
    industry_code VARCHAR(10) UNIQUE NOT NULL,        -- 業界コード
    industry_name VARCHAR(100) NOT NULL,              -- 業界名
    industry_name_en VARCHAR(100),                    -- 英語業界名
    
    -- 階層構造
    parent_industry_code VARCHAR(10),                 -- 親業界コード
    industry_level INTEGER DEFAULT 1,                 -- 業界階層レベル
    
    -- 分類情報
    classification_system VARCHAR(50),                -- 分類システム（日経/東証等）
    sector_code VARCHAR(10),                          -- セクターコード
    sector_name VARCHAR(100),                         -- セクター名
    
    -- 業界特性
    industry_characteristics JSONB,                   -- 業界特性情報
    average_roic_historical DECIMAL(8,4),             -- 過去平均ROIC
    
    -- メタデータ
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 業界マスタテーブルのインデックス
CREATE INDEX idx_industries_code ON industries(industry_code);
CREATE INDEX idx_industries_parent ON industries(parent_industry_code);
CREATE INDEX idx_industries_sector ON industries(sector_code);

-- ============================================
-- 6. 企業比較グループテーブル
-- ============================================

CREATE TABLE comparison_groups (
    id SERIAL PRIMARY KEY,
    group_name VARCHAR(255) NOT NULL,                 -- 比較グループ名
    group_description TEXT,                           -- グループ説明
    base_company_id INTEGER REFERENCES companies(id), -- 基準企業ID
    
    -- グループ設定
    comparison_criteria JSONB,                        -- 比較基準設定
    auto_update BOOLEAN DEFAULT false,                -- 自動更新フラグ
    
    -- メタデータ
    created_by VARCHAR(100),                          -- 作成者
    is_public BOOLEAN DEFAULT false,                  -- 公開フラグ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 企業比較グループテーブルのインデックス
CREATE INDEX idx_comparison_groups_base_company ON comparison_groups(base_company_id);
CREATE INDEX idx_comparison_groups_public ON comparison_groups(is_public) WHERE is_public = true;

-- ============================================
-- 7. 企業比較グループメンバーテーブル
-- ============================================

CREATE TABLE comparison_group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES comparison_groups(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- メンバー設定
    display_order INTEGER DEFAULT 0,                  -- 表示順序
    is_active BOOLEAN DEFAULT true,                   -- アクティブフラグ
    
    -- メタデータ
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    CONSTRAINT unique_group_company UNIQUE(group_id, company_id)
);

-- 企業比較グループメンバーテーブルのインデックス
CREATE INDEX idx_comparison_group_members_group_id ON comparison_group_members(group_id);
CREATE INDEX idx_comparison_group_members_company_id ON comparison_group_members(company_id);

-- ============================================
-- 8. システムログテーブル
-- ============================================

CREATE TABLE system_logs (
    id SERIAL PRIMARY KEY,
    log_level VARCHAR(10) NOT NULL,                   -- DEBUG/INFO/WARN/ERROR
    log_category VARCHAR(50) NOT NULL,                -- カテゴリ（EDINET_API/ROIC_CALC等）
    message TEXT NOT NULL,                            -- ログメッセージ
    
    -- 関連情報
    company_id INTEGER REFERENCES companies(id),
    document_id INTEGER REFERENCES edinet_documents(id),
    user_id VARCHAR(100),                             -- ユーザーID
    session_id VARCHAR(100),                          -- セッションID
    
    -- 詳細情報
    details JSONB,                                    -- 詳細情報
    execution_time_ms INTEGER,                        -- 実行時間（ミリ秒）
    
    -- タイムスタンプ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- インデックス
    CHECK (log_level IN ('DEBUG', 'INFO', 'WARN', 'ERROR'))
);

-- システムログテーブルのインデックス
CREATE INDEX idx_system_logs_level ON system_logs(log_level);
CREATE INDEX idx_system_logs_category ON system_logs(log_category);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX idx_system_logs_company_id ON system_logs(company_id) WHERE company_id IS NOT NULL;

-- ============================================
-- 9. キャッシュ管理テーブル
-- ============================================

CREATE TABLE cache_management (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,           -- キャッシュキー
    cache_type VARCHAR(50) NOT NULL,                  -- キャッシュタイプ
    company_id INTEGER REFERENCES companies(id),      -- 関連企業ID
    
    -- キャッシュ情報
    data_hash VARCHAR(64),                            -- データハッシュ値
    expiry_date TIMESTAMP NOT NULL,                   -- 有効期限
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 最終アクセス日時
    access_count INTEGER DEFAULT 0,                   -- アクセス回数
    
    -- メタデータ
    metadata JSONB,                                   -- キャッシュメタデータ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- キャッシュ管理テーブルのインデックス
CREATE INDEX idx_cache_management_key ON cache_management(cache_key);
CREATE INDEX idx_cache_management_type ON cache_management(cache_type);
CREATE INDEX idx_cache_management_expiry ON cache_management(expiry_date);

-- ============================================
-- 10. 更新関数・トリガー
-- ============================================

-- 更新日時自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルに更新日時トリガーを設定
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_edinet_documents_updated_at BEFORE UPDATE ON edinet_documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_statements_updated_at BEFORE UPDATE ON financial_statements 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roic_calculations_updated_at BEFORE UPDATE ON roic_calculations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 11. ビュー定義
-- ============================================

-- 企業基本情報ビュー
CREATE VIEW v_company_info AS
SELECT 
    c.id,
    c.edinet_code,
    c.ticker_symbol,
    c.company_name,
    c.industry_name,
    i.sector_name,
    c.market_cap,
    c.listing_market,
    c.is_active,
    -- 最新決算年度
    (SELECT MAX(fiscal_year) FROM financial_statements fs WHERE fs.company_id = c.id) as latest_fiscal_year,
    -- 最新ROIC
    (SELECT roic_percentage FROM roic_calculations rc 
     WHERE rc.company_id = c.id 
     ORDER BY fiscal_year DESC, quarter DESC LIMIT 1) as latest_roic
FROM companies c
LEFT JOIN industries i ON c.industry_code = i.industry_code
WHERE c.is_active = true;

-- 業界別ROIC統計ビュー
CREATE VIEW v_industry_roic_stats AS
SELECT 
    i.industry_code,
    i.industry_name,
    rc.fiscal_year,
    COUNT(*) as company_count,
    AVG(rc.roic_percentage) as avg_roic,
    STDDEV(rc.roic_percentage) as stddev_roic,
    MIN(rc.roic_percentage) as min_roic,
    MAX(rc.roic_percentage) as max_roic,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY rc.roic_percentage) as q1_roic,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY rc.roic_percentage) as median_roic,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY rc.roic_percentage) as q3_roic
FROM roic_calculations rc
JOIN companies c ON rc.company_id = c.id
JOIN industries i ON c.industry_code = i.industry_code
WHERE rc.quarter = 4  -- 年次のみ
GROUP BY i.industry_code, i.industry_name, rc.fiscal_year;

-- ============================================
-- 12. 初期データ投入
-- ============================================

-- 業界マスタ初期データ（主要業界のみ）
INSERT INTO industries (industry_code, industry_name, industry_name_en, classification_system, sector_code, sector_name) VALUES
('0100', '建設業', 'Construction', '東証', '01', '建設・資材'),
('1300', '鉄鋼', 'Steel', '東証', '02', '素材・化学'),
('1700', '非鉄金属', 'Non-ferrous metals', '東証', '02', '素材・化学'),
('2100', '食料品', 'Foods', '東証', '03', '食品'),
('3600', '機械', 'Machinery', '東証', '04', '機械'),
('3700', '電気機器', 'Electric appliances', '東証', '05', 'IT・電気'),
('5000', '電気・ガス業', 'Electric power & gas', '東証', '06', 'インフラ'),
('6100', '卸売業', 'Wholesale trade', '東証', '07', '商社・流通'),
('6200', '小売業', 'Retail trade', '東証', '07', '商社・流通'),
('7200', '銀行業', 'Banks', '東証', '08', '金融'),
('8300', '不動産業', 'Real estate', '東証', '09', '不動産'),
('9100', '情報・通信業', 'Information & communication', '東証', '05', 'IT・電気');

-- ============================================
-- 13. コメント追加
-- ============================================

-- テーブルコメント
COMMENT ON TABLE companies IS '企業マスタテーブル - EDINET対象企業の基本情報を管理';
COMMENT ON TABLE edinet_documents IS 'EDINET書類管理テーブル - 取得した有価証券報告書等の管理';
COMMENT ON TABLE financial_statements IS '財務データテーブル - 財務諸表から抽出した数値データ';
COMMENT ON TABLE roic_calculations IS 'ROIC計算結果テーブル - 計算されたROICとその分解要素';
COMMENT ON TABLE industries IS '業界マスタテーブル - 業界分類情報';
COMMENT ON TABLE comparison_groups IS '企業比較グループテーブル - ユーザー定義の比較グループ';
COMMENT ON TABLE system_logs IS 'システムログテーブル - アプリケーションログの記録';

-- 主要カラムコメント
COMMENT ON COLUMN companies.edinet_code IS 'EDINETコード（E + 5桁数字）';
COMMENT ON COLUMN financial_statements.net_sales IS '売上高（百万円単位）';
COMMENT ON COLUMN roic_calculations.roic_percentage IS 'ROIC（パーセント、小数点第4位まで）';
COMMENT ON COLUMN roic_calculations.invested_capital IS '投下資本（百万円単位）';

-- ============================================
-- 14. パフォーマンスチューニング設定
-- ============================================

-- PostgreSQL設定推奨値（postgresql.confで設定）
/*
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.7
wal_buffers = 16MB
default_statistics_target = 100
*/

-- 統計情報更新
ANALYZE companies;
ANALYZE financial_statements;
ANALYZE roic_calculations;

-- スキーマ作成完了
SELECT 'ROICアプリケーション データベーススキーマの作成が完了しました。' AS status;