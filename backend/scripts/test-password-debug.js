#!/usr/bin/env node

/**
 * パスワード認証デバッグテスト
 */
require('dotenv').config();

const { Pool } = require('pg');

async function testPasswordAuth() {
  console.log('🔐 パスワード認証デバッグテスト...\n');
  
  console.log('📋 接続設定情報:');
  console.log(`   Host: ${process.env.DB_HOST}`);
  console.log(`   Port: ${process.env.DB_PORT}`);
  console.log(`   Database: ${process.env.DB_NAME}`);
  console.log(`   User: ${process.env.DB_USER}`);
  console.log(`   Password: ${process.env.DB_PASSWORD?.substring(0, 5)}...`);
  console.log(`   SSL: ${process.env.DB_SSL}`);
  console.log('');
  
  // 複数のパスワード形式を試行
  const passwordVariations = [
    process.env.DB_PASSWORD,
    encodeURIComponent(process.env.DB_PASSWORD),
    `"${process.env.DB_PASSWORD}"`,
    process.env.DB_PASSWORD.replace(/[()[\]|]/g, '\\$&')
  ];
  
  for (let i = 0; i < passwordVariations.length; i++) {
    const password = passwordVariations[i];
    console.log(`🧪 テスト ${i + 1}: パスワード形式 "${password.substring(0, 5)}..."`);
    
    const testConfig = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: password,
      ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false
      } : false,
      connectionTimeoutMillis: 10000
    };
    
    const pool = new Pool(testConfig);
    
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as current_time');
      
      console.log('✅ 接続成功！');
      console.log(`   現在時刻: ${result.rows[0].current_time}`);
      console.log(`   有効なパスワード: ${password}`);
      
      client.release();
      await pool.end();
      return true;
      
    } catch (error) {
      console.log(`❌ 接続失敗: ${error.message}`);
      await pool.end();
    }
    
    console.log('');
  }
  
  console.log('🚨 すべてのパスワード形式で認証に失敗しました。');
  console.log('');
  console.log('💡 確認事項:');
  console.log('   1. database-2のパスワードが正確に設定されているか');
  console.log('   2. ユーザー名が "postgres" で正しいか');
  console.log('   3. AWSコンソールでパスワードリセットを試行');
  
  return false;
}

// スクリプト実行
if (require.main === module) {
  testPasswordAuth().then(success => {
    process.exit(success ? 0 : 1);
  });
}