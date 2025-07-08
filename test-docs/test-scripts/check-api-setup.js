#!/usr/bin/env node

/**
 * EDINET APIキー設定確認スクリプト
 */

console.log('🔍 EDINET APIキー設定状況確認\n');

// .env.localファイルから環境変数を読み込み
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      process.env[key.trim()] = value.trim();
    }
  });
}

// 1. 環境変数確認
console.log('1. 環境変数確認:');
const apiKey = process.env.EDINET_API_KEY;

if (!apiKey) {
  console.log('❌ EDINET_API_KEY が設定されていません');
} else if (apiKey === 'your-actual-api-key-here' || apiKey === '実際のAPIキーをここに入力してください') {
  console.log('⚠️ EDINET_API_KEY にプレースホルダーが設定されています');
  console.log('   実際のAPIキーに変更してください');
} else if (apiKey.length < 10) {
  console.log('⚠️ EDINET_API_KEY が短すぎます（無効な可能性）');
  console.log(`   現在の長さ: ${apiKey.length}文字`);
} else {
  console.log('✅ EDINET_API_KEY が設定されています');
  console.log(`   キー: ${apiKey.substring(0, 10)}...`);
  console.log(`   長さ: ${apiKey.length}文字`);
}

// 2. .env.localファイル確認
console.log('\n2. .env.localファイル確認:');
if (fs.existsSync(envPath)) {
  console.log('✅ .env.localファイルが存在します');
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  const apiKeyLine = lines.find(line => line.startsWith('EDINET_API_KEY='));
  
  if (apiKeyLine) {
    console.log('✅ .env.local内にEDINET_API_KEYの設定があります');
    const value = apiKeyLine.split('=')[1];
    if (value === '実際のAPIキーをここに入力してください' || value === 'your-actual-api-key-here') {
      console.log('⚠️ プレースホルダーのままです');
    }
  } else {
    console.log('❌ .env.local内にEDINET_API_KEYの設定がありません');
  }
} else {
  console.log('❌ .env.localファイルが存在しません');
}

// 3. 設定方法の案内
console.log('\n3. 設定方法:');
console.log('━'.repeat(50));

if (!apiKey || apiKey === 'your-actual-api-key-here' || apiKey === '実際のAPIキーをここに入力してください') {
  console.log('📝 以下の手順でAPIキーを設定してください:');
  console.log('');
  console.log('方法1: .env.localファイルを編集');
  console.log('   1. .env.localファイルを開く');
  console.log('   2. EDINET_API_KEY=実際のAPIキー に変更');
  console.log('   3. ファイルを保存');
  console.log('');
  console.log('方法2: 環境変数で設定');
  console.log('   export EDINET_API_KEY="実際のAPIキー"');
  console.log('');
  console.log('方法3: 実行時に指定');
  console.log('   EDINET_API_KEY="実際のAPIキー" node テストスクリプト.js');
} else {
  console.log('✅ APIキーが設定されています');
  console.log('   修正版APIのテストを実行できます');
  console.log('');
  console.log('🚀 テスト実行コマンド:');
  console.log('   node test-fixed-api-real.js');
}

console.log('\n💡 注意事項:');
console.log('- APIキーは機密情報です');
console.log('- .env.localファイルをGitにコミットしないでください');
console.log('- APIキーが漏洩した場合は即座に無効化してください');