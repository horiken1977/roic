const https = require('https');
const fs = require('fs');

/**
 * API詳細デバッグテスト
 */
async function testApiDebug() {
  console.log('🔍 API詳細デバッグテスト開始');
  console.log('=' .repeat(60));
  
  try {
    // シンプルなテストケース
    const testCases = [
      {
        name: 'トヨタ・デバッグモード',
        url: 'https://roic-horikens-projects.vercel.app/api/edinet/real-financial?edinetCode=E02144&fiscalYear=2024&debug=true'
      },
      {
        name: 'トヨタ・通常モード',
        url: 'https://roic-horikens-projects.vercel.app/api/edinet/real-financial?edinetCode=E02144&fiscalYear=2024'
      },
      {
        name: '代替API（simple-financial）',
        url: 'https://roic-horikens-projects.vercel.app/api/edinet/simple-financial?edinetCode=E02144&fiscalYear=2024'
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n📡 ${testCase.name} テスト中...`);
      console.log(`URL: ${testCase.url}`);
      
      const response = await makeApiCall(testCase.url);
      
      console.log(`ステータス: ${response.status}`);
      
      if (response.status === 200) {
        console.log('✅ API呼び出し成功');
        
        const data = response.data;
        console.log('レスポンス構造:');
        console.log('- companyName:', data.companyName || 'N/A');
        console.log('- edinetCode:', data.edinetCode || 'N/A');
        console.log('- netSales:', data.netSales || 'N/A');
        console.log('- operatingIncome:', data.operatingIncome || 'N/A');
        console.log('- totalAssets:', data.totalAssets || 'N/A');
        console.log('- cashAndEquivalents:', data.cashAndEquivalents || 'N/A');
        console.log('- dataSource:', data.dataSource || 'N/A');
        
        // デバッグ情報があるかチェック
        if (data.debug) {
          console.log('🔍 デバッグ情報あり:');
          console.log('- コンテキスト数:', data.debug.contexts?.total || 'N/A');
          console.log('- ファクト数:', data.debug.facts?.total || 'N/A');
          console.log('- XBRLファイル要素数:', data.debug.xbrlStructure?.xbrlChildCount || 'N/A');
          
          // 抽出テスト結果
          if (data.debug.extractionTest) {
            console.log('📊 抽出テスト結果:');
            console.log('- 売上高マッチ数:', data.debug.extractionTest.netSales?.matches?.length || 0);
            console.log('- 営業利益マッチ数:', data.debug.extractionTest.operatingIncome?.matches?.length || 0);
            console.log('- 総資産マッチ数:', data.debug.extractionTest.totalAssets?.matches?.length || 0);
          }
        }
        
        // 結果保存
        const fileName = `api_debug_${testCase.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
        fs.writeFileSync(fileName, JSON.stringify(data, null, 2), 'utf8');
        console.log(`💾 結果保存: ${fileName}`);
        
        // 成功したAPIがあればそれを利用
        if (data.netSales || data.operatingIncome || data.totalAssets) {
          console.log('🎉 データ取得成功！このAPIを使用します');
          return { success: true, data: data, apiUrl: testCase.url };
        }
        
      } else {
        console.log('❌ API呼び出し失敗');
        console.log('エラー:', response.data);
      }
      
      console.log('-'.repeat(50));
    }
    
    console.log('\n❌ すべてのAPIテストが失敗しました');
    return { success: false };
    
  } catch (error) {
    console.error('❌ デバッグテスト実行エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * API呼び出し共通関数
 */
function makeApiCall(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: res.statusCode === 200 ? JSON.parse(data) : data
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    }).on('error', reject);
  });
}

/**
 * 代替手段: 手動でXBRLデータから抽出
 */
