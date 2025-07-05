/**
 * 10企業ROIC計算テスト
 * 段階1: 最小限の汎用化での動作確認
 */

const https = require('https');

// テスト対象企業（多様な業種・決算期）
const testCompanies = [
  { name: 'トヨタ自動車', code: 'E02144', fiscalEnd: 3 },
  { name: 'ソニーグループ', code: 'E01777', fiscalEnd: 3 },
  { name: '本田技研工業', code: 'E02166', fiscalEnd: 3 },
  { name: '任天堂', code: 'E02367', fiscalEnd: 3 },
  { name: 'ソフトバンクグループ', code: 'E04426', fiscalEnd: 3 },
  { name: 'キーエンス', code: 'E01985', fiscalEnd: 3 },
  { name: '東京エレクトロン', code: 'E02652', fiscalEnd: 3 },
  { name: 'ファーストリテイリング', code: 'E03217', fiscalEnd: 8 },
  { name: 'オリエンタルランド', code: 'E04707', fiscalEnd: 3 },
  { name: '日本電産', code: 'E01975', fiscalEnd: 3 }
];

async function testCompanyData(company, fiscalYear = 2024) {
  return new Promise((resolve) => {
    const url = `https://roic-horikens-projects.vercel.app/api/edinet/real-financial?edinetCode=${company.code}&fiscalYear=${fiscalYear}`;
    
    console.log(`\n📊 ${company.name} (${company.code}) をテスト中...`);
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (result.success && result.data) {
            const financialData = result.data;
            
            // ROIC計算（簡易版）
            const nopat = financialData.operatingIncome * (1 - financialData.taxRate);
            const investedCapital = financialData.totalAssets - financialData.cashAndEquivalents;
            const roic = investedCapital > 0 ? (nopat / investedCapital) * 100 : 0;
            
            resolve({
              success: true,
              company: company.name,
              code: company.code,
              data: {
                売上高: financialData.netSales,
                営業利益: financialData.operatingIncome,
                総資産: financialData.totalAssets,
                現金同等物: financialData.cashAndEquivalents,
                株主資本: financialData.shareholdersEquity,
                有利子負債: financialData.interestBearingDebt,
                税率: financialData.taxRate,
                ROIC: roic.toFixed(2) + '%'
              },
              source: result.data.dataSource
            });
          } else {
            resolve({
              success: false,
              company: company.name,
              code: company.code,
              error: result.error || 'データ取得失敗',
              message: result.message
            });
          }
        } catch (error) {
          resolve({
            success: false,
            company: company.name,
            code: company.code,
            error: 'JSONパースエラー',
            message: error.message
          });
        }
      });
    }).on('error', (error) => {
      resolve({
        success: false,
        company: company.name,
        code: company.code,
        error: 'ネットワークエラー',
        message: error.message
      });
    });
  });
}

async function runTests() {
  console.log('🚀 10企業ROIC計算テスト開始');
  console.log('================================');
  
  const results = [];
  const startTime = Date.now();
  
  // 順次実行（API負荷軽減のため）
  for (const company of testCompanies) {
    const result = await testCompanyData(company);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${result.company}: ROIC = ${result.data.ROIC}`);
      console.log(`   売上高: ${(result.data.売上高 / 1000000000000).toFixed(1)}兆円`);
      console.log(`   営業利益: ${(result.data.営業利益 / 1000000000).toFixed(0)}億円`);
    } else {
      console.log(`❌ ${result.company}: ${result.error}`);
      console.log(`   詳細: ${result.message}`);
    }
    
    // API制限対策（1秒待機）
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const endTime = Date.now();
  const totalTime = ((endTime - startTime) / 1000).toFixed(1);
  
  // サマリー表示
  console.log('\n================================');
  console.log('📊 テスト結果サマリー');
  console.log('================================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ 成功: ${successful.length}/${testCompanies.length}社`);
  console.log(`❌ 失敗: ${failed.length}/${testCompanies.length}社`);
  console.log(`⏱️  実行時間: ${totalTime}秒`);
  
  if (successful.length > 0) {
    console.log('\n🏆 ROIC上位企業:');
    const sortedByROIC = successful
      .sort((a, b) => parseFloat(b.data.ROIC) - parseFloat(a.data.ROIC))
      .slice(0, 5);
    
    sortedByROIC.forEach((result, index) => {
      console.log(`${index + 1}. ${result.company}: ${result.data.ROIC}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n⚠️ エラー詳細:');
    failed.forEach(result => {
      console.log(`- ${result.company}: ${result.error} (${result.message})`);
    });
  }
  
  // 詳細結果をJSONで保存
  const fs = require('fs');
  const outputFile = `test-results-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`\n📄 詳細結果を ${outputFile} に保存しました`);
}

// 実行
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testCompanyData, runTests };