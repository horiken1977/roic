const https = require('https');
const fs = require('fs');

/**
 * トヨタ自動車での再設計版API実際テスト
 */
async function testToyotaRedesigned() {
  console.log('🧪 トヨタ自動車 再設計版API 実際テスト');
  console.log('='.repeat(60));
  
  const testCases = [
    {
      name: '通常モード（データ取得）',
      url: '/api/edinet/real-financial?edinetCode=E02144&fiscalYear=2024',
      description: '再設計版での正確な2024年3月期データ取得'
    },
    {
      name: 'デバッグモード（構造解析）',
      url: '/api/edinet/real-financial?edinetCode=E02144&fiscalYear=2024&debug=true',
      description: '再設計版でのXBRL構造詳細解析'
    }
  ];
  
  const results = {};
  
  for (const testCase of testCases) {
    console.log(`\\n🧪 ${testCase.name} テスト実行中...`);
    console.log(`📋 ${testCase.description}`);
    
    try {
      // Vercel APIエンドポイントに実際にリクエスト
      const result = await makeAPIRequest(testCase.url);
      
      if (result.success) {
        console.log(`✅ ${testCase.name} 成功`);
        
        if (testCase.name.includes('通常モード')) {
          // 通常モードの結果解析
          const data = result.data;
          
          console.log('\\n📊 取得データサマリー:');
          console.log(`- 企業名: ${data.companyName}`);
          console.log(`- 対象期間: ${data.fiscalPeriod}`);
          console.log(`- 期間終了: ${data.periodEnd}`);
          console.log(`- データソース: ${data.dataSource}`);
          console.log(`- 抽出方法: ${data.extractionMethod}`);
          
          console.log('\\n💰 財務データ詳細:');
          console.log(`- 売上高: ${(data.netSales / 1000000000000).toFixed(2)}兆円`);
          console.log(`- 営業利益: ${(data.operatingIncome / 1000000000000).toFixed(2)}兆円`);
          console.log(`- 総資産: ${(data.totalAssets / 1000000000000).toFixed(2)}兆円`);
          console.log(`- 現金: ${(data.cashAndEquivalents / 1000000000000).toFixed(2)}兆円`);
          console.log(`- 株主資本: ${(data.shareholdersEquity / 1000000000000).toFixed(2)}兆円`);
          console.log(`- 有利子負債: ${(data.interestBearingDebt / 1000000000000).toFixed(2)}兆円`);
          console.log(`- 税率: ${(data.taxRate * 100).toFixed(2)}%`);
          
          console.log('\\n📈 品質チェック結果:');
          console.log(`- スコア: ${data.qualityCheck?.score}`);
          console.log(`- 品質: ${data.qualityCheck?.quality}`);
          
          // 旧版との比較
          console.log('\\n🔄 旧版との予想比較:');
          console.log(`- 総資産改善: 62.3兆円 → ${(data.totalAssets / 1000000000000).toFixed(2)}兆円`);
          
          const oldTotalAssets = 62267140000000;
          const improvement = ((data.totalAssets - oldTotalAssets) / oldTotalAssets * 100).toFixed(2);
          console.log(`- 改善率: ${improvement}%`);
          
          // ROIC影響計算
          const newROIC = (data.operatingIncome / data.netSales) * (data.netSales / data.totalAssets) * 100;
          console.log(`- 新ROIC: ${newROIC.toFixed(2)}%`);
          
          // 有価証券報告書との比較
          console.log('\\n📋 有価証券報告書期待値との比較:');
          const expectedTotalAssets = 90114296000000; // 90,114,296百万円
          const accuracy = ((Math.abs(data.totalAssets - expectedTotalAssets) / expectedTotalAssets) * 100).toFixed(2);
          console.log(`- 総資産期待値: 90.11兆円`);
          console.log(`- API取得値: ${(data.totalAssets / 1000000000000).toFixed(2)}兆円`);
          console.log(`- 差異: ${accuracy}%`);
          
          if (accuracy < 5) {
            console.log(`✅ 優良（±5%以内）`);
          } else if (accuracy < 10) {
            console.log(`⚠️ 許容範囲（±10%以内）`);
          } else {
            console.log(`❌ 要調査（±10%超）`);
          }
          
          results[testCase.name] = {
            success: true,
            data: data,
            improvements: {
              totalAssetsImprovement: improvement,
              newROIC: newROIC,
              accuracyVsExpected: accuracy
            }
          };
          
        } else if (testCase.name.includes('デバッグモード')) {
          // デバッグモードの結果解析
          const debug = result.debug;
          
          console.log('\\n🔍 XBRL構造詳細:');
          console.log(`- 再設計版: ${debug.redesignedVersion}`);
          console.log(`- XBRL要素数: ${debug.xbrlStructure?.xbrlChildCount}`);
          console.log(`- コンテキスト数: ${debug.contexts?.total}`);
          console.log(`- ファクト数: ${debug.facts?.total}`);
          console.log(`- Summary要素数: ${debug.facts?.summaryElementsFound}`);
          console.log(`- IFRS要素数: ${debug.facts?.ifrsElementsFound}`);
          
          console.log('\\n🛠️ 設計改善点:');
          console.log(`- Summary要素除外: ${debug.designImprovements?.summaryElementsExcluded}`);
          console.log(`- 厳格コンテキストマッチング: ${debug.designImprovements?.strictContextMatching}`);
          console.log(`- フォールバック処理なし: ${debug.designImprovements?.noFallbackLogic}`);
          console.log(`- 明確エラーハンドリング: ${debug.designImprovements?.explicitErrorHandling}`);
          
          console.log('\\n📋 利用可能コンテキスト（上位10件）:');
          if (debug.contexts?.detailedContexts) {
            Object.entries(debug.contexts.detailedContexts).forEach(([id, period]) => {
              console.log(`- ${id}: ${period}`);
            });
          }
          
          results[testCase.name] = {
            success: true,
            debug: debug
          };
        }
        
      } else {
        console.log(`❌ ${testCase.name} 失敗`);
        console.log(`エラー: ${result.error}`);
        console.log(`メッセージ: ${result.message}`);
        
        results[testCase.name] = {
          success: false,
          error: result.error,
          message: result.message
        };
      }
      
    } catch (error) {
      console.log(`❌ ${testCase.name} 例外エラー`);
      console.log(`例外: ${error.message}`);
      
      results[testCase.name] = {
        success: false,
        error: 'EXCEPTION',
        message: error.message
      };
    }
  }
  
  // 結果サマリー
  console.log('\\n📊 テスト結果サマリー:');
  console.log('='.repeat(40));
  
  let successCount = 0;
  let totalCount = 0;
  
  Object.entries(results).forEach(([testName, result]) => {
    totalCount++;
    if (result.success) {
      successCount++;
      console.log(`✅ ${testName}: 成功`);
    } else {
      console.log(`❌ ${testName}: 失敗 (${result.error})`);
    }
  });
  
  console.log(`\\n🎯 成功率: ${successCount}/${totalCount} (${((successCount/totalCount)*100).toFixed(1)}%)`);
  
  // 主要改善点の確認
  if (results['通常モード（データ取得）']?.success) {
    const improvements = results['通常モード（データ取得）'].improvements;
    console.log('\\n🚀 主要改善点:');
    console.log(`- 総資産改善率: ${improvements.totalAssetsImprovement}%`);
    console.log(`- 新ROIC: ${improvements.newROIC.toFixed(2)}%`);
    console.log(`- 有報との差異: ${improvements.accuracyVsExpected}%`);
    
    if (parseFloat(improvements.totalAssetsImprovement) > 20) {
      console.log('🎉 総資産データが大幅に改善されました！');
    }
    
    if (parseFloat(improvements.accuracyVsExpected) < 10) {
      console.log('🎉 有価証券報告書との差異が許容範囲内です！');
    }
  }
  
  // 結果をファイルに保存
  const testResult = {
    テスト日時: new Date().toISOString(),
    テスト対象: 'トヨタ自動車（E02144）2024年3月期',
    再設計版API: true,
    結果: results,
    成功率: `${successCount}/${totalCount}`,
    主要改善: results['通常モード（データ取得）']?.improvements
  };
  
  fs.writeFileSync('トヨタ再設計版テスト結果_2025-07-07.json', JSON.stringify(testResult, null, 2), 'utf8');
  
  return testResult;
}

/**
 * 実際のAPIリクエスト実行
 */
function makeAPIRequest(path) {
  return new Promise((resolve, reject) => {
    // Vercel本番環境のURL
    const hostname = 'roic-horikens-projects.vercel.app';
    const url = `https://${hostname}${path}`;
    
    console.log(`🌐 API呼び出し: ${url}`);
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          reject(new Error(`JSON解析エラー: ${error.message}`));
        }
      });
      
    }).on('error', (error) => {
      reject(new Error(`リクエストエラー: ${error.message}`));
    });
  });
}

// 実行
testToyotaRedesigned().then(result => {
  console.log('\\n💾 テスト結果保存: トヨタ再設計版テスト結果_2025-07-07.json');
  console.log('\\n🎉 再設計版API実地テスト完了！');
  
  if (result.成功率 === '2/2') {
    console.log('\\n✅ 全テストケース成功！再設計版APIが正常に動作しています');
  } else {
    console.log('\\n⚠️ 一部テストケースで問題があります。結果を確認してください');
  }
}).catch(error => {
  console.error('\\n❌ テスト実行中にエラーが発生しました:', error.message);
});