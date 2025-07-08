const https = require('https');
const fs = require('fs');

/**
 * 総資産データの詳細調査
 * 6.22671E+13 vs 90,114,296百万円の差異原因特定
 */
async function debugAssetsInvestigation() {
  console.log('🔍 総資産データ詳細調査開始');
  console.log('='.repeat(60));
  
  try {
    console.log('📂 既存データファイル分析中...');
    
    // 最終テストデータ確認
    const finalTestFile = 'toyota_final_test_2025-07-06.json';
    const debugFile = 'toyota_fixed_data_2025-07-06.json';
    
    if (!fs.existsSync(finalTestFile)) {
      console.log('❌ 最終テストファイルが見つかりません');
      return;
    }
    
    const finalData = JSON.parse(fs.readFileSync(finalTestFile, 'utf8'));
    const debugData = JSON.parse(fs.readFileSync(debugFile, 'utf8'));
    
    console.log('📊 現在の総資産データ分析:');
    console.log(`- API取得値: ${finalData.財務データ?.総資産?.値}`);
    console.log(`- 表示形式: ${finalData.財務データ?.総資産?.表示}`);
    console.log(`- XBRL要素: ${finalData.財務データ?.総資産?.XBRL要素}`);
    console.log(`- 状態: ${finalData.財務データ?.総資産?.状態}`);
    
    console.log('\n🔎 6.22671E+13の詳細:');
    const currentValue = finalData.財務データ?.総資産?.値;
    console.log(`- 科学記法: ${currentValue}`);
    console.log(`- 通常表記: ${Number(currentValue).toLocaleString()}円`);
    console.log(`- 兆円換算: ${(Number(currentValue) / 1000000000000).toFixed(2)}兆円`);
    console.log(`- 百万円換算: ${(Number(currentValue) / 1000000).toLocaleString()}百万円`);
    
    console.log('\n📋 正しい2024年3月期総資産:');
    console.log('- 有価証券報告書記載値: 90,114,296百万円');
    console.log('- 円換算: 90,114,296,000,000円');
    console.log('- 兆円換算: 90.11兆円');
    
    console.log('\n📊 差異分析:');
    const correctValue = 90114296000000; // 90,114,296百万円を円に変換
    const differenceAmount = Number(currentValue) - correctValue;
    const differencePercent = ((Number(currentValue) - correctValue) / correctValue * 100).toFixed(2);
    
    console.log(`- API値 vs 正しい値の差異: ${differenceAmount.toLocaleString()}円`);
    console.log(`- 差異率: ${differencePercent}%`);
    console.log(`- API値が${Number(currentValue) > correctValue ? '過大' : '過小'}: ${Math.abs(differenceAmount / 1000000000000).toFixed(2)}兆円`);
    
    console.log('\n🔍 XBRL要素詳細調査:');
    
    // 資産関連要素の詳細分析
    const assetRelated = debugData.デバッグ情報?.facts?.assetRelated || [];
    
    console.log('\\n📋 資産関連XBRL要素分析:');
    assetRelated.forEach((item, index) => {
      console.log(`\\n${index + 1}. ${item.key}`);
      console.log(`   - カウント: ${item.count}`);
      console.log(`   - サンプル値: ${item.sampleValue}`);
      console.log(`   - 円換算: ${Number(item.sampleValue).toLocaleString()}円`);
      console.log(`   - 兆円換算: ${(Number(item.sampleValue) / 1000000000000).toFixed(2)}兆円`);
      console.log(`   - 百万円換算: ${(Number(item.sampleValue) / 1000000).toLocaleString()}百万円`);
      
      if (item.contexts && item.contexts[0]) {
        console.log(`   - コンテキスト例: ${item.contexts[0][0]}`);
      }
      
      // 正しい値との比較
      if (item.sampleValue) {
        const itemDifference = Number(item.sampleValue) - correctValue;
        const itemDifferencePercent = Math.abs(itemDifference / correctValue * 100).toFixed(2);
        console.log(`   - 正しい値との差異: ${itemDifferencePercent}%`);
      }
    });
    
    console.log('\\n🎯 問題の特定:');
    
    // 使用されているXBRL要素の問題点特定
    const usedElement = finalData.財務データ?.総資産?.XBRL要素;
    console.log(`\\n使用中のXBRL要素: ${usedElement}`);
    
    // 正しい要素の候補検索
    console.log('\\n🔎 正しい総資産要素の候補:');
    assetRelated.forEach((item) => {
      const value = Number(item.sampleValue);
      const percentage = Math.abs((value - correctValue) / correctValue * 100);
      
      if (percentage < 20) { // 20%以内の差異
        console.log(`\\n✅ 候補: ${item.key}`);
        console.log(`   - 値: ${value.toLocaleString()}円`);
        console.log(`   - 差異: ${percentage.toFixed(2)}%`);
        console.log(`   - コンテキスト: ${item.contexts?.[0]?.[0] || 'N/A'}`);
      }
    });
    
    console.log('\\n📅 期間・コンテキスト問題の調査:');
    
    // 利用可能なコンテキストの確認
    const contexts = debugData.デバッグ情報?.contexts;
    console.log(`\\n現在期間コンテキスト: ${contexts?.currentPeriodContextId}`);
    console.log(`期間: ${contexts?.currentPeriodContext?.startDate} ～ ${contexts?.currentPeriodContext?.endDate}`);
    
    // 2024年3月期（2023年4月1日～2024年3月31日）のコンテキスト検索
    console.log('\\n🔍 2024年3月期関連コンテキスト検索:');
    if (contexts?.availableContextIds) {
      const relevant2024Contexts = contexts.availableContextIds.filter(id => 
        id.includes('Prior1Year') || id.includes('CurrentYear') || id.includes('2024')
      );
      
      console.log('関連コンテキスト:');
      relevant2024Contexts.slice(0, 10).forEach(contextId => {
        console.log(`- ${contextId}`);
      });
    }
    
    console.log('\\n📊 調査結果サマリー:');
    console.log('1. 現在のAPI取得値: 62.27兆円（過小評価）');
    console.log('2. 正しい2024年3月期総資産: 90.11兆円');
    console.log('3. 差異: 約27.84兆円（-30.89%）');
    console.log('4. 使用XBRL要素: TotalAssetsIFRSSummaryOfBusinessResults');
    console.log('5. 問題可能性:');
    console.log('   - 間違ったコンテキスト期間の使用');
    console.log('   - 連結 vs 単体の取り違え');
    console.log('   - XBRL要素の選択ミス');
    
    // 修正案の提示
    console.log('\\n🔧 修正方針:');
    console.log('1. 正しい2024年3月期のコンテキストを特定');
    console.log('2. 適切なXBRL要素（連結総資産）を選択');
    console.log('3. API取得ロジックの修正');
    console.log('4. 期待値も2024年3月期に統一');
    
    // 調査結果をファイルに保存
    const investigationResult = {
      調査日時: new Date().toISOString(),
      現在のデータ: {
        API取得値: currentValue,
        表示値: finalData.財務データ?.総資産?.表示,
        XBRL要素: usedElement,
        兆円換算: (Number(currentValue) / 1000000000000).toFixed(2)
      },
      正しいデータ: {
        有報記載値: '90,114,296百万円',
        円換算: correctValue,
        兆円換算: (correctValue / 1000000000000).toFixed(2)
      },
      差異分析: {
        差異額: differenceAmount,
        差異率: `${differencePercent}%`,
        問題: 'API値が約30.89%過小評価'
      },
      資産関連要素: assetRelated.map(item => ({
        要素名: item.key,
        値: item.sampleValue,
        兆円: (Number(item.sampleValue) / 1000000000000).toFixed(2),
        正しい値との差異: Math.abs((Number(item.sampleValue) - correctValue) / correctValue * 100).toFixed(2) + '%'
      })),
      修正が必要な箇所: [
        'API取得ロジック（コンテキスト期間の修正）',
        'XBRL要素選択の見直し',
        '期待値データの2024年3月期への統一',
        'テストデータの再取得・検証'
      ]
    };
    
    fs.writeFileSync('総資産データ調査結果_2025-07-07.json', JSON.stringify(investigationResult, null, 2), 'utf8');
    
    console.log('\\n💾 調査結果保存完了: 総資産データ調査結果_2025-07-07.json');
    
    return investigationResult;
    
  } catch (error) {
    console.error('❌ 調査エラー:', error);
    return null;
  }
}

// 実行
debugAssetsInvestigation().then(result => {
  if (result) {
    console.log('\\n🎉 総資産データ調査完了！');
    console.log('\\n次のステップ:');
    console.log('1. API取得ロジックの修正');
    console.log('2. 正しい2024年3月期データの再取得');
    console.log('3. 期待値データの修正');
    console.log('4. 修正版テストの実行');
  } else {
    console.log('\\n❌ 調査に失敗しました');
  }
});