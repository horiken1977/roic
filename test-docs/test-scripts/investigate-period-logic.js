const https = require('https');

/**
 * 期間設定ロジックの詳細調査
 * なぜ2025年4月期のデータを取得したのかを明らかにする
 */
async function investigatePeriodLogic() {
  console.log('🔍 期間設定ロジック詳細調査');
  console.log('=' .repeat(60));
  
  console.log('📋 調査目的:');
  console.log('1. なぜfiscalYear=2024で2025年4月期データを取得したのか');
  console.log('2. 期間計算ロジックの確認');
  console.log('3. コンテキストマッチングの実際の動作');
  console.log('4. 正しい期間データ取得のための修正方針');
  
  try {
    // 1. デバッグモードでコンテキスト情報を取得
    console.log('\n🔍 ステップ1: デバッグモードでコンテキスト情報取得');
    const debugData = await fetchDebugData();
    
    if (!debugData.success) {
      throw new Error(`デバッグデータ取得失敗: ${debugData.error}`);
    }
    
    console.log('✅ デバッグデータ取得成功');
    
    // 2. コンテキスト情報の詳細分析
    console.log('\n📊 ステップ2: コンテキスト詳細分析');
    analyzeContexts(debugData.debug);
    
    // 3. 期間計算ロジックの確認
    console.log('\n🧮 ステップ3: 期間計算ロジック確認');
    analyzePeriodCalculation();
    
    // 4. 実際の取得データと期待値の比較
    console.log('\n📋 ステップ4: 取得データと期待値の比較');
    const actualData = await fetchActualData();
    compareWithExpected(actualData);
    
    // 5. 問題の特定と修正方針
    console.log('\n🔧 ステップ5: 問題特定と修正方針');
    identifyProblemsAndSolutions(debugData.debug, actualData);
    
  } catch (error) {
    console.error('❌ 調査中にエラーが発生:', error);
    throw error;
  }
}

/**
 * デバッグデータ取得
 */
function fetchDebugData() {
  return new Promise((resolve, reject) => {
    const url = 'https://roic-horikens-projects.vercel.app/api/edinet/real-financial?edinetCode=E02144&fiscalYear=2024&debug=true';
    
    console.log(`🌐 デバッグAPI呼び出し: ${url}`);
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          reject(new Error(`JSON解析エラー: ${error.message}`));
        }
      });
      
    }).on('error', (error) => {
      reject(new Error(`API呼び出しエラー: ${error.message}`));
    });
  });
}

/**
 * 実際の財務データ取得
 */
function fetchActualData() {
  return new Promise((resolve, reject) => {
    const url = 'https://roic-horikens-projects.vercel.app/api/edinet/real-financial?edinetCode=E02144&fiscalYear=2024';
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          reject(new Error(`JSON解析エラー: ${error.message}`));
        }
      });
      
    }).on('error', (error) => {
      reject(new Error(`API呼び出しエラー: ${error.message}`));
    });
  });
}

/**
 * コンテキスト情報の詳細分析
 */
function analyzeContexts(debugData) {
  console.log('📊 利用可能なコンテキスト分析:');
  
  if (debugData.contexts && debugData.contexts.detailedContexts) {
    console.log(`- 総コンテキスト数: ${debugData.contexts.total}`);
    
    console.log('\n🎯 重要なコンテキスト（期間情報含む）:');
    Object.entries(debugData.contexts.detailedContexts).forEach(([id, period]) => {
      console.log(`  ${id}: ${period}`);
      
      // 2024年3月期と2025年3月期を識別
      if (period.includes('2024-03-31')) {
        console.log(`    ✅ 2024年3月期コンテキスト発見: ${id}`);
      } else if (period.includes('2025-03-31')) {
        console.log(`    ⚠️ 2025年3月期コンテキスト発見: ${id}`);
      }
    });
  }
  
  console.log('\n🔍 Summary要素の有無:');
  console.log(`- Summary要素数: ${debugData.facts?.summaryElementsFound || 0}`);
  console.log(`- IFRS要素数: ${debugData.facts?.ifrsElementsFound || 0}`);
}

/**
 * 期間計算ロジックの確認
 */
function analyzePeriodCalculation() {
  console.log('📅 期間計算ロジック分析:');
  
  const fiscalYear = 2024;
  
  console.log(`\n入力パラメータ: fiscalYear=${fiscalYear}`);
  
  // 実装されている期間計算ロジック
  const periodStart = `${fiscalYear - 1}-04-01`;
  const periodEnd = `${fiscalYear}-03-31`;
  
  console.log(`計算結果:`);
  console.log(`- 期間開始: ${periodStart} (${fiscalYear - 1}年4月1日)`);
  console.log(`- 期間終了: ${periodEnd} (${fiscalYear}年3月31日)`);
  
  console.log(`\n🎯 期待される内容:`);
  console.log(`- fiscalYear=2024 → 2024年3月期 (2023年4月1日～2024年3月31日)`);
  console.log(`- これは正しく計算されている`);
  
  console.log(`\n❓ 問題の可能性:`);
  console.log(`1. コンテキストマッチングで実際には2025年3月期が選ばれている`);
  console.log(`2. XBRL内に2024年3月期のデータが存在しない`);
  console.log(`3. フォールバック処理で2025年3月期が選択されている`);
  console.log(`4. パターンマッチングで間違ったコンテキストが選ばれている`);
}

/**
 * 取得データと期待値の比較
 */
