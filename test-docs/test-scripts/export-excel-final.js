const fs = require('fs');

/**
 * 有価証券報告書突合用Excel形式出力
 */
function exportExcelFinal() {
  console.log('📊 有価証券報告書突合用Excel出力');
  console.log('=' .repeat(60));
  
  try {
    // 最終テストデータ読み込み
    const finalTestFile = 'toyota_final_test_2025-07-06.json';
    if (!fs.existsSync(finalTestFile)) {
      console.log('❌ 最終テストファイルが見つかりません');
      return false;
    }
    
    const finalData = JSON.parse(fs.readFileSync(finalTestFile, 'utf8'));
    
    console.log('📋 Excel用データ生成中...');
    
    // 基本情報CSV
    const basicInfo = [
      ['項目', '値', '備考'],
      ['企業名', finalData.企業名, '正式名称'],
      ['EDINETコード', finalData.EDINETコード, ''],
      ['決算年度', finalData.決算年度, ''],
      ['データソース', finalData.データソース, ''],
      ['抽出日時', finalData.抽出日時, '']
    ];
    
    // 財務データ詳細CSV
    const financialData = [
      ['財務項目', 'API取得値（円）', '表示形式', 'XBRL要素名', '状態', '有報記載値', '差異', '備考'],
      [
        '売上高',
        finalData.財務データ.売上高?.値 || '',
        finalData.財務データ.売上高?.表示 || '',
        finalData.財務データ.売上高?.XBRL要素 || '',
        finalData.財務データ.売上高?.状態 || '',
        '', // 手動入力用
        '', // 差異計算用
        '連結売上高'
      ],
      [
        '営業利益',
        finalData.財務データ.営業利益?.値 || '',
        finalData.財務データ.営業利益?.表示 || '',
        finalData.財務データ.営業利益?.XBRL要素 || '',
        finalData.財務データ.営業利益?.状態 || '',
        '', // 手動入力用
        '', // 差異計算用
        '連結営業利益'
      ],
      [
        '総資産',
        finalData.財務データ.総資産?.値 || '',
        finalData.財務データ.総資産?.表示 || '',
        finalData.財務データ.総資産?.XBRL要素 || '',
        finalData.財務データ.総資産?.状態 || '',
        '', // 手動入力用
        '', // 差異計算用
        '連結総資産'
      ]
    ];
    
    // ROIC計算詳細CSV
    const roicData = [
      ['計算項目', '値', '単位', '備考'],
      ['営業利益率', finalData.ROIC計算?.営業利益率 || '', '%', ''],
      ['総資産回転率', finalData.ROIC計算?.総資産回転率 || '', '回', ''],
      ['ROIC', finalData.ROIC計算?.ROIC || '', '%', ''],
      ['計算方式', finalData.ROIC計算?.計算方式 || '', '', '']
    ];
    
    // 有報確認チェックリストCSV
    const checklist = [
      ['確認項目', 'API取得値', '有報記載値（手動入力）', '差異', '確認状況', '備考'],
      ['売上高', finalData.財務データ.売上高?.表示 || '', '', '', '未確認', '連結損益計算書'],
      ['営業利益', finalData.財務データ.営業利益?.表示 || '', '', '', '未確認', '連結損益計算書'],
      ['総資産', finalData.財務データ.総資産?.表示 || '', '', '', '未確認', '連結貸借対照表'],
      ['', '', '', '', '', ''],
      ['確認手順', '', '', '', '', ''],
      ['1. EDINETアクセス', 'https://disclosure.edinet-fsa.go.jp/', '', '', '', ''],
      ['2. トヨタ自動車検索', '証券コード: 7203', '', '', '', ''],
      ['3. 2024年度有価証券報告書', '', '', '', '', ''],
      ['4. 連結損益計算書確認', '売上高・営業利益', '', '', '', ''],
      ['5. 連結貸借対照表確認', '総資産', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['判定基準', '', '', '', '', ''],
      ['差異±5%以内', '良好', '', '', '', ''],
      ['差異±10%以内', '許容', '', '', '', ''],
      ['差異±10%超', '要調査', '', '', '', '']
    ];
    
    // CSV文字列生成関数
    function arrayToCSV(data) {
      return data.map(row => 
        row.map(cell => {
          const str = String(cell || '');
          if (str.includes(',') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      ).join('\n');
    }
    
    // ファイル保存
    console.log('💾 ファイル保存中...');
    
    fs.writeFileSync('toyota_基本情報.csv', arrayToCSV(basicInfo), 'utf8');
    fs.writeFileSync('toyota_財務データ.csv', arrayToCSV(financialData), 'utf8');
    fs.writeFileSync('toyota_ROIC計算.csv', arrayToCSV(roicData), 'utf8');
    fs.writeFileSync('toyota_有報確認.csv', arrayToCSV(checklist), 'utf8');
    
    // 統合版作成
    const combined = [
      '【基本情報】',
      arrayToCSV(basicInfo),
      '',
      '【財務データ詳細】',
      arrayToCSV(financialData),
      '',
      '【ROIC計算詳細】',
      arrayToCSV(roicData),
      '',
      '【有価証券報告書確認チェックリスト】',
      arrayToCSV(checklist)
    ].join('\n');
    
    // BOM付きUTF-8で保存（Excel対応）
    const bom = '\uFEFF';
    fs.writeFileSync('toyota_完全版.csv', bom + combined, 'utf8');
    
    console.log('✅ Excel形式出力完了！');
    
    console.log('\n📁 作成ファイル:');
    console.log('1. toyota_基本情報.csv');
    console.log('2. toyota_財務データ.csv');
    console.log('3. toyota_ROIC計算.csv');
    console.log('4. toyota_有報確認.csv');
    console.log('5. toyota_完全版.csv (統合・BOM付き)');
    
    console.log('\n📋 有価証券報告書突合手順:');
    console.log('1. toyota_有報確認.csv をExcelで開く');
    console.log('2. EDINET で トヨタ自動車（7203）を検索');
    console.log('3. 2024年度有価証券報告書を確認');
    console.log('4. 連結財務諸表の数値を転記');
    console.log('5. 差異を計算・評価');
    
    console.log('\n🎯 API取得データサマリー:');
    console.log(`売上高: ${finalData.財務データ.売上高?.表示}`);
    console.log(`営業利益: ${finalData.財務データ.営業利益?.表示}`);
    console.log(`総資産: ${finalData.財務データ.総資産?.表示}`);
    console.log(`ROIC: ${finalData.ROIC計算?.ROIC}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Excel出力エラー:', error);
    return false;
  }
}

// 実行
const success = exportExcelFinal();

if (success) {
  console.log('\n🎉 有価証券報告書突合用Excelファイル作成完了！');
} else {
  console.log('\n❌ Excel出力に失敗しました');
}