const https = require('https');
const fs = require('fs');

// トヨタ自動車のEDINETコード
const TOYOTA_EDINET = 'E02144';

/**
 * 修正版でトヨタのデータを取得
 */
async function testToyotaFixed() {
  console.log('🚗 トヨタ自動車 修正版テスト開始');
  console.log('EDINETコード:', TOYOTA_EDINET);
  console.log('=' .repeat(60));
  
  try {
    // Vercel APIを呼び出し（デバッグモード）
    const url = `https://roic-horikens-projects.vercel.app/api/edinet/real-financial?edinetCode=${TOYOTA_EDINET}&fiscalYear=2024&debug=true`;
    
    console.log('📡 API呼び出し中...');
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
              data: JSON.parse(data)
            });
          } catch (error) {
            reject(error);
          }
        });
      }).on('error', reject);
    });
    
    console.log('\n📊 APIレスポンス:');
    console.log('ステータスコード:', response.status);
    
    if (response.status === 200) {
      const result = response.data;
      
      // 基本情報
      console.log('\n📋 基本情報:');
      console.log('企業名:', result.companyName);
      console.log('決算年度:', result.fiscalYear);
      console.log('データソース:', result.dataSource);
      
      // 財務データ
      console.log('\n💰 財務データ:');
      console.log('売上高:', formatCurrency(result.netSales));
      console.log('営業利益:', formatCurrency(result.operatingIncome));
      console.log('総資産:', formatCurrency(result.totalAssets));
      console.log('現金及び現金同等物:', formatCurrency(result.cashAndEquivalents));
      console.log('株主資本:', formatCurrency(result.shareholdersEquity));
      console.log('有利子負債:', formatCurrency(result.interestBearingDebt));
      console.log('実効税率:', result.taxRate ? `${(result.taxRate * 100).toFixed(2)}%` : 'N/A');
      
      // ROIC計算
      if (result.roic) {
        console.log('\n📈 ROIC計算結果:');
        console.log('ROIC値:', `${result.roic.value.toFixed(2)}%`);
        console.log('計算方式:', result.roic.method);
        console.log('NOPAT:', formatCurrency(result.roic.details.nopat));
        console.log('投下資本:', formatCurrency(result.roic.details.investedCapital));
      }
      
      // デバッグ情報（利用可能な場合）
      if (result.debug) {
        console.log('\n🔍 デバッグ情報:');
        console.log('XBRLファイル:', result.debug.xbrlFileName || 'N/A');
        console.log('コンテキスト数:', result.debug.contexts?.total || 'N/A');
        console.log('ファクト数:', result.debug.facts?.total || 'N/A');
        
        // 詳細なデバッグデータをファイルに保存
        const debugData = {
          基本情報: {
            企業名: result.companyName,
            EDINETコード: result.edinetCode,
            決算年度: result.fiscalYear,
            データソース: result.dataSource,
            取得日時: result.lastUpdated
          },
          財務データ: {
            売上高: result.netSales,
            営業利益: result.operatingIncome,
            総資産: result.totalAssets,
            現金及び現金同等物: result.cashAndEquivalents,
            株主資本: result.shareholdersEquity,
            有利子負債: result.interestBearingDebt,
            実効税率: result.taxRate
          },
          ROIC計算結果: result.roic,
          デバッグ情報: result.debug
        };
        
        // JSONファイルとして保存
        const fileName = `toyota_fixed_data_${new Date().toISOString().split('T')[0]}.json`;
        fs.writeFileSync(fileName, JSON.stringify(debugData, null, 2), 'utf8');
        console.log(`\n💾 詳細データを保存: ${fileName}`);
        
        // CSVファイルとしても保存
        const csvFileName = `toyota_fixed_data_${new Date().toISOString().split('T')[0]}.csv`;
        const csvContent = generateCSV(result);
        fs.writeFileSync(csvFileName, csvContent, 'utf8');
        console.log(`💾 CSVデータを保存: ${csvFileName}`);
      }
      
      // 前回との比較
      console.log('\n📊 前回エラーとの比較:');
      console.log('現金（前回）: -134,089百万円 → ', formatCurrency(result.cashAndEquivalents));
      console.log('有利子負債（前回）: 9,416,031百万円 → ', formatCurrency(result.interestBearingDebt));
      console.log('株主資本（前回）: 0.136（比率） → ', formatCurrency(result.shareholdersEquity));
      
    } else {
      console.log('❌ エラー:', response.data);
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
 * CSV生成
 */
function generateCSV(data) {
  const rows = [
    ['項目', '値', '単位', '備考'],
    ['企業名', data.companyName, '', ''],
    ['EDINETコード', data.edinetCode, '', ''],
    ['決算年度', data.fiscalYear, '年', ''],
    ['売上高', data.netSales, '円', formatCurrency(data.netSales)],
    ['営業利益', data.operatingIncome, '円', formatCurrency(data.operatingIncome)],
    ['総資産', data.totalAssets, '円', formatCurrency(data.totalAssets)],
    ['現金及び現金同等物', data.cashAndEquivalents, '円', formatCurrency(data.cashAndEquivalents)],
    ['株主資本', data.shareholdersEquity, '円', formatCurrency(data.shareholdersEquity)],
    ['有利子負債', data.interestBearingDebt, '円', formatCurrency(data.interestBearingDebt)],
    ['実効税率', data.taxRate ? (data.taxRate * 100).toFixed(2) : 'N/A', '%', ''],
  ];
  
  if (data.roic) {
    rows.push(
      ['', '', '', ''],
      ['ROIC計算結果', '', '', ''],
      ['ROIC', data.roic.value.toFixed(2), '%', ''],
      ['NOPAT', data.roic.details.nopat, '円', formatCurrency(data.roic.details.nopat)],
      ['投下資本', data.roic.details.investedCapital, '円', formatCurrency(data.roic.details.investedCapital)],
      ['計算方式', data.roic.method, '', '']
    );
  }
  
  return rows.map(row => row.join(',')).join('\n');
}

// 実行
testToyotaFixed();