function compareWithExpected(apiResult) {
  if (!apiResult.success) {
    console.log('❌ 実際のデータ取得に失敗');
    return;
  }
  
  const data = apiResult.data;
  
  console.log('📊 取得データ vs 期待値比較:');
  
  // 2024年3月期の有価証券報告書期待値
  const expected2024 = {
    売上高: 45095325, // 百万円
    営業利益: 5352934, // 百万円  
    総資産: 90114296, // 百万円
    現金: '正の値であるべき',
    株主資本: '正の値であるべき',
    有利子負債: '正の値であるべき'
  };
  
  // 2025年3月期の推定値（未確認）
  const estimated2025 = {
    売上高: 48036704, // 百万円（取得値）
    営業利益: 4795586, // 百万円（取得値）
    総資産: 93601350, // 百万円（取得値）
  };
  
  console.log('\n📋 売上高分析:');
  console.log(`- 取得値: ${(data.netSales / 1000000).toLocaleString()}百万円`);
  console.log(`- 2024年3月期期待値: ${expected2024.売上高.toLocaleString()}百万円`);
  console.log(`- 2025年3月期推定値: ${estimated2025.売上高.toLocaleString()}百万円`);
  
  if (data.netSales / 1000000 === estimated2025.売上高) {
    console.log(`⚠️ 2025年3月期のデータを取得している可能性が高い`);
  } else if (data.netSales / 1000000 === expected2024.売上高) {
    console.log(`✅ 2024年3月期のデータを正しく取得`);
  }
  
  console.log('\n📋 営業利益分析:');
  console.log(`- 取得値: ${(data.operatingIncome / 1000000).toLocaleString()}百万円`);
  console.log(`- 2024年3月期期待値: ${expected2024.営業利益.toLocaleString()}百万円`);
  console.log(`- 2025年3月期推定値: ${estimated2025.営業利益.toLocaleString()}百万円`);
  
  if (data.operatingIncome / 1000000 === estimated2025.営業利益) {
    console.log(`⚠️ 2025年3月期のデータを取得している可能性が高い`);
  }
  
  console.log('\n📋 総資産分析:');
  console.log(`- 取得値: ${(data.totalAssets / 1000000).toLocaleString()}百万円`);
  console.log(`- 2024年3月期期待値: ${expected2024.総資産.toLocaleString()}百万円`);
  console.log(`- 2025年3月期推定値: ${estimated2025.総資産.toLocaleString()}百万円`);
  
  if (data.totalAssets / 1000000 === estimated2025.総資産) {
    console.log(`⚠️ 2025年3月期のデータを取得している可能性が高い`);
  }
  
  console.log('\n📋 異常値分析:');
  console.log(`- 現金: ${(data.cashAndEquivalents / 1000000).toLocaleString()}百万円`);
  if (data.cashAndEquivalents < 0) {
    console.log(`  ❌ 負の値は異常 - XBRL要素選択ミスの可能性`);
  }
  
  console.log(`- 株主資本: ${(data.shareholdersEquity / 1000000).toLocaleString()}百万円`);
  if (data.shareholdersEquity <= 1) {
    console.log(`  ❌ 異常に小さい値 - XBRL要素選択ミスまたは単位ミス`);
  }
  
  console.log(`- 有利子負債: ${(data.interestBearingDebt / 1000000).toLocaleString()}百万円`);
}

/**
 * 問題の特定と修正方針
 */
function identifyProblemsAndSolutions(debugData, actualData) {
  console.log('🚨 特定された問題:');
  
  const problems = [];
  const solutions = [];
  
  // 問題1: 期間設定
  if (actualData.success) {
    const data = actualData.data;
    const estimated2025Values = [48036704, 4795586, 93601350];
    const actualValues = [
      data.netSales / 1000000, 
      data.operatingIncome / 1000000, 
      data.totalAssets / 1000000
    ];
    
    if (actualValues.every((val, i) => Math.abs(val - estimated2025Values[i]) < 1000)) {
      problems.push('2025年3月期のデータを取得している（2024年3月期が期待値）');
      solutions.push('コンテキストマッチングロジックの修正が必要');
    }
  }
  
  // 問題2: 異常値
  if (actualData.success) {
    const data = actualData.data;
    
    if (data.cashAndEquivalents < 0) {
      problems.push('現金が負の値（-0.13兆円）');
      solutions.push('CashAndCashEquivalentsIFRSのXBRL要素確認と修正');
    }
    
    if (data.shareholdersEquity <= 1) {
      problems.push('株主資本が異常に小さい（0.00兆円）');
      solutions.push('EquityAttributableToOwnersOfParentIFRSの要素確認と修正');
    }
  }
  
  console.log('\n❌ 特定された問題一覧:');
  problems.forEach((problem, index) => {
    console.log(`${index + 1}. ${problem}`);
  });
  
  console.log('\n🔧 推奨修正方針:');
  solutions.forEach((solution, index) => {
    console.log(`${index + 1}. ${solution}`);
  });
  
  console.log('\n🎯 具体的な修正アクション:');
  console.log('1. デバッグモードでコンテキスト詳細を確認し、正しい2024年3月期コンテキストを特定');
  console.log('2. パターンマッチング条件の見直し（CurrentYear vs Prior1Year）');
  console.log('3. 現金・株主資本のXBRL要素名の見直し');
  console.log('4. 単位（百万円 vs 円）の確認');
  console.log('5. Summary要素の完全除外確認');
  
  return {
    problems: problems,
    solutions: solutions
  };
}

// 実行
investigatePeriodLogic().then(() => {
  console.log('\n🎉 期間設定ロジック調査完了！');
  console.log('\n📋 次のステップ:');
  console.log('1. コンテキスト詳細の確認');
  console.log('2. XBRL要素の詳細調査');
  console.log('3. 修正方針の策定と実装');
  
}).catch(error => {
  console.error('\n❌ 調査中にエラーが発生しました:', error.message);
});