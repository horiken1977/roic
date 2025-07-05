/**
 * 10社の直接ROIC計算テスト
 * EDINETコード直接指定 → 財務データ取得 → ROIC計算
 * 企業検索APIをスキップして直接テスト
 */

const axios = require('axios');
const fs = require('fs');

// 設定
const BASE_URL = 'http://localhost:3001';
const FISCAL_YEAR = '2023';

// テスト結果記録
let testResults = {
  startTime: new Date().toISOString(),
  endTime: null,
  totalCompanies: 0,
  successCount: 0,
  errorCount: 0,
  companies: [],
  errors: [],
  summary: {
    avgResponseTime: 0,
    avgROIC: 0,
    maxROIC: 0,
    minROIC: Infinity
  }
};

/**
 * 最初の10社を取得（EDINETコード付き）
 */
function getFirst10Companies() {
  return [
    { no: 1, companyName: 'トヨタ自動車株式会社', edinetCode: 'E02144' },
    { no: 2, companyName: '本田技研工業株式会社', edinetCode: 'E02142' },
    { no: 3, companyName: '日産自動車株式会社', edinetCode: 'E02362' },
    { no: 4, companyName: 'SUBARU株式会社', edinetCode: 'E03595' },
    { no: 5, companyName: 'スズキ株式会社', edinetCode: 'E03581' },
    { no: 6, companyName: 'マツダ株式会社', edinetCode: 'E03582' },
    { no: 7, companyName: '日野自動車株式会社', edinetCode: 'E03533' },
    { no: 8, companyName: 'いすゞ自動車株式会社', edinetCode: 'E03565' },
    { no: 9, companyName: '豊田自動織機株式会社', edinetCode: 'E03355' },
    { no: 10, companyName: '株式会社デンソー', edinetCode: 'E03116' }
  ];
}

/**
 * 財務データ取得API呼び出し
 */
async function getFinancialData(edinetCode, companyName) {
  const startTime = Date.now();
  
  try {
    console.log(`💰 財務データ取得: ${companyName} (${edinetCode})`);
    
    const response = await axios.get(`${BASE_URL}/api/edinet/financial-1000`, {
      params: {
        edinetCode: edinetCode,
        fiscalYear: FISCAL_YEAR
      },
      timeout: 10000
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.data.success && response.data.data) {
      const data = response.data.data;
      console.log(`✅ 財務データ取得成功: ${data.companyName} - ${responseTime}ms`);
      console.log(`   売上高: ${(data.netSales / 1000000000000).toFixed(1)}兆円`);
      console.log(`   営業利益: ${(data.operatingIncome / 100000000).toFixed(0)}億円`);
      console.log(`   総資産: ${(data.totalAssets / 1000000000000).toFixed(1)}兆円`);
      console.log(`   現金: ${(data.cashAndEquivalents / 1000000000000).toFixed(1)}兆円`);
      console.log(`   株主資本: ${(data.shareholdersEquity / 1000000000000).toFixed(1)}兆円`);
      console.log(`   有利子負債: ${(data.interestBearingDebt / 1000000000000).toFixed(1)}兆円`);
      
      return {
        success: true,
        financialData: data,
        responseTime: responseTime
      };
    } else {
      throw new Error(response.data.error || '財務データが見つかりません');
    }
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`❌ 財務データエラー: ${error.message} - ${responseTime}ms`);
    
    return {
      success: false,
      error: error.message,
      responseTime: responseTime
    };
  }
}

/**
 * ROIC計算（4つの計算方式）
 */
