/**
 * 10企業テスト結果をExcel形式で出力
 */

const fs = require('fs');

// テスト結果データを読み込み
const testResults = JSON.parse(fs.readFileSync('test-results-2025-07-05.json', 'utf8'));

// Excel用CSVデータ生成
function generateExcelReport() {
  const csvData = [];
  
  // ヘッダー行
  const headers = [
    '企業名',
    'EDINETコード',
    '成功/失敗',
    'データソース',
    '売上高（円）',
    '売上高（兆円）',
    '営業利益（円）',
    '営業利益（億円）',
    '総資産（円）',
    '総資産（兆円）',
    '現金及び現金同等物（円）',
    '現金及び現金同等物（億円）',
    '株主資本（円）',
    '有利子負債（円）',
    '有利子負債（億円）',
    '実効税率',
    'ROIC（%）',
    'エラー内容',
    'エラー詳細'
  ];
  
  csvData.push(headers);
  
  // データ行
  testResults.forEach(result => {
    const row = [];
    
    // 基本情報
    row.push(result.company || '');
    row.push(result.code || '');
    row.push(result.success ? '成功' : '失敗');
    row.push(result.source || '');
    
    if (result.success && result.data) {
      const data = result.data;
      
      // 売上高
      row.push(data.売上高 || 0);
      row.push(data.売上高 ? (data.売上高 / 1000000000000).toFixed(2) : 0);
      
      // 営業利益
      row.push(data.営業利益 || 0);
      row.push(data.営業利益 ? (data.営業利益 / 100000000).toFixed(0) : 0);
      
      // 総資産
      row.push(data.総資産 || 0);
      row.push(data.総資産 ? (data.総資産 / 1000000000000).toFixed(2) : 0);
      
      // 現金及び現金同等物
      row.push(data.現金同等物 || 0);
      row.push(data.現金同等物 ? (data.現金同等物 / 100000000).toFixed(0) : 0);
      
      // 株主資本（注意: 数値が小さすぎる可能性）
      row.push(data.株主資本 || 0);
      
      // 有利子負債
      row.push(data.有利子負債 || 0);
      row.push(data.有利子負債 ? (data.有利子負債 / 100000000).toFixed(0) : 0);
      
      // 実効税率
      row.push(data.税率 || 0);
      
      // ROIC
      row.push(data.ROIC ? data.ROIC.replace('%', '') : 0);
      
      // エラー情報（成功時は空）
      row.push('');
      row.push('');
    } else {
      // 失敗時は財務データを空にしてエラー情報を記録
      for (let i = 0; i < 13; i++) {
        row.push('');
      }
      row.push(result.error || '');
      row.push(result.message || '');
    }
    
    csvData.push(row);
  });
  
  return csvData;
}

