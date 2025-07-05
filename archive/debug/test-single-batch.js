/**
 * 単一バッチ（100社）のクイックテスト
 * 現在の状況確認用
 */

const https = require('https');
const fs = require('fs');

const API_BASE_URL = 'https://roic-horikens-projects.vercel.app/api';
const FISCAL_YEAR = 2023;

// 確実に存在する企業コード
const TEST_COMPANIES = [
  'E02144', // トヨタ自動車
  'E04425', // ソフトバンクグループ
  'E02166', // ソニーグループ
  'E03814', // セブン&アイ・ホールディングス
  'E04430', // ファーストリテイリング
  'E03577', // 三菱UFJフィナンシャル・グループ
  'E03571', // 三井住友フィナンシャルグループ
  'E01593', // NTT
  'E01585', // KDDI
  'E04206', // ソフトバンク
];

async function testSingle(edinetCode) {
  return new Promise((resolve) => {
    const url = `${API_BASE_URL}/edinet/financial-safe?edinetCode=${edinetCode}&fiscalYear=${FISCAL_YEAR}`;
    const startTime = Date.now();
    
    const req = https.get(url, {
      headers: {
        'User-Agent': 'ROIC-Quick-Test/1.0',
        'Accept': 'application/json'
      },
      timeout: 10000
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
            responseTime,
            companyName: result.data?.companyName || 'N/A',
            dataSource: (result.source?.includes('direct_data') || result.data?.dataSource?.includes('direct_data')) ? 'real' : 'estimated'
          });
        } catch (parseError) {
          resolve({
            success: false,
            edinetCode,
            error: 'JSON_PARSE_ERROR',
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
        responseTime: Date.now() - startTime
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        edinetCode,
        error: 'TIMEOUT',
        responseTime: 10000
      });
    });
  });
}

async function main() {
  console.log('🔍 クイック10社テスト開始');
  console.log(`API エンドポイント: ${API_BASE_URL}/edinet/financial-safe`);
  
  const results = [];
  let realDataCount = 0;
  
  for (let i = 0; i < TEST_COMPANIES.length; i++) {
    const edinetCode = TEST_COMPANIES[i];
    console.log(`テスト中: ${edinetCode}...`);
    
    const result = await testSingle(edinetCode);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${result.companyName} (${result.dataSource}データ) - ${result.responseTime}ms`);
      if (result.dataSource === 'real') {
        realDataCount++;
      }
    } else {
      console.log(`❌ ${edinetCode} - ${result.error}`);
    }
    
    // 1秒待機
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const successCount = results.filter(r => r.success).length;
  const successRate = ((successCount / results.length) * 100).toFixed(1);
  const realDataRate = ((realDataCount / results.length) * 100).toFixed(1);
  
  console.log('\\n=== クイックテスト結果 ===');
  console.log(`成功: ${successCount}/${results.length} (${successRate}%)`);
  console.log(`実データ: ${realDataCount}社 (${realDataRate}%)`);
  
  // 結果保存
  const report = {
    testType: 'Quick 10 Companies Test',
    results: results,
    summary: {
      totalTested: results.length,
      successCount,
      successRate: `${successRate}%`,
      realDataCount,
      realDataRate: `${realDataRate}%`
    }
  };
  
  fs.writeFileSync('quick-test-result.json', JSON.stringify(report, null, 2));
  console.log('📄 結果を quick-test-result.json に保存');
  
  return report;
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ クイックテストエラー:', error);
    process.exit(1);
  });
}

module.exports = { main };