/**
 * 1000社ランダムEDINET企業テストスクリプト（シンプルAPI版）
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 設定
const TOTAL_COMPANIES = 1000;
const CONCURRENT_REQUESTS = 3; // 同時リクエスト数（安定化のため削減）
const API_BASE_URL = 'https://roic-horikens-projects.vercel.app/api';
const DELAY_BETWEEN_BATCHES = 800; // バッチ間の遅延（ms）

// 結果格納用
const results = {
  successful: [],
  failed: [],
  errors: {},
  scaleBreakdown: {},
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
  const codeNumber = Math.floor(Math.random() * 99999) + 1;
  return `E${codeNumber.toString().padStart(5, '0')}`;
}

/**
 * 指定された企業の財務データを取得（シンプルAPI版）
 */
async function fetchSimpleFinancialData(edinetCode, fiscalYear = 2023) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE_URL}/edinet/simple-financial?edinetCode=${edinetCode}&fiscalYear=${fiscalYear}`;
    const startTime = Date.now();
    
    const req = https.get(url, {
      headers: {
        'User-Agent': 'ROIC-Test-Script/1.0',
        'Accept': 'application/json'
      },
      timeout: 25000
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
        message: 'Request timeout after 25 seconds',
        responseTime: 25000
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
    data[field] !== undefined && (typeof data[field] !== 'number' || isNaN(data[field]) || data[field] < 0)
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
    const result = await fetchSimpleFinancialData(edinetCode);
    
    results.summary.totalTested++;
    results.summary.totalResponseTime += result.responseTime;
    
    if (result.success) {
      const validation = validateFinancialData(result.data);
      
      if (validation.valid) {
        // 企業規模別の統計を更新
        const scaleMatch = result.source.match(/simple_universal_(\w+)/);
        const scale = scaleMatch ? scaleMatch[1] : 'unknown';
        results.scaleBreakdown[scale] = (results.scaleBreakdown[scale] || 0) + 1;
        
        results.successful.push({
          edinetCode,
          companyName: result.data.companyName,
          source: result.source,
          scale: scale,
          netSales: result.data.netSales,
          totalAssets: result.data.totalAssets,
          operatingIncome: result.data.operatingIncome,
          responseTime: result.responseTime
        });
        results.summary.successCount++;
        
        // 進捗表示を簡略化
        if (results.summary.successCount % 50 === 0) {
          console.log(`✅ 進捗: ${results.summary.successCount}社成功`);
        }
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
      
      console.log(`❌ ${edinetCode}: ${result.error}`);
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
      averageResponseTime: `${Math.round(results.summary.averageResponseTime)}ms`,
      apiEndpoint: 'simple-financial'
    },
    results: {
      successCount: results.summary.successCount,
      failureCount: results.summary.failureCount,
      successRate: `${successRate}%`
    },
    errorBreakdown: results.errors,
    scaleBreakdown: results.scaleBreakdown,
    sampleSuccessfulCompanies: results.successful.slice(0, 20),
    sampleFailedCompanies: results.failed.slice(0, 10),
    financialStatistics: {
      avgNetSales: 0,
      avgOperatingIncome: 0,
      avgTotalAssets: 0
    }
  };
  
  // 財務統計を計算
  if (results.successful.length > 0) {
    report.financialStatistics.avgNetSales = Math.round(
      results.successful.reduce((sum, c) => sum + c.netSales, 0) / results.successful.length / 1000000000
    );
    report.financialStatistics.avgOperatingIncome = Math.round(
      results.successful.reduce((sum, c) => sum + c.operatingIncome, 0) / results.successful.length / 1000000000
    );
    report.financialStatistics.avgTotalAssets = Math.round(
      results.successful.reduce((sum, c) => sum + c.totalAssets, 0) / results.successful.length / 1000000000
    );
  }
  
  return report;
}

/**
 * レポートをファイルに保存
 */
function saveReport(report) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(__dirname, `test-1000-simple-report-${timestamp}.json`);
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 詳細レポートを保存しました: ${reportPath}`);
  
  // 簡易レポートをコンソールに出力
  console.log('\n=== 1000社テスト結果サマリー（シンプルAPI版） ===');
  console.log(`総テスト企業数: ${report.testInfo.actualTested}`);
  console.log(`成功: ${report.results.successCount} (${report.results.successRate})`);
  console.log(`失敗: ${report.results.failureCount}`);
  console.log(`テスト時間: ${report.testInfo.testDuration}`);
  console.log(`平均応答時間: ${report.testInfo.averageResponseTime}`);
  
  if (Object.keys(report.errorBreakdown).length > 0) {
    console.log('\n=== エラー内訳 ===');
    Object.entries(report.errorBreakdown).forEach(([error, count]) => {
      console.log(`${error}: ${count}件`);
    });
  }
  
  console.log('\n=== 企業規模内訳 ===');
  Object.entries(report.scaleBreakdown).forEach(([scale, count]) => {
    console.log(`${scale}企業: ${count}件`);
  });
  
  console.log('\n=== 財務統計（平均値・億円単位） ===');
  console.log(`売上高: ${report.financialStatistics.avgNetSales}億円`);
  console.log(`営業利益: ${report.financialStatistics.avgOperatingIncome}億円`);
  console.log(`総資産: ${report.financialStatistics.avgTotalAssets}億円`);
  
  console.log('\n=== 成功企業サンプル ===');
  report.sampleSuccessfulCompanies.slice(0, 10).forEach(company => {
    const salesBillion = Math.round(company.netSales / 1000000000);
    console.log(`${company.edinetCode}: ${company.companyName} (${company.scale}) - 売上${salesBillion}億円`);
  });
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('🚀 EDINET 1000社テストスクリプト開始（シンプルAPI版）');
  console.log(`対象企業数: ${TOTAL_COMPANIES}`);
  console.log(`同時リクエスト数: ${CONCURRENT_REQUESTS}`);
  console.log(`API エンドポイント: ${API_BASE_URL}/edinet/simple-financial`);
  
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
  
  // 成功率評価
  const successRate = (results.summary.successCount / results.summary.totalTested) * 100;
  if (successRate >= 95) {
    console.log(`🎉 素晴らしい成功率: ${successRate.toFixed(1)}% - システムは完全に動作しています！`);
  } else if (successRate >= 80) {
    console.log(`👍 良好な成功率: ${successRate.toFixed(1)}% - システムは正常に動作しています。`);
  } else {
    console.log(`⚠️  成功率が低いです (${successRate.toFixed(1)}%)`);
  }
}

// スクリプト実行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ テストスクリプトエラー:', error);
    process.exit(1);
  });
}

module.exports = { main };