function calculateROIC(financialData) {
  console.log(`🧮 ROIC計算: ${financialData.companyName}`);
  
  const {
    netSales,
    operatingIncome,
    totalAssets,
    cashAndEquivalents,
    shareholdersEquity,
    interestBearingDebt,
    taxRate = 0.3
  } = financialData;
  
  // 1. 基本方式: NOPAT ÷ (総資産 - 現金)
  const nopat = operatingIncome * (1 - taxRate);
  const investedCapitalBasic = totalAssets - cashAndEquivalents;
  const roicBasic = investedCapitalBasic > 0 ? (nopat / investedCapitalBasic * 100) : 0;
  
  // 2. 詳細方式: NOPAT ÷ (株主資本 + 有利子負債)
  const investedCapitalDetailed = shareholdersEquity + interestBearingDebt;
  const roicDetailed = investedCapitalDetailed > 0 ? (nopat / investedCapitalDetailed * 100) : 0;
  
  // 3. アセット方式: NOPAT ÷ 総資産
  const roicAsset = totalAssets > 0 ? (nopat / totalAssets * 100) : 0;
  
  // 4. 修正方式: 営業利益率 × 資本回転率
  const operatingMargin = netSales > 0 ? (operatingIncome / netSales * 100) : 0;
  const assetTurnover = totalAssets > 0 ? (netSales / totalAssets) : 0;
  const roicModified = operatingMargin * assetTurnover * (1 - taxRate);
  
  const roicResults = {
    basic: Math.round(roicBasic * 100) / 100,
    detailed: Math.round(roicDetailed * 100) / 100,
    asset: Math.round(roicAsset * 100) / 100,
    modified: Math.round(roicModified * 100) / 100,
    nopat: Math.round(nopat),
    investedCapitalBasic: Math.round(investedCapitalBasic),
    investedCapitalDetailed: Math.round(investedCapitalDetailed),
    operatingMargin: Math.round(operatingMargin * 100) / 100,
    assetTurnover: Math.round(assetTurnover * 100) / 100
  };
  
  console.log(`✅ ROIC計算完了:`);
  console.log(`   基本方式: ${roicResults.basic}% (NOPAT: ${(roicResults.nopat/100000000).toFixed(0)}億円 ÷ 投下資本: ${(roicResults.investedCapitalBasic/1000000000000).toFixed(1)}兆円)`);
  console.log(`   詳細方式: ${roicResults.detailed}% (NOPAT: ${(roicResults.nopat/100000000).toFixed(0)}億円 ÷ 資本: ${(roicResults.investedCapitalDetailed/1000000000000).toFixed(1)}兆円)`);
  console.log(`   資産方式: ${roicResults.asset}% (NOPAT: ${(roicResults.nopat/100000000).toFixed(0)}億円 ÷ 総資産: ${(totalAssets/1000000000000).toFixed(1)}兆円)`);
  console.log(`   修正方式: ${roicResults.modified}% (営業利益率: ${roicResults.operatingMargin}% × 回転率: ${roicResults.assetTurnover}回 × (1-税率))`);
  
  return roicResults;
}

/**
 * 単一企業の完全テスト
 */
