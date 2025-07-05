/**
 * トヨタのXBRL構造を直接デバッグするスクリプト
 */

const fs = require('fs');

// 環境変数を設定
process.env.EDINET_API_KEY = process.env.EDINET_API_KEY || 'your-api-key-here';

// API関数を直接インポート
const handler = require('./api/edinet/real-financial.js');

async function debugToyotaXBRL() {
  console.log('🔍 トヨタ自動車のXBRL構造デバッグを開始...');
  
  // モックレスポンスオブジェクト
  let resultData = null;
  const mockRes = {
    headers: {},
    statusCode: 200,
    setHeader: function(key, value) {
      this.headers[key] = value;
      return this;
    },
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      resultData = data;
      return this;
    },
    end: function() {
      return this;
    }
  };

  // モックリクエストオブジェクト
  const mockReq = {
    method: 'GET',
    query: {
      edinetCode: 'E02144',
      fiscalYear: '2024',
      debug: 'true'
    }
  };

  try {
    // API関数を実行
    await handler(mockReq, mockRes);
    
    if (resultData) {
      console.log('✅ デバッグデータ取得成功');
      
      // 結果をJSONファイルに保存
      fs.writeFileSync('./toyota-xbrl-debug-result.json', JSON.stringify(resultData, null, 2));
      console.log('📄 結果をtoyota-xbrl-debug-result.jsonに保存しました');
      
      // 主要な情報を表示
      if (resultData.success && resultData.debug) {
        const debug = resultData.debug;
        console.log('\n=== XBRL構造概要 ===');
        console.log(`企業コード: ${debug.edinetCode}`);
        console.log(`対象年度: ${debug.fiscalYear}`);
        console.log(`コンテキスト総数: ${debug.contexts.total}`);
        console.log(`ファクト総数: ${debug.facts.total}`);
        console.log(`使用コンテキスト: ${debug.contexts.currentPeriodContextId}`);
        
        console.log('\n=== 売上関連要素 ===');
        debug.facts.salesRelated.forEach((item, i) => {
          console.log(`${i+1}. ${item.key} (${item.count}件)`);
        });
        
        console.log('\n=== 利益関連要素 ===');
        debug.facts.profitRelated.forEach((item, i) => {
          console.log(`${i+1}. ${item.key} (${item.count}件)`);
        });
        
        console.log('\n=== 資産関連要素 ===');
        debug.facts.assetRelated.forEach((item, i) => {
          console.log(`${i+1}. ${item.key} (${item.count}件)`);
        });
      }
    } else {
      console.log('❌ デバッグデータが取得できませんでした');
      console.log('レスポンス:', mockRes);
    }
    
  } catch (error) {
    console.error('❌ デバッグ実行エラー:', error.message);
    console.error('スタック:', error.stack);
  }
}

// 実行
debugToyotaXBRL();