// CSV文字列生成
function generateCSVString(data) {
  return data.map(row => 
    row.map(cell => {
      // 文字列の場合はダブルクォートで囲む（カンマやダブルクォートを含む場合のエスケープ）
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',')
  ).join('\n');
}

// 詳細レポート生成
function generateDetailedReport() {
  const detailedData = [];
  
  // 詳細ヘッダー
  const detailedHeaders = [
    '企業名',
    'EDINETコード',
    '成功/失敗',
    '業種（推定）',
    '決算期',
    'データソース',
    '売上高（百万円）',
    '営業利益（百万円）',
    '総資産（百万円）',
    '現金及び現金同等物（百万円）',
    '株主資本（百万円）',
    '有利子負債（百万円）',
    '実効税率（%）',
    'NOPAT（百万円）',
    '投下資本（百万円）',
    'ROIC（%）',
    '資産回転率',
    '営業利益率（%）',
    'ROE（%）',
    'ROA（%）',
    '備考・エラー詳細'
  ];
  
  detailedData.push(detailedHeaders);
  
  testResults.forEach(result => {
    const row = [];
    
    // 基本情報
    row.push(result.company || '');
    row.push(result.code || '');
    row.push(result.success ? '成功' : '失敗');
    
    // 業種推定
    const industry = getIndustryEstimate(result.company);
    row.push(industry);
    row.push('3月'); // 今回のテストは全て3月決算想定
    row.push(result.source || '');
    
    if (result.success && result.data) {
      const data = result.data;
      
      // 財務データ（百万円単位）
      row.push(data.売上高 ? Math.round(data.売上高 / 1000000) : 0);
      row.push(data.営業利益 ? Math.round(data.営業利益 / 1000000) : 0);
      row.push(data.総資産 ? Math.round(data.総資産 / 1000000) : 0);
      row.push(data.現金同等物 ? Math.round(data.現金同等物 / 1000000) : 0);
      row.push(data.株主資本 ? Math.round(data.株主資本 / 1000000) : 0);
      row.push(data.有利子負債 ? Math.round(data.有利子負債 / 1000000) : 0);
      row.push(data.税率 ? (data.税率 * 100).toFixed(2) : 0);
      
      // 計算指標
      const nopat = data.営業利益 ? data.営業利益 * (1 - data.税率) : 0;
      const investedCapital = data.総資産 ? data.総資産 - data.現金同等物 : 0;
      const roic = investedCapital > 0 ? (nopat / investedCapital) * 100 : 0;
      const assetTurnover = (data.総資産 && data.売上高) ? data.売上高 / data.総資産 : 0;
      const operatingMargin = (data.売上高 && data.営業利益) ? (data.営業利益 / data.売上高) * 100 : 0;
      const roe = (data.株主資本 && data.営業利益) ? (data.営業利益 / data.株主資本) * 100 : 0;
      const roa = (data.総資産 && data.営業利益) ? (data.営業利益 / data.総資産) * 100 : 0;
      
      row.push(nopat ? Math.round(nopat / 1000000) : 0);
      row.push(investedCapital ? Math.round(investedCapital / 1000000) : 0);
      row.push(roic.toFixed(2));
      row.push(assetTurnover.toFixed(2));
      row.push(operatingMargin.toFixed(2));
      row.push(roe.toFixed(2));
      row.push(roa.toFixed(2));
      row.push('');
    } else {
      // 失敗時
      for (let i = 0; i < 14; i++) {
        row.push('');
      }
      row.push(`${result.error}: ${result.message}`);
    }
    
    detailedData.push(row);
  });
  
  return detailedData;
}

// 業種推定
function getIndustryEstimate(companyName) {
  if (companyName.includes('自動車') || companyName.includes('本田')) return '自動車';
  if (companyName.includes('ソニー')) return 'エレクトロニクス';
  if (companyName.includes('任天堂')) return 'ゲーム';
  if (companyName.includes('ソフトバンク')) return '通信・IT';
  if (companyName.includes('キーエンス')) return '精密機器';
  if (companyName.includes('東京エレクトロン')) return '半導体製造装置';
  if (companyName.includes('ファーストリテイリング')) return '小売・アパレル';
  if (companyName.includes('オリエンタルランド')) return 'エンターテイメント';
  if (companyName.includes('日本電産')) return '電子部品・モーター';
  return '不明';
}

// メイン実行
function main() {
  console.log('📊 Excel報告書生成開始...');
  
  // 基本レポート生成
  const basicData = generateExcelReport();
  const basicCSV = generateCSVString(basicData);
  fs.writeFileSync('10企業ROIC分析結果_基本.csv', '\uFEFF' + basicCSV); // BOM付きでUTF-8
  
  // 詳細レポート生成
  const detailedData = generateDetailedReport();
  const detailedCSV = generateCSVString(detailedData);
  fs.writeFileSync('10企業ROIC分析結果_詳細.csv', '\uFEFF' + detailedCSV);
  
  console.log('✅ Excel報告書生成完了');
  console.log('📄 基本レポート: 10企業ROIC分析結果_基本.csv');
  console.log('📄 詳細レポート: 10企業ROIC分析結果_詳細.csv');
  
  // 概要表示
  console.log('\n📋 データ概要:');
  const successful = testResults.filter(r => r.success);
  const failed = testResults.filter(r => !r.success);
  
  console.log(`✅ 成功: ${successful.length}社`);
  successful.forEach(result => {
    console.log(`  - ${result.company}: ROIC ${result.data.ROIC}`);
  });
  
  console.log(`❌ 失敗: ${failed.length}社`);
  failed.forEach(result => {
    console.log(`  - ${result.company}: ${result.error}`);
  });
}

if (require.main === module) {
  main();
}

module.exports = { generateExcelReport, generateDetailedReport };