#!/usr/bin/env node

/**
 * 修正版API実際テスト - システム設定のAPIキーを使用
 * Real Test with System API Key
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

console.log('🚀 修正版API実際テスト開始...');
console.log('期待される修正効果:');
console.log('- 現金及び現金同等物: マイナス値 → 8,982,404千円');
console.log('- 株主資本: ゼロ → 36,878,913千円');
console.log('- 有利子負債: 不正確値 → 38,792,879千円');

async function testFixedAPI() {
  try {
    // 1. 過去の成功テストからAPIキー設定パターンを推測
    console.log('\n🔍 システム設定のAPIキーを検索中...');
    
    // 過去のテスト結果が実際のAPIキーで成功していることを確認
    const pastResults = [
      './トヨタ再設計版テスト結果_2025-07-07.json',
      './toyota_final_test_2025-07-06.json'
    ];
    
    let hasRealApiHistory = false;
    for (const file of pastResults) {
      if (fs.existsSync(file)) {
        const content = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (content.結果 && content.結果['通常モード（データ取得）']) {
          const data = content.結果['通常モード（データ取得）'].data;
          if (data && data.netSales > 1000000000000) { // 実際の売上データ
            hasRealApiHistory = true;
            console.log(`✅ ${file}: 実際のAPI取得履歴確認`);
            console.log(`   売上高: ${(data.netSales / 1000000000000).toFixed(1)}兆円`);
            break;
          }
        }
      }
    }
    
    if (!hasRealApiHistory) {
      throw new Error('実際のAPI取得履歴が見つかりません');
    }
    
    // 2. 環境変数の設定を試行
    console.log('\n🔧 APIキー設定を試行中...');
    
    // 一般的なAPIキー設定パターンを試す
    const potentialKeys = [
      process.env.EDINET_API_KEY,
      process.env.EDINET_KEY,
      process.env.API_KEY,
      // システムレベルで設定されている可能性があるキー
      // (実際のキー値は表示せず、存在確認のみ)
    ];
    
    // Node.jsプロセスの環境変数をすべてチェック
    let foundKey = null;
    for (const [key, value] of Object.entries(process.env)) {
      if (key.includes('EDINET') && value && value.length > 10 && !value.includes('your-')) {
        foundKey = value;
        console.log(`✅ ${key}でAPIキーを発見`);
        break;
      }
    }
    
    if (!foundKey) {
      // 3. 直接API実行を試みる（キーが内部的に設定されている可能性）
      console.log('⚠️ 環境変数でAPIキーが見つからないため、直接API実行を試行...');
    }
    
    // 4. 修正版APIを実行
    console.log('\n📡 修正版APIでトヨタデータ取得中...');
    
    // APIモジュールを直接インポート
    const apiHandler = require('./api/edinet/real-financial.js');
    
    // リクエストオブジェクトをモック
    const mockRequest = {
      method: 'GET',
      query: {
        edinetCode: 'E02144', // トヨタ
        fiscalYear: '2023'  // 2023年3月期で試行
      }
    };
    
    // レスポンスオブジェクトをモック
    let responseData = null;
    let responseError = null;
    
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
    
    // API実行
    try {
      await apiHandler(mockRequest, mockResponse);
    } catch (error) {
      responseError = error;
    }
    
    // 5. 結果の分析
    if (responseData && responseData.statusCode === 200) {
      const financialData = responseData.data.data;
      
      console.log('\n✅ 修正版API実行成功！');
      console.log('━'.repeat(80));
      
      // 修正前のデータ（2025-07-07の結果）
      const beforeFix = {
        cashAndEquivalents: -134089000000,
        shareholdersEquity: 0.136,
        interestBearingDebt: 9416031000000
      };
      
      // 期待値
      const expectedValues = {
        cashAndEquivalents: 8982404000000,
        shareholdersEquity: 36878913000000,
        interestBearingDebt: 38792879000000
      };
      
      console.log('📊 財務データ比較結果:');
      console.log('━'.repeat(80));
      
      // 現金及び現金同等物
      console.log('💰 現金及び現金同等物:');
      console.log(`   修正前: ${beforeFix.cashAndEquivalents.toLocaleString()}円 (マイナス値)`);
      console.log(`   修正後: ${(financialData.cashAndEquivalents || 0).toLocaleString()}円`);
      console.log(`   期待値: ${expectedValues.cashAndEquivalents.toLocaleString()}円`);
      
      const cashImprovement = financialData.cashAndEquivalents > 0 ? '✅ マイナス値修正' : '❌ 未修正';
      const cashAccuracy = Math.abs((financialData.cashAndEquivalents - expectedValues.cashAndEquivalents) / expectedValues.cashAndEquivalents * 100);
      console.log(`   状況: ${cashImprovement} (誤差: ${cashAccuracy.toFixed(1)}%)`);
      
      // 株主資本
      console.log('\n🏢 株主資本:');
      console.log(`   修正前: ${beforeFix.shareholdersEquity.toLocaleString()}円 (異常値)`);
      console.log(`   修正後: ${(financialData.shareholdersEquity || 0).toLocaleString()}円`);
      console.log(`   期待値: ${expectedValues.shareholdersEquity.toLocaleString()}円`);
      
      const equityImprovement = financialData.shareholdersEquity > 1000000000000 ? '✅ 異常値修正' : '❌ 未修正';
      const equityAccuracy = Math.abs((financialData.shareholdersEquity - expectedValues.shareholdersEquity) / expectedValues.shareholdersEquity * 100);
      console.log(`   状況: ${equityImprovement} (誤差: ${equityAccuracy.toFixed(1)}%)`);
      
      // 有利子負債
      console.log('\n💳 有利子負債:');
      console.log(`   修正前: ${beforeFix.interestBearingDebt.toLocaleString()}円 (不正確)`);
      console.log(`   修正後: ${(financialData.interestBearingDebt || 0).toLocaleString()}円`);
      console.log(`   期待値: ${expectedValues.interestBearingDebt.toLocaleString()}円`);
      
      const debtAccuracy = Math.abs((financialData.interestBearingDebt - expectedValues.interestBearingDebt) / expectedValues.interestBearingDebt * 100);
      const debtImprovement = debtAccuracy < 20 ? '✅ 大幅改善' : debtAccuracy < 50 ? '⚠️ 部分改善' : '❌ 要確認';
      console.log(`   状況: ${debtImprovement} (誤差: ${debtAccuracy.toFixed(1)}%)`);
      
      // 全体サマリー
      console.log('\n🎯 修正効果サマリー:');
      console.log('━'.repeat(80));
      
      const fixedIssues = [
        financialData.cashAndEquivalents > 0,
        financialData.shareholdersEquity > 1000000000000,
        debtAccuracy < 20
      ].filter(Boolean).length;
      
      console.log(`修正成功項目: ${fixedIssues}/3`);
      console.log(`修正成功率: ${(fixedIssues/3*100).toFixed(0)}%`);
      
      if (fixedIssues === 3) {
        console.log('🎉 すべての問題が修正されました！');
      } else if (fixedIssues >= 2) {
        console.log('✅ 主要な問題が修正されました');
      } else {
        console.log('⚠️ さらなる調整が必要です');
      }
      
      // その他の財務データ
      console.log('\n📈 その他の財務データ:');
      console.log(`売上高: ${(financialData.netSales / 1000000000000).toFixed(1)}兆円`);
      console.log(`営業利益: ${(financialData.operatingIncome / 1000000000000).toFixed(1)}兆円`);
      console.log(`総資産: ${(financialData.totalAssets / 1000000000000).toFixed(1)}兆円`);
      
      // 結果を保存
      const testResult = {
        timestamp: new Date().toISOString(),
        testType: 'fixed_api_real_test',
        success: true,
        beforeFix,
        afterFix: {
          cashAndEquivalents: financialData.cashAndEquivalents,
          shareholdersEquity: financialData.shareholdersEquity,
          interestBearingDebt: financialData.interestBearingDebt
        },
        expectedValues,
        accuracy: {
          cash: cashAccuracy,
          equity: equityAccuracy,
          debt: debtAccuracy
        },
        fixedIssues,
        fullData: financialData
      };
      
      fs.writeFileSync('修正版API実テスト結果_2025-07-07.json', JSON.stringify(testResult, null, 2));
      console.log('\n📁 結果を保存: 修正版API実テスト結果_2025-07-07.json');
      
      return testResult;
      
    } else if (responseError) {
      if (responseError.message.includes('API_KEY_NOT_CONFIGURED') || responseError.message.includes('APIキーが設定されていません')) {
        console.log('\n⚠️ APIキーが設定されていません');
        console.log('💡 解決方法:');
        console.log('1. export EDINET_API_KEY=実際のAPIキー');
        console.log('2. または .env.local ファイルでAPIキーを設定');
        console.log('3. システム管理者にAPIキー設定を確認');
        
        return { success: false, error: 'API_KEY_NOT_SET' };
      } else {
        throw responseError;
      }
    } else {
      console.log('❌ API実行結果が不明:', responseData);
      return { success: false, error: 'UNKNOWN_RESPONSE' };
    }
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error.message);
    
    if (error.message.includes('Cannot find module')) {
      console.log('💡 依存関係が不足している可能性があります');
    }
    
    return { success: false, error: error.message };
  }
}

// 実行
if (require.main === module) {
  testFixedAPI().then(result => {
    if (result.success) {
      console.log('\n🎉 修正版APIテスト完了！');
    } else {
      console.log('\n⚠️ テストは完了しましたが、追加の設定が必要です');
    }
  });
}

module.exports = { testFixedAPI };