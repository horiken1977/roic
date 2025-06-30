/**
 * PostgreSQL データベース接続設定
 */
const { Pool } = require('pg');

// データベース接続設定
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  // SSL設定（AWS RDS用）
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false,
  
  // 接続プール設定
  min: parseInt(process.env.DB_POOL_MIN) || 2,
  max: parseInt(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  
  // エラーハンドリング
  statement_timeout: 30000,  // 30秒でタイムアウト
  query_timeout: 30000,
  
  // ログ設定
  log: (msg) => console.log('PostgreSQL:', msg)
};

// 設定値の検証
function validateDatabaseConfig() {
  const requiredEnvVars = [
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required database environment variables:', missingVars);
    throw new Error(`Missing database environment variables: ${missingVars.join(', ')}`);
  }

  console.log('Database configuration validated', {
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    ssl: process.env.DB_SSL === 'true'
  });
}

// PostgreSQL接続プール作成
const pool = new Pool(dbConfig);

// 接続プールイベントハンドラー
pool.on('connect', (client) => {
  console.log('New PostgreSQL client connected');
});

pool.on('error', (err, client) => {
  console.error('PostgreSQL client error:', err.message);
});

pool.on('acquire', (client) => {
  console.log('PostgreSQL client acquired from pool');
});

pool.on('remove', (client) => {
  console.log('PostgreSQL client removed from pool');
});

// データベース接続テスト
async function testDatabaseConnection() {
  let client;
  try {
    console.log('Testing database connection...');
    
    client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    
    console.log('Database connection successful', {
      currentTime: result.rows[0].current_time,
      postgresVersion: result.rows[0].pg_version
    });
    
    return {
      success: true,
      currentTime: result.rows[0].current_time,
      version: result.rows[0].pg_version
    };
  } catch (error) {
    console.error('Database connection test failed:', error.message);
    throw new Error(`Database connection failed: ${error.message}`);
  } finally {
    if (client) {
      client.release();
    }
  }
}

// クエリ実行（ログ付き）
async function query(text, params = []) {
  const startTime = Date.now();
  let client;
  
  try {
    client = await pool.connect();
    const result = await client.query(text, params);
    const duration = Date.now() - startTime;
    
    console.log('Query executed', {
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      duration: `${duration}ms`,
      rows: result.rowCount
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Query execution failed', {
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      error: error.message,
      duration: `${duration}ms`
    });
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// トランザクション実行
async function transaction(callback) {
  let client;
  
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    
    const result = await callback(client);
    
    await client.query('COMMIT');
    console.log('Transaction committed successfully');
    
    return result;
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      console.log('Transaction rolled back due to error');
    }
    console.error('Transaction failed:', error.message);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// 接続プール終了
async function closePool() {
  try {
    await pool.end();
    console.log('Database connection pool closed');
  } catch (error) {
    console.error('Error closing database pool:', error.message);
  }
}

// プロセス終了時のクリーンアップ
process.on('SIGINT', closePool);
process.on('SIGTERM', closePool);

module.exports = {
  pool,
  query,
  transaction,
  testDatabaseConnection,
  validateDatabaseConfig,
  closePool
};