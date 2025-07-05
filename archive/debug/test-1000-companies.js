/**
 * 1000社ランダムEDINET企業テストスクリプト
 * 
 * このスクリプトは以下をテストします：
 * 1. 1000社のランダムEDINET企業でROIC分析を実行
 * 2. エラーが発生しないことを確認
 * 3. 財務データが正常に取得できることを確認
 * 4. 結果をレポートとして出力
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 設定
const TOTAL_COMPANIES = 1000;
const CONCURRENT_REQUESTS = 5; // 同時リクエスト数
const API_BASE_URL = 'https://roic-horikens-projects.vercel.app/api';
const DELAY_BETWEEN_BATCHES = 1000; // バッチ間の遅延（ms）

// 結果格納用
const results = {
  successful: [],
  failed: [],
  errors: {},
  summary: {
    totalTested: 0,
    successCount: 0,
    failureCount: 0,
    startTime: new Date(),
    endTime: null,
    averageResponseTime: 0,
    totalResponseTime: 0
  }
};

/**
 * ランダムなEDINETコードを生成
 */
function generateRandomEdinetCode() {
  // EDINETコードの形式: E + 5桁数字
  const codeNumber = Math.floor(Math.random() * 99999) + 1;
  return `E${codeNumber.toString().padStart(5, '0')}`;
}

/**
 * 指定された企業の財務データを取得
 */
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

/**
 * 財務データを検証
 */
function validateFinancialData(data) {
  if (!data) return { valid: false, reason: 'データが null または undefined' };
  
  const requiredFields = ['companyName', 'edinetCode', 'fiscalYear', 'netSales', 'totalAssets'];
  const missingFields = requiredFields.filter(field => data[field] === undefined || data[field] === null);
  
  if (missingFields.length > 0) {
    return { valid: false, reason: `必須フィールドが不足: ${missingFields.join(', ')}` };
  }
  
  // 数値フィールドの検証
  const numericFields = ['netSales', 'totalAssets', 'operatingIncome', 'shareholdersEquity'];
  const invalidNumericFields = numericFields.filter(field => 
    data[field] !== undefined && (typeof data[field] !== 'number' || isNaN(data[field]))
  );
  
  if (invalidNumericFields.length > 0) {
    return { valid: false, reason: `数値フィールドが無効: ${invalidNumericFields.join(', ')}` };
  }
  
  return { valid: true };
}

/**
 * バッチ処理でテストを実行
 */
async function runBatchTest(batchNumber, edinetCodes) {
  console.log(`\n=== バッチ ${batchNumber} 開始 (${edinetCodes.length}社) ===`);
  
  const promises = edinetCodes.map(async (edinetCode) => {
    const result = await fetchFinancialData(edinetCode);
    
    results.summary.totalTested++;
    results.summary.totalResponseTime += result.responseTime;
    
    if (result.success) {
      const validation = validateFinancialData(result.data);
      
      if (validation.valid) {
        results.successful.push({
          edinetCode,
          companyName: result.data.companyName,
          source: result.source,
          netSales: result.data.netSales,
          totalAssets: result.data.totalAssets,
          responseTime: result.responseTime
        });
        results.summary.successCount++;
        console.log(`✅ ${edinetCode}: ${result.data.companyName} (${result.source})`);
      } else {
        results.failed.push({
          edinetCode,
          error: 'VALIDATION_ERROR',
          message: validation.reason,
          responseTime: result.responseTime
        });
        results.summary.failureCount++;
        console.log(`❌ ${edinetCode}: データ検証失敗 - ${validation.reason}`);
      }
    } else {
      results.failed.push({
        edinetCode,
        error: result.error,
        message: result.message,
        responseTime: result.responseTime
      });
      results.summary.failureCount++;
      
      // エラー統計を更新
      const errorKey = result.error || 'UNKNOWN_ERROR';
      results.errors[errorKey] = (results.errors[errorKey] || 0) + 1;
      
      console.log(`❌ ${edinetCode}: ${result.error} - ${result.message}`);
    }
    
    return result;
  });
  
  await Promise.all(promises);
  
  const successRate = ((results.summary.successCount / results.summary.totalTested) * 100).toFixed(1);
  console.log(`バッチ ${batchNumber} 完了: 成功率 ${successRate}% (${results.summary.successCount}/${results.summary.totalTested})`);
  
  // バッチ間の遅延
  if (batchNumber < Math.ceil(TOTAL_COMPANIES / CONCURRENT_REQUESTS)) {
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
  }
}

/**
 * レポートを生成
 */
