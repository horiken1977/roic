/**
 * ROIC分析アプリケーション バックエンドサーバー
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// 設定ファイル読み込み
const { logger, expressLogger } = require('./config/logger');
const { validateAWSConfig, testAWSConnection } = require('./config/aws');
const { validateDatabaseConfig, testDatabaseConnection } = require('./config/database');

// アプリケーション作成
const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア設定
app.use(helmet()); // セキュリティヘッダー
app.use(compression()); // レスポンス圧縮
app.use(expressLogger); // ログ出力

// CORS設定
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 最大100リクエスト
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api', limiter);

// JSON解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ヘルスチェックエンドポイント
app.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // AWS接続テスト
    const awsStatus = await testAWSConnection();
    
    // データベース接続テスト
    const dbStatus = await testDatabaseConnection();
    
    const responseTime = Date.now() - startTime;
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: {
        aws: {
          status: awsStatus.success ? 'connected' : 'disconnected',
          region: awsStatus.region,
          rdsInstances: awsStatus.rdsInstances
        },
        database: {
          status: dbStatus.success ? 'connected' : 'disconnected',
          version: dbStatus.version
        }
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform
      }
    });
    
    logger.info('Health check completed successfully', {
      responseTime: `${responseTime}ms`,
      awsConnected: awsStatus.success,
      dbConnected: dbStatus.success
    });
    
  } catch (error) {
    logger.error('Health check failed:', error.message);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// APIルート基本設定
app.get('/api', (req, res) => {
  res.json({
    message: 'ROIC Analysis API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      health: '/health',
      companies: '/api/companies',
      roic: '/api/roic',
      financials: '/api/financials',
      sync: '/api/companies/sync'
    }
  });
});

// API ルートの設定
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// データ同期ジョブの開始
const DataSyncJob = require('./jobs/data-sync-job');
const dataSyncJob = new DataSyncJob();

// 本番環境でのみバッチジョブを自動開始
if (process.env.NODE_ENV === 'production') {
  dataSyncJob.start();
  logger.info('Data sync job started');
}

// 404ハンドラー
app.use('*', (req, res) => {
  logger.warn('Route not found', { url: req.originalUrl, method: req.method });
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// エラーハンドラー
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  
  res.status(error.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// サーバー起動
async function startServer() {
  try {
    // 環境変数検証
    validateAWSConfig();
    validateDatabaseConfig();
    
    // AWS接続テスト
    await testAWSConnection();
    logger.info('AWS connection verified');
    
    // データベース接続テスト
    await testDatabaseConnection();
    logger.info('Database connection verified');
    
    // サーバー起動
    const server = app.listen(PORT, () => {
      logger.info(`ROIC Analysis API server running on port ${PORT}`, {
        nodeEnv: process.env.NODE_ENV,
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      });
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

// サーバー起動実行
if (require.main === module) {
  startServer();
}

module.exports = app;