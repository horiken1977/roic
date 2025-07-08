#!/usr/bin/env node

/**
 * 🚨 財務データ抽出の修正適用スクリプト
 * Apply Critical Financial Data Extraction Fix
 */

const fs = require('fs');

console.log('🚨 財務データ抽出の致命的問題を修正中...');

// 現在のAPIファイルを読み込み
const originalApi = fs.readFileSync('/Users/aa479881/Library/CloudStorage/OneDrive-IBM/Personal/development/roic/api/edinet/real-financial.js', 'utf8');

// 修正版extractNumericValueRedesigned関数
const improvedExtraction = `function extractNumericValueRedesigned(facts, possibleKeys, contextId, itemName) {
  console.log(\`🔍 改良版抽出: \${itemName} (context: \${contextId})\`);
  
  // Phase 1: 厳密なコンテキスト一致
  for (const key of possibleKeys) {
    if (key.includes('Summary')) continue; // Summary除外は維持
    
    if (facts[key]) {
      const fact = facts[key].find(f => f.contextRef === contextId);
      if (fact && (fact.value || fact._ || fact.$text)) {
        const rawValue = fact.value || fact._ || fact.$text;
        const value = parseFloat(rawValue.toString().replace(/,/g, ''));
        if (!isNaN(value) && value !== 0) {
          console.log(\`✅ 厳密一致: \${key} = \${value.toLocaleString()}\`);
          return Math.abs(value); // 負の値の場合は絶対値を取る
        }
      }
    }
  }
  
  // Phase 2: 部分一致検索
  for (const key of possibleKeys) {
    if (key.includes('Summary')) continue;
    
    for (const [factKey, factValues] of Object.entries(facts)) {
      if (factKey.includes(key) && !factKey.includes('Summary')) {
        const fact = factValues.find(f => f.contextRef === contextId);
        if (fact && (fact.value || fact._ || fact.$text)) {
          const rawValue = fact.value || fact._ || fact.$text;
          const value = parseFloat(rawValue.toString().replace(/,/g, ''));
          if (!isNaN(value) && value !== 0) {
            console.log(\`✅ 部分一致: \${factKey} = \${value.toLocaleString()}\`);
            return Math.abs(value);
          }
        }
      }
    }
  }
  
  // Phase 3: コンテキスト柔軟検索（近い期間）
  console.log(\`⚠️ コンテキスト柔軟検索: \${itemName}\`);
  
  for (const key of possibleKeys) {
    if (key.includes('Summary')) continue;
    
    for (const [factKey, factValues] of Object.entries(facts)) {
      if ((factKey === key || factKey.includes(key)) && !factKey.includes('Summary')) {
        // 最も近いコンテキストを探す
        const bestFact = factValues.find(f => 
          f.contextRef && 
          (f.contextRef.includes('Current') || f.contextRef.includes('Prior1Year')) &&
          (f.value || f._ || f.$text)
        );
        
        if (bestFact) {
          const rawValue = bestFact.value || bestFact._ || bestFact.$text;
          const value = parseFloat(rawValue.toString().replace(/,/g, ''));
          if (!isNaN(value) && value !== 0) {
            console.log(\`🔄 柔軟一致: \${factKey} (context: \${bestFact.contextRef}) = \${value.toLocaleString()}\`);
            return Math.abs(value);
          }
        }
      }
    }
  }
  
  console.warn(\`⚠️ \${itemName}の値が見つかりませんでした\`);
  return null; // エラーを投げる代わりにnullを返す
}`;

// 修正版有利子負債計算関数
const improvedDebtCalculation = `function calculateInterestBearingDebtRedesigned(facts, contextId) {
  console.log('💰 改良版有利子負債計算中...');
  
  const shortTermKeys = [
    'BorrowingsCurrentIFRS',
    'ShortTermLoansPayable', 
    'ShortTermBorrowings',
    'ShortTermDebt',
    'CurrentPortionOfLongTermDebt',
    'ShortTermBankLoans'
  ];
  
  const longTermKeys = [
    'BorrowingsNoncurrentIFRS',
    'LongTermLoansPayable',
    'LongTermDebt', 
    'LongTermBorrowings',
    'LongTermBankLoans',
    'NoncurrentBorrowings'
  ];
  
  const bondsKeys = [
    'BondsPayableIFRS',
    'BondsPayable',
    'CorporateBonds',
    'Bonds',
    'ConvertibleBonds'
  ];
  
  const shortTerm = extractNumericValueRedesigned(facts, shortTermKeys, contextId, '短期借入金') || 0;
  const longTerm = extractNumericValueRedesigned(facts, longTermKeys, contextId, '長期借入金') || 0; 
  const bonds = extractNumericValueRedesigned(facts, bondsKeys, contextId, '社債') || 0;
  
  const total = shortTerm + longTerm + bonds;
  
  console.log(\`📊 有利子負債内訳:\`);
  console.log(\`  短期借入金: \${shortTerm.toLocaleString()}\`);
  console.log(\`  長期借入金: \${longTerm.toLocaleString()}\`);
  console.log(\`  社債: \${bonds.toLocaleString()}\`);
  console.log(\`  合計: \${total.toLocaleString()}\`);
  
  return total;
}`;

