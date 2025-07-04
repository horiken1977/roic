/**
 * 実際のEDINET API統合テストスクリプト - 1000社大規模版
 * 実データでのXBRL解析とROIC計算の大規模検証
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 設定
const TOTAL_COMPANIES = 1000;
const CONCURRENT_REQUESTS = 5; // 同時リクエスト数
const API_BASE_URL = 'https://roic-horikens-projects.vercel.app/api';
const FISCAL_YEAR = 2023;
const DELAY_BETWEEN_BATCHES = 1000; // バッチ間の遅延（ms）

// 主要な実在企業のEDINETコード（実際の上場企業）
const KNOWN_COMPANIES = [
  // 既存の7社
  { edinetCode: 'E02144', name: 'トヨタ自動車', scale: 'large' },
  { edinetCode: 'E04425', name: 'ソフトバンクグループ', scale: 'large' },
  { edinetCode: 'E02166', name: 'ソニーグループ', scale: 'large' },
  { edinetCode: 'E03814', name: 'セブン&アイ・ホールディングス', scale: 'medium' },
  { edinetCode: 'E04430', name: 'ファーストリテイリング', scale: 'medium' },
  { edinetCode: 'E03577', name: '三菱UFJフィナンシャル・グループ', scale: 'large' },
  { edinetCode: 'E03571', name: '三井住友フィナンシャルグループ', scale: 'large' },
  
  // 追加の主要企業
  { edinetCode: 'E01593', name: '日本電信電話（NTT）', scale: 'large' },
  { edinetCode: 'E01585', name: 'KDDI', scale: 'large' },
  { edinetCode: 'E04206', name: 'ソフトバンク', scale: 'large' },
  { edinetCode: 'E02142', name: 'ホンダ', scale: 'large' },
  { edinetCode: 'E02362', name: '日産自動車', scale: 'large' },
  { edinetCode: 'E01798', name: 'パナソニック', scale: 'large' },
  { edinetCode: 'E01739', name: '三菱電機', scale: 'large' },
  { edinetCode: 'E02513', name: '三井物産', scale: 'large' },
  { edinetCode: 'E02511', name: '伊藤忠商事', scale: 'large' },
  { edinetCode: 'E02768', name: '双日', scale: 'medium' },
  { edinetCode: 'E02491', name: '住友商事', scale: 'large' },
  { edinetCode: 'E02497', name: '丸紅', scale: 'large' },
  { edinetCode: 'E02269', name: '明治ホールディングス', scale: 'medium' },
  { edinetCode: 'E00383', name: '新日本製鐵', scale: 'large' },
  { edinetCode: 'E01264', name: 'JFEホールディングス', scale: 'large' },
  { edinetCode: 'E00048', name: 'アサヒグループホールディングス', scale: 'large' },
  { edinetCode: 'E00040', name: 'キリンホールディングス', scale: 'large' },
  { edinetCode: 'E00378', name: '花王', scale: 'large' },
  { edinetCode: 'E00381', name: '資生堂', scale: 'large' },
  { edinetCode: 'E04502', name: '武田薬品工業', scale: 'large' },
  { edinetCode: 'E04503', name: 'アステラス製薬', scale: 'large' },
  { edinetCode: 'E04506', name: '大塚ホールディングス', scale: 'large' },
  { edinetCode: 'E04507', name: '塩野義製薬', scale: 'medium' }
];

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
    realData: 0,      // 実際の財務データ
    estimatedData: 0, // 推定データ
    errorData: 0      // エラー
  },
  roicAnalysis: {
    calculated: 0,
    validRange: 0,
    extremeValues: 0,
    byIndustry: {}
  },
  scaleBreakdown: {
    large: 0,
    medium: 0,
    small: 0
  }
};

/**
 * ランダムなEDINETコードを生成（E00001〜E99999）
 */
function generateRandomEdinetCode() {
  const codeNumber = Math.floor(Math.random() * 99999) + 1;
  return `E${codeNumber.toString().padStart(5, '0')}`;
}

/**
 * 1000社分のテスト対象企業リストを生成
 */
function generateTestCompanies() {
  const companies = [];
  
  // まず既知の企業を追加
  KNOWN_COMPANIES.forEach(company => {
    companies.push(company);
  });
  
  // 残りはランダムに生成
  const remainingCount = TOTAL_COMPANIES - companies.length;
  for (let i = 0; i < remainingCount; i++) {
    const edinetCode = generateRandomEdinetCode();
    // 重複チェック
    if (!companies.find(c => c.edinetCode === edinetCode)) {
      const codeNum = parseInt(edinetCode.replace('E', ''));
      let scale = 'small';
      if (codeNum < 5000) scale = 'large';
      else if (codeNum < 15000) scale = 'medium';
      
      companies.push({
        edinetCode: edinetCode,
        name: `企業 ${edinetCode}`,
        scale: scale
      });
    }
  }
  
  // シャッフルして返す
  return companies.sort(() => Math.random() - 0.5);
}

