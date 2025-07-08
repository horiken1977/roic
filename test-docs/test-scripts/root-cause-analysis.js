/**
 * 4年前データ取得の根本原因分析
 */
function analyzeRootCause() {
  console.log('🔍 4年前データ取得の根本原因分析');
  console.log('='.repeat(60));
  
  console.log('📋 問題の詳細:');
  console.log('- 期待値: 2024年3月期（2023年4月1日～2024年3月31日）');
  console.log('- 実際取得: 4年前のデータ（Prior4YearInstant）');
  console.log('- 取得値: 62.27兆円 vs 正しい値: 90.11兆円');
  
  console.log('\n🚨 根本原因の特定:');
  
  console.log('\n1. 【デバッグデータのコンテキスト分析】');
  console.log('   - 使用コンテキスト: "Prior4YearInstant"');
  console.log('   - これは「4年前の時点」を意味する');
  console.log('   - 2024年3月期を取得するはずが、2020年3月期のデータを取得');
  
  console.log('\n2. 【API実装の問題箇所】');
  console.log('   api/edinet/real-financial.js の以下の箇所に問題:');
  console.log('   ');
  console.log('   【365行目】totalAssets抽出:');
  console.log('   ```javascript');
  console.log('   totalAssets: extractNumericValue(facts, [');
  console.log('     "TotalAssetsIFRSSummaryOfBusinessResults",');
  console.log('     "AssetsIFRS",');
  console.log('     "Assets"');
  console.log('   ], "CurrentYearInstant"),  // ← 正しいコンテキスト指定');
  console.log('   ```');
  
  console.log('\n3. 【extractNumericValue関数の問題】');
  console.log('   558行目のextractNumericValue関数:');
  console.log('   - 指定したコンテキスト（CurrentYearInstant）で値が見つからない');
  console.log('   - フォールバック処理（599-617行目）で間違ったコンテキストを選択');
  console.log('   - Prior4YearInstantが含まれるコンテキストを誤って採用');
  
  console.log('\n4. 【フォールバック処理の問題】');
  console.log('   604-606行目:');
  console.log('   ```javascript');
  console.log('   const fact = facts[key].find(f => {');
  console.log('     const refValue = Array.isArray(f.contextRef) ? f.contextRef[0] : f.contextRef;');
  console.log('     return refValue && (refValue.includes("CurrentYear") || refValue.includes("Prior1Year"));');
  console.log('   });');
  console.log('   ```');
  console.log('   ← "Prior1Year"も含めているが、実際は"Prior4Year"が選ばれた');
  
  console.log('\n5. 【デバッグ情報から判明した実態】');
  console.log('   toyota_fixed_data_2025-07-06.json の380行目:');
  console.log('   - TotalAssetsIFRSSummaryOfBusinessResults');
  console.log('   - sampleValue: "62267140000000"');
  console.log('   - contexts: ["Prior4YearInstant", "Prior3YearInstant", "Prior2YearInstant"]');
  console.log('   → CurrentYearInstantやPrior1YearInstantが存在しない！');
  
  console.log('\n🎯 問題の本質:');
  console.log('1. **XBRL要素選択ミス**: TotalAssetsIFRSSummaryOfBusinessResults');
  console.log('   - この要素は「サマリー」用で、過去数年分のデータのみ');
  console.log('   - 当期（CurrentYear）のデータが含まれていない');
  console.log('   - 正しくは "TotalAssetsIFRS" を使用すべき');
  
  console.log('\n2. **コンテキスト期間の混乱**:');
  console.log('   - API設定: fiscalYear=2024 (2024年3月期の意図)');
  console.log('   - 実際の期間設定: 2024-04-01～2025-03-31 (2025年3月期)');
  console.log('   - この食い違いによりCurrentYearが2025年3月期を指している');
  
  console.log('\n3. **フォールバック処理の不備**:');
  console.log('   - 適切なコンテキストが見つからない場合');
  console.log('   - Prior4YearInstantを選択してしまう設計');
  console.log('   - エラーで停止すべきところを継続してしまった');
  
  console.log('\n📊 影響範囲の分析:');
  console.log('✅ 売上高: 正常（TotalNetRevenuesIFRS、CurrentYearDuration）');
  console.log('✅ 営業利益: 正常（OperatingProfitLossIFRS、CurrentYearDuration）');
  console.log('❌ 総資産: 異常（TotalAssetsIFRSSummaryOfBusinessResults、Prior4YearInstant）');
  console.log('');
  console.log('→ 売上・営業利益は"Duration"（期間）で正しく取得');
  console.log('→ 総資産は"Instant"（時点）で間違ったデータを取得');
  
  console.log('\n🔧 修正すべき箇所:');
  console.log('1. **XBRL要素名の修正**:');
  console.log('   - TotalAssetsIFRSSummaryOfBusinessResults');
  console.log('   → TotalAssetsIFRS');
  
  console.log('\n2. **コンテキスト期間の修正**:');
  console.log('   - 2024年3月期（2023-04-01～2024-03-31）の正しい設定');
  console.log('   - Prior1YearInstant使用（CurrentYearが2025年3月期のため）');
  
  console.log('\n3. **フォールバック処理の改善**:');
  console.log('   - 適切なコンテキストが見つからない場合のエラーハンドリング');
  console.log('   - Prior4Year等の古いデータを自動選択しない制御');
  
  console.log('\n4. **期待値データの修正**:');
  console.log('   - 現在の期待値: 2025年3月期ベース');
  console.log('   → 2024年3月期の正しい有価証券報告書値に変更');
  
  console.log('\n📝 修正アクションプラン:');
  console.log('1. api/edinet/real-financial.js の365行目修正');
  console.log('2. extractNumericValue関数のフォールバック処理改善');
  console.log('3. 2024年3月期の正しいデータ再取得');
  console.log('4. 期待値データの2024年3月期への統一');
  console.log('5. 修正版テストの実行と検証');
  
  const rootCauseReport = {
    問題: '4年前（2020年3月期）のデータを誤取得',
    根本原因: {
      主要因: 'XBRL要素選択ミス（TotalAssetsIFRSSummaryOfBusinessResults）',
      副要因: [
        'コンテキスト期間の混乱（2024年度 vs 2025年度）',
        'フォールバック処理でPrior4YearInstantを選択',
        '期待値データが2025年3月期ベース'
      ]
    },
    影響範囲: {
      正常: ['売上高（CurrentYearDuration）', '営業利益（CurrentYearDuration）'],
      異常: ['総資産（Prior4YearInstant）']
    },
    修正必要箇所: [
      'api/edinet/real-financial.js 365行目 XBRL要素名',
      'extractNumericValue関数 フォールバック処理',
      '期待値データ 2024年3月期への統一',
      'コンテキスト期間設定の見直し'
    ],
    検証方法: [
      '修正後のAPI値 vs 有価証券報告書値の突合',
      '総資産: 90,114,296百万円との差異確認',
      'ROIC計算値の妥当性確認'
    ]
  };
  
  return rootCauseReport;
}

// 実行
const report = analyzeRootCause();

console.log('\n💾 根本原因分析レポート生成完了');
console.log('\n🎯 結論: XBRL要素選択ミスとフォールバック処理の問題により');
console.log('　　　　　2020年3月期（4年前）のデータを誤取得していた');