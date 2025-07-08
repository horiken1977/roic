const https = require('https');
const fs = require('fs');

/**
 * XBRL要素の詳細調査
 * 現金、株主資本、有利子負債の異常値の原因を特定
 */
async function investigateXBRLElements() {
  console.log('🔬 XBRL要素詳細調査');
  console.log('=' .repeat(60));
  
  console.log('📋 調査目的:');
  console.log('1. 現金が-134,089百万円（負の値）になる原因');
  console.log('2. 株主資本が0.136百万円（異常に小さい）になる原因');
  console.log('3. 2025年3月期データを取得している原因');
  console.log('4. 正しいXBRL要素と修正方針の特定');
  
  try {
    // 1. 既存のロジックでどの要素を取得しているか確認
    console.log('\n🔍 ステップ1: 現在のXBRL要素取得状況の確認');
    await investigateCurrentLogic();
    
    // 2. デバッグデータでコンテキスト詳細を確認
    console.log('\n🔍 ステップ2: コンテキスト詳細調査');
    const debugData = await fetchDetailedDebugData();
    analyzeDetailedContexts(debugData);
    
    // 3. XBRL構造の調査
    console.log('\n🔍 ステップ3: XBRL構造詳細調査');
    analyzeXBRLStructure(debugData);
    
    // 4. 問題の根本原因特定
    console.log('\n🔍 ステップ4: 根本原因特定');
    identifyRootCauses();
    
    // 5. 修正方針の策定
    console.log('\n🔍 ステップ5: 修正方針策定');
    proposeCorrections();
    
  } catch (error) {
    console.error('❌ XBRL要素調査エラー:', error);
    throw error;
  }
}

/**
 * 現在のロジックでの要素取得状況確認
 */
async function investigateCurrentLogic() {
  console.log('📊 現在のロジック分析:');
  
  // 再設計版APIの要素定義を確認
  const elementMapping = {
    現金: ['CashAndCashEquivalentsIFRS', 'CashAndDeposits', 'CashAndCashEquivalents', 'Cash'],
    株主資本: ['EquityAttributableToOwnersOfParentIFRS', 'EquityIFRS', 'ShareholdersEquity', 'NetAssets', 'TotalNetAssets'],
    売上高: ['TotalNetRevenuesIFRS', 'RevenueIFRS', 'SalesOfProductsIFRS', 'NetSales'],
    営業利益: ['OperatingProfitLossIFRS', 'ProfitLossFromOperatingActivitiesIFRS', 'OperatingIncomeIFRS'],
    総資産: ['TotalAssetsIFRS', 'AssetsIFRS', 'Assets']
  };
  
  console.log('\n📋 定義されたXBRL要素候補:');
  Object.entries(elementMapping).forEach(([項目, 要素リスト]) => {
    console.log(`${項目}:`);
    要素リスト.forEach((要素, index) => {
      console.log(`  ${index + 1}. ${要素}`);
    });
  });
  
  console.log('\n🤔 問題の可能性:');
  console.log('1. CashAndCashEquivalentsIFRS が間違った値を返している');
  console.log('2. EquityAttributableToOwnersOfParentIFRS が単位を間違えて解釈している');
  console.log('3. コンテキストが2025年3月期を指している');
  console.log('4. 要素名そのものが間違っている');
}

/**
 * 詳細デバッグデータ取得
 */
