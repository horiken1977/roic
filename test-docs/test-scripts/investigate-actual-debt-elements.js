#!/usr/bin/env node

/**
 * トヨタXBRLに実際に存在する有利子負債関連要素の調査
 * デバッグモードを使って実際の要素名を特定
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

console.log('🔍 トヨタXBRL実際の有利子負債要素調査');
console.log('📋 目的: 実在する要素名で38.79兆円の負債を発見');

async function investigateActualDebtElements() {
  try {
    // デバッグモードでXBRLの生データを取得
    const apiHandler = require('./api/edinet/real-financial.js');
    
    console.log('\n📡 XBRLデバッグデータ取得中...');
    
    const mockRequest = {
      method: 'GET',
      query: {
        edinetCode: 'E02144',
        fiscalYear: '2023',
        debug: 'true'  // デバッグモードで全要素を取得
      }
    };
    
    let debugResult = null;
    const mockResponse = {
      setHeader: () => {},
      status: (code) => ({
        json: (data) => {
          debugResult = { statusCode: code, data };
          return mockResponse;
        },
        end: () => mockResponse
      })
    };
    
    await apiHandler(mockRequest, mockResponse);
    
    if (debugResult && debugResult.statusCode === 200 && debugResult.data.debug) {
      const debug = debugResult.data.debug;
      
      console.log('\n🎯 実際の有利子負債関連要素分析:');
      console.log('━'.repeat(80));
      
      if (debug.debtRelatedFacts) {
        console.log(`📊 負債関連要素数: ${Object.keys(debug.debtRelatedFacts).length}件`);
        
        // 高額な負債項目を特定（1兆円以上）
        const significantDebtElements = [];
        
        Object.entries(debug.debtRelatedFacts).forEach(([elementName, facts]) => {
          facts.forEach(fact => {
            const amount = parseFloat(fact.value);
            if (amount > 1000000000000) { // 1兆円以上
              significantDebtElements.push({
                element: elementName,
                amount: amount,
                context: fact.context,
                amountTrillionYen: (amount / 1000000000000).toFixed(1)
              });
            }
          });
        });
        
        // 金額の降順でソート
        significantDebtElements.sort((a, b) => b.amount - a.amount);
        
        console.log('\n💰 高額負債要素（1兆円以上）:');
        console.log('━'.repeat(80));
        
        let totalFound = 0;
        significantDebtElements.forEach((item, index) => {
          console.log(`${index + 1}. ${item.element}`);
          console.log(`   金額: ${item.amountTrillionYen}兆円`);
          console.log(`   コンテキスト: ${item.context}`);
          console.log('');
          totalFound += item.amount;
        });
        
        console.log(`📊 発見した高額負債合計: ${(totalFound/1000000000000).toFixed(1)}兆円`);
        console.log(`期待値38.79兆円との差異: ${Math.abs(totalFound - 38792879000000).toLocaleString()}円`);
        
        // 実際に使用すべき要素名の提案
        const proposedElements = significantDebtElements.slice(0, 10).map(item => item.element);
        
        console.log('\n🎯 APIで使用すべき実際の要素名:');
        console.log('━'.repeat(80));
        proposedElements.forEach((element, index) => {
          console.log(`${index + 1}. '${element}',`);
        });
        
        // 全負債関連要素のリスト出力
        console.log('\n📋 全負債関連要素リスト:');
        console.log('━'.repeat(80));
        Object.keys(debug.debtRelatedFacts).forEach((element, index) => {
          console.log(`${index + 1}. ${element}`);
        });
        
        // 結果保存
        const analysis = {
          timestamp: new Date().toISOString(),
          investigationType: 'actual_debt_elements_analysis',
          xbrlStructure: debug.xbrlStructure,
          totalDebtElements: Object.keys(debug.debtRelatedFacts).length,
          significantDebtElements: significantDebtElements,
          proposedApiElements: proposedElements,
          totalFoundAmount: totalFound,
          expectedAmount: 38792879000000,
          accuracy: Math.abs((totalFound - 38792879000000) / 38792879000000 * 100),
          allDebtElements: Object.keys(debug.debtRelatedFacts),
          recommendation: '発見された実際の要素名でAPI修正を実施'
        };
        
        fs.writeFileSync('トヨタ実際負債要素調査結果_2025-07-07.json', JSON.stringify(analysis, null, 2));
        console.log('\n📁 調査結果保存: トヨタ実際負債要素調査結果_2025-07-07.json');
        
        return analysis;
        
      } else {
        console.log('❌ デバッグデータに負債関連要素が見つかりません');
        return null;
      }
      
    } else {
      console.log('❌ デバッグデータの取得に失敗');
      console.log('レスポンス:', debugResult);
      return null;
    }
    
  } catch (error) {
    console.error('❌ 調査エラー:', error.message);
    return null;
  }
}

// 実行
if (require.main === module) {
  investigateActualDebtElements().then(result => {
    if (result && result.significantDebtElements.length > 0) {
      console.log('\n🎉 実際の有利子負債要素特定完了！');
      console.log('💡 次のステップ: 発見された要素名でAPIロジックを最終調整');
      console.log(`📊 発見合計: ${(result.totalFoundAmount/1000000000000).toFixed(1)}兆円`);
    } else {
      console.log('\n⚠️ 十分な負債要素が見つかりませんでした');
    }
  });
}

module.exports = { investigateActualDebtElements };