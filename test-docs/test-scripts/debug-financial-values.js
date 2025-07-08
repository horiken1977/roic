#!/usr/bin/env node

/**
 * 財務数値の詳細デバッグ・検証スクリプト
 * Debug Financial Values Script
 */

const fs = require('fs');

async function debugFinancialValues() {
  try {
    console.log('🔍 財務数値の詳細デバッグを開始...');
    
    // トヨタのEDINETコード
    const edinetCode = 'E02144';
    
    // 現在のAPIで実際に取得されている値を調査
    console.log('\n1. 現在のAPIレスポンス取得中...');
    
    const response = await fetch(`http://localhost:3000/api/edinet/real-financial?edinetCode=${edinetCode}&fiscalYear=2024`);
    const data = await response.json();
    
    console.log('\n📊 現在のAPI出力値:');
    console.log('─'.repeat(60));
    console.log(`現金及び現金同等物: ${data.cashAndCashEquivalents?.toLocaleString() || 'N/A'}`);
    console.log(`株主資本: ${data.shareholdersEquity?.toLocaleString() || 'N/A'}`);
    console.log(`有利子負債: ${data.interestBearingDebt?.toLocaleString() || 'N/A'}`);
    console.log(`総資産: ${data.totalAssets?.toLocaleString() || 'N/A'}`);
    console.log(`売上: ${data.revenue?.toLocaleString() || 'N/A'}`);
    console.log(`営業利益: ${data.operatingIncome?.toLocaleString() || 'N/A'}`);
    
    console.log('\n📈 期待値（有報ベース）:');
    console.log('─'.repeat(60));
    console.log('現金及び現金同等物: 8,982,404');
    console.log('株主資本（純資産合計）: 36,878,913');
    console.log('有利子負債: 38,792,879');
    
    console.log('\n🔍 差異分析:');
    console.log('─'.repeat(60));
    
    const expectedCash = 8982404;
    const expectedEquity = 36878913;
    const expectedDebt = 38792879;
    
    const cashDiff = (data.cashAndCashEquivalents || 0) - expectedCash;
    const equityDiff = (data.shareholdersEquity || 0) - expectedEquity;
    const debtDiff = (data.interestBearingDebt || 0) - expectedDebt;
    
    console.log(`現金差異: ${cashDiff.toLocaleString()} (${((cashDiff/expectedCash)*100).toFixed(2)}%)`);
    console.log(`株主資本差異: ${equityDiff.toLocaleString()} (${((equityDiff/expectedEquity)*100).toFixed(2)}%)`);
    console.log(`有利子負債差異: ${debtDiff.toLocaleString()} (${((debtDiff/expectedDebt)*100).toFixed(2)}%)`);
    
    // XBRL生データを確認
    console.log('\n2. XBRL生データ取得中...');
    
    // EDINETから直接XBRLデータを取得して分析
    const xbrlResponse = await fetch(`https://api.edinet-fsa.go.jp/api/v2/documents.json?date=2024-06-25&type=2&Subscription-Key=${process.env.EDINET_API_KEY}`);
    
    if (!xbrlResponse.ok) {
      console.log('⚠️ EDINET API直接アクセスできません。ローカルデータで分析を続行...');
    }
    
    console.log('\n3. データ抽出ロジック詳細分析...');
    
    // 実際のAPI処理を模擬実行してロジックを確認
    console.log('\n🔍 各項目の抽出ロジック分析:');
    console.log('─'.repeat(60));
    
    // APIファイルを読み込んで分析
    const apiFile = fs.readFileSync('/Users/aa479881/Library/CloudStorage/OneDrive-IBM/Personal/development/roic/api/edinet/real-financial.js', 'utf8');
    
    // 現金関連の抽出ロジックを確認
    const cashPattern = /CashAndCashEquivalents/g;
    const cashMatches = apiFile.match(cashPattern);
    
    if (cashMatches) {
      console.log(`現金抽出パターン: ${cashMatches.length}箇所で"CashAndCashEquivalents"を検索`);
    }
    
    // 株主資本関連の抽出ロジックを確認  
    const equityPattern = /ShareholdersEquity|NetAssets|TotalNetAssets/g;
    const equityMatches = apiFile.match(equityPattern);
    
    if (equityMatches) {
      console.log(`株主資本抽出パターン: ${equityMatches.length}箇所で株主資本関連要素を検索`);
    }
    
    // 有利子負債関連の抽出ロジックを確認
    const debtPattern = /InterestBearingDebt|BorrowingsFromBanks|Bonds/g;
    const debtMatches = apiFile.match(debtPattern);
    
    if (debtMatches) {
      console.log(`有利子負債抽出パターン: ${debtMatches.length}箇所で有利子負債関連要素を検索`);
    }
    
    console.log('\n4. 問題となりそうな処理パターンの検索...');
    console.log('─'.repeat(60));
    
    // 雑な実装を示すパターンを検索
    const problematicPatterns = [
      { name: 'デフォルト値設定', pattern: /= 0[^\.]/g },
      { name: '適当な計算', pattern: /\* 0\.3|\* 30/g },
      { name: 'マイナス値', pattern: /-\s*\d+/g },
      { name: 'TODO/FIXME', pattern: /TODO|FIXME|hack|temporary/gi },
      { name: 'Prior4Year使用', pattern: /Prior4Year/g },
      { name: 'Summary要素使用', pattern: /Summary/g }
    ];
    
    problematicPatterns.forEach(({ name, pattern }) => {
      const matches = apiFile.match(pattern);
      if (matches) {
        console.log(`⚠️ ${name}: ${matches.length}箇所で発見`);
        matches.slice(0, 3).forEach(match => {
          console.log(`   - "${match}"`);
        });
      }
    });
    
    console.log('\n5. 保存用データ出力...');
    
    const debugResult = {
      timestamp: new Date().toISOString(),
      currentValues: {
        cashAndCashEquivalents: data.cashAndCashEquivalents,
        shareholdersEquity: data.shareholdersEquity,
        interestBearingDebt: data.interestBearingDebt,
        totalAssets: data.totalAssets,
        revenue: data.revenue,
        operatingIncome: data.operatingIncome
      },
      expectedValues: {
        cashAndCashEquivalents: expectedCash,
        shareholdersEquity: expectedEquity,
        interestBearingDebt: expectedDebt
      },
      differences: {
        cash: cashDiff,
        equity: equityDiff,
        debt: debtDiff
      },
      analysis: {
        cashExtractionFound: !!cashMatches,
        equityExtractionFound: !!equityMatches,
        debtExtractionFound: !!debtMatches,
        problematicPatterns: problematicPatterns.filter(p => apiFile.match(p.pattern))
      }
    };
    
    const outputFile = `財務数値デバッグ結果_${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(debugResult, null, 2));
    
    console.log(`\n✅ デバッグ結果を ${outputFile} に保存しました`);
    console.log('\n🎯 次のステップ:');
    console.log('1. XBRL要素の直接確認');
    console.log('2. コンテキスト選択ロジックの修正');
    console.log('3. フォールバック処理の除去');
    console.log('4. 厳密な値検証の実装');
    
  } catch (error) {
    console.error('❌ デバッグ中にエラーが発生:', error);
    
    // エラー時はオフライン分析を実行
    console.log('\n📋 オフライン分析に切り替え...');
    
    const apiFile = fs.readFileSync('/Users/aa479881/Library/CloudStorage/OneDrive-IBM/Personal/development/roic/api/edinet/real-financial.js', 'utf8');
    
    console.log('\n🔍 APIファイル内の問題パターン検索:');
    
    // より詳細な問題パターン検索
    const lines = apiFile.split('\n');
    
    lines.forEach((line, index) => {
      if (line.includes('CashAndCashEquivalents') || 
          line.includes('ShareholdersEquity') || 
          line.includes('InterestBearingDebt')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
      }
      
      if (line.includes('= 0') || line.includes('* 0.3') || line.includes('Prior4Year')) {
        console.log(`⚠️ 問題Line ${index + 1}: ${line.trim()}`);
      }
    });
  }
}

// 実行
if (require.main === module) {
  debugFinancialValues();
}

module.exports = { debugFinancialValues };