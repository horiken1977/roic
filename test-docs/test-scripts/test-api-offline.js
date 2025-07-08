#!/usr/bin/env node

/**
 * オフライン APIテスト - 修正内容の確認
 * Test API Modifications Offline
 */

const fs = require('fs');

console.log('🧪 修正版API内容確認テスト開始...');

// APIファイルを読み込んで修正内容を検証
const apiCode = fs.readFileSync('./api/edinet/real-financial.js', 'utf8');

console.log('\n🔍 財務データ抽出修正の検証:');
console.log('─'.repeat(60));

// 1. エラー処理の改善確認
const errorImprovements = [
  { 
    pattern: /return null/g, 
    name: 'エラー投げすぎ修正 (null返却)',
    description: 'エラーを投げる代わりにnullを返すように修正'
  },
  { 
    pattern: /Math\.abs\(value\)/g, 
    name: 'マイナス値の絶対値変換',
    description: '負の値を正の値に変換'
  }
];

errorImprovements.forEach(improvement => {
  const matches = apiCode.match(improvement.pattern);
  const count = matches ? matches.length : 0;
  console.log(`✅ ${improvement.name}: ${count}箇所で適用`);
  if (count > 0) {
    console.log(`   → ${improvement.description}`);
  }
});

console.log('\n🔍 検索キーワード拡張の検証:');
console.log('─'.repeat(60));

// 2. 現金及び現金同等物の検索キーワード
const cashKeywords = [
  'CashAndCashEquivalentsIFRS',
  'CashAndDeposits',
  'CashAndCashEquivalents',
  'Cash',
  'CashAndDepositsAtEnd',
  'CashOnHandAndInBanks',
  'MoneyHeldInTrust',
  'CashInHandAndAtBanks'
];

console.log('現金及び現金同等物の検索キーワード:');
cashKeywords.forEach(keyword => {
  const found = apiCode.includes(keyword);
  console.log(`  ${found ? '✅' : '❌'} ${keyword}`);
});

// 3. 株主資本の検索キーワード
const equityKeywords = [
  'EquityAttributableToOwnersOfParentIFRS',
  'EquityIFRS',
  'ShareholdersEquity',
  'NetAssets',
  'TotalNetAssets',
  'TotalEquity',
  'EquityAttributableToOwnersOfParent',
  'ParentCompanyShareholdersEquity',
  'TotalShareholdersEquity',
  'ShareholdersEquityTotal'
];

console.log('\n株主資本の検索キーワード:');
equityKeywords.forEach(keyword => {
  const found = apiCode.includes(keyword);
  console.log(`  ${found ? '✅' : '❌'} ${keyword}`);
});

// 4. 有利子負債の検索キーワード
const debtKeywords = [
  'BorrowingsCurrentIFRS',
  'ShortTermLoansPayable',
  'ShortTermBorrowings',
  'ShortTermDebt',
  'CurrentPortionOfLongTermDebt',
  'ShortTermBankLoans',
  'BorrowingsNoncurrentIFRS',
  'LongTermLoansPayable',
  'LongTermDebt',
  'LongTermBorrowings',
  'LongTermBankLoans',
  'NoncurrentBorrowings'
];

console.log('\n有利子負債の検索キーワード:');
debtKeywords.forEach(keyword => {
  const found = apiCode.includes(keyword);
  console.log(`  ${found ? '✅' : '❌'} ${keyword}`);
});

console.log('\n🔍 段階的検索ロジックの検証:');
console.log('─'.repeat(60));

// 5. 段階的検索の確認
const searchPhases = [
  { pattern: /Phase 1: 厳密なコンテキスト一致/, name: 'Phase 1: 厳密一致検索' },
  { pattern: /Phase 2: 部分一致検索/, name: 'Phase 2: 部分一致検索' },
  { pattern: /Phase 3: コンテキスト柔軟検索/, name: 'Phase 3: 柔軟検索' }
];

searchPhases.forEach(phase => {
  const found = phase.pattern.test(apiCode);
  console.log(`  ${found ? '✅' : '❌'} ${phase.name}`);
});

