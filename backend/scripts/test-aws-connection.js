#!/usr/bin/env node

/**
 * AWS接続テストスクリプト
 */
require('dotenv').config();

// Loggerを先に読み込み
const { logger } = require('../config/logger');

const { testAWSConnection } = require('../config/aws');
const { testDatabaseConnection } = require('../config/database');

async function runConnectionTests() {
  console.log('🧪 AWS & Database Connection Test Starting...\n');
  
  try {
    // AWS接続テスト
    console.log('1️⃣ Testing AWS Connection...');
    const awsResult = await testAWSConnection();
    
    console.log('✅ AWS Connection Successful!');
    console.log(`   - Region: ${awsResult.region}`);
    console.log(`   - RDS Instances: ${awsResult.rdsInstances}`);
    console.log('');
    
    // データベース接続テスト
    console.log('2️⃣ Testing Database Connection...');
    const dbResult = await testDatabaseConnection();
    
    console.log('✅ Database Connection Successful!');
    console.log(`   - Current Time: ${dbResult.currentTime}`);
    console.log(`   - PostgreSQL Version: ${dbResult.version.split(' ')[0]}`);
    console.log('');
    
    // 総合結果
    console.log('🎉 All Connection Tests Passed!');
    console.log('Ready to start the ROIC Analysis API server.');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Connection Test Failed:');
    console.error(`   Error: ${error.message}`);
    console.error('');
    console.error('Please check your configuration:');
    console.error('   - AWS credentials (.env file)');
    console.error('   - Database connection settings');
    console.error('   - Network connectivity');
    
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  runConnectionTests();
}

module.exports = { runConnectionTests };