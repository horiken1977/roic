/**
 * 10社サンプルテストスクリプト（修正確認用）
 */

const https = require('https');

const API_BASE_URL = 'https://roic-horikens-projects.vercel.app/api';

// テスト対象のEDINETコード
const testCodes = [
  'E01739', // 三菱電機（既知の企業）
  'E02144', // トヨタ自動車（既知の企業） 
  'E99999', // 存在しないコード
  'E12345', // ランダム1
  'E54321', // ランダム2
  'E11111', // ランダム3
  'E22222', // ランダム4
  'E33333', // ランダム5
  'E44444', // ランダム6
  'E55555'  // ランダム7
];

async function fetchFinancialData(edinetCode, fiscalYear = 2023) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE_URL}/edinet/financial?edinetCode=${edinetCode}&fiscalYear=${fiscalYear}`;
    const startTime = Date.now();
    
    const req = https.get(url, {
      headers: {
        'User-Agent': 'ROIC-Test-Script/1.0',
        'Accept': 'application/json'
      },
      timeout: 30000
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        
        try {
          if (res.statusCode !== 200) {
            resolve({
              success: false,
              edinetCode,
              error: `HTTP_${res.statusCode}`,
              message: `HTTP Error: ${res.statusCode}`,
              responseTime
            });
            return;
          }
          
          const result = JSON.parse(data);
          resolve({
            success: result.success,
            edinetCode,
            data: result.data,
            source: result.source,
            message: result.message,
            error: result.error,
            responseTime
          });
        } catch (parseError) {
          resolve({
            success: false,
            edinetCode,
            error: 'JSON_PARSE_ERROR',
            message: `JSON Parse Error: ${parseError.message}`,
            responseTime
          });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({
        success: false,
        edinetCode,
        error: 'REQUEST_ERROR',
        message: `Request Error: ${error.message}`,
        responseTime: Date.now() - startTime
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        edinetCode,
        error: 'TIMEOUT',
        message: 'Request timeout after 30 seconds',
        responseTime: 30000
      });
    });
  });
}

async function main() {
  console.log('🔍 10社サンプルテスト開始（修正確認用）');
  console.log(`API エンドポイント: ${API_BASE_URL}`);
  console.log(`テスト企業数: ${testCodes.length}`);
  
  const results = [];
  
  for (let i = 0; i < testCodes.length; i++) {
    const edinetCode = testCodes[i];
    console.log(`\n[${i+1}/${testCodes.length}] ${edinetCode} をテスト中...`);
    
    const result = await fetchFinancialData(edinetCode);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ 成功: ${result.data.companyName} (${result.source})`);
      console.log(`   売上: ${(result.data.netSales / 1000000000).toFixed(0)}億円`);
      console.log(`   営業利益: ${(result.data.operatingIncome / 1000000000).toFixed(0)}億円`);
    } else {
      console.log(`❌ 失敗: ${result.error} - ${result.message}`);
    }
    
    console.log(`   応答時間: ${result.responseTime}ms`);
    
    // 次のリクエストまで少し待機
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // 結果サマリー
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const successRate = (successful.length / results.length * 100).toFixed(1);
  
  console.log('\n=== テスト結果サマリー ===');
  console.log(`総テスト数: ${results.length}`);
  console.log(`成功: ${successful.length} (${successRate}%)`);
  console.log(`失敗: ${failed.length}`);
  
  if (successful.length > 0) {
    console.log('\n=== 成功企業 ===');
    successful.forEach(r => {
      console.log(`${r.edinetCode}: ${r.data.companyName} (${r.source})`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n=== 失敗企業 ===');
    failed.forEach(r => {
      console.log(`${r.edinetCode}: ${r.error} - ${r.message}`);
    });
  }
  
  console.log('\n✅ テスト完了');
  
  if (successRate < 50) {
    console.log('⚠️  成功率が低いです。システムに問題がある可能性があります。');
  } else {
    console.log('🎉 修正が成功しています！');
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ テストスクリプトエラー:', error);
    process.exit(1);
  });
}

module.exports = { main };