/**
 * 実際のEDINET APIから財務データを取得
 */
async function fetchRealFinancialData(company) {
  return new Promise((resolve) => {
    const url = `${API_BASE_URL}/edinet/financial-safe?edinetCode=${company.edinetCode}&fiscalYear=${FISCAL_YEAR}`;
    const startTime = Date.now();
    
    const req = https.get(url, {
      headers: {
        'User-Agent': 'ROIC-Real-Test-1000/1.0',
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
              company,
              error: `HTTP_${res.statusCode}`,
              message: `HTTP Error: ${res.statusCode}`,
              responseTime
            });
            return;
          }
          
          const result = JSON.parse(data);
          resolve({
            success: result.success,
            company,
            data: result.data,
            source: result.source,
            message: result.message,
            error: result.error,
            responseTime
          });
        } catch (parseError) {
          resolve({
            success: false,
            company,
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
        company,
        error: 'REQUEST_ERROR',
        message: `Request Error: ${error.message}`,
        responseTime: Date.now() - startTime
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        company,
        error: 'TIMEOUT',
        message: 'Request timeout after 30 seconds',
        responseTime: 30000
      });
    });
  });
}

/**
 * データソースの分析
 */
function analyzeDataSource(result) {
  if (!result.success || !result.data) {
    return 'error';
  }
  
  const source = result.source || '';
  const dataSource = result.data.dataSource || '';
  
  if (source.includes('direct_data') || dataSource.includes('direct_data')) {
    return 'real';
  } else if (source.includes('estimated') || dataSource.includes('estimated')) {
    return 'estimated';
  }
  
  return 'unknown';
}

/**
 * ROIC計算
 */
function calculateROIC(data) {
  if (!data || typeof data.operatingIncome !== 'number' || typeof data.totalAssets !== 'number') {
    return null;
  }
  
  const operatingIncome = data.operatingIncome;
  const taxRate = data.taxRate || 0.30;
  const nopat = operatingIncome * (1 - taxRate);
  const totalAssets = data.totalAssets;
  const cash = data.cashAndEquivalents || 0;
  const investedCapital = totalAssets - cash;
  
  if (investedCapital <= 0) {
    return null;
  }
  
  return (nopat / investedCapital) * 100;
}

/**
 * 業界推定
 */
function estimateIndustry(company, data) {
  const name = company.name || data?.companyName || '';
  
  // 業界キーワードマッピング
  if (name.includes('銀行') || name.includes('フィナンシャル') || name.includes('信託')) return '金融';
  if (name.includes('自動車') || name.includes('トヨタ') || name.includes('ホンダ') || name.includes('日産')) return '自動車';
  if (name.includes('電機') || name.includes('電器') || name.includes('ソニー') || name.includes('パナソニック')) return '電機';
  if (name.includes('通信') || name.includes('NTT') || name.includes('KDDI') || name.includes('ソフトバンク')) return '通信';
  if (name.includes('商事') || name.includes('物産') || name.includes('商社')) return '商社';
  if (name.includes('小売') || name.includes('セブン') || name.includes('イオン')) return '小売';
  if (name.includes('製薬') || name.includes('薬品')) return '製薬';
  if (name.includes('食品') || name.includes('飲料')) return '食品';
  
  return 'その他';
}

/**
 * バッチ処理
 */
