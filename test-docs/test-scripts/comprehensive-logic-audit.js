const fs = require('fs');

/**
 * 全データ取得ロジックの雑な仕様確認
 * フォールバック処理の総点検
 */
function comprehensiveLogicAudit() {
  console.log('🔍 全データ取得ロジックの雑な仕様確認');
  console.log('='.repeat(60));
  
  console.log('📋 real-financial.js の全フォールバック処理を詳細分析...');
  
  // real-financial.js のソースコード読み込み（模擬）
  const apiLogicAnalysis = {
    
    // 1. 売上高の取得ロジック
    売上高: {
      対象行: '348-354行目',
      XBRL要素: [
        'TotalNetRevenuesIFRS',
        'SalesOfProductsIFRS', 
        'OperatingRevenuesIFRSKeyFinancialData',
        'RevenueIFRS',
        'NetSales'
      ],
      指定コンテキスト: 'CurrentYearDuration',
      フォールバック有無: 'あり（558-632行目のextractNumericValue）',
      問題: 'Duration系なので比較的安全だが、フォールバック処理が雑'
    },
    
    // 2. 営業利益の取得ロジック
    営業利益: {
      対象行: '356-362行目',
      XBRL要素: [
        'OperatingProfitLossIFRS',
        'ProfitLossFromOperatingActivitiesIFRS',
        'ProfitLossBeforeTaxIFRSSummaryOfBusinessResults',
        'OperatingIncomeIFRS'
      ],
      指定コンテキスト: 'CurrentYearDuration',
      フォールバック有無: 'あり（558-632行目のextractNumericValue）',
      問題: 'Duration系なので比較的安全だが、フォールバック処理が雑'
    },
    
    // 3. 総資産の取得ロジック ←【問題発覚済み】
    総資産: {
      対象行: '364-369行目',
      XBRL要素: [
        'TotalAssetsIFRSSummaryOfBusinessResults', // ← これが問題
        'AssetsIFRS',
        'Assets'
      ],
      指定コンテキスト: 'CurrentYearInstant',
      フォールバック有無: 'あり（558-632行目のextractNumericValue）',
      問題: '❌ 1番目の要素がSummary用でPrior4YearInstantを取得'
    },
    
    // 4. 現金及び現金同等物の取得ロジック
    現金及び現金同等物: {
      対象行: '371-378行目',
      XBRL要素: [
        'CashAndCashEquivalentsIFRS',
        'CashAndCashEquivalentsIFRSSummaryOfBusinessResults', // ← Summary要素
        'CashAndDeposits',
        'CashAndCashEquivalents',
        'Cash'
      ],
      指定コンテキスト: 'CurrentYearInstant',
      フォールバック有無: 'あり（558-632行目のextractNumericValue）',
      問題: '⚠️ 2番目の要素がSummary用で古いデータの可能性'
    },
    
    // 5. 株主資本の取得ロジック
    株主資本: {
      対象行: '380-388行目',
      XBRL要素: [
        'EquityAttributableToOwnersOfParentIFRS',
        'EquityAttributableToOwnersOfParentIFRSSummaryOfBusinessResults', // ← Summary要素
        'EquityIFRS',
        'NetAssets',
        'ShareholdersEquity',
        'TotalNetAssets'
      ],
      指定コンテキスト: 'CurrentYearInstant',
      フォールバック有無: 'あり（558-632行目のextractNumericValue）',
      問題: '⚠️ 2番目の要素がSummary用で古いデータの可能性'
    },
    
    // 6. 有利子負債の取得ロジック
    有利子負債: {
      対象行: '391行目（calculateInterestBearingDebt）',
      計算方式: '短期負債 + 長期負債 + 社債',
      短期負債XBRL要素: [
        'BorrowingsCurrentIFRS',
        'ShortTermLoansPayable',
        'ShortTermBorrowings',
        'CurrentPortionOfLongTermLoansPayable'
      ],
      長期負債XBRL要素: [
        'BorrowingsNoncurrentIFRS',
        'LongTermLoansPayable',
        'LongTermDebt',
        'LongTermBorrowings'
      ],
      社債XBRL要素: [
        'BondsPayableIFRS',
        'BondsPayable',
        'CorporateBonds'
      ],
      指定コンテキスト: 'CurrentYearInstant',
      フォールバック有無: 'あり（各要素でextractNumericValue）',
      問題: '⚠️ 3つの計算要素すべてでフォールバック処理が働く可能性'
    },
    
    // 7. 税率の取得ロジック
    税率: {
      対象行: '394行目（calculateTaxRate）',
      計算方式: '法人税等 ÷ 税引前利益',
      法人税等XBRL要素: [
        'IncomeTaxExpenseIFRS',
        'IncomeTaxes',
        'IncomeTaxesCurrent',
        'CorporateIncomeTaxes'
      ],
      税引前利益XBRL要素: [
        'ProfitLossBeforeTaxIFRS',
        'IncomeBeforeIncomeTaxes',
        'ProfitBeforeIncomeTaxes',
        'IncomeBeforeTax'
      ],
      フォールバック有無: 'あり + デフォルト値30%',
      問題: '⚠️ 計算失敗時に一律30%という雑な設定'
    }
  };
  
  console.log('📊 フォールバック処理の詳細分析:');
  console.log('');
  
  console.log('【extractNumericValue関数 558-632行目の問題】');
  console.log('1. 完全一致検索（563-577行目）');
  console.log('2. 部分一致検索（579-597行目）');  
  console.log('3. ❌ 雑なフォールバック処理（599-617行目）:');
  console.log('   ```javascript');
  console.log('   const fact = facts[key].find(f => {');
  console.log('     const refValue = Array.isArray(f.contextRef) ? f.contextRef[0] : f.contextRef;');
  console.log('     return refValue && (refValue.includes("CurrentYear") || refValue.includes("Prior1Year"));');
  console.log('   });');
  console.log('   ```');
  console.log('   → CurrentYearもPrior1Yearも見つからない場合、');
  console.log('   → Prior4Year等の古いデータを拾ってしまう！');
  console.log('');
  
  console.log('4. ❌ 最終的に0を返す（632行目）:');
  console.log('   ```javascript');
  console.log('   return 0;');
  console.log('   ```');
  console.log('   → データが見つからない場合、警告なしに0を返す');
  console.log('');
  
  console.log('🚨 同様の問題が発生する可能性のある項目:');
  
  Object.entries(apiLogicAnalysis).forEach(([項目名, 分析]) => {
    console.log(`\\n【${項目名}】`);
    console.log(`- XBRL要素: ${分析.XBRL要素 ? 分析.XBRL要素.join(', ') : '複合計算'}`);
    console.log(`- コンテキスト: ${分析.指定コンテキスト || '複数'}`);
    
    // Summary要素の問題チェック
    const summaryElements = 分析.XBRL要素?.filter(el => el.includes('Summary')) || [];
    if (summaryElements.length > 0) {
      console.log(`⚠️ Summary要素あり: ${summaryElements.join(', ')}`);
      console.log(`   → 古いデータを取得する可能性`);
    }
    
    console.log(`- 問題レベル: ${分析.問題}`);
  });
  
  console.log('\\n🎯 具体的な問題パターン:');
  
  console.log('\\n1. ❌【Summary要素の問題】:');
  console.log('   - TotalAssetsIFRSSummaryOfBusinessResults');
  console.log('   - CashAndCashEquivalentsIFRSSummaryOfBusinessResults');
  console.log('   - EquityAttributableToOwnersOfParentIFRSSummaryOfBusinessResults');
  console.log('   - ProfitLossBeforeTaxIFRSSummaryOfBusinessResults');
  console.log('   → これらは過去数年分のサマリー用で当期データなし');
  
  console.log('\\n2. ❌【フォールバック処理の問題】:');
  console.log('   - CurrentYear見つからず → Prior1Year探す');
  console.log('   - Prior1Year見つからず → Prior4Yearを取得してしまう');
  console.log('   - エラーを出さずに古いデータで継続');
  
  console.log('\\n3. ❌【デフォルト値の問題】:');
  console.log('   - 税率: 計算失敗時に一律30%');
  console.log('   - 各項目: 見つからない場合に0');
  console.log('   → 適切な警告なしに不正確な値を使用');
  
  console.log('\\n4. ❌【複合計算の問題】:');
  console.log('   - 有利子負債 = 短期 + 長期 + 社債');
  console.log('   - 各要素でフォールバック → 部分的に古いデータ混入');
  console.log('   - 税率 = 法人税等 ÷ 税引前利益');
  console.log('   - 各要素でフォールバック → 計算結果が不正確');
  
  console.log('\\n📋 実際のデータで問題確認:');
  
  // 既存のテストデータを分析
  try {
    if (fs.existsSync('toyota_final_test_2025-07-06.json')) {
      const finalData = JSON.parse(fs.readFileSync('toyota_final_test_2025-07-06.json', 'utf8'));
      
      console.log('\\n【現在のAPI取得値確認】:');
      console.log(`- 売上高: ${finalData.財務データ?.売上高?.表示} (${finalData.財務データ?.売上高?.状態})`);
      console.log(`- 営業利益: ${finalData.財務データ?.営業利益?.表示} (${finalData.財務データ?.営業利益?.状態})`);
      console.log(`- 総資産: ${finalData.財務データ?.総資産?.表示} (${finalData.財務データ?.総資産?.状態})`);
      
      console.log('\\n⚠️ 他の項目も同様の問題の可能性:');
      console.log('- 現金: 負の値だった履歴あり（修正済み？）');
      console.log('- 株主資本: 比率エラーの履歴あり（修正済み？）');
      console.log('- 有利子負債: 過小計上の履歴あり（修正済み？）');
    }
  } catch (error) {
    console.log('❌ テストデータ読み込みエラー:', error.message);
  }
  
  console.log('\\n🔧 修正が必要な箇所の優先順位:');
  
  const 修正優先順位 = [
    {
      優先度: '🚨 緊急',
      項目: 'extractNumericValue関数のフォールバック処理',
      問題: 'Prior4Year等の古いデータを自動選択',
      影響: '全ての財務データ取得に影響'
    },
    {
      優先度: '🔴 高',
      項目: 'Summary要素の削除',
      問題: 'TotalAssetsIFRSSummaryOfBusinessResults等',
      影響: '総資産、現金、株主資本が古いデータになる'
    },
    {
      優先度: '🟡 中',
      項目: 'デフォルト値の見直し',
      問題: '税率30%、見つからない場合0',
      影響: '計算精度が低下'
    },
    {
      優先度: '🟢 低',
      項目: 'エラーハンドリングの改善',
      問題: '警告なしに不正確なデータで継続',
      影響: 'デバッグが困難'
    }
  ];
  
  修正優先順位.forEach((項目, index) => {
    console.log(`\\n${index + 1}. ${項目.優先度} ${項目.項目}`);
    console.log(`   問題: ${項目.問題}`);
    console.log(`   影響: ${項目.影響}`);
  });
  
  // 修正方針の提示
  console.log('\\n🎯 修正方針:');
  console.log('1. ❌ 雑なフォールバック処理を厳格化');
  console.log('2. ❌ Summary要素を優先リストから除外');
  console.log('3. ✅ 適切なエラーハンドリング追加');
  console.log('4. ✅ データ品質チェック機能追加');
  console.log('5. ✅ 取得失敗時の明確な警告');
  
  const auditResult = {
    調査日時: new Date().toISOString(),
    問題のあるロジック: {
      extractNumericValue関数: 'フォールバック処理が雑すぎる',
      Summary要素: '4つの項目で古いデータ取得リスク',
      デフォルト値: '不正確な値での継続',
      エラーハンドリング: '警告なしに問題を隠蔽'
    },
    影響範囲: {
      確認済み: '総資産（Prior4YearInstant取得）',
      疑い: '現金、株主資本、有利子負債、税率',
      安全: '売上高、営業利益（Duration系）'
    },
    修正優先度: 修正優先順位
  };
  
  fs.writeFileSync('全ロジック監査結果_2025-07-07.json', JSON.stringify(auditResult, null, 2), 'utf8');
  
  return auditResult;
}

// 実行
const result = comprehensiveLogicAudit();

console.log('\\n💾 全ロジック監査完了: 全ロジック監査結果_2025-07-07.json');
console.log('\\n🚨 結論: 複数の項目で「見つからなかったら適当に取る」雑な仕様を確認');
console.log('　　　　 特にSummary要素とフォールバック処理に重大な問題あり');