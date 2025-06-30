/**
 * AWS SDK設定
 */
const AWS = require('aws-sdk');

// 環境変数から AWS 認証情報を設定
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-northeast-1'
});

// AWS SDK の設定確認
function validateAWSConfig() {
  const requiredEnvVars = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required AWS environment variables:', missingVars);
    throw new Error(`Missing AWS environment variables: ${missingVars.join(', ')}`);
  }

  console.log('AWS SDK configuration loaded successfully', {
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ? '***' + process.env.AWS_ACCESS_KEY_ID.slice(-4) : 'not set'
  });
}

// AWS サービスクライアントの初期化
const rds = new AWS.RDS({
  region: process.env.AWS_REGION,
  apiVersion: '2014-10-31'
});

const cloudWatch = new AWS.CloudWatch({
  region: process.env.AWS_REGION,
  apiVersion: '2010-08-01'
});

// AWS接続テスト
async function testAWSConnection() {
  try {
    console.log('Testing AWS connection...');
    
    // RDS インスタンス一覧取得テスト
    const rdsResponse = await rds.describeDBInstances().promise();
    console.log('AWS RDS connection successful', {
      instanceCount: rdsResponse.DBInstances.length
    });
    
    return {
      success: true,
      rdsInstances: rdsResponse.DBInstances.length,
      region: process.env.AWS_REGION
    };
  } catch (error) {
    console.error('AWS connection test failed:', error.message);
    throw new Error(`AWS connection failed: ${error.message}`);
  }
}

// メトリクス送信（CloudWatch）
async function sendMetrics(metricName, value, unit = 'Count', namespace = 'ROIC/Application') {
  try {
    const params = {
      Namespace: namespace,
      MetricData: [
        {
          MetricName: metricName,
          Value: value,
          Unit: unit,
          Timestamp: new Date()
        }
      ]
    };

    await cloudWatch.putMetricData(params).promise();
    console.log(`Metric sent to CloudWatch: ${metricName} = ${value}`);
  } catch (error) {
    console.error('Failed to send metrics to CloudWatch:', error.message);
  }
}

module.exports = {
  AWS,
  rds,
  cloudWatch,
  validateAWSConfig,
  testAWSConnection,
  sendMetrics
};