function generateReport() {
  results.summary.endTime = new Date();
  results.summary.averageResponseTime = results.summary.totalResponseTime / results.summary.totalTested;
  
  const duration = results.summary.endTime - results.summary.startTime;
  const successRate = ((results.summary.successCount / results.summary.totalTested) * 100).toFixed(1);
  
  const report = {
    testInfo: {
      totalCompanies: TOTAL_COMPANIES,
      actualTested: results.summary.totalTested,
      concurrentRequests: CONCURRENT_REQUESTS,
      testDuration: `${Math.round(duration / 1000)}秒`,
      averageResponseTime: `${Math.round(results.summary.averageResponseTime)}ms`
    },
    results: {
      successCount: results.summary.successCount,
      failureCount: results.summary.failureCount,
      successRate: `${successRate}%`
    },
    errorBreakdown: results.errors,
    sampleSuccessfulCompanies: results.successful.slice(0, 10),
    sampleFailedCompanies: results.failed.slice(0, 10),
    dataSourceBreakdown: {}
  };
  
  // データソース別の統計を計算
  results.successful.forEach(company => {
    const source = company.source || 'unknown';
    report.dataSourceBreakdown[source] = (report.dataSourceBreakdown[source] || 0) + 1;
  });
  
  return report;
}

/**
 * レポートをファイルに保存
 */
function saveReport(report) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(__dirname, `test-report-${timestamp}.json`);
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 詳細レポートを保存しました: ${reportPath}`);
  
  // 簡易レポートをコンソールに出力
  console.log('\n=== テスト結果サマリー ===');
  console.log(`総テスト企業数: ${report.testInfo.actualTested}`);
  console.log(`成功: ${report.results.successCount} (${report.results.successRate})`);
  console.log(`失敗: ${report.results.failureCount}`);
  console.log(`テスト時間: ${report.testInfo.testDuration}`);
  console.log(`平均応答時間: ${report.testInfo.averageResponseTime}`);
  
  console.log('\n=== エラー内訳 ===');
  Object.entries(report.errorBreakdown).forEach(([error, count]) => {
    console.log(`${error}: ${count}件`);
  });
  
  console.log('\n=== データソース内訳 ===');
  Object.entries(report.dataSourceBreakdown).forEach(([source, count]) => {
    console.log(`${source}: ${count}件`);
  });
  
  console.log('\n=== 成功企業サンプル ===');
  report.sampleSuccessfulCompanies.forEach(company => {
    console.log(`${company.edinetCode}: ${company.companyName} (${company.source})`);
  });
  
  if (report.sampleFailedCompanies.length > 0) {
    console.log('\n=== 失敗企業サンプル ===');
    report.sampleFailedCompanies.forEach(company => {
      console.log(`${company.edinetCode}: ${company.error} - ${company.message}`);
    });
  }
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('🚀 EDINET 1000社テストスクリプト開始');
  console.log(`対象企業数: ${TOTAL_COMPANIES}`);
  console.log(`同時リクエスト数: ${CONCURRENT_REQUESTS}`);
  console.log(`API エンドポイント: ${API_BASE_URL}`);
  
  // ランダムなEDINETコードを生成
  const edinetCodes = Array.from({ length: TOTAL_COMPANIES }, () => generateRandomEdinetCode());
  
  // 重複を除去
  const uniqueEdinetCodes = [...new Set(edinetCodes)];
  console.log(`重複除去後: ${uniqueEdinetCodes.length}社`);
  
  // バッチに分割
  const batches = [];
  for (let i = 0; i < uniqueEdinetCodes.length; i += CONCURRENT_REQUESTS) {
    batches.push(uniqueEdinetCodes.slice(i, i + CONCURRENT_REQUESTS));
  }
  
  console.log(`${batches.length}バッチに分割`);
  
  // バッチ処理を実行
  for (let i = 0; i < batches.length; i++) {
    await runBatchTest(i + 1, batches[i]);
  }
  
  // レポート生成・保存
  const report = generateReport();
  saveReport(report);
  
  console.log('\n✅ テスト完了');
  
  // 成功率が低い場合は警告
  const successRate = (results.summary.successCount / results.summary.totalTested) * 100;
  if (successRate < 80) {
    console.log(`⚠️  成功率が低いです (${successRate.toFixed(1)}%)`);
    console.log('システムの改善が必要かもしれません。');
  } else {
    console.log(`🎉 成功率: ${successRate.toFixed(1)}% - 良好です！`);
  }
}

// スクリプト実行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ テストスクリプトエラー:', error);
    process.exit(1);
  });
}

module.exports = { main, fetchFinancialData, validateFinancialData };