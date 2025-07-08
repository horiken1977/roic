#!/usr/bin/env node

/**
 * 修正版APIのトヨタデータテスト
 * Test Fixed Toyota Financial Data
 */

console.log('🧪 修正版APIのトヨタデータテスト開始...');
console.log('期待値:');
console.log('- 現金及び現金同等物: 8,982,404');
console.log('- 株主資本: 36,878,913');
console.log('- 有利子負債: 38,792,879');

// Node.js環境でAPIを直接呼び出し
async function testFixedToyotaAPI() {
  try {
    // APIモジュールを直接インポート
    const apiHandler = require('./api/edinet/real-financial.js');
    
    // 環境変数設定（APIキーが必要な場合）
    if (!process.env.EDINET_API_KEY) {
      console.log('⚠️ EDINET_API_KEY環境変数が未設定のため、モックテストを実行');
      return testWithMockData();
    }
    
    // リクエストオブジェクトをモック
    const mockRequest = {
      method: 'GET',
      query: {
        edinetCode: 'E02144', // トヨタ
        fiscalYear: '2024'
      }
    };
    
    // レスポンスオブジェクトをモック
    let responseData = null;
    const mockResponse = {
      setHeader: () => {},
      status: (code) => ({
        json: (data) => {
          responseData = { statusCode: code, data };
          return mockResponse;
        },
        end: () => mockResponse
      })
    };
    
    console.log('📡 修正版APIを実行中...');
    await apiHandler(mockRequest, mockResponse);
    
    if (responseData && responseData.statusCode === 200) {
      const financialData = responseData.data.data;
      
      console.log('\n✅ 修正版API実行結果:');
      console.log('─'.repeat(60));
      
      const results = {
        companyName: financialData.companyName,
        fiscalYear: financialData.fiscalYear,
        cashAndEquivalents: financialData.cashAndEquivalents,
        shareholdersEquity: financialData.shareholdersEquity,
        interestBearingDebt: financialData.interestBearingDebt,
        totalAssets: financialData.totalAssets,
        netSales: financialData.netSales,
        operatingIncome: financialData.operatingIncome
      };
      
      console.log(`企業名: ${results.companyName}`);
      console.log(`会計年度: ${results.fiscalYear}年3月期`);
      console.log(`現金及び現金同等物: ${results.cashAndEquivalents?.toLocaleString() || 'N/A'}`);
      console.log(`株主資本: ${results.shareholdersEquity?.toLocaleString() || 'N/A'}`);
      console.log(`有利子負債: ${results.interestBearingDebt?.toLocaleString() || 'N/A'}`);
      console.log(`総資産: ${results.totalAssets?.toLocaleString() || 'N/A'}`);
      console.log(`売上高: ${results.netSales?.toLocaleString() || 'N/A'}`);
      console.log(`営業利益: ${results.operatingIncome?.toLocaleString() || 'N/A'}`);
      
      // 期待値との比較
      console.log('\n📊 期待値との比較:');
      console.log('─'.repeat(60));
      
      const expectedValues = {
        cashAndEquivalents: 8982404,
        shareholdersEquity: 36878913,
        interestBearingDebt: 38792879
      };
      
      const comparisons = [
        {
          name: '現金及び現金同等物',
          actual: results.cashAndEquivalents,
          expected: expectedValues.cashAndEquivalents
        },
        {
          name: '株主資本',
          actual: results.shareholdersEquity,
          expected: expectedValues.shareholdersEquity
        },
        {
          name: '有利子負債',
          actual: results.interestBearingDebt,
          expected: expectedValues.interestBearingDebt
        }
      ];
      
      let fixedCount = 0;
      
      comparisons.forEach(comp => {
        const diff = (comp.actual || 0) - comp.expected;
        const percentage = Math.abs(diff / comp.expected * 100);
        const status = percentage < 5 ? '✅ 修正成功' : percentage < 20 ? '⚠️ 改善' : '❌ 要修正';
        
        if (percentage < 5) fixedCount++;
        
        console.log(`${comp.name}:`);
        console.log(`  実際値: ${(comp.actual || 0).toLocaleString()}`);
        console.log(`  期待値: ${comp.expected.toLocaleString()}`);
        console.log(`  差異: ${diff.toLocaleString()} (${percentage.toFixed(2)}%)`);
        console.log(`  状況: ${status}`);
        console.log('');
      });
      
      console.log('🎯 修正結果サマリー:');
      console.log(`修正成功: ${fixedCount}/3 項目`);
      console.log(`修正率: ${(fixedCount/3*100).toFixed(0)}%`);
      
      // 結果をファイルに保存
      const resultData = {
        timestamp: new Date().toISOString(),
        testType: 'fixed_api_toyota_test',
        results,
        expectedValues,
        comparisons: comparisons.map(c => ({
          ...c,
          diff: (c.actual || 0) - c.expected,
          percentage: Math.abs(((c.actual || 0) - c.expected) / c.expected * 100)
        })),
        summary: {
          fixedCount,
          totalItems: 3,
          fixRate: fixedCount/3*100
        }
      };
      
      const fs = require('fs');
      fs.writeFileSync('修正版APIテスト結果_2025-07-07.json', JSON.stringify(resultData, null, 2));
      
      console.log('\n📁 結果を保存: 修正版APIテスト結果_2025-07-07.json');
      
      return resultData;
      
    } else {
      console.error('❌ API実行に失敗:', responseData);
      return null;
    }
    
  } catch (error) {
    console.error('❌ テスト実行中にエラー:', error.message);
    return null;
  }
}

// モックデータを使用したテスト
function testWithMockData() {
  console.log('🧪 モックデータでテスト実行中...');
  
  // 修正版の改良ポイントを確認
  const apiCode = require('fs').readFileSync('./api/edinet/real-financial.js', 'utf8');
  
  const improvements = [
    { check: 'Math.abs(value)', name: 'マイナス値の絶対値変換' },
    { check: 'return null', name: 'エラー投げすぎの修正' },
    { check: 'CashAndDepositsAtEnd', name: '現金検索キーワード拡張' },
    { check: 'TotalShareholdersEquity', name: '株主資本検索キーワード拡張' },
    { check: 'ShortTermBankLoans', name: '有利子負債検索キーワード拡張' }
  ];
  
  console.log('\n🔍 修正内容確認:');
  improvements.forEach(imp => {
    const found = apiCode.includes(imp.check);
    console.log(`${found ? '✅' : '❌'} ${imp.name}: ${found ? '適用済み' : '未適用'}`);
  });
  
  const appliedCount = improvements.filter(imp => apiCode.includes(imp.check)).length;
  console.log(`\n修正適用率: ${appliedCount}/${improvements.length} (${(appliedCount/improvements.length*100).toFixed(0)}%)`);
  
  return {
    mockTest: true,
    improvementsApplied: appliedCount,
    totalImprovements: improvements.length
  };
}

// テスト実行
if (require.main === module) {
  testFixedToyotaAPI();
}

module.exports = { testFixedToyotaAPI };