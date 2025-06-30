#!/usr/bin/env node

/**
 * データベーススキーマ適用スクリプト
 * AWS RDS PostgreSQLにROICアプリケーションのスキーマを適用
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

class SchemaApplicator {
    constructor() {
        this.pool = new Pool({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            ssl: process.env.DB_SSL === 'true' ? {
                rejectUnauthorized: false
            } : false,
            connectionTimeoutMillis: 10000
        });
    }

    async checkConnection() {
        console.log('🔗 データベース接続確認中...');
        try {
            const client = await this.pool.connect();
            const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
            
            console.log('✅ データベース接続成功');
            console.log(`   現在時刻: ${result.rows[0].current_time}`);
            console.log(`   PostgreSQLバージョン: ${result.rows[0].pg_version.split(',')[0]}`);
            
            client.release();
            return true;
        } catch (error) {
            console.error('❌ データベース接続失敗:', error.message);
            return false;
        }
    }

    async loadSchemaFile() {
        console.log('📄 スキーマファイル読み込み中...');
        try {
            const schemaPath = path.join(__dirname, '../../database/schema.sql');
            const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
            console.log(`✅ スキーマファイル読み込み完了 (${Math.round(schemaSQL.length / 1024)}KB)`);
            return schemaSQL;
        } catch (error) {
            console.error('❌ スキーマファイル読み込み失敗:', error.message);
            throw error;
        }
    }

    async checkExistingTables() {
        console.log('🔍 既存テーブル確認中...');
        try {
            const result = await this.pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
            `);
            
            const existingTables = result.rows.map(row => row.table_name);
            
            if (existingTables.length > 0) {
                console.log('⚠️  既存テーブルが見つかりました:');
                existingTables.forEach(table => {
                    console.log(`   - ${table}`);
                });
                return existingTables;
            } else {
                console.log('✅ 既存テーブルはありません（新規適用）');
                return [];
            }
        } catch (error) {
            console.error('❌ 既存テーブル確認失敗:', error.message);
            throw error;
        }
    }

    async executeSchemaSQL(schemaSQL) {
        console.log('⚡ スキーマSQL実行中...');
        const client = await this.pool.connect();
        
        try {
            // トランザクション開始
            await client.query('BEGIN');
            
            console.log('   📊 SQL実行開始...');
            const startTime = Date.now();
            
            // スキーマSQLを実行
            await client.query(schemaSQL);
            
            const executionTime = Date.now() - startTime;
            console.log(`   ✅ SQL実行完了 (${executionTime}ms)`);
            
            // コミット
            await client.query('COMMIT');
            console.log('✅ トランザクションコミット完了');
            
            return true;
        } catch (error) {
            // ロールバック
            await client.query('ROLLBACK');
            console.error('❌ SQL実行失敗 - ロールバック実行:', error.message);
            
            // エラー詳細を表示
            if (error.position) {
                console.error(`   エラー位置: ${error.position}`);
            }
            if (error.detail) {
                console.error(`   詳細: ${error.detail}`);
            }
            
            throw error;
        } finally {
            client.release();
        }
    }

    async verifySchemaApplication() {
        console.log('🔬 スキーマ適用確認中...');
        try {
            // テーブル数確認
            const tableResult = await this.pool.query(`
                SELECT COUNT(*) as table_count 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
            `);
            
            // ビュー数確認
            const viewResult = await this.pool.query(`
                SELECT COUNT(*) as view_count 
                FROM information_schema.views 
                WHERE table_schema = 'public'
            `);
            
            // インデックス数確認
            const indexResult = await this.pool.query(`
                SELECT COUNT(*) as index_count 
                FROM pg_indexes 
                WHERE schemaname = 'public'
            `);
            
            // 拡張機能確認
            const extensionResult = await this.pool.query(`
                SELECT extname FROM pg_extension 
                WHERE extname IN ('uuid-ossp', 'pg_trgm')
                ORDER BY extname
            `);
            
            const tableCount = parseInt(tableResult.rows[0].table_count);
            const viewCount = parseInt(viewResult.rows[0].view_count);
            const indexCount = parseInt(indexResult.rows[0].index_count);
            const extensions = extensionResult.rows.map(row => row.extname);
            
            console.log('📊 スキーマ適用結果:');
            console.log(`   テーブル数: ${tableCount}`);
            console.log(`   ビュー数: ${viewCount}`);
            console.log(`   インデックス数: ${indexCount}`);
            console.log(`   拡張機能: ${extensions.join(', ')}`);
            
            // 期待値チェック
            const expectedTables = 10; // companies, edinet_documents, financial_statements, roic_calculations, industries, comparison_groups, comparison_group_members, system_logs, cache_management + update function table
            const expectedViews = 2;   // v_company_info, v_industry_roic_stats
            
            if (tableCount >= expectedTables && viewCount >= expectedViews) {
                console.log('✅ スキーマ適用成功 - 全ての主要オブジェクトが作成されました');
                return true;
            } else {
                console.log(`⚠️  スキーマ適用不完全 - 期待値: テーブル${expectedTables}+, ビュー${expectedViews}+`);
                return false;
            }
            
        } catch (error) {
            console.error('❌ スキーマ確認失敗:', error.message);
            return false;
        }
    }

    async getTableList() {
        console.log('📋 作成されたテーブル一覧:');
        try {
            const result = await this.pool.query(`
                SELECT 
                    table_name,
                    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
                FROM information_schema.tables t
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
            `);
            
            result.rows.forEach(row => {
                console.log(`   📁 ${row.table_name} (${row.column_count}カラム)`);
            });
            
            return result.rows;
        } catch (error) {
            console.error('❌ テーブル一覧取得失敗:', error.message);
            return [];
        }
    }

    async insertSampleData() {
        console.log('📝 サンプルデータ投入テスト...');
        try {
            // テスト用企業データ投入
            const testCompany = await this.pool.query(`
                INSERT INTO companies (edinet_code, company_name, industry_code, industry_name, is_active)
                VALUES ('E00001', 'テスト株式会社', '3700', '電気機器', true)
                ON CONFLICT (edinet_code) DO NOTHING
                RETURNING id, edinet_code, company_name
            `);
            
            if (testCompany.rows.length > 0) {
                console.log('✅ サンプル企業データ投入成功:');
                console.log(`   ID: ${testCompany.rows[0].id}`);
                console.log(`   EDINETコード: ${testCompany.rows[0].edinet_code}`);
                console.log(`   企業名: ${testCompany.rows[0].company_name}`);
            } else {
                console.log('ℹ️  サンプル企業データは既に存在します');
            }
            
            return true;
        } catch (error) {
            console.error('❌ サンプルデータ投入失敗:', error.message);
            return false;
        }
    }

    async cleanup() {
        try {
            await this.pool.end();
            console.log('🔌 データベース接続を終了しました');
        } catch (error) {
            console.error('❌ 接続終了エラー:', error.message);
        }
    }

    async run() {
        console.log('🚀 ROICアプリケーション データベーススキーマ適用開始\n');
        
        let success = false;
        
        try {
            // 1. データベース接続確認
            const connected = await this.checkConnection();
            if (!connected) {
                throw new Error('データベース接続に失敗しました');
            }
            
            console.log('');
            
            // 2. 既存テーブル確認
            const existingTables = await this.checkExistingTables();
            console.log('');
            
            // 3. スキーマファイル読み込み
            const schemaSQL = await this.loadSchemaFile();
            console.log('');
            
            // 4. スキーマSQL実行
            await this.executeSchemaSQL(schemaSQL);
            console.log('');
            
            // 5. 適用確認
            const verified = await this.verifySchemaApplication();
            console.log('');
            
            // 6. テーブル一覧表示
            await this.getTableList();
            console.log('');
            
            // 7. サンプルデータ投入テスト
            await this.insertSampleData();
            console.log('');
            
            if (verified) {
                console.log('🎉 データベーススキーマ適用が正常に完了しました！');
                console.log('');
                console.log('次のステップ:');
                console.log('  1. EDINET API実装');
                console.log('  2. 財務データ取得・解析');
                console.log('  3. ROIC計算エンジン実装');
                success = true;
            } else {
                console.log('⚠️  スキーマ適用は完了しましたが、一部の確認項目で問題があります');
            }
            
        } catch (error) {
            console.error('\n❌ スキーマ適用中にエラーが発生しました:', error.message);
            console.error('\n🔧 トラブルシューティング:');
            console.error('  1. データベース接続設定を確認してください');
            console.error('  2. PostgreSQLサーバーが稼働しているか確認してください');
            console.error('  3. スキーマファイルの構文エラーがないか確認してください');
        } finally {
            await this.cleanup();
        }
        
        return success;
    }
}

// スクリプト実行
if (require.main === module) {
    const applicator = new SchemaApplicator();
    applicator.run().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = SchemaApplicator;