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
      const dataStatus = {
        売上高: {
          値: result.netSales,
          期待値: 48036704000000, // 48.0兆円
          状態: result.netSales ? '✅ 取得成功' : '❌ 取得失敗',
          誤差: result.netSales ? `${((Math.abs(result.netSales - 48036704000000) / 48036704000000) * 100).toFixed(2)}%` : 'N/A'
        },
        営業利益: {
          値: result.operatingIncome,
          期待値: 4795586000000, // 4.8兆円
          状態: result.operatingIncome ? '✅ 取得成功' : '❌ 取得失敗',
          誤差: result.operatingIncome ? `${((Math.abs(result.operatingIncome - 4795586000000) / 4795586000000) * 100).toFixed(2)}%` : 'N/A'
        },
        総資産: {
          値: result.totalAssets,
          期待値: 93601350000000, // 93.6兆円
          状態: result.totalAssets ? '✅ 取得成功' : '❌ 取得失敗',
          誤差: result.totalAssets ? `${((Math.abs(result.totalAssets - 93601350000000) / 93601350000000) * 100).toFixed(2)}%` : 'N/A'
        },
        現金及び現金同等物: {
          値: result.cashAndEquivalents,
          修正前エラー: -134089000000,
          期待値: 8982404000000, // 推定8.98兆円
          状態: result.cashAndEquivalents && result.cashAndEquivalents > 0 ? '✅ 修正成功' : '❌ 修正失敗'
        },
        株主資本: {
          値: result.shareholdersEquity,
          修正前エラー: 0.136,
          期待値: 40000000000000, // 推定40兆円
          状態: result.shareholdersEquity && result.shareholdersEquity > 1000000000000 ? '✅ 修正成功' : '❌ 修正失敗'
        },
        有利子負債: {
          値: result.interestBearingDebt,
          修正前エラー: 9416031000000,
          期待値: 38792879000000, // 推定38.8兆円
          状態: result.interestBearingDebt && result.interestBearingDebt > 20000000000000 ? '✅ 修正成功' : '❌ 修正失敗'
        },
        実効税率: {
          値: result.taxRate,
          修正前エラー: 0.3,
          期待値: 0.27, // 推定27%
          状態: result.taxRate && result.taxRate > 0 && result.taxRate < 1 && result.taxRate !== 0.3 ? '✅ 計算成功' : '❌ 計算失敗'
        }
      };
      
      // 結果表示
      Object.entries(dataStatus).forEach(([key, data]) => {
        console.log(`\n${key}:`);
        console.log(`  取得値: ${formatCurrency(data.値)}`);
        console.log(`  期待値: ${formatCurrency(data.期待値)}`);
        console.log(`  状態: ${data.状態}`);
        if (data.誤差) {
          console.log(`  誤差: ${data.誤差}`);
        }
        if (data.修正前エラー !== undefined) {
          console.log(`  修正前: ${formatCurrency(data.修正前エラー)}`);
        }
      });
      
      // ROIC計算結果
      if (result.roic) {
        console.log('\n📈 ROIC計算結果:');
        console.log('ROIC:', `${result.roic.value.toFixed(2)}%`);
        console.log('NOPAT:', formatCurrency(result.roic.details.nopat));
        console.log('投下資本:', formatCurrency(result.roic.details.investedCapital));
        console.log('計算方式:', result.roic.method);
      }
      
      // 成功率計算
      const successItems = Object.values(dataStatus).filter(item => item.状態.includes('✅')).length;
      const totalItems = Object.keys(dataStatus).length;
      const successRate = (successItems / totalItems * 100).toFixed(1);
      
      console.log('\n🎯 修正効果サマリー:');
      console.log(`成功項目: ${successItems}/${totalItems}`);
      console.log(`成功率: ${successRate}%`);
      
      // 完全なテスト結果を保存
      const testResult = {
        テスト実行日時: new Date().toISOString(),
        テスト種別: '技術的課題修正版',
        企業情報: {
          企業名: result.companyName,
          EDINETコード: result.edinetCode,
          決算年度: result.fiscalYear
        },
        修正前後比較: dataStatus,
        ROIC計算: result.roic,
        成功率: {
          成功項目数: successItems,
          総項目数: totalItems,
          成功率: `${successRate}%`
        },
        API応答: {
          ステータス: response.status,
          データソース: result.dataSource,
          最終更新: result.lastUpdated
        }
      };
      
      // ファイル保存
      const fileName = `toyota_technical_fix_${new Date().toISOString().split('T')[0]}.json`;
      fs.writeFileSync(fileName, JSON.stringify(testResult, null, 2), 'utf8');
      console.log(`\n💾 テスト結果保存: ${fileName}`);
      
      // CSV保存
      const csvData = generateComparisonCSV(dataStatus, successRate);
      const csvFileName = `toyota_technical_fix_${new Date().toISOString().split('T')[0]}.csv`;
      fs.writeFileSync(csvFileName, csvData, 'utf8');
      console.log(`💾 CSV結果保存: ${csvFileName}`);
      
      // 成功判定
      if (successRate >= 70) {
        console.log('\n🎉 技術的課題修正成功！');
      } else if (successRate >= 30) {
        console.log('\n⚠️ 部分的修正成功、さらなる調整が必要');
      } else {
        console.log('\n❌ 修正失敗、根本的な見直しが必要');
      }
      
    } else {
      console.log('❌ APIエラー:', response.data);
    }
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error);
  }
}

/**
 * 金額フォーマット
 */
function formatCurrency(value) {
  if (!value && value !== 0) return 'N/A';
  if (typeof value === 'string') return value;
  
  // 億円単位に変換
  const oku = value / 100000000;
  
  if (Math.abs(oku) >= 10000) {
    // 兆円単位
    return `${(oku / 10000).toFixed(1)}兆円`;
  } else if (Math.abs(oku) >= 1) {
    return `${oku.toFixed(0).toLocaleString()}億円`;
  } else {
    // 百万円単位
    const million = value / 1000000;
    return `${million.toFixed(0).toLocaleString()}百万円`;
  }
}

/**
 * 比較CSV生成
 */
function generateComparisonCSV(dataStatus, successRate) {
  const rows = [
    ['項目', '修正前エラー', '取得値', '期待値', '誤差', '状態'],
    ...Object.entries(dataStatus).map(([key, data]) => [
      key,
      data.修正前エラー !== undefined ? formatCurrency(data.修正前エラー) : '',
      formatCurrency(data.値),
      formatCurrency(data.期待値),
      data.誤差 || '',
      data.状態
    ]),
    ['', '', '', '', '', ''],
    ['成功率', '', successRate + '%', '100%', '', successRate >= 70 ? '✅ 成功' : '❌ 失敗']
  ];
  
  return rows.map(row => row.join(',')).join('\n');
}

// 実行
testTechnicalFix();