function fetchDetailedDebugData() {
  return new Promise((resolve, reject) => {
    const url = 'https://roic-horikens-projects.vercel.app/api/edinet/real-financial?edinetCode=E02144&fiscalYear=2024&debug=true';
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

/**
 * コンテキスト詳細分析
 */
function analyzeDetailedContexts(debugData) {
  console.log('🎯 コンテキスト詳細分析:');
  
  if (!debugData.success || !debugData.debug) {
    console.log('❌ デバッグデータが取得できません');
    return;
  }
  
  const debug = debugData.debug;
  
  console.log(`\n📊 基本情報:`);
  console.log(`- 総コンテキスト数: ${debug.contexts?.total || '不明'}`);
  console.log(`- 総ファクト数: ${debug.facts?.total || '不明'}`);
  console.log(`- Summary要素数: ${debug.facts?.summaryElementsFound || '不明'}`);
  console.log(`- IFRS要素数: ${debug.facts?.ifrsElementsFound || '不明'}`);
  
  if (debug.contexts?.detailedContexts) {
    console.log('\n🔍 重要なコンテキスト分析:');
    
    const contexts = debug.contexts.detailedContexts;
    const context2024 = [];
    const context2025 = [];
    const contextCurrent = [];
    const contextPrior = [];
    
    Object.entries(contexts).forEach(([id, period]) => {
      if (period.includes('2024-03-31')) {
        context2024.push({ id, period });
      }
      if (period.includes('2025-03-31')) {
        context2025.push({ id, period });
      }
      if (id.includes('Current')) {
        contextCurrent.push({ id, period });
      }
      if (id.includes('Prior')) {
        contextPrior.push({ id, period });
      }
    });
    
    console.log(`\n📅 2024年3月期コンテキスト (${context2024.length}件):`);
    context2024.slice(0, 5).forEach(ctx => {
      console.log(`  ${ctx.id}: ${ctx.period}`);
    });
    
    console.log(`\n📅 2025年3月期コンテキスト (${context2025.length}件):`);
    context2025.slice(0, 5).forEach(ctx => {
      console.log(`  ${ctx.id}: ${ctx.period}`);
    });
    
    console.log(`\n🎯 Current系コンテキスト (${contextCurrent.length}件):`);
    contextCurrent.slice(0, 5).forEach(ctx => {
      console.log(`  ${ctx.id}: ${ctx.period}`);
    });
    
    console.log(`\n🔙 Prior系コンテキスト (${contextPrior.length}件):`);
    contextPrior.slice(0, 5).forEach(ctx => {
      console.log(`  ${ctx.id}: ${ctx.period}`);
    });
    
    // 重要な発見
    if (context2025.length > 0 && contextCurrent.some(ctx => ctx.period.includes('2025-03-31'))) {
      console.log('\n⚠️ 重要な発見: CurrentYear系が2025年3月期を指している！');
      console.log('   これが2025年3月期データ取得の原因です。');
    }
    
    if (context2024.length > 0) {
      console.log('\n✅ 2024年3月期のコンテキストは存在します');
      console.log('   Prior1Year系を使用すべきです。');
    }
  }
}

/**
 * XBRL構造分析
 */
function analyzeXBRLStructure(debugData) {
  console.log('🏗️ XBRL構造分析:');
  
  if (!debugData.success || !debugData.debug) {
    console.log('❌ XBRL構造データが取得できません');
    return;
  }
  
  const debug = debugData.debug;
  
  if (debug.xbrlStructure) {
    console.log(`\n📊 XBRL基本構造:`);
    console.log(`- ルート要素数: ${debug.xbrlStructure.rootElements?.length || '不明'}`);
    console.log(`- XBRL子要素数: ${debug.xbrlStructure.xbrlChildCount || '不明'}`);
    
    if (debug.xbrlStructure.firstFewElements) {
      console.log(`\n🔍 主要要素（上位10件）:`);
      debug.xbrlStructure.firstFewElements.slice(0, 10).forEach((element, index) => {
        console.log(`  ${index + 1}. ${element}`);
      });
    }
  }
  
  console.log('\n🎯 想定される問題要素:');
  console.log('1. CashAndCashEquivalentsIFRS → 負の値を返している');
  console.log('2. EquityAttributableToOwnersOfParentIFRS → 0.136を返している（単位ミス？）');
  console.log('3. コンテキスト選択が間違っている（Current vs Prior1）');
}

/**
 * 根本原因特定
 */
function identifyRootCauses() {
  console.log('🚨 根本原因特定:');
  
  console.log('\n❌ 問題1: 期間設定エラー');
  console.log('原因: CurrentYear系コンテキストが2025年3月期を指している');
  console.log('結果: 2025年3月期のデータを取得（2024年3月期が期待値）');
  console.log('修正: Prior1Year系コンテキストを使用すべき');
  
  console.log('\n❌ 問題2: 現金の負の値');
  console.log('原因: CashAndCashEquivalentsIFRSが間違った要素または値を取得');
  console.log('可能性:');
  console.log('  - 要素名が間違っている');
  console.log('  - 借方・貸方の符号が逆');
  console.log('  - 単位が間違っている');
  console.log('  - Summary要素を取得している');
  
  console.log('\n❌ 問題3: 株主資本の異常に小さい値');
  console.log('原因: EquityAttributableToOwnersOfParentIFRSが0.136を返している');
  console.log('可能性:');
  console.log('  - 単位ミス（円 vs 千円 vs 百万円）');
  console.log('  - 要素名が間違っている');
  console.log('  - データ形式の解釈ミス');
  
  console.log('\n❌ 問題4: コンテキストマッチングロジック');
  console.log('原因: findTargetPeriodContextsRedesigned関数の選択ロジック');
  console.log('問題: CurrentYear系を優先選択している');
  console.log('修正: 2024年3月期の場合はPrior1Year系を選択すべき');
}

/**
 * 修正方針策定
 */
function proposeCorrections() {
  console.log('🔧 修正方針策定:');
  
  console.log('\n🎯 修正1: コンテキスト選択の修正');
  console.log('問題: CurrentYearが2025年3月期を指している');
  console.log('修正方針:');
  console.log('  1. fiscalYear=2024の場合、Prior1Year系を優先使用');
  console.log('  2. 完全一致での期間チェックを強化');
  console.log('  3. パターンマッチングの順序を変更');
  
  console.log('\n🎯 修正2: 現金要素の修正');
  console.log('問題: CashAndCashEquivalentsIFRSが-134,089百万円');
  console.log('修正方針:');
  console.log('  1. 要素名の見直し（Cash, CashAndDeposits等）');
  console.log('  2. 符号チェックの追加');
  console.log('  3. 単位確認の強化');
  console.log('  4. Summary要素の完全除外確認');
  
  console.log('\n🎯 修正3: 株主資本要素の修正');
  console.log('問題: EquityAttributableToOwnersOfParentIFRSが0.136');
  console.log('修正方針:');
  console.log('  1. 単位の明示的確認（decimals属性チェック）');
  console.log('  2. 要素名の見直し');
  console.log('  3. 値の妥当性チェック追加');
  
  console.log('\n🎯 修正4: デバッグ機能の強化');
  console.log('修正方針:');
  console.log('  1. 使用されたコンテキストIDの明示');
  console.log('  2. 取得された生の値の表示');
  console.log('  3. XBRL要素の詳細情報出力');
  console.log('  4. 単位・符号情報の表示');
  
  console.log('\n📋 実装優先順位:');
  console.log('1. 【最高】コンテキスト選択ロジックの修正（期間問題の解決）');
  console.log('2. 【高】現金・株主資本のXBRL要素見直し');
  console.log('3. 【中】デバッグ情報の強化');
  console.log('4. 【低】エラーハンドリングの改善');
  
  // 修正案をファイルに保存
  const correctionPlan = {
    調査日時: new Date().toISOString(),
    問題特定: {
      期間設定: 'CurrentYear系が2025年3月期を指している',
      現金異常値: 'CashAndCashEquivalentsIFRSが-134,089百万円',
      株主資本異常値: 'EquityAttributableToOwnersOfParentIFRSが0.136',
    },
    修正方針: {
      コンテキスト選択: 'Prior1Year系の優先使用',
      現金要素: '要素名・符号・単位の見直し',
      株主資本要素: '単位の明示的確認',
      デバッグ強化: '詳細情報の出力'
    },
    実装優先順位: [
      'コンテキスト選択ロジック修正',
      'XBRL要素見直し',
      'デバッグ情報強化',
      'エラーハンドリング改善'
    ]
  };
  
  fs.writeFileSync('XBRL要素調査結果_修正方針_2025-07-07.json', JSON.stringify(correctionPlan, null, 2), 'utf8');
  console.log('\n💾 修正方針をファイルに保存: XBRL要素調査結果_修正方針_2025-07-07.json');
}

// 実行
investigateXBRLElements().then(() => {
  console.log('\n🎉 XBRL要素詳細調査完了！');
  console.log('\n📋 次のアクション:');
  console.log('1. コンテキスト選択ロジックの修正実装');
  console.log('2. XBRL要素名の見直しと修正');
  console.log('3. テスト実行と検証');
  
}).catch(error => {
  console.error('\n❌ XBRL要素調査中にエラー:', error.message);
});