/**
 * EDINET APIキー設定確認スクリプト
 */

require('dotenv').config({ path: '.env.local' });

console.log('🔑 EDINET APIキー設定確認');
console.log('==========================================');

const apiKey = process.env.EDINET_API_KEY;

if (!apiKey) {
  console.log('❌ APIキーが設定されていません');
  console.log('\n設定方法:');
  console.log('1. .env.localファイルを編集');
  console.log('2. EDINET_API_KEY=your-actual-key を追加');
} else if (apiKey === 'your-actual-api-key-here') {
  console.log('⚠️  APIキーがプレースホルダーのままです');
  console.log('実際のAPIキーに置き換えてください');
} else {
  console.log('✅ APIキー設定済み');
  console.log(`キーの先頭8文字: ${apiKey.substring(0, 8)}...`);
  console.log(`キーの長さ: ${apiKey.length}文字`);
}

console.log('\n📁 現在の作業ディレクトリ:', process.cwd());
console.log('🔍 .env.localファイルの存在:', require('fs').existsSync('.env.local') ? '✅' : '❌');