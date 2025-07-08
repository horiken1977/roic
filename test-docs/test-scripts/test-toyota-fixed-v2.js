const https = require('https');
const fs = require('fs');

// トヨタ自動車のEDINETコード
const TOYOTA_EDINET = 'E02144';

/**
 * 修正版でトヨタのデータを取得（配列形式のcontextRef対応）
 */
async function testToyotaFixedV2() {
  console.log('🚗 トヨタ自動車 修正版テストV2開始');
  console.log('EDINETコード:', TOYOTA_EDINET);
  console.log('=' .repeat(60));
  
  try {
    // デバッグデータを読み込み
    const debugData = JSON.parse(fs.readFileSync('toyota_fixed_data_2025-07-06.json', 'utf8'));
    
    console.log('\n📊 デバッグ情報分析:');
    console.log('コンテキスト数:', debugData.デバッグ情報.contexts.total);
    console.log('ファクト数:', debugData.デバッグ情報.facts.total);
    console.log('現在期間コンテキストID:', debugData.デバッグ情報.contexts.currentPeriodContextId);
    
    // 売上関連データ
    console.log('\n💰 売上関連要素:');
    const salesElements = debugData.デバッグ情報.facts.salesRelated;
    for (const elem of salesElements.slice(0, 5)) {
      console.log(`- ${elem.key}: ${elem.sampleValue} (contexts: ${elem.contexts.map(c => Array.isArray(c) ? c[0] : c).join(', ')})`);
    }
    
    // 特定の要素を探す
    console.log('\n🔍 特定要素の詳細確認:');
    
    // TotalNetRevenuesIFRS
    const totalRevenues = salesElements.find(e => e.key === 'TotalNetRevenuesIFRS');
    if (totalRevenues) {
      console.log('TotalNetRevenuesIFRS:', totalRevenues);
    }
    
    // OperatingProfitLossIFRS
    const operatingProfit = salesElements.find(e => e.key === 'OperatingProfitLossIFRS');
    if (operatingProfit) {
      console.log('OperatingProfitLossIFRS:', operatingProfit);
    }
    
    // 資産関連
    console.log('\n💼 資産関連要素:');
    const assetElements = debugData.デバッグ情報.facts.assetRelated;
    
    // AssetsIFRS を探す
    const assets = assetElements.find(e => e.key.includes('Assets'));
    console.log('Assets要素:', assets);
    
    // 抽出テスト結果
    console.log('\n📈 抽出テスト結果:');
    const extractionTest = debugData.デバッグ情報.extractionTest;
    
    console.log('売上高抽出:');
    console.log('- 検索キー:', extractionTest.netSales.searchKeys);
    console.log('- マッチ数:', extractionTest.netSales.matches.length);
    console.log('- 利用可能コンテキスト:', extractionTest.netSales.allAvailableContexts.slice(0, 5).map(c => Array.isArray(c) ? c[0] : c));
    
    console.log('\n営業利益抽出:');
    console.log('- 検索キー:', extractionTest.operatingIncome.searchKeys);
    console.log('- マッチ数:', extractionTest.operatingIncome.matches.length);
    
    console.log('\n総資産抽出:');
    console.log('- 検索キー:', extractionTest.totalAssets.searchKeys);
    console.log('- マッチ数:', extractionTest.totalAssets.matches.length);
    
    // 手動でデータを抽出してみる
    console.log('\n🔧 手動データ抽出テスト:');
    
    // 売上高（TotalNetRevenuesIFRS）
    const revenue = totalRevenues ? totalRevenues.sampleValue : 'N/A';
    console.log('売上高（TotalNetRevenuesIFRS）:', formatCurrency(parseFloat(revenue)));
    
    // 営業利益（OperatingProfitLossIFRS）
    const opProfit = operatingProfit ? operatingProfit.sampleValue : 'N/A';
    console.log('営業利益（OperatingProfitLossIFRS）:', formatCurrency(parseFloat(opProfit)));
    
    // 総資産（TotalAssetsIFRSSummaryOfBusinessResults）
    const totalAssets = assetElements.find(e => e.key === 'TotalAssetsIFRSSummaryOfBusinessResults');
    const assetsValue = totalAssets ? totalAssets.sampleValue : 'N/A';
    console.log('総資産（TotalAssetsIFRSSummaryOfBusinessResults）:', formatCurrency(parseFloat(assetsValue)));
    
    // 修正版APIを再度呼び出し（contextRef配列対応版）
    console.log('\n📡 修正版API呼び出し（real-financial-v2）...');
    const url = `https://roic-horikens-projects.vercel.app/api/edinet/real-financial-v2?edinetCode=${TOYOTA_EDINET}&fiscalYear=2024`;
    
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
    
    console.log('APIレスポンス:', response.status);
    
    if (response.status === 200 && response.data) {
      const result = response.data;
      
      console.log('\n📊 修正版API結果:');
      console.log('企業名:', result.companyName);
      console.log('売上高:', formatCurrency(result.netSales));
      console.log('営業利益:', formatCurrency(result.operatingIncome));
      console.log('総資産:', formatCurrency(result.totalAssets));
      console.log('現金:', formatCurrency(result.cashAndEquivalents));
      console.log('株主資本:', formatCurrency(result.shareholdersEquity));
      console.log('有利子負債:', formatCurrency(result.interestBearingDebt));
      
      // 修正版データを保存
      const fileName = `toyota_fixed_v2_data_${new Date().toISOString().split('T')[0]}.json`;
      fs.writeFileSync(fileName, JSON.stringify(result, null, 2), 'utf8');
      console.log(`\n💾 修正版データを保存: ${fileName}`);
    } else {
      console.log('APIエラー:', response.data);
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

// 実行
testToyotaFixedV2();