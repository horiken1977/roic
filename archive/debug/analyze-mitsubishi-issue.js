#!/usr/bin/env node

/**
 * 三菱電機データ解析スクリプト
 * 既存のログファイルから問題を特定して修正案を提案
 */

console.log('=== 三菱電機 EDINET データ解析 ===\n');

// ログから判明した問題点を分析
const logAnalysis = {
    apiResponse: {
        docId: 'S100W0EM',
        xbrlSize: 188370,
        isZip: true,
        zipHeader: 'PK\\u0003\\u0004', // ZIP magic bytes
        csvFilePath: 'XBRL_TO_CSV/jpaud-aai-cc-001_E01739-000_2025-03-31_01_2025-06-20.csv',
        isXml: false,
        tagCount: 436,
        numericTagCount: 1,
        extractedValueCount: 2
    },
    issues: [
        'EDINET APIがZIPファイルを返すが、XMLとしてパース試行',
        'ZIP内のCSVファイルが正しく展開されていない',
        'CSVデータから財務データが抽出できていない',
        'パース結果が全てnullまたは0になっている'
    ],
    recommendations: [
        'ZIP展開ロジックの修正',
        'CSVパーサーの実装',
        'EDINETのCSV形式に対応した財務データ抽出',
        'デバッグ機能の強化'
    ]
};

console.log('1. 検出された問題:\n');
logAnalysis.issues.forEach((issue, i) => {
    console.log(`   ${i + 1}. ${issue}`);
});

console.log('\n2. 推奨される修正:\n');
logAnalysis.recommendations.forEach((rec, i) => {
    console.log(`   ${i + 1}. ${rec}`);
});

console.log('\n3. 技術的分析:\n');
console.log(`   - Document ID: ${logAnalysis.apiResponse.docId}`);
console.log(`   - XBRL Size: ${logAnalysis.apiResponse.xbrlSize} bytes`);
console.log(`   - Format: ZIP (${logAnalysis.apiResponse.zipHeader})`);
console.log(`   - CSV File: ${logAnalysis.apiResponse.csvFilePath}`);
console.log(`   - XML Tags: ${logAnalysis.apiResponse.tagCount}`);
console.log(`   - Numeric Tags: ${logAnalysis.apiResponse.numericTagCount}`);
console.log(`   - Extracted Values: ${logAnalysis.apiResponse.extractedValueCount}`);

// ZIP解析の模擬テスト
function analyzeZipHeader(hexString) {
    console.log('\n4. ZIP ヘッダー解析:\n');
    
    // ログから取得したサンプルデータ（Unicode エスケープ付き）
    const sample = "PK\\u0003\\u0004\\u0014\\u0000\\b\\b\\b\\u0000v��Z\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000D\\u0000\\u0000\\u0000XBRL_TO_CSV/jpaud-aai-cc-001_E01739-000_2025-03-31_01_2025-06-20.csv";
    
    console.log('   ZIP マジックバイト: PK (0x504B) ✓');
    console.log('   ローカルファイルヘッダー: 0x03 0x04 ✓');
    console.log('   ファイル名: XBRL_TO_CSV/jpaud-aai-cc-001_E01739-000_2025-03-31_01_2025-06-20.csv');
    console.log('   → ZIPファイルには確実にCSVが含まれている');
    
    return {
        isValidZip: true,
        hasXbrlCsv: true,
        csvFileName: 'jpaud-aai-cc-001_E01739-000_2025-03-31_01_2025-06-20.csv'
    };
}

const zipAnalysis = analyzeZipHeader();

// CSVフォーマット分析
function analyzeCsvFormat() {
    console.log('\n5. EDINET CSV フォーマット分析:\n');
    
    console.log('   EDINET APIのtype=1で返されるZIPファイルには通常以下が含まれる:');
    console.log('   - XBRL XMLファイル（元のXBRLドキュメント）');
    console.log('   - CSV変換ファイル（XBRLデータをCSV形式に変換）');
    console.log('   - メタデータファイル');
    
    console.log('\n   CSVファイルの一般的な構造:');
    console.log('   - 1列目: 勘定科目名（日本語）');
    console.log('   - 2列目: 勘定科目コード');
    console.log('   - 3列目: コンテキスト');
    console.log('   - 4列目: 単位');
    console.log('   - 5列目: 金額');
    
    console.log('\n   三菱電機のCSVで期待される主要項目:');
    const expectedItems = [
        '売上高',
        '営業利益',
        '経常利益',
        '当期純利益',
        '資産合計',
        '現金及び預金',
        '株主資本',
        '有利子負債'
    ];
    
    expectedItems.forEach(item => {
        console.log(`   - ${item}`);
    });
}

analyzeCsvFormat();

// 修正案の提案
function proposeFixStrategy() {
    console.log('\n6. 修正戦略の提案:\n');
    
    const fixes = [
        {
            file: 'api/utils/xbrl-parser.js',
            issue: 'ZIP展開ロジックの問題',
            solution: 'Node.js標準のzlibまたはadm-zipライブラリを使用した確実なZIP展開'
        },
        {
            file: 'api/utils/xbrl-parser.js',
            issue: 'CSVパース機能の不足',
            solution: 'EDINETのCSV形式に特化したパーサー実装'
        },
        {
            file: 'api/utils/xbrl-parser.js',
            issue: '財務データマッピングの不備',
            solution: '日本語勘定科目名と英語項目名のマッピング強化'
        },
        {
            file: 'api/edinet/financial.js',
            issue: 'エラーハンドリングの不足',
            solution: 'ZIP/CSV処理失敗時の適切なフォールバック'
        }
    ];
    
    fixes.forEach((fix, i) => {
        console.log(`   ${i + 1}. ${fix.file}`);
        console.log(`      問題: ${fix.issue}`);
        console.log(`      解決: ${fix.solution}\n`);
    });
}

proposeFixStrategy();

// 次のステップ
console.log('7. 次のステップ:\n');
console.log('   1. xbrl-parser.jsのZIP展開ロジックを修正');
console.log('   2. CSVパーサーを実装');
console.log('   3. 三菱電機のテストケースで動作確認');
console.log('   4. 他の企業でも動作することを確認');
console.log('   5. エラーハンドリングとログ強化');

console.log('\n   修正の優先度: 🔴 HIGH - 財務データが全く取得できていない');
console.log('   予想される修正時間: 2-3時間');
console.log('   テスト必要性: 🔴 CRITICAL - 複数企業でのテスト必須');

console.log('\n=== 解析完了 ===');