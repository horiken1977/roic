#!/usr/bin/env node

/**
 * 最終改善版APIテストスクリプト
 * 統合改善版有利子負債計算の効果を検証
 */

const fs = require('fs');
const path = require('path');

// .env.localファイルから環境変数を読み込み
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    }
  });
}

console.log('🧪 統合改善版API最終効果検証');
console.log('📋 目標: 有利子負債誤差95.1% → 5%以下');

async function testFinalImprovements() {
  try {
    // APIハンドラーを直接呼び出し
    const apiHandler = require('./api/edinet/real-financial.js');
    
    console.log('\n📡 改善版APIでデータ取得中...');
    
    const mockRequest = {
      method: 'GET',
      query: {
        edinetCode: 'E02144',
        fiscalYear: '2023'
      }
    };
    
    let testResult = null;
    const mockResponse = {
      setHeader: () => {},
      status: (code) => ({
        json: (data) => {
          testResult = { statusCode: code, data };
          return mockResponse;
        },
        end: () => mockResponse
      })
    };
    
    await apiHandler(mockRequest, mockResponse);
    
    if (testResult && testResult.statusCode === 200 && testResult.data.success) {
      const data = testResult.data.data;
      
      console.log('\n🎯 統合改善版結果:');
      console.log('━'.repeat(80));
      
      // 改善前後の比較
      const beforeFix = {
        cashAndEquivalents: -134089000000,
        shareholdersEquity: 0.136,
        interestBearingDebt: 9416031000000
      };
      
      const afterFix = {
        cashAndEquivalents: data.cashAndEquivalents,
        shareholdersEquity: data.shareholdersEquity,
        interestBearingDebt: data.interestBearingDebt
      };
      
      const expectedValues = {
        cashAndEquivalents: 8982404000000,
        shareholdersEquity: 36878913000000,
        interestBearingDebt: 38792879000000
      };
      
      // 精度計算
      const accuracy = {
        cash: Math.abs((afterFix.cashAndEquivalents - expectedValues.cashAndEquivalents) / expectedValues.cashAndEquivalents * 100),
        equity: Math.abs((afterFix.shareholdersEquity - expectedValues.shareholdersEquity) / expectedValues.shareholdersEquity * 100),
        debt: Math.abs((afterFix.interestBearingDebt - expectedValues.interestBearingDebt) / expectedValues.interestBearingDebt * 100)
      };
      
      console.log('📊 財務データ精度比較:');
      console.log(`現金及び現金同等物: ${(afterFix.cashAndEquivalents/1000000000000).toFixed(1)}兆円 (誤差${accuracy.cash.toFixed(1)}%)`);
      console.log(`株主資本: ${(afterFix.shareholdersEquity/1000000000000).toFixed(1)}兆円 (誤差${accuracy.equity.toFixed(1)}%)`);
      console.log(`有利子負債: ${(afterFix.interestBearingDebt/1000000000000).toFixed(1)}兆円 (誤差${accuracy.debt.toFixed(1)}%)`);
      
      // 改善効果評価
      const debtImprovementTarget = accuracy.debt < 5;
      const overallQuality = (accuracy.cash < 20 && accuracy.equity < 25 && accuracy.debt < 5) ? '目標達成' :
                           (accuracy.cash < 30 && accuracy.equity < 40 && accuracy.debt < 20) ? '大幅改善' : '要追加調整';
      
      console.log('\n🎯 改善効果評価:');
      console.log('━'.repeat(80));
      console.log(`有利子負債目標達成: ${debtImprovementTarget ? '✅ 達成' : '❌ 未達成'}`);
      console.log(`総合品質: ${overallQuality}`);
      
      if (debtImprovementTarget) {
        console.log('\n🎉 雑な実装残り33%の完全修正成功！');
        console.log('✅ 有利子負債誤差が95.1% → 5%以下に改善');
        console.log('✅ 連結ベース・セグメント別の包括的抽出実装');
        console.log('✅ 3段階フォールバック方式による堅牢性向上');
      } else {
        console.log('\n⚠️ 追加調整が必要です');
        console.log('💡 推奨: XBRL要素名の詳細調査とセグメント情報の活用');
      }
      
      // 結果保存
      const finalResult = {
        timestamp: new Date().toISOString(),
        testType: 'final_comprehensive_improvement',
        success: true,
        improvements: {
          phase1: '連結ベース要素優先検索',
          phase2: '金融事業セグメント抽出',
          phase3: '自動車事業セグメント積み上げ',
          quality: '自動品質評価とレポート'
        },
        beforeFix: beforeFix,
        afterFix: afterFix,
        expectedValues: expectedValues,
        accuracy: accuracy,
        debtTargetAchieved: debtImprovementTarget,
        overallQuality: overallQuality,
        fullData: data
      };
      
      fs.writeFileSync('最終改善効果検証結果_2025-07-07.json', JSON.stringify(finalResult, null, 2));
      console.log('\n📁 最終結果保存: 最終改善効果検証結果_2025-07-07.json');
      
      return finalResult;
      
    } else {
      console.log('❌ APIテスト失敗:', testResult);
      return null;
    }
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error.message);
    return null;
  }
}

// 実行
if (require.main === module) {
  testFinalImprovements().then(result => {
    if (result && result.debtTargetAchieved) {
      console.log('\n🚀 統合改善版API完成！');
      console.log('📋 雑な実装残り33%の完全修正達成');
      console.log('💰 有利子負債抽出精度: 95.1%誤差 → 5%以下');
    } else {
      console.log('\n🔧 継続的改善が必要');
    }
  });
}

module.exports = { testFinalImprovements };