async function processBatch(companies, batchNumber) {
  console.log(`\n=== バッチ ${batchNumber} 開始 (${companies.length}社) ===`);
  
  const promises = companies.map(async (company) => {
    const result = await fetchRealFinancialData(company);
    
    testResults.summary.totalTested++;
    testResults.summary.totalResponseTime += result.responseTime;
    
    if (result.success) {
      const dataSource = analyzeDataSource(result);
      const roic = calculateROIC(result.data);
      const industry = estimateIndustry(company, result.data);
      
      // 統計更新
      if (dataSource === 'real') {
        testResults.dataQuality.realData++;
      } else if (dataSource === 'estimated') {
        testResults.dataQuality.estimatedData++;
      }
      
      testResults.scaleBreakdown[company.scale]++;
      
      if (roic !== null) {
        testResults.roicAnalysis.calculated++;
        if (roic >= -50 && roic <= 100) {
          testResults.roicAnalysis.validRange++;
        } else {
          testResults.roicAnalysis.extremeValues++;
        }
        
        // 業界別ROIC集計
        if (!testResults.roicAnalysis.byIndustry[industry]) {
          testResults.roicAnalysis.byIndustry[industry] = {
            count: 0,
            totalROIC: 0,
            avgROIC: 0
          };
        }
        testResults.roicAnalysis.byIndustry[industry].count++;
        testResults.roicAnalysis.byIndustry[industry].totalROIC += roic;
      }
      
      testResults.successful.push({
        edinetCode: company.edinetCode,
        companyName: result.data.companyName,
        scale: company.scale,
        industry: industry,
        dataSource: dataSource,
        roic: roic,
        netSales: result.data.netSales,
        responseTime: result.responseTime
      });
      
      testResults.summary.successCount++;
      
      // 進捗表示（100社ごと）
      if (testResults.summary.successCount % 100 === 0) {
        console.log(`✅ 進捗: ${testResults.summary.successCount}社成功`);
      }
      
    } else {
      testResults.failed.push({
        edinetCode: company.edinetCode,
        companyName: company.name,
        error: result.error,
        message: result.message,
        responseTime: result.responseTime
      });
      testResults.summary.failureCount++;
      testResults.dataQuality.errorData++;
    }
  });
  
  await Promise.all(promises);
  
  const successRate = ((testResults.summary.successCount / testResults.summary.totalTested) * 100).toFixed(1);
  console.log(`バッチ ${batchNumber} 完了: 成功率 ${successRate}% (${testResults.summary.successCount}/${testResults.summary.totalTested})`);
}

/**
 * 業界別ROIC平均値計算
 */
function calculateIndustryAverages() {
  Object.keys(testResults.roicAnalysis.byIndustry).forEach(industry => {
    const data = testResults.roicAnalysis.byIndustry[industry];
    data.avgROIC = data.totalROIC / data.count;
  });
}

/**
 * レポート生成
 */
function generateReport() {
  testResults.summary.endTime = new Date();
  testResults.summary.averageResponseTime = testResults.summary.totalResponseTime / testResults.summary.totalTested;
  
  calculateIndustryAverages();
  
  const duration = testResults.summary.endTime - testResults.summary.startTime;
  const successRate = ((testResults.summary.successCount / testResults.summary.totalTested) * 100).toFixed(1);
  
  const report = {
    testInfo: {
      testType: 'EDINET API Real Data Integration Test - 1000 Companies',
      totalCompanies: testResults.summary.totalTested,
      knownCompanies: KNOWN_COMPANIES.length,
      randomCompanies: testResults.summary.totalTested - KNOWN_COMPANIES.length,
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
      realData: testResults.dataQuality.realData,
      estimatedData: testResults.dataQuality.estimatedData,
      errorData: testResults.dataQuality.errorData,
      realDataPercentage: `${((testResults.dataQuality.realData / testResults.summary.totalTested) * 100).toFixed(1)}%`
    },
    roicAnalysis: {
      calculated: testResults.roicAnalysis.calculated,
      validRange: testResults.roicAnalysis.validRange,
      extremeValues: testResults.roicAnalysis.extremeValues,
      calculationRate: `${((testResults.roicAnalysis.calculated / testResults.summary.totalTested) * 100).toFixed(1)}%`,
      byIndustry: testResults.roicAnalysis.byIndustry
    },
    scaleBreakdown: testResults.scaleBreakdown,
    topPerformers: testResults.successful
      .filter(c => c.roic !== null)
      .sort((a, b) => b.roic - a.roic)
      .slice(0, 20),
    largestCompanies: testResults.successful
      .sort((a, b) => b.netSales - a.netSales)
      .slice(0, 20),
    failures: testResults.failed.slice(0, 50) // 最初の50件のみ
  };
  
  return report;
}

/**
 * レポート保存と表示
 */
