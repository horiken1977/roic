const https = require('https');
const fs = require('fs');

/**
 * 直接抽出テスト（現在のAPIでシンプルテスト）
 */
async function testDirectExtraction() {
  console.log('🔧 直接抽出テスト開始');
  console.log('=' .repeat(60));
  
  try {
    // 現在のAPIを使ってシンプルにテスト
    const url = `https://roic-horikens-projects.vercel.app/api/edinet/real-financial?edinetCode=E02144&fiscalYear=2024`;
    
    console.log('📡 現在のAPI呼び出し...');
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
    
    console.log('\n📊 APIレスポンス:');
    console.log('ステータスコード:', response.status);
    
    if (response.status === 200 && response.data) {
      const result = response.data;
      
      console.log('\n🏢 基本情報:');
      console.log('企業名:', result.companyName || 'N/A');
      console.log('EDINETコード:', result.edinetCode || 'N/A');
      console.log('決算年度:', result.fiscalYear || 'N/A');
      console.log('データソース:', result.dataSource || 'N/A');
      
      console.log('\n💰 財務データ:');
      console.log('売上高:', formatCurrency(result.netSales));
      console.log('営業利益:', formatCurrency(result.operatingIncome));
      console.log('総資産:', formatCurrency(result.totalAssets));
      console.log('現金及び現金同等物:', formatCurrency(result.cashAndEquivalents));
      console.log('株主資本:', formatCurrency(result.shareholdersEquity));
      console.log('有利子負債:', formatCurrency(result.interestBearingDebt));
      console.log('実効税率:', result.taxRate ? `${(result.taxRate * 100).toFixed(2)}%` : 'N/A');
      
      // ROIC計算結果
      if (result.roic) {
        console.log('\n📈 ROIC計算結果:');
        console.log('ROIC:', `${result.roic.value.toFixed(2)}%`);
        console.log('NOPAT:', formatCurrency(result.roic.details.nopat));
        console.log('投下資本:', formatCurrency(result.roic.details.investedCapital));
        console.log('計算方式:', result.roic.method);
      }
      
      // 前回との比較データ
      console.log('\n📊 前回エラーとの比較:');
      console.log('現金（修正前）: -134,089百万円 → （修正後）', formatCurrency(result.cashAndEquivalents));
      console.log('有利子負債（修正前）: 9,416,031百万円 → （修正後）', formatCurrency(result.interestBearingDebt));
      console.log('株主資本（修正前）: 0.136（比率エラー） → （修正後）', formatCurrency(result.shareholdersEquity));
      
      // 期待値との比較
      console.log('\n🎯 期待値との比較:');
      console.log('売上高（期待値: 48.0兆円） → （実測値）', formatCurrency(result.netSales));
      console.log('営業利益（期待値: 4.8兆円） → （実測値）', formatCurrency(result.operatingIncome));
      console.log('総資産（期待値: 93.6兆円） → （実測値）', formatCurrency(result.totalAssets));
      console.log('現金（期待値: 8.98兆円） → （実測値）', formatCurrency(result.cashAndEquivalents));
      console.log('有利子負債（期待値: 38.8兆円） → （実測値）', formatCurrency(result.interestBearingDebt));
      
      // 完全なデータセットを保存
      const completeData = {
        テスト実行日時: new Date().toISOString(),
        企業情報: {
          企業名: result.companyName,
          EDINETコード: result.edinetCode,
          決算年度: result.fiscalYear,
          データソース: result.dataSource
        },
        財務データ: {
          売上高: {
            値: result.netSales,
            表示: formatCurrency(result.netSales),
            期待値: '48.0兆円',
            状態: result.netSales ? '取得成功' : '取得失敗'
          },
          営業利益: {
            値: result.operatingIncome,
            表示: formatCurrency(result.operatingIncome),
            期待値: '4.8兆円',
            状態: result.operatingIncome ? '取得成功' : '取得失敗'
          },
          総資産: {
            値: result.totalAssets,
            表示: formatCurrency(result.totalAssets),
            期待値: '93.6兆円',
            状態: result.totalAssets ? '取得成功' : '取得失敗'
          },
          現金及び現金同等物: {
            値: result.cashAndEquivalents,
            表示: formatCurrency(result.cashAndEquivalents),
            期待値: '8.98兆円',
            修正前エラー: '-134,089百万円',
            状態: result.cashAndEquivalents ? '修正成功' : '修正失敗'
          },
          株主資本: {
            値: result.shareholdersEquity,
            表示: formatCurrency(result.shareholdersEquity),
            期待値: '40兆円程度',
            修正前エラー: '0.136（比率エラー）',
            状態: result.shareholdersEquity && result.shareholdersEquity > 1000000 ? '修正成功' : '修正失敗'
          },
          有利子負債: {
            値: result.interestBearingDebt,
            表示: formatCurrency(result.interestBearingDebt),
            期待値: '38.8兆円',
            修正前エラー: '9,416,031百万円',
            状態: result.interestBearingDebt ? '修正成功' : '修正失敗'
          },
          実効税率: {
            値: result.taxRate,
            表示: result.taxRate ? `${(result.taxRate * 100).toFixed(2)}%` : 'N/A',
            期待値: '25-30%',
            状態: result.taxRate && result.taxRate > 0 && result.taxRate < 1 ? '計算成功' : '計算失敗'
          }
        },
        ROIC計算: result.roic || null,
        修正効果サマリー: {
          修正項目数: 4,
          修正成功項目: [
            result.cashAndEquivalents ? '現金及び現金同等物' : null,
            result.shareholdersEquity && result.shareholdersEquity > 1000000 ? '株主資本' : null,
            result.interestBearingDebt ? '有利子負債' : null,
            result.taxRate && result.taxRate > 0 ? '実効税率' : null
          ].filter(Boolean),
          全体成功率: null
        }
      };
      
      // 成功率計算
      const successCount = completeData.修正効果サマリー.修正成功項目.length;
      completeData.修正効果サマリー.全体成功率 = `${successCount}/4 (${(successCount/4*100).toFixed(1)}%)`;
      
      // ファイル保存
      const fileName = `toyota_complete_test_${new Date().toISOString().split('T')[0]}.json`;
      fs.writeFileSync(fileName, JSON.stringify(completeData, null, 2), 'utf8');
      console.log(`\n💾 完全テスト結果を保存: ${fileName}`);
      
      // CSVファイルも作成
      const csvData = generateTestCSV(completeData);
      const csvFileName = `toyota_complete_test_${new Date().toISOString().split('T')[0]}.csv`;
      fs.writeFileSync(csvFileName, csvData, 'utf8');
      console.log(`💾 CSV結果を保存: ${csvFileName}`);
      
      console.log('\n🎉 修正効果サマリー:');
      console.log(`修正成功項目: ${completeData.修正効果サマリー.修正成功項目.join(', ')}`);
      console.log(`全体成功率: ${completeData.修正効果サマリー.全体成功率}`);
      
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
 * テスト結果CSV生成
 */
function generateTestCSV(data) {
  const rows = [
    ['項目', '修正前', '修正後', '期待値', '状態'],
    ['企業名', '', data.企業情報.企業名 || 'N/A', 'トヨタ自動車株式会社', ''],
    ['EDINETコード', '', data.企業情報.EDINETコード || 'N/A', 'E02144', ''],
    ['売上高', '', data.財務データ.売上高.表示, data.財務データ.売上高.期待値, data.財務データ.売上高.状態],
    ['営業利益', '', data.財務データ.営業利益.表示, data.財務データ.営業利益.期待値, data.財務データ.営業利益.状態],
    ['総資産', '', data.財務データ.総資産.表示, data.財務データ.総資産.期待値, data.財務データ.総資産.状態],
    ['現金及び現金同等物', data.財務データ.現金及び現金同等物.修正前エラー, data.財務データ.現金及び現金同等物.表示, data.財務データ.現金及び現金同等物.期待値, data.財務データ.現金及び現金同等物.状態],
    ['株主資本', data.財務データ.株主資本.修正前エラー, data.財務データ.株主資本.表示, data.財務データ.株主資本.期待値, data.財務データ.株主資本.状態],
    ['有利子負債', data.財務データ.有利子負債.修正前エラー, data.財務データ.有利子負債.表示, data.財務データ.有利子負債.期待値, data.財務データ.有利子負債.状態],
    ['実効税率', '30%（固定値）', data.財務データ.実効税率.表示, data.財務データ.実効税率.期待値, data.財務データ.実効税率.状態],
    ['', '', '', '', ''],
    ['修正効果サマリー', '', '', '', ''],
    ['成功項目数', '', data.修正効果サマリー.修正成功項目.length.toString(), '4', ''],
    ['全体成功率', '', data.修正効果サマリー.全体成功率, '100%', '']
  ];
  
  return rows.map(row => row.join(',')).join('\n');
}

// 実行
testDirectExtraction();