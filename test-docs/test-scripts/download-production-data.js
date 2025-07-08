#!/usr/bin/env node

/**
 * 本番EDINET API経由での生データ取得・ダウンロードスクリプト
 * 修正効果の確認とデータ検証用
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

console.log('📡 本番EDINET API生データ取得・ダウンロード開始');
console.log('🎯 目的: 修正版APIの実際の動作確認とデータ検証');

async function downloadProductionData() {
  try {
    // 本番APIハンドラーを使用
    const apiHandler = require('./api/edinet/real-financial.js');
    
    console.log('\n📊 1. 通常モードでのデータ取得');
    console.log('━'.repeat(80));
    
    // 通常モードでの取得
    const normalRequest = {
      method: 'GET',
      query: {
        edinetCode: 'E02144',
        fiscalYear: '2023'
      }
    };
    
    let normalResult = null;
    const normalResponse = {
      setHeader: () => {},
      status: (code) => ({
        json: (data) => {
          normalResult = { statusCode: code, data };
          return normalResponse;
        },
        end: () => normalResponse
      })
    };
    
    await apiHandler(normalRequest, normalResponse);
    
    if (normalResult && normalResult.statusCode === 200 && normalResult.data.success) {
      const data = normalResult.data.data;
      
      console.log('✅ 通常モード取得成功');
      console.log(`企業: ${data.companyName || 'E02144'}`);
      console.log(`期間: ${data.fiscalPeriod}`);
      console.log(`売上高: ${(data.netSales / 1000000000000).toFixed(2)}兆円`);
      console.log(`営業利益: ${(data.operatingIncome / 1000000000000).toFixed(2)}兆円`);
      console.log(`総資産: ${(data.totalAssets / 1000000000000).toFixed(2)}兆円`);
      console.log(`現金等: ${(data.cashAndEquivalents / 1000000000000).toFixed(2)}兆円`);
      console.log(`株主資本: ${(data.shareholdersEquity / 1000000000000).toFixed(2)}兆円`);
      console.log(`有利子負債: ${(data.interestBearingDebt / 1000000000000).toFixed(2)}兆円`);
      
      // 通常データを保存
      fs.writeFileSync('本番API通常データ_2025-07-07.json', JSON.stringify(normalResult.data, null, 2));
      console.log('📁 通常データ保存: 本番API通常データ_2025-07-07.json');
      
    } else {
      console.log('❌ 通常モード取得失敗:', normalResult);
    }
    
    console.log('\n📊 2. デバッグモードでの詳細データ取得');
    console.log('━'.repeat(80));
    
    // デバッグモードでの取得
    const debugRequest = {
      method: 'GET',
      query: {
        edinetCode: 'E02144',
        fiscalYear: '2023',
        debug: 'true'
      }
    };
    
    let debugResult = null;
    const debugResponse = {
      setHeader: () => {},
      status: (code) => ({
        json: (data) => {
          debugResult = { statusCode: code, data };
          return debugResponse;
        },
        end: () => debugResponse
      })
    };
    
    await apiHandler(debugRequest, debugResponse);
    
    if (debugResult && debugResult.statusCode === 200 && debugResult.data.debug) {
      const debug = debugResult.data.debug;
      
      console.log('✅ デバッグモード取得成功');
      console.log(`XBRLルート要素: ${debug.xbrlStructure?.rootElements?.join(', ') || 'N/A'}`);
      console.log(`コンテキスト数: ${debug.contexts?.total || 'N/A'}`);
      console.log(`ファクト数: ${debug.facts?.total || 'N/A'}`);
      console.log(`負債関連要素数: ${Object.keys(debug.debtRelatedFacts || {}).length}`);
      
      // デバッグデータを保存
      fs.writeFileSync('本番APIデバッグデータ_2025-07-07.json', JSON.stringify(debugResult.data, null, 2));
      console.log('📁 デバッグデータ保存: 本番APIデバッグデータ_2025-07-07.json');
      
      // 負債関連要素の詳細分析
      if (debug.debtRelatedFacts) {
        console.log('\n💰 高額負債要素トップ10:');
        console.log('━'.repeat(80));
        
        const significantDebts = [];
        Object.entries(debug.debtRelatedFacts).forEach(([elementName, facts]) => {
          facts.forEach(fact => {
            const amount = parseFloat(fact.value);
            if (amount > 500000000000) { // 5000億円以上
              significantDebts.push({
                element: elementName,
                amount: amount,
                context: fact.context,
                amountTrillion: (amount / 1000000000000).toFixed(1)
              });
            }
          });
        });
        
        significantDebts.sort((a, b) => b.amount - a.amount);
        significantDebts.slice(0, 10).forEach((item, index) => {
          console.log(`${index + 1}. ${item.element}: ${item.amountTrillion}兆円 (${item.context})`);
        });
        
        // 高額要素リストを保存
        fs.writeFileSync('高額負債要素リスト_2025-07-07.json', JSON.stringify(significantDebts, null, 2));
        console.log('\n📁 高額要素リスト保存: 高額負債要素リスト_2025-07-07.json');
      }
      
    } else {
      console.log('❌ デバッグモード取得失敗:', debugResult);
    }
    
    console.log('\n📊 3. 精度比較と検証結果');
    console.log('━'.repeat(80));
    
    if (normalResult && normalResult.data.success) {
      const data = normalResult.data.data;
      
      // 期待値との比較
      const expectedValues = {
        cashAndEquivalents: 8982404000000,
        shareholdersEquity: 36878913000000,
        interestBearingDebt: 38792879000000
      };
      
      const actualValues = {
        cashAndEquivalents: data.cashAndEquivalents,
        shareholdersEquity: data.shareholdersEquity,
        interestBearingDebt: data.interestBearingDebt
      };
      
      const accuracy = {
        cash: Math.abs((actualValues.cashAndEquivalents - expectedValues.cashAndEquivalents) / expectedValues.cashAndEquivalents * 100),
        equity: Math.abs((actualValues.shareholdersEquity - expectedValues.shareholdersEquity) / expectedValues.shareholdersEquity * 100),
        debt: Math.abs((actualValues.interestBearingDebt - expectedValues.interestBearingDebt) / expectedValues.interestBearingDebt * 100)
      };
      
      console.log('📊 本番環境での精度検証:');
      console.log(`現金等 - 取得値: ${(actualValues.cashAndEquivalents/1000000000000).toFixed(2)}兆円, 期待値: ${(expectedValues.cashAndEquivalents/1000000000000).toFixed(2)}兆円, 誤差: ${accuracy.cash.toFixed(1)}%`);
      console.log(`株主資本 - 取得値: ${(actualValues.shareholdersEquity/1000000000000).toFixed(2)}兆円, 期待値: ${(expectedValues.shareholdersEquity/1000000000000).toFixed(2)}兆円, 誤差: ${accuracy.equity.toFixed(1)}%`);
      console.log(`有利子負債 - 取得値: ${(actualValues.interestBearingDebt/1000000000000).toFixed(2)}兆円, 期待値: ${(expectedValues.interestBearingDebt/1000000000000).toFixed(2)}兆円, 誤差: ${accuracy.debt.toFixed(1)}%`);
      
      // 品質評価
      const qualityScore = {
        cash: accuracy.cash < 20 ? '良好' : '要改善',
        equity: accuracy.equity < 25 ? '良好' : '要改善', 
        debt: accuracy.debt < 80 ? '改善済' : '要追加対応'
      };
      
      console.log('\n🎯 品質評価:');
      console.log(`現金等: ${qualityScore.cash}`);
      console.log(`株主資本: ${qualityScore.equity}`);
      console.log(`有利子負債: ${qualityScore.debt}`);
      
      // 最終検証結果を保存
      const verificationResult = {
        timestamp: new Date().toISOString(),
        verificationType: 'production_api_verification',
        apiSource: 'edinet_production',
        company: 'E02144 (トヨタ自動車)',
        fiscalYear: 2023,
        expectedValues: expectedValues,
        actualValues: actualValues,
        accuracy: accuracy,
        qualityScore: qualityScore,
        overallAssessment: {
          cashFixed: accuracy.cash < 20,
          equityFixed: accuracy.equity < 25,
          debtImproved: accuracy.debt < 80,
          productionReady: accuracy.cash < 20 && accuracy.equity < 25 && accuracy.debt < 80
        },
        dataFiles: [
          '本番API通常データ_2025-07-07.json',
          '本番APIデバッグデータ_2025-07-07.json',
          '高額負債要素リスト_2025-07-07.json'
        ]
      };
      
      fs.writeFileSync('本番環境検証結果_2025-07-07.json', JSON.stringify(verificationResult, null, 2));
      console.log('\n📁 検証結果保存: 本番環境検証結果_2025-07-07.json');
      
      return verificationResult;
    }
    
  } catch (error) {
    console.error('❌ データ取得エラー:', error.message);
    return null;
  }
}

// CSVエクスポート機能
function exportToCSV(data) {
  if (!data || !data.actualValues) return;
  
  const csvData = [
    ['項目', '取得値（兆円）', '期待値（兆円）', '誤差（%）', '品質評価'],
    [
      '現金及び現金同等物',
      (data.actualValues.cashAndEquivalents / 1000000000000).toFixed(2),
      (data.expectedValues.cashAndEquivalents / 1000000000000).toFixed(2),
      data.accuracy.cash.toFixed(1),
      data.qualityScore.cash
    ],
    [
      '株主資本',
      (data.actualValues.shareholdersEquity / 1000000000000).toFixed(2),
      (data.expectedValues.shareholdersEquity / 1000000000000).toFixed(2),
      data.accuracy.equity.toFixed(1),
      data.qualityScore.equity
    ],
    [
      '有利子負債',
      (data.actualValues.interestBearingDebt / 1000000000000).toFixed(2),
      (data.expectedValues.interestBearingDebt / 1000000000000).toFixed(2),
      data.accuracy.debt.toFixed(1),
      data.qualityScore.debt
    ]
  ];
  
  const csvContent = csvData.map(row => row.join(',')).join('\n');
  fs.writeFileSync('本番環境検証結果_2025-07-07.csv', csvContent);
  console.log('📁 CSV出力: 本番環境検証結果_2025-07-07.csv');
}

// 実行
if (require.main === module) {
  downloadProductionData().then(result => {
    if (result) {
      console.log('\n🎉 本番環境データ取得・検証完了！');
      console.log('📋 生成ファイル:');
      console.log('  • 本番API通常データ_2025-07-07.json');
      console.log('  • 本番APIデバッグデータ_2025-07-07.json');
      console.log('  • 高額負債要素リスト_2025-07-07.json');
      console.log('  • 本番環境検証結果_2025-07-07.json');
      
      // CSV出力
      exportToCSV(result);
      console.log('  • 本番環境検証結果_2025-07-07.csv');
      
      if (result.overallAssessment.productionReady) {
        console.log('\n✅ 本番環境対応完了！');
      } else {
        console.log('\n⚠️ 追加調整が推奨されます');
      }
    } else {
      console.log('\n❌ データ取得に失敗しました');
    }
  });
}

module.exports = { downloadProductionData };