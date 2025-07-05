/**
 * 10社ROIC計算テスト結果をExcel形式で出力
 * 詳細な財務データとROIC計算結果を含む
 */

const XLSX = require('xlsx');
const fs = require('fs');

/**
 * テスト結果からExcelデータを生成
 */
function generateExcelFromTestResults() {
  console.log('📊 10社ROIC計算テスト結果Excel生成開始...');
  
  // 最新のテスト結果ファイルを読み込み
  const testFiles = fs.readdirSync('.')
    .filter(file => file.startsWith('test-direct-roic-10-summary-') && file.endsWith('.json'))
    .sort()
    .reverse();
  
  if (testFiles.length === 0) {
    throw new Error('テスト結果ファイルが見つかりません');
  }
  
  const latestFile = testFiles[0];
  console.log(`📄 使用ファイル: ${latestFile}`);
  
  const testResults = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
  
  // 1. メインデータシート用のデータ準備
  const mainData = testResults.successfulCompanies.map((company, index) => ({
    'No': company.no,
    'EDINETコード': company.edinetCode,
    '企業名': company.companyName,
    '売上高(兆円)': company.netSales_trillion,
    '営業利益(億円)': company.operatingIncome_billion,
    '総資産(兆円)': company.totalAssets_trillion,
    'NOPAT(億円)': company.nopat_billion,
    '営業利益率(%)': company.operatingMargin,
    '資産回転率(回)': company.assetTurnover,
    '基本ROIC(%)': company.roicBasic,
    '詳細ROIC(%)': company.roicDetailed,
    '資産ROIC(%)': company.roicAsset,
    '修正ROIC(%)': company.roicModified,
    '処理時間(ms)': company.totalTime
  }));
  
  // 2. サマリーデータ準備
  const summaryData = [
    { '項目': 'テスト実行日時', '値': new Date(testResults.testInfo.startTime).toLocaleString('ja-JP') },
    { '項目': '総企業数', '値': testResults.testInfo.totalCompanies + '社' },
    { '項目': '成功企業数', '値': testResults.testInfo.successCount + '社' },
    { '項目': 'エラー企業数', '値': testResults.testInfo.errorCount + '社' },
    { '項目': '成功率', '値': testResults.testInfo.successRate },
    { '項目': '平均レスポンス時間', '値': testResults.statistics.avgResponseTime + 'ms' },
    { '項目': '平均ROIC', '値': testResults.statistics.avgROIC + '%' },
    { '項目': '最大ROIC', '値': testResults.statistics.maxROIC + '%' },
    { '項目': '最小ROIC', '値': testResults.statistics.minROIC + '%' }
  ];
  
  // 3. ROIC計算方式説明データ
  const roicMethodsData = [
    {
      '計算方式': '基本方式',
      '計算式': 'NOPAT ÷ (総資産 - 現金)',
      '説明': '最も一般的なROIC計算方式。投下資本を総資産から現金を除いた額で算出',
      '適用場面': '一般的な企業分析、業界比較'
    },
    {
      '計算方式': '詳細方式',
      '計算式': 'NOPAT ÷ (株主資本 + 有利子負債)',
      '説明': '資本構造を詳細に考慮した計算方式。株主資本と有利子負債の合計を投下資本とする',
      '適用場面': '財務レバレッジの影響を詳細分析したい場合'
    },
    {
      '計算方式': '資産方式',
      '計算式': 'NOPAT ÷ 総資産',
      '説明': '総資産をそのまま投下資本として使用するシンプルな方式',
      '適用場面': 'ROAとの比較、簡易的な分析'
    },
    {
      '計算方式': '修正方式',
      '計算式': '営業利益率 × 資産回転率 × (1-税率)',
      '説明': 'デュポン分析の考え方を取り入れた方式。収益性と効率性を分解',
      '適用場面': '収益性と効率性の要因分析'
    }
  ];
  
  // 4. 財務指標詳細データ
  const detailData = testResults.successfulCompanies.map(company => {
    const investedCapitalBasic = company.totalAssets_trillion * 1000000000000 - (company.totalAssets_trillion * 1000000000000 * 0.15); // 現金15%と仮定
    const investedCapitalDetailed = company.totalAssets_trillion * 1000000000000 * 0.6; // 株主資本+有利子負債60%と仮定
    
    return {
      'No': company.no,
      '企業名': company.companyName,
      '売上高(兆円)': company.netSales_trillion,
      '営業利益(億円)': company.operatingIncome_billion,
      'NOPAT(億円)': company.nopat_billion,
      '総資産(兆円)': company.totalAssets_trillion,
      '投下資本_基本(兆円)': Math.round(investedCapitalBasic / 1000000000000 * 10) / 10,
      '投下資本_詳細(兆円)': Math.round(investedCapitalDetailed / 1000000000000 * 10) / 10,
      '営業利益率(%)': company.operatingMargin,
      '資産回転率(回)': company.assetTurnover,
      '基本ROIC(%)': company.roicBasic,
      '詳細ROIC(%)': company.roicDetailed,
      '資産ROIC(%)': company.roicAsset,
      '修正ROIC(%)': company.roicModified
    };
  });
  
  return {
    mainData,
    summaryData,
    roicMethodsData,
    detailData,
    testInfo: testResults.testInfo
  };
}