async function testSingleCompany(company, index) {
  const companyStartTime = Date.now();
  
  console.log(`\n🏢 [${index + 1}/10] ${company.companyName} テスト開始`);
  console.log('=====================================');
  
  const result = {
    no: company.no,
    originalCompanyName: company.companyName,
    originalEdinetCode: company.edinetCode,
    financialData: null,
    roicCalculation: null,
    totalTime: 0,
    status: 'pending',
    errors: []
  };
  
  try {
    // 1. 財務データ取得
    const financialResult = await getFinancialData(company.edinetCode, company.companyName);
    if (!financialResult.success) {
      result.errors.push({ step: 'financial', error: financialResult.error });
      throw new Error(`財務データ取得失敗: ${financialResult.error}`);
    }
    result.financialData = financialResult.financialData;
    
    // 2. ROIC計算
    result.roicCalculation = calculateROIC(result.financialData);
    
    // 3. 結果記録
    result.totalTime = Date.now() - companyStartTime;
    result.status = 'success';
    
    testResults.successCount++;
    testResults.companies.push(result);
    
    // 統計更新
    const mainROIC = result.roicCalculation.basic; // 基本方式を代表値とする
    testResults.summary.maxROIC = Math.max(testResults.summary.maxROIC, mainROIC);
    testResults.summary.minROIC = Math.min(testResults.summary.minROIC, mainROIC);
    
    console.log(`✅ [${index + 1}] ${company.companyName} 完了 (${result.totalTime}ms)`);
    console.log(`   🎯 代表ROIC: ${mainROIC}%`);
    
  } catch (error) {
    result.totalTime = Date.now() - companyStartTime;
    result.status = 'error';
    result.errors.push({ step: 'general', error: error.message });
    
    testResults.errorCount++;
    testResults.errors.push({
      company: company.companyName,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    console.log(`❌ [${index + 1}] ${company.companyName} エラー: ${error.message} (${result.totalTime}ms)`);
  }
  
  return result;
}

/**
 * メインテスト実行
 */
async function runMainTest() {
  console.log('🚀 10社直接ROIC計算テスト開始');
  console.log('==========================================');
  console.log(`📊 対象: 最初の10社（主要自動車メーカー）`);
  console.log(`🎯 API: 財務データ取得 → ROIC計算（企業検索スキップ）`);
  console.log(`📅 会計年度: ${FISCAL_YEAR}`);
  console.log(`🔗 エンドポイント: ${BASE_URL}/api/edinet/financial-1000`);
  console.log('==========================================\n');
  
  try {
    // 1. テスト対象企業取得
    const companies = getFirst10Companies();
    testResults.totalCompanies = companies.length;
    
    // 2. 各企業のテスト実行
    for (let i = 0; i < companies.length; i++) {
      await testSingleCompany(companies[i], i);
      
      // リクエスト間隔（300ms）
      if (i < companies.length - 1) {
        console.log('⏳ 300ms待機...');
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    // 3. 最終結果処理
    testResults.endTime = new Date().toISOString();
    
    // 平均ROIC計算
    if (testResults.successCount > 0) {
      const totalROIC = testResults.companies
        .filter(c => c.status === 'success')
        .reduce((sum, c) => sum + c.roicCalculation.basic, 0);
      testResults.summary.avgROIC = Math.round((totalROIC / testResults.successCount) * 100) / 100;
      
      // 平均レスポンス時間計算
      const totalTime = testResults.companies
        .filter(c => c.status === 'success')
        .reduce((sum, c) => sum + c.totalTime, 0);
      testResults.summary.avgResponseTime = Math.round(totalTime / testResults.successCount);
    }
    
    // 4. 結果表示
    displayResults();
    
    // 5. 結果保存
    await saveResults();
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error);
    testResults.endTime = new Date().toISOString();
    await saveResults();
  }
}

/**
 * 結果表示
 */
function displayResults() {
  const duration = new Date(testResults.endTime) - new Date(testResults.startTime);
  const successRate = (testResults.successCount / testResults.totalCompanies * 100).toFixed(1);
  
  console.log('\n🎯 10社直接ROIC計算テスト完了');
  console.log('==========================================');
  console.log(`📊 総企業数: ${testResults.totalCompanies}社`);
  console.log(`✅ 成功: ${testResults.successCount}社 (${successRate}%)`);
  console.log(`❌ エラー: ${testResults.errorCount}社`);
  console.log(`⏱️  総所要時間: ${(duration / 1000).toFixed(1)}秒`);
  
  if (testResults.successCount > 0) {
    console.log(`📈 平均ROIC: ${testResults.summary.avgROIC}%`);
    console.log(`📈 最大ROIC: ${testResults.summary.maxROIC}%`);
    console.log(`📈 最小ROIC: ${testResults.summary.minROIC}%`);
    console.log(`📈 平均レスポンス時間: ${testResults.summary.avgResponseTime}ms`);
  }
  
  if (testResults.errorCount > 0) {
    console.log('\n❌ エラー詳細:');
    testResults.errors.forEach((error, index) => {
      console.log(`   [${index + 1}] ${error.company}: ${error.error}`);
    });
  }
  
  console.log('\n🏆 成功企業詳細:');
  testResults.companies
    .filter(c => c.status === 'success')
    .forEach((company, index) => {
      const roic = company.roicCalculation;
      console.log(`   [${index + 1}] ${company.financialData.companyName}`);
      console.log(`       基本ROIC: ${roic.basic}% | 詳細: ${roic.detailed}% | 資産: ${roic.asset}% | 修正: ${roic.modified}%`);
      console.log(`       売上: ${(company.financialData.netSales/1000000000000).toFixed(1)}兆円 | 営業利益: ${(company.financialData.operatingIncome/100000000).toFixed(0)}億円`);
      console.log(`       処理時間: ${company.totalTime}ms`);
    });
}

/**
 * 結果保存
 */
async function saveResults() {
  try {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const detailFileName = `test-direct-roic-10-detail-${timestamp}.json`;
    const summaryFileName = `test-direct-roic-10-summary-${timestamp}.json`;
    
    // 詳細結果保存
    fs.writeFileSync(detailFileName, JSON.stringify(testResults, null, 2), 'utf8');
    
    // 要約結果保存（CSVライクな形式も追加）
    const summary = {
      testInfo: {
        startTime: testResults.startTime,
        endTime: testResults.endTime,
        totalCompanies: testResults.totalCompanies,
        successCount: testResults.successCount,
        errorCount: testResults.errorCount,
        successRate: (testResults.successCount / testResults.totalCompanies * 100).toFixed(1) + '%'
      },
      statistics: testResults.summary,
      successfulCompanies: testResults.companies
        .filter(c => c.status === 'success')
        .map(c => ({
          no: c.no,
          companyName: c.financialData.companyName,
          edinetCode: c.originalEdinetCode,
          netSales_trillion: Math.round(c.financialData.netSales / 1000000000000 * 10) / 10,
          operatingIncome_billion: Math.round(c.financialData.operatingIncome / 100000000),
          totalAssets_trillion: Math.round(c.financialData.totalAssets / 1000000000000 * 10) / 10,
          roicBasic: c.roicCalculation.basic,
          roicDetailed: c.roicCalculation.detailed,
          roicAsset: c.roicCalculation.asset,
          roicModified: c.roicCalculation.modified,
          nopat_billion: Math.round(c.roicCalculation.nopat / 100000000),
          operatingMargin: c.roicCalculation.operatingMargin,
          assetTurnover: c.roicCalculation.assetTurnover,
          totalTime: c.totalTime
        })),
      errors: testResults.errors
    };
    
    fs.writeFileSync(summaryFileName, JSON.stringify(summary, null, 2), 'utf8');
    
    console.log(`\n📄 結果保存完了:`);
    console.log(`   詳細結果: ${detailFileName}`);
    console.log(`   要約結果: ${summaryFileName}`);
    
  } catch (error) {
    console.error('❌ 結果保存エラー:', error);
  }
}

// メイン実行
if (require.main === module) {
  runMainTest();
}

module.exports = { runMainTest, testResults };