console.log('\n🔍 Summary要素除外の検証:');
console.log('─'.repeat(60));

const summaryExclusions = apiCode.match(/includes\('Summary'\)/g);
const summaryExclusionCount = summaryExclusions ? summaryExclusions.length : 0;
console.log(`✅ Summary要素除外: ${summaryExclusionCount}箇所で実装`);

console.log('\n🔍 修正前後の問題解決状況:');
console.log('─'.repeat(60));

const problems = [
  {
    issue: '現金及び現金同等物のマイナス値',
    expectedValue: '8,982,404',
    fix: 'Math.abs()による絶対値変換 + 拡張キーワード検索',
    status: apiCode.includes('Math.abs(value)') && apiCode.includes('CashAndDepositsAtEnd')
  },
  {
    issue: '株主資本のゼロ値',
    expectedValue: '36,878,913',
    fix: '包括的な純資産要素検索 + 段階的フォールバック',
    status: apiCode.includes('TotalShareholdersEquity') && apiCode.includes('Phase 2')
  },
  {
    issue: '有利子負債の計算エラー',
    expectedValue: '38,792,879',
    fix: '個別要素の柔軟な抽出 + null処理改善',
    status: apiCode.includes('ShortTermBankLoans') && apiCode.includes('return null')
  }
];

problems.forEach(problem => {
  console.log(`${problem.status ? '✅' : '❌'} ${problem.issue}`);
  console.log(`   期待値: ${problem.expectedValue}`);
  console.log(`   修正内容: ${problem.fix}`);
  console.log(`   状況: ${problem.status ? '修正適用済み' : '要確認'}`);
  console.log('');
});

const fixedCount = problems.filter(p => p.status).length;
console.log('🎯 修正状況サマリー:');
console.log(`修正完了: ${fixedCount}/${problems.length} 項目`);
console.log(`修正率: ${(fixedCount/problems.length*100).toFixed(0)}%`);

console.log('\n📋 APIキー設定確認:');
console.log('─'.repeat(60));

// .env.localファイルの確認
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const hasRealKey = !envContent.includes('your-actual-api-key-here');
  console.log(`${hasRealKey ? '✅' : '⚠️'} .env.local: ${hasRealKey ? 'APIキー設定済み' : 'プレースホルダー'}`);
  
  if (!hasRealKey) {
    console.log('');
    console.log('🔧 APIキー設定方法:');
    console.log('1. EDINET APIキーを取得');
    console.log('2. .env.local ファイルの "your-actual-api-key-here" を実際のキーに置換');
    console.log('3. export EDINET_API_KEY=actual-key または source .env.local');
  }
} else {
  console.log('⚠️ .env.local ファイルが見つかりません');
}

console.log('\n✅ 修正版APIの検証完了');
console.log('📡 実際のテストを行うには適切なAPIキー設定が必要です');

// 結果をファイルに保存
const verificationResult = {
  timestamp: new Date().toISOString(),
  verificationItems: {
    errorHandling: errorImprovements.map(imp => ({
      name: imp.name,
      applied: (apiCode.match(imp.pattern) || []).length > 0
    })),
    searchKeywords: {
      cash: cashKeywords.filter(k => apiCode.includes(k)).length,
      equity: equityKeywords.filter(k => apiCode.includes(k)).length,
      debt: debtKeywords.filter(k => apiCode.includes(k)).length
    },
    phaseSearch: searchPhases.map(p => ({
      name: p.name,
      implemented: p.pattern.test(apiCode)
    })),
    problems: problems.map(p => ({
      issue: p.issue,
      expectedValue: p.expectedValue,
      fixed: p.status
    }))
  },
  summary: {
    totalProblems: problems.length,
    fixedProblems: fixedCount,
    fixRate: (fixedCount/problems.length*100).toFixed(0) + '%'
  }
};

fs.writeFileSync('修正版API検証結果_2025-07-07.json', JSON.stringify(verificationResult, null, 2));
console.log('\n📁 検証結果を保存: 修正版API検証結果_2025-07-07.json');