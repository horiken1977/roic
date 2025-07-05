/**
 * 実際のEDINET API統合テストスクリプト
 * 実データでのXBRL解析とROIC計算の検証
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 設定
const TEST_COMPANIES = [
  // 大企業（検証済み実在企業）
  { edinetCode: 'E02144', name: 'トヨタ自動車', scale: 'large' },
  { edinetCode: 'E04425', name: 'ソフトバンクグループ', scale: 'large' },
  { edinetCode: 'E02166', name: 'ソニーグループ', scale: 'large' },
  // 中堅企業
  { edinetCode: 'E03814', name: 'セブン&アイ・ホールディングス', scale: 'medium' },
  { edinetCode: 'E04430', name: 'ファーストリテイリング', scale: 'medium' },
  // 金融系（異なる業界での検証）
  { edinetCode: 'E03577', name: '三菱UFJフィナンシャル・グループ', scale: 'large' },
  { edinetCode: 'E03571', name: '三井住友フィナンシャルグループ', scale: 'large' }
];

const API_BASE_URL = 'https://roic-horikens-projects.vercel.app/api';
const FISCAL_YEAR = 2023;
const DELAY_BETWEEN_REQUESTS = 2000; // リクエスト間隔（ms）

// 結果格納用
const testResults = {
  successful: [],
  failed: [],
  summary: {
    totalTested: 0,
    successCount: 0,
    failureCount: 0,
    startTime: new Date(),
    endTime: null,
    averageResponseTime: 0,
    totalResponseTime: 0
  },
  dataQuality: {
    validXbrlData: 0,
    estimatedData: 0,
    errorData: 0
  },
  roicAnalysis: {
    calculated: 0,
    validRange: 0, // -50% ~ 100% の合理的範囲
    extremeValues: 0
  }
};

/**
 * 実際のEDINET APIから財務データを取得
 */
