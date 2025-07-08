const fs = require('fs');

/**
 * 全データ取得の正確性検証
 * 売上高・営業利益を含む全項目の疑わしいロジックを検証
 */
function verifyAllDataAccuracy() {
  console.log('🔍 全データ取得の正確性検証');
  console.log('='.repeat(60));
  
  console.log('📋 売上高・営業利益も含めて正確性を疑って検証...');
  
  // 既存データの読み込みと分析
  let finalData = null;
  let debugData = null;
  
  try {
    if (fs.existsSync('toyota_final_test_2025-07-06.json')) {
      finalData = JSON.parse(fs.readFileSync('toyota_final_test_2025-07-06.json', 'utf8'));
    }
    if (fs.existsSync('toyota_fixed_data_2025-07-06.json')) {
      debugData = JSON.parse(fs.readFileSync('toyota_fixed_data_2025-07-06.json', 'utf8'));
    }
  } catch (error) {
    console.log('❌ データファイル読み込みエラー:', error.message);
  }
  
  console.log('🎯 各データの詳細検証:');
  
  const 検証結果 = {
    
    // 1. 売上高の検証
    売上高: {
      API取得値: finalData?.財務データ?.売上高?.値,
      表示: finalData?.財務データ?.売上高?.表示,
      XBRL要素: finalData?.財務データ?.売上高?.XBRL要素,
      状態: finalData?.財務データ?.売上高?.状態,
      
      有価証券報告書期待値: {
        '2024年3月期': '45,095,325百万円',
        '2025年3月期': '未確認'
      },
      
      疑わしい点: [
        'TotalNetRevenuesIFRS の正確性',
        'CurrentYearDuration が2024年3月期を指しているか',
        'フォールバック処理で古いデータを取得していないか'
      ],
      
      検証方法: 'デバッグデータでコンテキストとXBRL要素を確認',
      
      判定: null // 後で設定
    },
    
    // 2. 営業利益の検証
    営業利益: {
      API取得値: finalData?.財務データ?.営業利益?.値,
      表示: finalData?.財務データ?.営業利益?.表示,
      XBRL要素: finalData?.財務データ?.営業利益?.XBRL要素,
      状態: finalData?.財務データ?.営業利益?.状態,
      
      有価証券報告書期待値: {
        '2024年3月期': '5,352,934百万円',
        '2025年3月期': '未確認'
      },
      
      疑わしい点: [
        'OperatingProfitLossIFRS の正確性',
        'CurrentYearDuration が2024年3月期を指しているか',
        'ProfitLossBeforeTaxIFRSSummaryOfBusinessResults (Summary要素) が混入していないか'
      ],
      
      検証方法: 'デバッグデータでコンテキストとXBRL要素を確認',
      
      判定: null
    },
    
    // 3. 総資産の検証（既知の問題）
    総資産: {
      API取得値: finalData?.財務データ?.総資産?.値,
      表示: finalData?.財務データ?.総資産?.表示,
      XBRL要素: finalData?.財務データ?.総資産?.XBRL要素,
      状態: finalData?.財務データ?.総資産?.状態,
      
      有価証券報告書期待値: {
        '2024年3月期': '90,114,296百万円',
        '2025年3月期': '未確認'
      },
      
      確認済み問題: [
        '❌ TotalAssetsIFRSSummaryOfBusinessResults (Summary要素)',
        '❌ Prior4YearInstant コンテキスト',
        '❌ 62.27兆円 vs 正しい90.11兆円（-30.90%の差異）'
      ],
      
      判定: '❌ 不正確（4年前のデータ）'
    }
  };
  
  console.log('\\n📊 デバッグデータからの詳細分析:');
  
  if (debugData?.デバッグ情報) {
    const debug = debugData.デバッグ情報;
    
    console.log('\\n【売上関連要素の詳細確認】:');
    const salesElements = debug.facts?.salesRelated || [];
    salesElements.forEach((element, index) => {
      console.log(`${index + 1}. ${element.key}`);
      console.log(`   - サンプル値: ${element.sampleValue}`);
      console.log(`   - 兆円換算: ${(Number(element.sampleValue) / 1000000000000).toFixed(2)}兆円`);
      console.log(`   - コンテキスト例: ${element.contexts?.[0]?.[0] || 'N/A'}`);
      
      // 売上高として使用されている要素をチェック
      if (element.key === 'TotalNetRevenuesIFRS') {
        console.log(`   🎯 これが売上高として使用されている要素`);
        
        // 45.1兆円（API取得値）との整合性確認
        const apiValue = finalData?.財務データ?.売上高?.値;
        if (apiValue && Math.abs(Number(element.sampleValue) - Number(apiValue)) < 1000000) {
          console.log(`   ✅ API取得値と一致: ${Number(apiValue).toLocaleString()}円`);
          検証結果.売上高.判定 = '✅ 数値一致（コンテキスト要確認）';
        } else {
          console.log(`   ❌ API取得値と不一致: API=${Number(apiValue).toLocaleString()}円`);
          検証結果.売上高.判定 = '❌ 数値不一致';
        }
      }
    });
    
    console.log('\\n【利益関連要素の詳細確認】:');
    const profitElements = debug.facts?.profitRelated || [];
    profitElements.forEach((element, index) => {
      console.log(`${index + 1}. ${element.key}`);
      console.log(`   - サンプル値: ${element.sampleValue}`);
      console.log(`   - 兆円換算: ${(Number(element.sampleValue) / 1000000000000).toFixed(2)}兆円`);
      console.log(`   - コンテキスト例: ${element.contexts?.[0]?.[0] || 'N/A'}`);
      
      // 営業利益として使用されている要素をチェック
      if (element.key === 'OperatingProfitLossIFRS') {
        console.log(`   🎯 これが営業利益として使用されている要素`);
        
        // 5.4兆円（API取得値）との整合性確認
        const apiValue = finalData?.財務データ?.営業利益?.値;
        if (apiValue && Math.abs(Number(element.sampleValue) - Number(apiValue)) < 1000000) {
          console.log(`   ✅ API取得値と一致: ${Number(apiValue).toLocaleString()}円`);
          検証結果.営業利益.判定 = '✅ 数値一致（コンテキスト要確認）';
        } else {
          console.log(`   ❌ API取得値と不一致: API=${Number(apiValue).toLocaleString()}円`);
          検証結果.営業利益.判定 = '❌ 数値不一致';
        }
      }
    });
    
    console.log('\\n【資産関連要素の詳細確認】:');
    const assetElements = debug.facts?.assetRelated || [];
    assetElements.forEach((element, index) => {
      console.log(`${index + 1}. ${element.key}`);
      console.log(`   - サンプル値: ${element.sampleValue}`);
      console.log(`   - 兆円換算: ${(Number(element.sampleValue) / 1000000000000).toFixed(2)}兆円`);
      console.log(`   - コンテキスト例: ${element.contexts?.[0]?.[0] || 'N/A'}`);
      
      // 有価証券報告書の正しい値（90.11兆円）との比較
      const correctValue = 90114296000000;
      const difference = Math.abs(Number(element.sampleValue) - correctValue) / correctValue * 100;
      console.log(`   - 正しい値との差異: ${difference.toFixed(2)}%`);
      
      if (difference < 5) {
        console.log(`   ✅ 正しい値に近い（±5%以内）`);
      } else if (difference < 10) {
        console.log(`   ⚠️ 許容範囲（±10%以内）`);
      } else {
        console.log(`   ❌ 大きな差異（±10%超）`);
      }
    });
    
    // コンテキスト期間の詳細確認
    console.log('\\n【コンテキスト期間の詳細確認】:');
    console.log(`現在期間設定: ${debug.contexts?.currentPeriodContext?.startDate} ～ ${debug.contexts?.currentPeriodContext?.endDate}`);
    console.log(`現在期間ID: ${debug.contexts?.currentPeriodContextId}`);
    
    // 2024年3月期（2023-04-01 ～ 2024-03-31）のコンテキスト検索
    const availableContexts = debug.contexts?.availableContextIds || [];
    const related2024Contexts = availableContexts.filter(id => 
      id.includes('Prior1Year') || 
      id.includes('2024') ||
      (id.includes('CurrentYear') && debug.contexts?.currentPeriodContext?.endDate?.includes('2024'))
    );
    
    console.log('\\n2024年3月期関連コンテキスト:');
    related2024Contexts.slice(0, 10).forEach(contextId => {
      console.log(`- ${contextId}`);
    });
    
    if (debug.contexts?.currentPeriodContext?.endDate?.includes('2025')) {
      console.log('\\n🚨 重大な問題発見:');
      console.log('- CurrentYear が 2025年3月期を指している');
      console.log('- 2024年3月期データを取得するには Prior1Year を使用する必要がある');
      console.log('- しかし売上高・営業利益は CurrentYearDuration を使用している');
      console.log('- → 売上高・営業利益も2025年3月期のデータの可能性が高い');
      
      検証結果.売上高.判定 = '❌ 2025年3月期のデータの可能性';
      検証結果.営業利益.判定 = '❌ 2025年3月期のデータの可能性';
    }
  }
  
  console.log('\\n🔍 期間設定の根本的問題:');
  console.log('');
  console.log('【API呼び出しパラメータの確認】:');
  console.log('- fiscalYear=2024 で呼び出し');
  console.log('- しかし実際の期間: 2024-04-01 ～ 2025-03-31');
  console.log('- これは2025年3月期を意味する');
  console.log('');
  console.log('【正しい期間との比較】:');
  console.log('❌ 現在: 2024-04-01 ～ 2025-03-31 (2025年3月期)');
  console.log('✅ 正しい: 2023-04-01 ～ 2024-03-31 (2024年3月期)');
  console.log('');
  console.log('【影響範囲】:');
  console.log('- CurrentYearDuration → 2025年3月期');
  console.log('- CurrentYearInstant → 2025年3月31日時点');
  console.log('- Prior1YearDuration → 2024年3月期 ← 本来これを使うべき');
  console.log('- Prior1YearInstant → 2024年3月31日時点 ← 本来これを使うべき');
  
  console.log('\\n🚨 全データが疑わしい理由:');
  console.log('1. ❌ fiscalYear=2024 の解釈ミス');
  console.log('   - 意図: 2024年3月期（2023年4月～2024年3月）');
  console.log('   - 実際: 2025年3月期（2024年4月～2025年3月）');
  console.log('');
  console.log('2. ❌ CurrentYear系コンテキストの誤用');
  console.log('   - 売上高: CurrentYearDuration (2025年3月期)');
  console.log('   - 営業利益: CurrentYearDuration (2025年3月期)');
  console.log('   - 総資産: CurrentYearInstant → フォールバックでPrior4Year');
  console.log('');
  console.log('3. ❌ 有価証券報告書との期間不一致');
  console.log('   - API: 2025年3月期データ取得');
  console.log('   - 期待値: 2024年3月期の有価証券報告書値で比較');
  console.log('   - → 比較する期間が1年ずれている');
  
  // 修正方針の詳細
  console.log('\\n🔧 根本的修正方針:');
  console.log('');
  console.log('【1. 期間設定の修正】:');
  console.log('- fiscalYear=2024 → 正しく2024年3月期を指すよう修正');
  console.log('- または Prior1Year系コンテキストを明示的に使用');
  console.log('');
  console.log('【2. 全XBRL要素の見直し】:');
  console.log('- Summary要素を優先リストから完全除外');
  console.log('- 正確なIFRS要素のみを使用');
  console.log('- フォールバック処理の厳格化');
  console.log('');
  console.log('【3. データ取得ロジックの再設計】:');
  console.log('- 売上高: TotalNetRevenuesIFRS + Prior1YearDuration');
  console.log('- 営業利益: OperatingProfitLossIFRS + Prior1YearDuration');
  console.log('- 総資産: TotalAssetsIFRS + Prior1YearInstant');
  console.log('- 現金: CashAndCashEquivalentsIFRS + Prior1YearInstant');
  console.log('- 株主資本: EquityAttributableToOwnersOfParentIFRS + Prior1YearInstant');
  console.log('');
  console.log('【4. 期待値データの統一】:');
  console.log('- 全て2024年3月期の有価証券報告書値に統一');
  console.log('- 2025年3月期データとの混在を回避');
  
  // 検証結果の保存
  const verificationReport = {
    検証日時: new Date().toISOString(),
    重大な発見: {
      期間設定問題: 'fiscalYear=2024が2025年3月期を指している',
      全データ疑義: '売上高・営業利益も2025年3月期の可能性',
      比較期間不一致: 'API(2025年3月期) vs 期待値(2024年3月期)'
    },
    検証結果: 検証結果,
    修正必要項目: [
      'fiscalYear パラメータの解釈修正',
      '全コンテキストをPrior1Year系に変更',
      'Summary要素の完全除外',
      'フォールバック処理の厳格化',
      '期待値データの2024年3月期統一'
    ],
    優先度: {
      最高: '期間設定の根本的修正',
      高: 'Summary要素除外',
      中: 'フォールバック処理改善',
      低: 'エラーハンドリング改善'
    }
  };
  
  fs.writeFileSync('全データ正確性検証結果_2025-07-07.json', JSON.stringify(verificationReport, null, 2), 'utf8');
  
  return verificationReport;
}

// 実行
const result = verifyAllDataAccuracy();

console.log('\\n💾 全データ正確性検証完了: 全データ正確性検証結果_2025-07-07.json');
console.log('\\n🚨 結論: 売上高・営業利益も含めて全データが疑わしい');
console.log('　　　　　期間設定が根本的に間違っており、2025年3月期のデータを取得している可能性');