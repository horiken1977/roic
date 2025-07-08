const https = require('https');
const fs = require('fs');
const iconv = require('iconv-lite');

/**
 * API取得データのExcel形式出力（SHIFT-JIS）
 */
async function createExcelReport() {
  console.log('📊 API取得データのExcel形式出力開始');
  console.log('=' .repeat(60));
  
  try {
    // 最新のテスト結果ファイルを読み込み
    const finalTestFile = 'toyota_final_test_2025-07-06.json';
    
    if (!fs.existsSync(finalTestFile)) {
      console.log('❌ 最終テストファイルが見つかりません。先にfinal-test.jsを実行してください。');
      return;
    }
    
    console.log('📂 最終テスト結果読み込み中...');
    const finalData = JSON.parse(fs.readFileSync(finalTestFile, 'utf8'));
    
    // デバッグファイルからXBRL詳細データも読み込み
    const debugFile = 'toyota_fixed_data_2025-07-06.json';
    let debugData = null;
    if (fs.existsSync(debugFile)) {
      debugData = JSON.parse(fs.readFileSync(debugFile, 'utf8'));
    }
    
    console.log('📋 Excel形式データ生成中...');
    
    // Excelデータ構造作成
    const excelData = {
      基本情報: [
        ['項目', '値', '備考'],
        ['企業名', finalData.企業名, '正式名称'],
        ['EDINETコード', finalData.EDINETコード, '金融庁企業識別コード'],
        ['決算年度', finalData.決算年度, '年度'],
        ['データソース', finalData.データソース, '取得方法'],
        ['抽出日時', finalData.抽出日時, 'ISO8601形式'],
        ['', '', ''],
        ['有価証券報告書確認用', '', ''],
        ['決算期', '2024年3月期', '2024年4月1日-2025年3月31日'],
        ['報告書種類', '有価証券報告書', '年次報告'],
        ['提出日', '確認要', 'EDINET提出日'],
        ['', '', '']
      ],
      
      財務データ詳細: [
        ['財務項目', 'API取得値（円）', '表示形式', 'XBRL要素名', '状態', '有報確認欄', '差異', '備考'],
        ['売上高', 
         finalData.財務データ.売上高?.値 || 'N/A',
         finalData.財務データ.売上高?.表示 || 'N/A',
         finalData.財務データ.売上高?.XBRL要素 || 'N/A',
         finalData.財務データ.売上高?.状態 || 'N/A',
         '', '', '連結売上高'],
        ['営業利益',
         finalData.財務データ.営業利益?.値 || 'N/A', 
         finalData.財務データ.営業利益?.表示 || 'N/A',
         finalData.財務データ.営業利益?.XBRL要素 || 'N/A',
         finalData.財務データ.営業利益?.状態 || 'N/A',
         '', '', '連結営業利益'],
        ['総資産',
         finalData.財務データ.総資産?.値 || 'N/A',
         finalData.財務データ.総資産?.表示 || 'N/A', 
         finalData.財務データ.総資産?.XBRL要素 || 'N/A',
         finalData.財務データ.総資産?.状態 || 'N/A',
         '', '', '連結総資産（期末）'],
        ['', '', '', '', '', '', '', ''],
        ['参考：期待値との比較', '', '', '', '', '', '', ''],
        ['売上高期待値', '48,036,704,000,000', '48.0兆円', '有報記載値', '参考', '', '', ''],
        ['営業利益期待値', '4,795,586,000,000', '4.8兆円', '有報記載値', '参考', '', '', ''],
        ['総資産期待値', '93,601,350,000,000', '93.6兆円', '有報記載値', '参考', '', '', '']
      ],
      
      ROIC計算詳細: [
        ['計算項目', '値', '単位', '計算式', '備考'],
        ['営業利益率', finalData.ROIC計算?.営業利益率 || 'N/A', '%', '営業利益 ÷ 売上高', '収益性指標'],
        ['総資産回転率', finalData.ROIC計算?.総資産回転率 || 'N/A', '回転', '売上高 ÷ 総資産', '効率性指標'],
        ['ROIC', finalData.ROIC計算?.ROIC || 'N/A', '%', '営業利益率 × 総資産回転率', '総合収益性'],
        ['', '', '', '', ''],
        ['計算方式', finalData.ROIC計算?.計算方式 || 'N/A', '', '', ''],
        ['計算状態', finalData.ROIC計算?.状態 || 'N/A', '', '', ''],
        ['', '', '', '', ''],
        ['詳細計算過程', '', '', '', ''],
        ['1. 営業利益', finalData.財務データ.営業利益?.値 || 'N/A', '円', '', ''],
        ['2. 売上高', finalData.財務データ.売上高?.値 || 'N/A', '円', '', ''],
        ['3. 総資産', finalData.財務データ.総資産?.値 || 'N/A', '円', '', ''],
        ['4. 営業利益率', '', '', '= 1 ÷ 2', ''],
        ['5. 総資産回転率', '', '', '= 2 ÷ 3', ''],
        ['6. ROIC', '', '', '= 4 × 5', '']
      ]
    };
    
    // XBRL構造詳細（デバッグデータがある場合）
    if (debugData?.デバッグ情報) {
      const debug = debugData.デバッグ情報;
      
      excelData.XBRL構造詳細 = [
        ['XBRL項目', '値', '備考'],
        ['コンテキスト総数', debug.contexts?.total || 'N/A', 'XBRL内のコンテキスト数'],
        ['ファクト総数', debug.facts?.total || 'N/A', 'XBRL内の財務データ要素数'],
        ['現在期間コンテキストID', debug.contexts?.currentPeriodContextId || 'N/A', '当期データのコンテキスト'],
        ['XBRL要素総数', debug.xbrlStructure?.xbrlChildCount || 'N/A', 'XML内の全要素数'],
        ['', '', ''],
        ['売上関連要素数', debug.facts?.salesRelated?.length || 'N/A', '売上に関連する要素'],
        ['利益関連要素数', debug.facts?.profitRelated?.length || 'N/A', '利益に関連する要素'],
        ['資産関連要素数', debug.facts?.assetRelated?.length || 'N/A', '資産に関連する要素'],
        ['', '', ''],
        ['抽出テスト結果', '', ''],
        ['売上高マッチ数', debug.extractionTest?.netSales?.matches?.length || 0, '検索でマッチした要素数'],
        ['営業利益マッチ数', debug.extractionTest?.operatingIncome?.matches?.length || 0, '検索でマッチした要素数'],
        ['総資産マッチ数', debug.extractionTest?.totalAssets?.matches?.length || 0, '検索でマッチした要素数']
      ];
      
      // 利用可能なコンテキスト一覧
      if (debug.contexts?.availableContextIds) {
        excelData.利用可能コンテキスト = [
          ['コンテキストID', '備考']
        ];
        debug.contexts.availableContextIds.slice(0, 20).forEach(contextId => {
          excelData.利用可能コンテキスト.push([contextId, '']);
        });
      }
    }
    
    // 修正効果比較
    if (finalData.修正効果) {
      excelData.修正効果比較 = [
        ['カテゴリ', '内容', '備考'],
        ['修正前の問題点', '', ''],
        ...finalData.修正効果.修正前の問題.map(problem => ['', problem, '']),
        ['', '', ''],
        ['修正後の改善点', '', ''],
        ...finalData.修正効果.修正後の改善.map(improvement => ['', improvement, '']),
        ['', '', ''],
        ['技術課題解決項目', '', ''],
        ...finalData.修正効果.技術課題解決.map(solution => ['', solution, ''])
      ];
    }
    
    // 有価証券報告書確認チェックリスト
    excelData.有報確認チェックリスト = [
      ['確認項目', 'API取得値', '有報記載値', '差異', '確認状況', '備考'],
      ['売上高（連結）', finalData.財務データ.売上高?.表示 || 'N/A', '', '', '未確認', '損益計算書'],
      ['営業利益（連結）', finalData.財務データ.営業利益?.表示 || 'N/A', '', '', '未確認', '損益計算書'],
      ['総資産（連結）', finalData.財務データ.総資産?.表示 || 'N/A', '', '', '未確認', '貸借対照表'],
      ['', '', '', '', '', ''],
      ['確認手順', '', '', '', '', ''],
      ['1. EDINETで有価証券報告書を検索', '', '', '', '', 'https://disclosure.edinet-fsa.go.jp/'],
      ['2. トヨタ自動車（E02144）を検索', '', '', '', '', ''],
      ['3. 2024年度有価証券報告書を選択', '', '', '', '', ''],
      ['4. 連結損益計算書で売上高・営業利益確認', '', '', '', '', ''],
      ['5. 連結貸借対照表で総資産確認', '', '', '', '', ''],
      ['6. 上記表の「有報記載値」欄に転記', '', '', '', '', ''],
      ['7. 差異を計算・記録', '', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['差異許容範囲', '', '', '', '', ''],
      ['±5%以内', '良好', '', '', '', ''],
      ['±10%以内', '許容', '', '', '', ''],
      ['±10%超', '要調査', '', '', '', '']
    ];
    
    console.log('💾 CSV形式でのExcelデータ生成中...');
    
    // 各シートをCSV形式で生成
    const csvFiles = [];
    
    Object.entries(excelData).forEach(([sheetName, data]) => {
      const csvContent = data.map(row => 
        row.map(cell => {
          // セル内容を文字列化し、カンマやダブルクォートをエスケープ
          const cellStr = String(cell || '');
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      ).join('\n');
      
      // SHIFT-JIS形式で保存
      const fileName = `toyota_api_data_${sheetName}_SJIS.csv`;
      const sjisBuffer = iconv.encode(csvContent, 'shift_jis');
      fs.writeFileSync(fileName, sjisBuffer);
      
      csvFiles.push(fileName);
      console.log(`✅ ${sheetName}シート作成: ${fileName}`);
    });
    
    // 統合版Excel形式CSV（全シートまとめ）
    console.log('📋 統合版Excel作成中...');
    let combinedContent = '';
    
    Object.entries(excelData).forEach(([sheetName, data]) => {
      combinedContent += `\n【${sheetName}】\n`;
      combinedContent += data.map(row => row.join(',')).join('\n');
      combinedContent += '\n\n';
    });
    
    // 統合版もSHIFT-JIS形式で保存
    const combinedFileName = 'toyota_api_complete_data_SJIS.csv';
    const combinedSjisBuffer = iconv.encode(combinedContent, 'shift_jis');
    fs.writeFileSync(combinedFileName, combinedSjisBuffer);
    
    console.log(`✅ 統合版作成: ${combinedFileName}`);
    
    // 作成ファイル一覧表示
    console.log('\n📁 作成されたファイル一覧:');
    csvFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });
    console.log(`${csvFiles.length + 1}. ${combinedFileName} (統合版)`);
    
    console.log('\n📋 有価証券報告書確認手順:');
    console.log('1. 上記CSVファイルをExcelで開く');
    console.log('2. EDINET (https://disclosure.edinet-fsa.go.jp/) で有価証券報告書を検索');
    console.log('3. トヨタ自動車（E02144）の2024年度有価証券報告書を開く');
    console.log('4. 連結財務諸表から該当数値を確認');
    console.log('5. 「有報確認チェックリスト」シートに記入');
    console.log('6. 差異を計算・分析');
    
    console.log('\n🎯 期待される確認結果:');
    console.log('- 売上高: API値 vs 有報値の差異が±10%以内');
    console.log('- 営業利益: API値 vs 有報値の差異が±10%以内');
    console.log('- 総資産: API値 vs 有報値の差異が±10%以内');
    
    console.log('\n✅ Excel形式出力完了（SHIFT-JIS形式）');
    
    return {
      success: true,
      files: [...csvFiles, combinedFileName],
      dataStructure: Object.keys(excelData)
    };
    
  } catch (error) {
    console.error('❌ Excel出力エラー:', error);
    
    // iconvが使用できない場合のフォールバック
    if (error.message.includes('iconv')) {
      console.log('\n⚠️ SHIFT-JIS変換ライブラリが見つかりません');
      console.log('UTF-8形式で出力します...');
      
      // UTF-8でのフォールバック出力
      return createFallbackExcel();
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * SHIFT-JIS変換ライブラリがない場合のフォールバック
 */
function createFallbackExcel() {
  console.log('📋 UTF-8フォールバック版Excel出力');
  
  try {
    const finalTestFile = 'toyota_final_test_2025-07-06.json';
    const finalData = JSON.parse(fs.readFileSync(finalTestFile, 'utf8'));
    
    // シンプルなCSV形式で出力
    const csvContent = [
      ['項目', 'API取得値', '表示形式', 'XBRL要素', '状態', '有報確認欄', '差異', '備考'],
      ['企業名', finalData.企業名, '', '', '', '', '', ''],
      ['EDINETコード', finalData.EDINETコード, '', '', '', '', '', ''],
      ['決算年度', finalData.決算年度, '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['売上高', finalData.財務データ.売上高?.値 || '', finalData.財務データ.売上高?.表示 || '', finalData.財務データ.売上高?.XBRL要素 || '', finalData.財務データ.売上高?.状態 || '', '', '', '連結売上高'],
      ['営業利益', finalData.財務データ.営業利益?.値 || '', finalData.財務データ.営業利益?.表示 || '', finalData.財務データ.営業利益?.XBRL要素 || '', finalData.財務データ.営業利益?.状態 || '', '', '', '連結営業利益'],
      ['総資産', finalData.財務データ.総資産?.値 || '', finalData.財務データ.総資産?.表示 || '', finalData.財務データ.総資産?.XBRL要素 || '', finalData.財務データ.総資産?.状態 || '', '', '', '連結総資産'],
      ['', '', '', '', '', '', '', ''],
      ['ROIC', finalData.ROIC計算?.ROIC || '', '', '', '', '', '', ''],
      ['営業利益率', finalData.ROIC計算?.営業利益率 || '', '', '', '', '', '', ''],
      ['総資産回転率', finalData.ROIC計算?.総資産回転率 || '', '', '', '', '', '', '']
    ].map(row => row.join(',')).join('\n');
    
    const fileName = 'toyota_api_data_UTF8.csv';
    fs.writeFileSync(fileName, csvContent, 'utf8');
    
    console.log(`✅ UTF-8版作成: ${fileName}`);
    console.log('⚠️ Excelで開く際は文字エンコーディングをUTF-8に設定してください');
    
    return {
      success: true,
      files: [fileName],
      encoding: 'UTF-8'
    };
    
  } catch (error) {
    console.error('❌ フォールバック出力エラー:', error);
    return { success: false, error: error.message };
  }
}

// 実行
createExcelReport().then(result => {
  if (result.success) {
    console.log('\n🎉 Excel出力完了！');
    console.log('有価証券報告書との突合確認を実施してください。');
  } else {
    console.log('\n❌ Excel出力に失敗しました:', result.error);
  }
});