async function fetchRealFinancialData(edinetCode, fiscalYear = FISCAL_YEAR) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE_URL}/edinet/financial-safe?edinetCode=${edinetCode}&fiscalYear=${fiscalYear}`;
    const startTime = Date.now();
    
    console.log(`🔍 実データ取得開始: ${edinetCode} (${fiscalYear}年度)`);
    
    const req = https.get(url, {
      headers: {
        'User-Agent': 'ROIC-Real-Test/1.0',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30秒タイムアウト
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
            responseTime,
            rawResponse: result
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
 * データソースの判定（実XBRL vs 推定データ）
 */
function analyzeDataSource(result) {
  if (!result.success || !result.data) {
    return { type: 'error', quality: 'none' };
  }
  
  const source = result.source || '';
  const data = result.data;
  
  // データソースの判定
  if (source.includes('xbrl') || source.includes('edinet_real')) {
    return { type: 'xbrl', quality: 'high' };
  } else if (source.includes('simple_universal') || source.includes('estimated')) {
    return { type: 'estimated', quality: 'medium' };
  } else if (source.includes('emergency') || source.includes('fallback')) {
    return { type: 'fallback', quality: 'low' };
  }
  
  // データの特徴から推定
  if (data.dataSource && data.dataSource.includes('xbrl')) {
    return { type: 'xbrl', quality: 'high' };
  }
  
  return { type: 'unknown', quality: 'medium' };
}

/**
 * 財務データの妥当性検証
 */
function validateFinancialData(data, companyInfo) {
  const validation = {
    valid: true,
    issues: [],
    score: 100
  };
  
  if (!data) {
    validation.valid = false;
    validation.issues.push('データが存在しません');
    return validation;
  }
  
  // 必須フィールドの確認
  const requiredFields = ['companyName', 'edinetCode', 'fiscalYear', 'netSales', 'totalAssets'];
  const missingFields = requiredFields.filter(field => 
    data[field] === undefined || data[field] === null
  );
  
  if (missingFields.length > 0) {
    validation.valid = false;
    validation.issues.push(`必須フィールド不足: ${missingFields.join(', ')}`);
    validation.score -= 30;
  }
  
  // 数値の妥当性確認
  const numericFields = ['netSales', 'totalAssets', 'operatingIncome', 'shareholdersEquity'];
  numericFields.forEach(field => {
    const value = data[field];
    if (value !== undefined) {
      if (typeof value !== 'number' || isNaN(value)) {
        validation.issues.push(`${field}が無効な数値`);
        validation.score -= 10;
      } else if (value < 0 && field !== 'operatingIncome') {
        validation.issues.push(`${field}が負の値`);
        validation.score -= 5;
      }
    }
  });
  
  // 規模の妥当性確認（企業情報との整合性）
  if (data.netSales && companyInfo.scale) {
    const salesBillion = data.netSales / 1000000000;
    let expectedRange = { min: 0, max: Infinity };
    
    switch (companyInfo.scale) {
      case 'large':
        expectedRange = { min: 100, max: 50000 }; // 1000億～50兆円
        break;
      case 'medium':
        expectedRange = { min: 10, max: 5000 }; // 100億～5兆円
        break;
      case 'small':
        expectedRange = { min: 1, max: 1000 }; // 10億～1兆円
        break;
    }
    
    if (salesBillion < expectedRange.min || salesBillion > expectedRange.max) {
      validation.issues.push(`売上規模が期待範囲外: ${salesBillion.toFixed(0)}億円`);
      validation.score -= 15;
    }
  }
  
  return validation;
}

/**
 * ROIC計算と妥当性検証
 */
function calculateAndValidateROIC(data) {
  if (!data || typeof data.netSales !== 'number' || typeof data.totalAssets !== 'number') {
    return { success: false, error: 'ROIC計算に必要なデータが不足' };
  }
  
  try {
    // 基本ROIC計算
    const operatingIncome = data.operatingIncome || 0;
    const taxRate = data.taxRate || 0.30;
    const nopat = operatingIncome * (1 - taxRate);
    const totalAssets = data.totalAssets;
    const cash = data.cashAndEquivalents || 0;
    const investedCapital = totalAssets - cash;
    
    const roic = investedCapital > 0 ? (nopat / investedCapital) * 100 : 0;
    
    // ROIC妥当性の確認
    const validation = {
      roic: roic,
      nopat: nopat,
      investedCapital: investedCapital,
      valid: true,
      issues: []
    };
    
    // 合理的な範囲の確認（-50% ～ 100%）
    if (roic < -50 || roic > 100) {
      validation.valid = false;
      validation.issues.push(`ROIC値が極端: ${roic.toFixed(2)}%`);
    }
    
    // 投下資本の妥当性
    if (investedCapital <= 0) {
      validation.valid = false;
      validation.issues.push('投下資本が0以下');
    }
    
    return validation;
  } catch (error) {
    return { success: false, error: `ROIC計算エラー: ${error.message}` };
  }
}

/**
 * 単一企業のテスト実行
 */
async function testSingleCompany(companyInfo) {
  console.log(`\n=== ${companyInfo.name} (${companyInfo.edinetCode}) テスト開始 ===`);
  
  const result = await fetchRealFinancialData(companyInfo.edinetCode, FISCAL_YEAR);
  
  testResults.summary.totalTested++;
  testResults.summary.totalResponseTime += result.responseTime;
  
  if (result.success) {
    // データソース分析
    const sourceAnalysis = analyzeDataSource(result);
    
    // データ品質評価
    const validation = validateFinancialData(result.data, companyInfo);
    
    // ROIC計算
    const roicResult = calculateAndValidateROIC(result.data);
    
    const testRecord = {
      edinetCode: companyInfo.edinetCode,
      companyName: companyInfo.name,
      expectedScale: companyInfo.scale,
      responseTime: result.responseTime,
      dataSource: sourceAnalysis,
      validation: validation,
      roic: roicResult,
      rawData: {
        netSales: result.data.netSales,
        operatingIncome: result.data.operatingIncome,
        totalAssets: result.data.totalAssets,
        dataSource: result.data.dataSource
      }
    };
    
    testResults.successful.push(testRecord);
    testResults.summary.successCount++;
    
    // 統計更新
    if (sourceAnalysis.type === 'xbrl') {
      testResults.dataQuality.validXbrlData++;
    } else if (sourceAnalysis.type === 'estimated') {
      testResults.dataQuality.estimatedData++;
    }
    
    if (roicResult.success !== false) {
      testResults.roicAnalysis.calculated++;
      if (roicResult.valid) {
        testResults.roicAnalysis.validRange++;
      } else {
        testResults.roicAnalysis.extremeValues++;
      }
    }
    
    // 結果表示
    console.log(`✅ 成功: ${companyInfo.name}`);
    console.log(`   データソース: ${sourceAnalysis.type} (${sourceAnalysis.quality}品質)`);
    console.log(`   データ妥当性: ${validation.valid ? '✅' : '❌'} (スコア: ${validation.score})`);
    if (roicResult.success !== false) {
      console.log(`   ROIC: ${roicResult.roic.toFixed(2)}% (${roicResult.valid ? '正常範囲' : '要確認'})`);
    }
    if (validation.issues.length > 0) {
      console.log(`   問題: ${validation.issues.join(', ')}`);
    }
    
  } else {
    testResults.failed.push({
      edinetCode: companyInfo.edinetCode,
      companyName: companyInfo.name,
      error: result.error,
      message: result.message,
      responseTime: result.responseTime
    });
    testResults.summary.failureCount++;
    testResults.dataQuality.errorData++;
    
    console.log(`❌ 失敗: ${companyInfo.name} - ${result.error}`);
  }
}

/**
 * レポート生成
 */
function generateReport() {
  testResults.summary.endTime = new Date();
  testResults.summary.averageResponseTime = testResults.summary.totalResponseTime / testResults.summary.totalTested;
  
  const duration = testResults.summary.endTime - testResults.summary.startTime;
  const successRate = ((testResults.summary.successCount / testResults.summary.totalTested) * 100).toFixed(1);
  
  const report = {
    testInfo: {
      testType: 'EDINET API Real Data Integration Test',
      totalCompanies: TEST_COMPANIES.length,
      fiscalYear: FISCAL_YEAR,
      testDuration: `${Math.round(duration / 1000)}秒`,
      averageResponseTime: `${Math.round(testResults.summary.averageResponseTime)}ms`
    },
    results: {
      successCount: testResults.summary.successCount,
      failureCount: testResults.summary.failureCount,
      successRate: `${successRate}%`
    },
    dataQuality: {
      xbrlData: testResults.dataQuality.validXbrlData,
      estimatedData: testResults.dataQuality.estimatedData,
      errorData: testResults.dataQuality.errorData,
      xbrlPercentage: `${((testResults.dataQuality.validXbrlData / testResults.summary.totalTested) * 100).toFixed(1)}%`
    },
    roicAnalysis: {
      calculated: testResults.roicAnalysis.calculated,
      validRange: testResults.roicAnalysis.validRange,
      extremeValues: testResults.roicAnalysis.extremeValues,
      calculationRate: `${((testResults.roicAnalysis.calculated / testResults.summary.totalTested) * 100).toFixed(1)}%`
    },
    detailedResults: testResults.successful,
    failures: testResults.failed
  };
  
  return report;
}

/**
 * レポート保存と表示
 */
function saveAndDisplayReport(report) {
  // レポートファイル保存
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(__dirname, `real-edinet-test-report-${timestamp}.json`);
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 詳細レポートを保存: ${reportPath}`);
  
  // サマリー表示
  console.log('\n=== 実際のEDINET API統合テスト結果 ===');
  console.log(`総テスト企業数: ${report.testInfo.totalCompanies}`);
  console.log(`成功: ${report.results.successCount} (${report.results.successRate})`);
  console.log(`失敗: ${report.results.failureCount}`);
  console.log(`テスト時間: ${report.testInfo.testDuration}`);
  console.log(`平均応答時間: ${report.testInfo.averageResponseTime}`);
  
  console.log('\n=== データ品質分析 ===');
  console.log(`実XBRL解析データ: ${report.dataQuality.xbrlData}社 (${report.dataQuality.xbrlPercentage})`);
  console.log(`推定データ: ${report.dataQuality.estimatedData}社`);
  console.log(`エラー: ${report.dataQuality.errorData}社`);
  
  console.log('\n=== ROIC計算分析 ===');
  console.log(`ROIC計算成功: ${report.roicAnalysis.calculated}社 (${report.roicAnalysis.calculationRate})`);
  console.log(`正常範囲内: ${report.roicAnalysis.validRange}社`);
  console.log(`要確認値: ${report.roicAnalysis.extremeValues}社`);
  
  if (report.detailedResults.length > 0) {
    console.log('\n=== 成功企業詳細 ===');
    report.detailedResults.forEach(company => {
      const salesBillion = Math.round(company.rawData.netSales / 1000000000);
      const roicDisplay = company.roic.success !== false ? `${company.roic.roic.toFixed(2)}%` : 'N/A';
      console.log(`${company.companyName}: 売上${salesBillion}億円, ROIC=${roicDisplay}, データ=${company.dataSource.type}`);
    });
  }
  
  if (report.failures.length > 0) {
    console.log('\n=== 失敗企業 ===');
    report.failures.forEach(failure => {
      console.log(`${failure.companyName}: ${failure.error} - ${failure.message}`);
    });
  }
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('🚀 実際のEDINET API統合テスト開始');
  console.log(`対象企業数: ${TEST_COMPANIES.length}`);
  console.log(`対象年度: ${FISCAL_YEAR}`);
  console.log(`API エンドポイント: ${API_BASE_URL}/edinet/financial-safe`);
  console.log(`リクエスト間隔: ${DELAY_BETWEEN_REQUESTS}ms`);
  
  // 各企業のテストを順次実行
  for (let i = 0; i < TEST_COMPANIES.length; i++) {
    await testSingleCompany(TEST_COMPANIES[i]);
    
    // 最後の企業以外は待機
    if (i < TEST_COMPANIES.length - 1) {
      console.log(`⏳ ${DELAY_BETWEEN_REQUESTS}ms 待機中...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
    }
  }
  
  // レポート生成・保存
  const report = generateReport();
  saveAndDisplayReport(report);
  
  console.log('\n✅ 実際のEDINET API統合テスト完了');
  
  // 結果評価
  const successRate = (testResults.summary.successCount / testResults.summary.totalTested) * 100;
  const xbrlRate = (testResults.dataQuality.validXbrlData / testResults.summary.totalTested) * 100;
  
  if (successRate >= 80 && xbrlRate >= 30) {
    console.log(`🎉 テスト評価: 優秀 (成功率${successRate.toFixed(1)}%, XBRL解析率${xbrlRate.toFixed(1)}%)`);
  } else if (successRate >= 60) {
    console.log(`👍 テスト評価: 良好 (成功率${successRate.toFixed(1)}%, XBRL解析率${xbrlRate.toFixed(1)}%)`);
  } else {
    console.log(`⚠️  テスト評価: 要改善 (成功率${successRate.toFixed(1)}%, XBRL解析率${xbrlRate.toFixed(1)}%)`);
  }
}

// スクリプト実行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 実EDINET統合テストエラー:', error);
    process.exit(1);
  });
}

module.exports = { main, testSingleCompany };