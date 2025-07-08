#!/usr/bin/env node

/**
 * 有利子負債構造詳細調査スクリプト
 * トヨタ自動車の実際のXBRLデータから有利子負債関連の全要素を抽出
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

console.log('🔍 有利子負債構造詳細調査開始...');
console.log('📋 調査目的: 期待値38.8兆円に対して現在1.9兆円（95.1%誤差）の原因特定');

async function investigateDebtStructure() {
  try {
    // APIハンドラーを読み込み（デバッグモード有効）
    const apiHandler = require('./api/edinet/real-financial.js');
    
    console.log('\n📡 トヨタ自動車XBRLデータ取得中...');
    
    const mockRequest = {
      method: 'GET',
      query: {
        edinetCode: 'E02144',
        fiscalYear: '2023',
        debug: 'true'  // デバッグモードを有効化
      }
    };
    
    let responseData = null;
    const mockResponse = {
      setHeader: () => {},
      status: (code) => ({
        json: (data) => {
          responseData = { statusCode: code, data };
          return mockResponse;
        },
        end: () => mockResponse
      })
    };
    
    await apiHandler(mockRequest, mockResponse);
    
    if (responseData && responseData.statusCode === 200) {
      const result = responseData.data;
      
      console.log('\n🎯 有利子負債関連XBRL要素の全件調査');
      console.log('━'.repeat(80));
      
      // デバッグデータから全ファクトを取得
      if (result.debug && result.debug.allFacts) {
        const allFacts = result.debug.allFacts;
        
        // 有利子負債関連のキーワードで検索
        const debtKeywords = [
          'debt', 'loan', 'borrow', 'bond', 'payable', 'liability',
          '借入', '社債', '負債', 'Debt', 'Loan', 'Borrow', 'Bond',
          'ShortTerm', 'LongTerm', 'Current', 'NonCurrent',
          'Commercial', 'Paper', 'Note', 'Finance', 'Lease'
        ];
        
        const debtRelatedFacts = [];
        
        Object.entries(allFacts).forEach(([elementName, factData]) => {
          const isDebtRelated = debtKeywords.some(keyword => 
            elementName.toLowerCase().includes(keyword.toLowerCase())
          );
          
          if (isDebtRelated && factData.value && parseFloat(factData.value) > 0) {
            debtRelatedFacts.push({
              elementName,
              value: parseFloat(factData.value),
              context: factData.context,
              unit: factData.unit || 'JPY'
            });
          }
        });
        
        // 金額順にソート
        debtRelatedFacts.sort((a, b) => b.value - a.value);
        
        console.log(`\n📊 有利子負債関連要素 (${debtRelatedFacts.length}件発見):`);
        console.log('━'.repeat(80));
        
        let totalDebtValue = 0;
        const currentYearFacts = [];
        
        debtRelatedFacts.forEach((fact, index) => {
          const amountBillion = fact.value / 1000000000000;
          console.log(`${(index + 1).toString().padStart(2)}. ${fact.elementName}`);
          console.log(`    金額: ${fact.value.toLocaleString()}円 (${amountBillion.toFixed(2)}兆円)`);
          console.log(`    コンテキスト: ${fact.context}`);
          
          // CurrentYearInstantのみを集計対象とする
          if (fact.context === 'CurrentYearInstant') {
            currentYearFacts.push(fact);
            console.log(`    ✅ 集計対象`);
          } else {
            console.log(`    ⚠️ 対象外（期間違い）`);
          }
          console.log('');
        });
        
        console.log('\n🎯 CurrentYearInstant期間の有利子負債要素:');
        console.log('━'.repeat(80));
        
        currentYearFacts.forEach((fact, index) => {
          const amountBillion = fact.value / 1000000000000;
          totalDebtValue += fact.value;
          console.log(`${(index + 1).toString().padStart(2)}. ${fact.elementName}: ${amountBillion.toFixed(2)}兆円`);
        });
        
        console.log('\n📈 集計結果:');
        console.log('━'.repeat(80));
        console.log(`合計金額: ${totalDebtValue.toLocaleString()}円`);
        console.log(`合計金額: ${(totalDebtValue / 1000000000000).toFixed(2)}兆円`);
        console.log(`期待値: 38.79兆円`);
        console.log(`現在の取得: ${(totalDebtValue / 1000000000000).toFixed(2)}兆円`);
        console.log(`誤差: ${Math.abs((totalDebtValue - 38792879000000) / 38792879000000 * 100).toFixed(1)}%`);
        
        // 大きな金額の要素を特定
        console.log('\n🔍 高額要素の詳細分析:');
        console.log('━'.repeat(80));
        
        const highValueFacts = debtRelatedFacts.filter(fact => 
          fact.value > 1000000000000 // 1兆円以上
        );
        
        highValueFacts.forEach(fact => {
          const amountBillion = fact.value / 1000000000000;
          console.log(`💰 ${fact.elementName}`);
          console.log(`   金額: ${amountBillion.toFixed(2)}兆円`);
          console.log(`   コンテキスト: ${fact.context}`);
          
          // 有価証券報告書での一般的な有利子負債項目かどうか判定
          const isTypicalDebt = [
            'ShortTermLoansPayable',
            'CurrentPortionOfLongTermLoansPayable', 
            'LongTermLoansPayable',
            'BondsPayable',
            'ShortTermBorrowings',
            'LongTermBorrowings',
            'CommercialPapersPayable'
          ].some(typical => fact.elementName.includes(typical));
          
          console.log(`   分類: ${isTypicalDebt ? '✅ 典型的有利子負債' : '⚠️ 要確認'}`);
          console.log('');
        });
        
        // 結果をファイルに保存
        const investigation = {
          timestamp: new Date().toISOString(),
          company: 'E02144',
          fiscalYear: '2023',
          investigation: {
            totalFactsFound: debtRelatedFacts.length,
            currentYearFactsCount: currentYearFacts.length,
            totalDebtCalculated: totalDebtValue,
            expectedDebt: 38792879000000,
            accuracy: Math.abs((totalDebtValue - 38792879000000) / 38792879000000 * 100),
            currentYearFacts: currentYearFacts,
            allDebtFacts: debtRelatedFacts,
            highValueFacts: highValueFacts
          }
        };
        
        fs.writeFileSync('有利子負債構造調査結果_2025-07-07.json', JSON.stringify(investigation, null, 2));
        console.log('📁 調査結果を保存: 有利子負債構造調査結果_2025-07-07.json');
        
        return investigation;
        
      } else {
        console.log('❌ デバッグデータが取得できませんでした');
        return null;
      }
      
    } else {
      console.log('❌ API呼び出しに失敗しました:', responseData);
      return null;
    }
    
  } catch (error) {
    console.error('❌ 調査中にエラーが発生:', error.message);
    return null;
  }
}

// 実行
if (require.main === module) {
  investigateDebtStructure().then(result => {
    if (result) {
      console.log('\n🎉 有利子負債構造調査完了！');
      console.log('📋 次のステップ: 調査結果を基に抽出ロジックを改善');
    } else {
      console.log('\n⚠️ 調査に問題が発生しました');
    }
  });
}

module.exports = { investigateDebtStructure };