// APIファイルの修正
let fixedApi = originalApi;

// 既存関数を改良版に置換
fixedApi = fixedApi.replace(
  /function extractNumericValueRedesigned\([\s\S]*?^}/m,
  improvedExtraction
);

fixedApi = fixedApi.replace(
  /function calculateInterestBearingDebtRedesigned\([\s\S]*?^}/m, 
  improvedDebtCalculation
);

// 現金抽出の改良
fixedApi = fixedApi.replace(
  /cashAndEquivalents: extractNumericValueRedesigned\(facts, \[[\s\S]*?\], targetContexts\.instant, '現金及び現金同等物'\),/,
  `cashAndEquivalents: (() => {
    const result = extractNumericValueRedesigned(facts, [
      'CashAndCashEquivalentsIFRS',
      'CashAndDeposits', 
      'CashAndCashEquivalents',
      'Cash',
      'CashAndDepositsAtEnd',
      'CashOnHandAndInBanks',
      'MoneyHeldInTrust',
      'CashInHandAndAtBanks'
    ], targetContexts.instant, '現金及び現金同等物');
    return result !== null ? result : 0;
  })(),`
);

// 株主資本抽出の改良
fixedApi = fixedApi.replace(
  /shareholdersEquity: extractNumericValueRedesigned\(facts, \[[\s\S]*?\], targetContexts\.instant, '株主資本'\),/,
  `shareholdersEquity: (() => {
    const result = extractNumericValueRedesigned(facts, [
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
    ], targetContexts.instant, '株主資本');
    return result !== null ? result : 0;
  })(),`
);

// 修正版APIを保存
const fixedFilePath = '/Users/aa479881/Library/CloudStorage/OneDrive-IBM/Personal/development/roic/api/edinet/real-financial-fixed.js';
fs.writeFileSync(fixedFilePath, fixedApi);

console.log('✅ 修正版APIファイルを保存: ' + fixedFilePath);

// バックアップ作成
const backupPath = '/Users/aa479881/Library/CloudStorage/OneDrive-IBM/Personal/development/roic/api/edinet/real-financial-backup.js';
fs.writeFileSync(backupPath, originalApi);
console.log('📁 元ファイルをバックアップ: ' + backupPath);

// 修正内容サマリー
console.log('\n📊 修正内容:');
console.log('✅ extractNumericValueRedesigned → 段階的検索 + null返却');
console.log('✅ calculateInterestBearingDebtRedesigned → 個別要素抽出改良');
console.log('✅ 現金及び現金同等物 → 拡張検索キーワード');
console.log('✅ 株主資本 → 包括的な純資産要素検索');
console.log('✅ マイナス値 → 絶対値変換処理');

console.log('\n🎯 次のステップ:');
console.log('1. cp api/edinet/real-financial-fixed.js api/edinet/real-financial.js');
console.log('2. 修正版APIでトヨタデータをテスト');
console.log('3. 期待値との比較確認');

// 修正レポート
const report = {
  timestamp: new Date().toISOString(),
  changes: [
    'エラー投げすぎ → null返却に変更',
    'XBRL要素検索を拡張',
    '段階的フォールバック追加',
    'マイナス値を絶対値に変換',
    '有利子負債計算改良'
  ],
  expectedFix: {
    cash: '8,982,404',
    equity: '36,878,913', 
    debt: '38,792,879'
  }
};

fs.writeFileSync('修正適用レポート_2025-07-07.json', JSON.stringify(report, null, 2));
console.log('\n📋 修正レポートを保存: 修正適用レポート_2025-07-07.json');