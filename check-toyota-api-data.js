/**
 * トヨタ自動車の各APIエンドポイントからのレスポンスを確認
 * 実際のデータソースを特定
 */

const axios = require('axios');
const fs = require('fs');

const TOYOTA_EDINET_CODE = 'E02144';
const FISCAL_YEARS = ['2022', '2023', '2024'];

/**
 * 各APIエンドポイントをテスト
 */
async function testAllEndpoints() {
  console.log('🚀 トヨタ自動車 API データ確認開始');
  console.log('==========================================');
  
  const endpoints = [
    {
      name: 'financial',
      url: 'https://roic-horikens-projects.vercel.app/api/edinet/financial'
    },
    {
      name: 'financial-safe',
      url: 'https://roic-horikens-projects.vercel.app/api/edinet/financial-safe'
    },
    {
      name: 'simple-financial',
      url: 'https://roic-horikens-projects.vercel.app/api/edinet/simple-financial'
    },
    {
      name: 'financial-1000',
      url: 'https://roic-horikens-projects.vercel.app/api/edinet/financial-1000'
    }
  ];
  
  const results = {
    timestamp: new Date().toISOString(),
    company: 'トヨタ自動車株式会社',
    edinetCode: TOYOTA_EDINET_CODE,
    apiResponses: {}
  };
  
  for (const endpoint of endpoints) {
    console.log(`\n📡 ${endpoint.name} エンドポイントをテスト中...`);
    results.apiResponses[endpoint.name] = {};
    
    for (const year of FISCAL_YEARS) {
      try {
        const response = await axios.get(endpoint.url, {
          params: {
            edinetCode: TOYOTA_EDINET_CODE,
            fiscalYear: year
          },
          timeout: 10000
        });
        
        const data = response.data;
        
        if (data.success && data.data) {
          const financialData = data.data;
          
          console.log(`✅ ${year}年度データ取得成功`);
          console.log(`   企業名: ${financialData.companyName || '不明'}`);
          console.log(`   売上高: ${(financialData.netSales / 1000000).toFixed(0)}百万円`);
          console.log(`   営業利益: ${(financialData.operatingIncome / 1000000).toFixed(0)}百万円`);
          console.log(`   総資産: ${(financialData.totalAssets / 1000000).toFixed(0)}百万円`);
          console.log(`   データソース: ${financialData.dataSource || data.source || '不明'}`);
          
          results.apiResponses[endpoint.name][year] = {
            success: true,
            companyName: financialData.companyName,
            netSales: financialData.netSales,
            operatingIncome: financialData.operatingIncome,
            totalAssets: financialData.totalAssets,
            cashAndEquivalents: financialData.cashAndEquivalents,
            shareholdersEquity: financialData.shareholdersEquity,
            interestBearingDebt: financialData.interestBearingDebt,
            taxRate: financialData.taxRate,
            dataSource: financialData.dataSource || data.source,
            estimationNote: financialData.estimationNote,
            rawResponse: data
          };
        } else {
          throw new Error(data.error || 'データ取得失敗');
        }
        
      } catch (error) {
        console.log(`❌ ${year}年度エラー: ${error.message}`);
        results.apiResponses[endpoint.name][year] = {
          success: false,
          error: error.message
        };
      }
      
      // API レート制限対策
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // 結果をファイルに保存
  const fileName = `toyota-api-data-comparison-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(fileName, JSON.stringify(results, null, 2), 'utf8');
  
  console.log(`\n📄 結果保存完了: ${fileName}`);
  
  // 比較表を作成
  console.log('\n📊 データ比較表（売上高）:');
  console.log('年度 | financial | financial-safe | simple-financial | financial-1000');
  console.log('-----|-----------|----------------|------------------|---------------');
  
  for (const year of FISCAL_YEARS) {
    const row = [year];
    for (const endpoint of endpoints) {
      const data = results.apiResponses[endpoint.name][year];
      if (data && data.success) {
        row.push(`${(data.netSales / 1000000).toFixed(0)}百万円`);
      } else {
        row.push('エラー');
      }
    }
    console.log(row.join(' | '));
  }
  
  // CSVファイルも作成
  const csvData = [
    ['エンドポイント', '年度', '企業名', '売上高(百万円)', '営業利益(百万円)', '総資産(百万円)', 'データソース', '備考']
  ];
  
  for (const [endpointName, yearData] of Object.entries(results.apiResponses)) {
    for (const [year, data] of Object.entries(yearData)) {
      if (data.success) {
        csvData.push([
          endpointName,
          year,
          data.companyName || '',
          Math.round(data.netSales / 1000000),
          Math.round(data.operatingIncome / 1000000),
          Math.round(data.totalAssets / 1000000),
          data.dataSource || '',
          data.estimationNote || ''
        ]);
      }
    }
  }
  
  const csvContent = csvData.map(row => row.join(',')).join('\n');
  const csvFileName = `toyota-api-data-${new Date().toISOString().slice(0, 10)}.csv`;
  fs.writeFileSync(csvFileName, csvContent, 'utf8');
  
  console.log(`📄 CSV保存完了: ${csvFileName}`);
  
  return results;
}

// メイン実行
if (require.main === module) {
  testAllEndpoints();
}

module.exports = { testAllEndpoints };