function saveAndDisplayReport(report) {
  // レポートファイル保存
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(__dirname, `real-edinet-1000-test-report-${timestamp}.json`);
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 詳細レポートを保存: ${reportPath}`);
  
  // サマリー表示
  console.log('\n=== 実際のEDINET API統合テスト結果（1000社） ===');
  console.log(`総テスト企業数: ${report.testInfo.totalCompanies}`);
  console.log(`既知企業: ${report.testInfo.knownCompanies}社`);
  console.log(`ランダム企業: ${report.testInfo.randomCompanies}社`);
  console.log(`成功: ${report.results.successCount} (${report.results.successRate})`);
  console.log(`失敗: ${report.results.failureCount}`);
  console.log(`テスト時間: ${report.testInfo.testDuration}`);
  console.log(`平均応答時間: ${report.testInfo.averageResponseTime}`);
  
  console.log('\n=== データ品質分析 ===');
  console.log(`実財務データ: ${report.dataQuality.realData}社 (${report.dataQuality.realDataPercentage})`);
  console.log(`推定データ: ${report.dataQuality.estimatedData}社`);
  console.log(`エラー: ${report.dataQuality.errorData}社`);
  
  console.log('\n=== 企業規模分布 ===');
  console.log(`大企業: ${report.scaleBreakdown.large}社`);
  console.log(`中企業: ${report.scaleBreakdown.medium}社`);
  console.log(`小企業: ${report.scaleBreakdown.small}社`);
  
  console.log('\n=== ROIC計算分析 ===');
  console.log(`ROIC計算成功: ${report.roicAnalysis.calculated}社 (${report.roicAnalysis.calculationRate})`);
  console.log(`正常範囲内: ${report.roicAnalysis.validRange}社`);
  console.log(`要確認値: ${report.roicAnalysis.extremeValues}社`);
  
  console.log('\n=== 業界別平均ROIC ===');
  Object.entries(report.roicAnalysis.byIndustry)
    .sort((a, b) => b[1].avgROIC - a[1].avgROIC)
    .forEach(([industry, data]) => {
      console.log(`${industry}: ${data.avgROIC.toFixed(2)}% (${data.count}社)`);
    });
  
  console.log('\n=== ROIC上位20社 ===');
  report.topPerformers.forEach((company, index) => {
    console.log(`${index + 1}. ${company.companyName}: ROIC ${company.roic.toFixed(2)}%`);
  });
  
  console.log('\n=== 売上高上位20社 ===');
  report.largestCompanies.forEach((company, index) => {
    const salesTrillion = (company.netSales / 1000000000000).toFixed(1);
    console.log(`${index + 1}. ${company.companyName}: ${salesTrillion}兆円`);
  });
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('🚀 実際のEDINET API統合テスト開始（1000社版）');
  console.log(`対象企業数: ${TOTAL_COMPANIES}`);
  console.log(`既知企業数: ${KNOWN_COMPANIES.length}`);
  console.log(`同時実行数: ${CONCURRENT_REQUESTS}`);
  console.log(`対象年度: ${FISCAL_YEAR}`);
  console.log(`API エンドポイント: ${API_BASE_URL}/edinet/financial-safe`);
  
  // テスト対象企業リストを生成
  console.log('\n📋 テスト対象企業リスト生成中...');
  const testCompanies = generateTestCompanies();
  console.log(`✅ ${testCompanies.length}社のテスト対象企業を準備完了`);
  
  // バッチに分割
  const batches = [];
  for (let i = 0; i < testCompanies.length; i += CONCURRENT_REQUESTS) {
    batches.push(testCompanies.slice(i, i + CONCURRENT_REQUESTS));
  }
  
  console.log(`\n🔄 ${batches.length}バッチに分割して実行`);
  
  // バッチ処理を実行
  for (let i = 0; i < batches.length; i++) {
    await processBatch(batches[i], i + 1);
    
    // 最後のバッチ以外は待機
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }
  
  // レポート生成・保存
  console.log('\n📊 レポート生成中...');
  const report = generateReport();
  saveAndDisplayReport(report);
  
  console.log('\n✅ 実際のEDINET API統合テスト完了（1000社）');
  
  // 結果評価
  const successRate = (testResults.summary.successCount / testResults.summary.totalTested) * 100;
  const realDataRate = (testResults.dataQuality.realData / testResults.summary.totalTested) * 100;
  
  if (successRate >= 95) {
    console.log(`🎉 優秀な結果: 成功率${successRate.toFixed(1)}%, 実データ率${realDataRate.toFixed(1)}%`);
  } else if (successRate >= 80) {
    console.log(`👍 良好な結果: 成功率${successRate.toFixed(1)}%, 実データ率${realDataRate.toFixed(1)}%`);
  } else {
    console.log(`⚠️  要改善: 成功率${successRate.toFixed(1)}%, 実データ率${realDataRate.toFixed(1)}%`);
  }
}

// スクリプト実行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 実EDINET統合テスト（1000社）エラー:', error);
    process.exit(1);
  });
}

module.exports = { main };