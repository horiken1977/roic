#!/usr/bin/env node

/**
 * 三菱電機修正検証スクリプト
 * 修正されたパーサーの動作確認
 */

const path = require('path');

console.log('=== 三菱電機修正検証 ===\n');

// 1. 修正されたファイルの存在確認
const xbrlParserPath = path.join(__dirname, 'api/utils/xbrl-parser.js');
console.log('1. 修正ファイル確認:');
console.log(`   ✓ XBRL Parser: ${xbrlParserPath}`);

try {
    const SimpleXbrlParser = require('./api/utils/xbrl-parser.js');
    const parser = new SimpleXbrlParser();
    
    console.log('   ✓ パーサークラスの読み込み成功');
    
    // 2. 新機能の存在確認
    console.log('\n2. 新機能確認:');
    const newMethods = [
        'extractCsvFromZip',
        'parseZipDirectory', 
        'extractFileFromZip',
        'parseCsvFinancialData',
        'parseCsvLine',
        'mapAccountToField',
        'parseJapaneseNumber'
    ];
    
    newMethods.forEach(method => {
        if (typeof parser[method] === 'function') {
            console.log(`   ✓ ${method}() メソッド追加済み`);
        } else {
            console.log(`   ❌ ${method}() メソッドが見つかりません`);
        }
    });
    
    // 3. CSVマッピングの確認
    console.log('\n3. CSVマッピング確認:');
    if (parser.csvMappings) {
        console.log(`   ✓ csvMappings プロパティ存在`);
        console.log(`   ✓ 対応項目数: ${Object.keys(parser.csvMappings).length}`);
        
        // 主要項目の確認
        const keyItems = ['netSales', 'operatingIncome', 'totalAssets', 'shareholdersEquity'];
        keyItems.forEach(item => {
            if (parser.csvMappings[item]) {
                console.log(`   ✓ ${item}: ${parser.csvMappings[item].length}個のマッピング`);
            } else {
                console.log(`   ❌ ${item} マッピングなし`);
            }
        });
    } else {
        console.log('   ❌ csvMappings プロパティが見つかりません');
    }
    
    // 4. 日本語数値解析テスト
    console.log('\n4. 数値解析テスト:');
    const testNumbers = [
        '1,234,567',
        '123億円',
        '456万円', 
        '789千円',
        '１２３４',
        '-567'
    ];
    
    testNumbers.forEach(testNum => {
        try {
            const result = parser.parseJapaneseNumber(testNum);
            console.log(`   ✓ "${testNum}" → ${result}`);
        } catch (error) {
            console.log(`   ❌ "${testNum}" → エラー: ${error.message}`);
        }
    });
    
    // 5. CSV行解析テスト
    console.log('\n5. CSV行解析テスト:');
    const testCsvLines = [
        '"売上高","NetSales","CurrentYearInstant_ConsolidatedMember","JPY","5000000000000"',
        '営業利益,OperatingIncome,CurrentYear,JPY,300000000000',
        '"資産合計","Assets","CurrentYearInstant","JPY","6000000000000"'
    ];
    
    testCsvLines.forEach(line => {
        try {
            const fields = parser.parseCsvLine(line);
            console.log(`   ✓ ${fields.length}フィールド: ${fields[0]} → ${fields[4]}`);
        } catch (error) {
            console.log(`   ❌ CSV解析エラー: ${error.message}`);
        }
    });
    
    // 6. 勘定科目マッピングテスト
    console.log('\n6. 勘定科目マッピングテスト:');
    const testAccounts = ['売上高', '営業利益', '資産合計', '株主資本', '現金及び預金'];
    
    testAccounts.forEach(account => {
        const mapped = parser.mapAccountToField(account);
        if (mapped) {
            console.log(`   ✓ "${account}" → ${mapped}`);
        } else {
            console.log(`   ❌ "${account}" → マッピングなし`);
        }
    });
    
    console.log('\n=== 検証完了 ===');
    console.log('\n次のステップ:');
    console.log('1. 実際のAPIキーを設定');
    console.log('2. フロントエンドで三菱電機を検索'); 
    console.log('3. 財務データが正常に取得されることを確認');
    console.log('4. ROIC計算結果が0%でないことを確認');
    
} catch (error) {
    console.error('❌ 検証エラー:', error.message);
    console.log('\n修正が正しく適用されていない可能性があります。');
}

console.log('\n=== 重要な注意点 ===');
console.log('・EDINETのAPIキーが必要です');
console.log('・修正後の初回実行では既存キャッシュのクリアが必要な場合があります'); 
console.log('・本番環境では十分なテストを行ってからデプロイしてください');