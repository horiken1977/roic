#!/usr/bin/env node

/**
 * RDS詳細情報確認スクリプト
 */
require('dotenv').config();

const AWS = require('aws-sdk');

// AWS設定
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const rds = new AWS.RDS({ region: process.env.AWS_REGION });

async function checkRDSDetails() {
  console.log('🔍 RDS詳細情報の確認...\n');
  
  try {
    // RDSインスタンス詳細取得
    console.log('1️⃣ RDSインスタンス詳細情報...');
    const instances = await rds.describeDBInstances().promise();
    
    instances.DBInstances.forEach((instance, index) => {
      console.log(`📊 インスタンス ${index + 1}:`);
      console.log(`   - Identifier: ${instance.DBInstanceIdentifier}`);
      console.log(`   - Engine: ${instance.Engine} ${instance.EngineVersion}`);
      console.log(`   - Status: ${instance.DBInstanceStatus}`);
      console.log(`   - Endpoint: ${instance.Endpoint?.Address || 'なし'}`);
      console.log(`   - Port: ${instance.Endpoint?.Port || 'なし'}`);
      console.log(`   - Database Name: ${instance.DBName || 'なし'}`);
      console.log(`   - Master Username: ${instance.MasterUsername}`);
      console.log(`   - VPC: ${instance.DBSubnetGroup?.VpcId || 'なし'}`);
      console.log(`   - Public Access: ${instance.PubliclyAccessible}`);
      console.log('');
    });
    
    // RDSクラスター詳細取得
    console.log('2️⃣ RDSクラスター詳細情報...');
    const clusters = await rds.describeDBClusters().promise();
    
    clusters.DBClusters.forEach((cluster, index) => {
      console.log(`🌐 クラスター ${index + 1}:`);
      console.log(`   - Identifier: ${cluster.DBClusterIdentifier}`);
      console.log(`   - Engine: ${cluster.Engine} ${cluster.EngineVersion}`);
      console.log(`   - Status: ${cluster.Status}`);
      console.log(`   - Endpoint: ${cluster.Endpoint || 'なし'}`);
      console.log(`   - Reader Endpoint: ${cluster.ReaderEndpoint || 'なし'}`);
      console.log(`   - Port: ${cluster.Port || 'なし'}`);
      console.log(`   - Database Name: ${cluster.DatabaseName || 'なし'}`);
      console.log(`   - Master Username: ${cluster.MasterUsername}`);
      console.log(`   - VPC: ${cluster.VpcSecurityGroups?.[0]?.VpcId || 'なし'}`);
      console.log(`   - Security Groups: ${cluster.VpcSecurityGroups?.map(sg => sg.VpcSecurityGroupId).join(', ') || 'なし'}`);
      console.log('');
    });
    
    // 推奨設定の提案
    console.log('💡 推奨設定:');
    if (clusters.DBClusters.length > 0) {
      const cluster = clusters.DBClusters[0];
      console.log(`   DB_HOST=${cluster.Endpoint}`);
      console.log(`   DB_PORT=${cluster.Port}`);
      console.log(`   DB_NAME=${cluster.DatabaseName || 'postgres'}`);
      console.log(`   DB_USER=${cluster.MasterUsername}`);
    } else if (instances.DBInstances.length > 0) {
      const instance = instances.DBInstances[0];
      console.log(`   DB_HOST=${instance.Endpoint?.Address}`);
      console.log(`   DB_PORT=${instance.Endpoint?.Port}`);
      console.log(`   DB_NAME=${instance.DBName || 'postgres'}`);
      console.log(`   DB_USER=${instance.MasterUsername}`);
    }
    
  } catch (error) {
    console.error('❌ RDS情報取得エラー:', error.message);
  }
}

// スクリプト実行
if (require.main === module) {
  checkRDSDetails();
}