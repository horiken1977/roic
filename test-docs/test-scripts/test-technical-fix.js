const https = require('https');
const fs = require('fs');

// トヨタ自動車のEDINETコード
const TOYOTA_EDINET = 'E02144';

/**
 * 技術的課題修正版テスト
 */
async function testTechnicalFix() {
  console.log('🔧 技術的課題修正版テスト開始');
  console.log('EDINETコード:', TOYOTA_EDINET);
  console.log('=' .repeat(60));
  
  try {
    // 修正版APIを呼び出し
    const url = `https://roic-horikens-projects.vercel.app/api/edinet/real-financial?edinetCode=${TOYOTA_EDINET}&fiscalYear=2024&debug=true`;
    
    console.log('📡 修正版API呼び出し中...');
    console.log('URL:', url);
    
    const response = await new Promise((resolve, reject) => {
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
    
    console.log('\n📊 APIレスポンス分析:');
    console.log('ステータスコード:', response.status);
    
    if (response.status === 200 && response.data) {
      const result = response.data;
      
      console.log('\n🏢 基本情報:');
      console.log('企業名:', result.companyName || 'N/A');
      console.log('EDINETコード:', result.edinetCode || 'N/A');
      console.log('決算年度:', result.fiscalYear || 'N/A');
      console.log('データソース:', result.dataSource || 'N/A');
      
      console.log('\n💰 財務データ検証:');
      
      // 修正前後の比較
      const dataStatus = {\n        売上高: {\n          値: result.netSales,\n          期待値: 48036704000000, // 48.0兆円\n          状態: result.netSales ? '✅ 取得成功' : '❌ 取得失敗',\n          誤差: result.netSales ? `${((Math.abs(result.netSales - 48036704000000) / 48036704000000) * 100).toFixed(2)}%` : 'N/A'\n        },\n        営業利益: {\n          値: result.operatingIncome,\n          期待値: 4795586000000, // 4.8兆円\n          状態: result.operatingIncome ? '✅ 取得成功' : '❌ 取得失敗',\n          誤差: result.operatingIncome ? `${((Math.abs(result.operatingIncome - 4795586000000) / 4795586000000) * 100).toFixed(2)}%` : 'N/A'\n        },\n        総資産: {\n          値: result.totalAssets,\n          期待値: 93601350000000, // 93.6兆円\n          状態: result.totalAssets ? '✅ 取得成功' : '❌ 取得失敗',\n          誤差: result.totalAssets ? `${((Math.abs(result.totalAssets - 93601350000000) / 93601350000000) * 100).toFixed(2)}%` : 'N/A'\n        },\n        現金及び現金同等物: {\n          値: result.cashAndEquivalents,\n          修正前エラー: -134089000000,\n          期待値: 8982404000000, // 推定8.98兆円\n          状態: result.cashAndEquivalents && result.cashAndEquivalents > 0 ? '✅ 修正成功' : '❌ 修正失敗'\n        },\n        株主資本: {\n          値: result.shareholdersEquity,\n          修正前エラー: 0.136,\n          期待値: 40000000000000, // 推定40兆円\n          状態: result.shareholdersEquity && result.shareholdersEquity > 1000000000000 ? '✅ 修正成功' : '❌ 修正失敗'\n        },\n        有利子負債: {\n          値: result.interestBearingDebt,\n          修正前エラー: 9416031000000,\n          期待値: 38792879000000, // 推定38.8兆円\n          状態: result.interestBearingDebt && result.interestBearingDebt > 20000000000000 ? '✅ 修正成功' : '❌ 修正失敗'\n        },\n        実効税率: {\n          値: result.taxRate,\n          修正前エラー: 0.3,\n          期待値: 0.27, // 推定27%\n          状態: result.taxRate && result.taxRate > 0 && result.taxRate < 1 && result.taxRate !== 0.3 ? '✅ 計算成功' : '❌ 計算失敗'\n        }\n      };\n      \n      // 結果表示\n      Object.entries(dataStatus).forEach(([key, data]) => {\n        console.log(`\\n${key}:`);\n        console.log(`  取得値: ${formatCurrency(data.値)}`);\n        console.log(`  期待値: ${formatCurrency(data.期待値)}`);\n        console.log(`  状態: ${data.状態}`);\n        if (data.誤差) {\n          console.log(`  誤差: ${data.誤差}`);\n        }\n        if (data.修正前エラー !== undefined) {\n          console.log(`  修正前: ${formatCurrency(data.修正前エラー)}`);\n        }\n      });\n      \n      // ROIC計算結果\n      if (result.roic) {\n        console.log('\\n📈 ROIC計算結果:');\n        console.log('ROIC:', `${result.roic.value.toFixed(2)}%`);\n        console.log('NOPAT:', formatCurrency(result.roic.details.nopat));\n        console.log('投下資本:', formatCurrency(result.roic.details.investedCapital));\n        console.log('計算方式:', result.roic.method);\n      }\n      \n      // 成功率計算\n      const successItems = Object.values(dataStatus).filter(item => item.状態.includes('✅')).length;\n      const totalItems = Object.keys(dataStatus).length;\n      const successRate = (successItems / totalItems * 100).toFixed(1);\n      \n      console.log('\\n🎯 修正効果サマリー:');\n      console.log(`成功項目: ${successItems}/${totalItems}`);\n      console.log(`成功率: ${successRate}%`);\n      \n      // 完全なテスト結果を保存\n      const testResult = {\n        テスト実行日時: new Date().toISOString(),\n        テスト種別: '技術的課題修正版',\n        企業情報: {\n          企業名: result.companyName,\n          EDINETコード: result.edinetCode,\n          決算年度: result.fiscalYear\n        },\n        修正前後比較: dataStatus,\n        ROIC計算: result.roic,\n        成功率: {\n          成功項目数: successItems,\n          総項目数: totalItems,\n          成功率: `${successRate}%`\n        },\n        API応答: {\n          ステータス: response.status,\n          データソース: result.dataSource,\n          最終更新: result.lastUpdated\n        }\n      };\n      \n      // ファイル保存\n      const fileName = `toyota_technical_fix_${new Date().toISOString().split('T')[0]}.json`;\n      fs.writeFileSync(fileName, JSON.stringify(testResult, null, 2), 'utf8');\n      console.log(`\\n💾 テスト結果保存: ${fileName}`);\n      \n      // CSV保存\n      const csvData = generateComparisonCSV(dataStatus, successRate);\n      const csvFileName = `toyota_technical_fix_${new Date().toISOString().split('T')[0]}.csv`;\n      fs.writeFileSync(csvFileName, csvData, 'utf8');\n      console.log(`💾 CSV結果保存: ${csvFileName}`);\n      \n      // 成功判定\n      if (successRate >= 70) {\n        console.log('\\n🎉 技術的課題修正成功！');\n      } else if (successRate >= 30) {\n        console.log('\\n⚠️ 部分的修正成功、さらなる調整が必要');\n      } else {\n        console.log('\\n❌ 修正失敗、根本的な見直しが必要');\n      }\n      \n    } else {\n      console.log('❌ APIエラー:', response.data);\n    }\n    \n  } catch (error) {\n    console.error('❌ テスト実行エラー:', error);\n  }\n}\n\n/**\n * 金額フォーマット\n */\nfunction formatCurrency(value) {\n  if (!value && value !== 0) return 'N/A';\n  if (typeof value === 'string') return value;\n  \n  // 億円単位に変換\n  const oku = value / 100000000;\n  \n  if (Math.abs(oku) >= 10000) {\n    // 兆円単位\n    return `${(oku / 10000).toFixed(1)}兆円`;\n  } else if (Math.abs(oku) >= 1) {\n    return `${oku.toFixed(0).toLocaleString()}億円`;\n  } else {\n    // 百万円単位\n    const million = value / 1000000;\n    return `${million.toFixed(0).toLocaleString()}百万円`;\n  }\n}\n\n/**\n * 比較CSV生成\n */\nfunction generateComparisonCSV(dataStatus, successRate) {\n  const rows = [\n    ['項目', '修正前エラー', '取得値', '期待値', '誤差', '状態'],\n    ...Object.entries(dataStatus).map(([key, data]) => [\n      key,\n      data.修正前エラー !== undefined ? formatCurrency(data.修正前エラー) : '',\n      formatCurrency(data.値),\n      formatCurrency(data.期待値),\n      data.誤差 || '',\n      data.状態\n    ]),\n    ['', '', '', '', '', ''],\n    ['成功率', '', successRate + '%', '100%', '', successRate >= 70 ? '✅ 成功' : '❌ 失敗']\n  ];\n  \n  return rows.map(row => row.join(',')).join('\\n');\n}\n\n// 実行\ntestTechnicalFix();