/**
 * Excelワークブック作成
 */
function createExcelWorkbook(data) {
  console.log('📄 Excelワークブック作成...');
  
  const workbook = XLSX.utils.book_new();
  
  // 1. メインシート
  const mainSheet = XLSX.utils.json_to_sheet(data.mainData);
  
  // 列幅設定
  const mainColWidths = [
    { wch: 5 },  // No
    { wch: 15 }, // EDINETコード
    { wch: 20 }, // 企業名
    { wch: 12 }, // 売上高
    { wch: 15 }, // 営業利益
    { wch: 12 }, // 総資産
    { wch: 12 }, // NOPAT
    { wch: 15 }, // 営業利益率
    { wch: 15 }, // 資産回転率
    { wch: 12 }, // 基本ROIC
    { wch: 12 }, // 詳細ROIC
    { wch: 12 }, // 資産ROIC
    { wch: 12 }, // 修正ROIC
    { wch: 12 }  // 処理時間
  ];
  mainSheet['!cols'] = mainColWidths;
  
  XLSX.utils.book_append_sheet(workbook, mainSheet, 'ROIC計算結果');
  
  // 2. サマリーシート
  const summarySheet = XLSX.utils.json_to_sheet(data.summaryData);
  summarySheet['!cols'] = [{ wch: 20 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'テスト概要');
  
  // 3. ROIC計算方式説明シート
  const methodsSheet = XLSX.utils.json_to_sheet(data.roicMethodsData);
  methodsSheet['!cols'] = [
    { wch: 15 }, // 計算方式
    { wch: 30 }, // 計算式
    { wch: 40 }, // 説明
    { wch: 30 }  // 適用場面
  ];
  XLSX.utils.book_append_sheet(workbook, methodsSheet, 'ROIC計算方式');
  
  // 4. 詳細分析シート
  const detailSheet = XLSX.utils.json_to_sheet(data.detailData);
  detailSheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 20 }, // 企業名
    { wch: 12 }, // 売上高
    { wch: 15 }, // 営業利益
    { wch: 12 }, // NOPAT
    { wch: 12 }, // 総資産
    { wch: 15 }, // 投下資本_基本
    { wch: 15 }, // 投下資本_詳細
    { wch: 15 }, // 営業利益率
    { wch: 15 }, // 資産回転率
    { wch: 12 }, // 基本ROIC
    { wch: 12 }, // 詳細ROIC
    { wch: 12 }, // 資産ROIC
    { wch: 12 }  // 修正ROIC
  ];
  XLSX.utils.book_append_sheet(workbook, detailSheet, '詳細分析');
  
  return workbook;
}

/**
 * メイン実行
 */
function main() {
  console.log('🚀 10社ROIC計算テスト結果Excel出力開始');
  console.log('==========================================');
  
  try {
    // 1. テスト結果データ読み込み
    const data = generateExcelFromTestResults();
    
    // 2. Excelワークブック作成
    const workbook = createExcelWorkbook(data);
    
    // 3. ファイル名生成（タイムスタンプ付き）
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const fileName = `ROIC計算テスト結果_10社_${timestamp}.xlsx`;
    
    // 4. ファイル保存
    XLSX.writeFile(workbook, fileName);
    
    // 5. 結果表示
    console.log('\n✅ Excel出力完了');
    console.log('==========================================');
    console.log(`📄 ファイル名: ${fileName}`);
    console.log(`📊 テスト実行日時: ${new Date(data.testInfo.startTime).toLocaleString('ja-JP')}`);
    console.log(`🏢 対象企業数: ${data.testInfo.totalCompanies}社`);
    console.log(`✅ 成功率: ${data.testInfo.successRate}`);
    console.log(`📈 平均ROIC: ${data.mainData.reduce((sum, c) => sum + c['基本ROIC(%)'], 0) / data.mainData.length}%`);
    
    console.log('\n📋 含まれるシート:');
    console.log('   1. ROIC計算結果 - メインの計算結果データ');
    console.log('   2. テスト概要 - テスト実行情報とサマリー');
    console.log('   3. ROIC計算方式 - 4つの計算方式の詳細説明');
    console.log('   4. 詳細分析 - 投下資本等の詳細財務指標');
    
    console.log('\n🎯 企業一覧:');
    data.mainData.forEach((company, index) => {
      console.log(`   ${index + 1}. ${company['企業名']} - ROIC: ${company['基本ROIC(%)']}%`);
    });
    
    console.log(`\n📁 保存場所: ${process.cwd()}/${fileName}`);
    console.log('💾 Excelファイルをダウンロードしてご確認ください');
    
    return {
      success: true,
      fileName: fileName,
      fullPath: `${process.cwd()}/${fileName}`,
      companiesCount: data.testInfo.totalCompanies,
      successRate: data.testInfo.successRate
    };
    
  } catch (error) {
    console.error('❌ エラー発生:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 実行
if (require.main === module) {
  main();
}

module.exports = { main, generateExcelFromTestResults };