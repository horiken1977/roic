/**
 * ログ設定（Winston）
 */
const winston = require('winston');
const path = require('path');

// ログレベル設定
const logLevel = process.env.LOG_LEVEL || 'info';

// ログフォーマット定義
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // メタデータがある場合は追加
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    
    return msg;
  })
);

// トランスポート設定
const transports = [
  // コンソール出力
  new winston.transports.Console({
    level: logLevel,
    format: winston.format.combine(
      winston.format.colorize(),
      logFormat
    )
  })
];

// 本番環境またはファイルログが設定されている場合
if (process.env.NODE_ENV === 'production' || process.env.LOG_FILE) {
  const logDir = path.dirname(process.env.LOG_FILE || 'logs/app.log');
  
  // ログディレクトリ作成
  const fs = require('fs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  // ファイル出力（一般ログ）
  transports.push(
    new winston.transports.File({
      filename: process.env.LOG_FILE || 'logs/app.log',
      level: logLevel,
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
  
  // エラーログ専用ファイル
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  );
}

// Winstonロガー作成
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports,
  // 未処理の例外をキャッチ
  exceptionHandlers: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    })
  ],
  // 未処理のPromise拒否をキャッチ
  rejectionHandlers: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    })
  ]
});

// Express用ミドルウェア関数
function expressLogger(req, res, next) {
  const startTime = Date.now();
  
  // レスポンス終了時にログ出力
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP request completed with error', logData);
    } else {
      logger.info('HTTP request completed', logData);
    }
  });
  
  next();
}

// EDINET API呼び出し用ログ
function logEdinetApiCall(method, url, statusCode, duration, data = {}) {
  const logData = {
    service: 'EDINET_API',
    method,
    url,
    statusCode,
    duration: `${duration}ms`,
    ...data
  };
  
  if (statusCode >= 400) {
    logger.error('EDINET API call failed', logData);
  } else {
    logger.info('EDINET API call successful', logData);
  }
}

// データベースクエリ用ログ
function logDatabaseQuery(query, duration, rowCount, error = null) {
  const logData = {
    service: 'DATABASE',
    query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
    duration: `${duration}ms`,
    rowCount
  };
  
  if (error) {
    logger.error('Database query failed', { ...logData, error: error.message });
  } else {
    logger.debug('Database query executed', logData);
  }
}

// ROIC計算用ログ
function logRoicCalculation(companyId, fiscalYear, roic, duration) {
  logger.info('ROIC calculation completed', {
    service: 'ROIC_CALCULATOR',
    companyId,
    fiscalYear,
    roic: `${roic}%`,
    duration: `${duration}ms`
  });
}

module.exports = {
  logger,
  expressLogger,
  logEdinetApiCall,
  logDatabaseQuery,
  logRoicCalculation
};