async function manualDataExtraction() {
  console.log('\n🔧 手動データ抽出を試行中...');
  
  // デバッグ情報ファイルから手動抽出
  try {
    const debugFile = 'toyota_fixed_data_2025-07-06.json';
    if (fs.existsSync(debugFile)) {
      const debugData = JSON.parse(fs.readFileSync(debugFile, 'utf8'));
      const factData = debugData.デバッグ情報?.facts;
      
      if (factData) {
        console.log('📊 手動抽出結果:');
        
        // 売上高
        const revenueElement = factData.salesRelated?.find(e => e.key === 'TotalNetRevenuesIFRS');
        if (revenueElement) {
          console.log('売上高 (TotalNetRevenuesIFRS):', formatCurrency(parseFloat(revenueElement.sampleValue)));
        }
        
        // 営業利益
        const opProfitElement = factData.salesRelated?.find(e => e.key === 'OperatingProfitLossIFRS');
        if (opProfitElement) {
          console.log('営業利益 (OperatingProfitLossIFRS):', formatCurrency(parseFloat(opProfitElement.sampleValue)));
        }
        
        // 総資産
        const assetsElement = factData.assetRelated?.find(e => e.key === 'TotalAssetsIFRSSummaryOfBusinessResults');
        if (assetsElement) {
          console.log('総資産 (TotalAssetsIFRSSummaryOfBusinessResults):', formatCurrency(parseFloat(assetsElement.sampleValue)));
        }
        
        // 手動抽出データをファイルに保存
        const manualData = {
          企業名: 'トヨタ自動車株式会社',\n          EDINETコード: 'E02144',\n          決算年度: 2024,\n          手動抽出データ: {\n            売上高: revenueElement ? parseFloat(revenueElement.sampleValue) : null,\n            営業利益: opProfitElement ? parseFloat(opProfitElement.sampleValue) : null,\n            総資産: assetsElement ? parseFloat(assetsElement.sampleValue) : null\n          },\n          データソース: '手動XBRL抽出',\n          抽出日時: new Date().toISOString()\n        };\n        \n        const manualFileName = `toyota_manual_extraction_${new Date().toISOString().split('T')[0]}.json`;\n        fs.writeFileSync(manualFileName, JSON.stringify(manualData, null, 2), 'utf8');\n        console.log(`💾 手動抽出結果保存: ${manualFileName}`);\n        \n        return manualData;\n      }\n    }\n  } catch (error) {\n    console.error('手動抽出エラー:', error.message);\n  }\n  \n  return null;\n}\n\n/**\n * 金額フォーマット\n */\nfunction formatCurrency(value) {\n  if (!value && value !== 0) return 'N/A';\n  if (typeof value === 'string') return value;\n  \n  const oku = value / 100000000;\n  \n  if (Math.abs(oku) >= 10000) {\n    return `${(oku / 10000).toFixed(1)}兆円`;\n  } else if (Math.abs(oku) >= 1) {\n    return `${oku.toFixed(0).toLocaleString()}億円`;\n  } else {\n    const million = value / 1000000;\n    return `${million.toFixed(0).toLocaleString()}百万円`;\n  }\n}\n\n// メイン実行\nasync function main() {\n  console.log('🚀 包括的APIデバッグ＆手動抽出テスト開始');\n  \n  // API デバッグテスト\n  const apiResult = await testApiDebug();\n  \n  // API失敗時は手動抽出を試行\n  if (!apiResult.success) {\n    console.log('\\n🔄 API失敗のため手動抽出を実行中...');\n    const manualResult = await manualDataExtraction();\n    \n    if (manualResult) {\n      console.log('\\n✅ 手動抽出成功！データを取得できました');\n      console.log('最終レポート:');\n      console.log('売上高:', formatCurrency(manualResult.手動抽出データ.売上高));\n      console.log('営業利益:', formatCurrency(manualResult.手動抽出データ.営業利益));\n      console.log('総資産:', formatCurrency(manualResult.手動抽出データ.総資産));\n    } else {\n      console.log('\\n❌ 手動抽出も失敗しました');\n    }\n  } else {\n    console.log('\\n✅ API経由でのデータ取得成功！');\n  }\n}\n\nmain();