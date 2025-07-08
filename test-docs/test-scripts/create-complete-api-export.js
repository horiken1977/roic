const fs = require('fs');

/**
 * API取得データの完全版Excel出力
 * すべてのAPIデータを詳細に出力
 */
function createCompleteApiExport() {
  console.log('📊 API取得データ完全版出力開始');
  console.log('='.repeat(60));
  
  try {
    // 最終テストデータ読み込み
    const finalTestFile = 'toyota_final_test_2025-07-06.json';
    const debugFile = 'toyota_fixed_data_2025-07-06.json';
    
    if (!fs.existsSync(finalTestFile)) {
      console.log('❌ 最終テストファイルが見つかりません');
      return false;
    }
    
    const finalData = JSON.parse(fs.readFileSync(finalTestFile, 'utf8'));
    let debugData = null;
    
    if (fs.existsSync(debugFile)) {
      debugData = JSON.parse(fs.readFileSync(debugFile, 'utf8'));
    }
    
    console.log('📋 完全版データ構造作成中...');
    
    // CSV生成関数
    function arrayToCSV(data) {
      return data.map(row => 
        row.map(cell => {
          const str = String(cell || '');
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      ).join('\n');
    }
    
    // 1. 基本情報詳細
    const basicInfo = [
      ['【基本情報】', '', ''],
      ['項目', '値', '備考'],
      ['企業名', finalData.企業名 || '', '正式名称'],
      ['EDINETコード', finalData.EDINETコード || '', '金融庁企業識別コード'],
      ['決算年度', finalData.決算年度 || '', '年度'],
      ['データソース', finalData.データソース || '', '取得方法'],
      ['抽出日時', finalData.抽出日時 || '', 'ISO8601形式'],
      ['', '', ''],
      ['有価証券報告書確認用', '', ''],
      ['決算期', '2024年3月期', '2024年4月1日-2025年3月31日'],
      ['EDINET URL', 'https://disclosure.edinet-fsa.go.jp/', '有価証券報告書検索'],
      ['証券コード', '7203', 'トヨタ自動車'],
      ['', '', '']
    ];
    
    // 2. 財務データ完全版
    const financialData = [
      ['【財務データ詳細】', '', '', '', '', '', '', ''],
      ['財務項目', 'API取得値（円）', '表示形式', 'XBRL要素名', '状態', '有報確認値', '差異', '備考'],
      [
        '売上高',
        finalData.財務データ?.売上高?.値 || '',
        finalData.財務データ?.売上高?.表示 || '',
        finalData.財務データ?.売上高?.XBRL要素 || '',
        finalData.財務データ?.売上高?.状態 || '',
        '', '', '連結売上高'
      ],
      [
        '営業利益',
        finalData.財務データ?.営業利益?.値 || '',
        finalData.財務データ?.営業利益?.表示 || '',
        finalData.財務データ?.営業利益?.XBRL要素 || '',
        finalData.財務データ?.営業利益?.状態 || '',
        '', '', '連結営業利益'
      ],
      [
        '総資産',
        finalData.財務データ?.総資産?.値 || '',
        finalData.財務データ?.総資産?.表示 || '',
        finalData.財務データ?.総資産?.XBRL要素 || '',
        finalData.財務データ?.総資産?.状態 || '',
        '', '', '連結総資産'
      ],
      ['', '', '', '', '', '', '', ''],
      ['期待値との比較', '', '', '', '', '', '', ''],
      ['売上高期待値', '48,036,704,000,000', '48.0兆円', '有価証券報告書ベース', '参考', '', '', ''],
      ['営業利益期待値', '4,795,586,000,000', '4.8兆円', '有価証券報告書ベース', '参考', '', '', ''],
      ['総資産期待値', '93,601,350,000,000', '93.6兆円', '有価証券報告書ベース', '参考', '', '', '']
    ];
    
    // 3. ROIC計算詳細
    const roicCalculation = [
      ['【ROIC計算詳細】', '', '', '', ''],
      ['計算項目', '値', '単位', '計算式', '備考'],
      ['営業利益率', finalData.ROIC計算?.営業利益率 || '', '%', '営業利益 ÷ 売上高', '収益性指標'],
      ['総資産回転率', finalData.ROIC計算?.総資産回転率 || '', '回転', '売上高 ÷ 総資産', '効率性指標'],
      ['ROIC', finalData.ROIC計算?.ROIC || '', '%', '営業利益率 × 総資産回転率', '総合収益性指標'],
      ['', '', '', '', ''],
      ['計算方式', finalData.ROIC計算?.計算方式 || '', '', '', ''],
      ['計算状態', finalData.ROIC計算?.状態 || '', '', '', ''],
      ['', '', '', '', ''],
      ['詳細計算過程', '', '', '', ''],
      ['営業利益（円）', finalData.財務データ?.営業利益?.値 || '', '円', '', '分子'],
      ['売上高（円）', finalData.財務データ?.売上高?.値 || '', '円', '', '営業利益率計算用'],
      ['総資産（円）', finalData.財務データ?.総資産?.値 || '', '円', '', '総資産回転率計算用'],
      ['', '', '', '', ''],
      ['計算結果確認', '', '', '', ''],
      ['営業利益率計算', `${finalData.財務データ?.営業利益?.値} ÷ ${finalData.財務データ?.売上高?.値}`, '', '= ' + (finalData.ROIC計算?.営業利益率 || ''), ''],
      ['総資産回転率計算', `${finalData.財務データ?.売上高?.値} ÷ ${finalData.財務データ?.総資産?.値}`, '', '= ' + (finalData.ROIC計算?.総資産回転率 || ''), ''],
      ['ROIC最終計算', `${finalData.ROIC計算?.営業利益率} × ${finalData.ROIC計算?.総資産回転率}`, '', '= ' + (finalData.ROIC計算?.ROIC || ''), '']
    ];
    
    // 4. 修正効果比較
    const improvementComparison = [
      ['【修正効果比較】', '', ''],
      ['カテゴリ', '内容', '備考'],
      ['修正前の問題点', '', ''],
      ...((finalData.修正効果?.修正前の問題 || []).map(problem => ['', problem, ''])),
      ['', '', ''],
      ['修正後の改善点', '', ''],
      ...((finalData.修正効果?.修正後の改善 || []).map(improvement => ['', improvement, ''])),
      ['', '', ''],
      ['技術課題解決項目', '', ''],
      ...((finalData.修正効果?.技術課題解決 || []).map(solution => ['', solution, '']))
    ];
    
    // 5. XBRL構造詳細（デバッグデータがある場合）
    let xbrlStructure = [
      ['【XBRL構造詳細】', '', ''],
      ['項目', '値', '備考'],
      ['データなし', '', 'デバッグファイルが見つかりません']
    ];
    
    if (debugData?.デバッグ情報) {
      const debug = debugData.デバッグ情報;
      xbrlStructure = [
        ['【XBRL構造詳細】', '', ''],
        ['項目', '値', '備考'],
        ['XBRL要素総数', debug.xbrlStructure?.xbrlChildCount || '', 'XML内の全要素数'],
        ['コンテキスト総数', debug.contexts?.total || '', 'XBRL内のコンテキスト数'],
        ['ファクト総数', debug.facts?.total || '', 'XBRL内の財務データ要素数'],
        ['現在期間コンテキストID', debug.contexts?.currentPeriodContextId || '', '当期データのコンテキスト'],
        ['期間開始日', debug.contexts?.currentPeriodContext?.startDate || '', '会計期間開始'],
        ['期間終了日', debug.contexts?.currentPeriodContext?.endDate || '', '会計期間終了'],
        ['', '', ''],
        ['カテゴリ別統計', '', ''],
        ['売上関連要素数', debug.facts?.salesRelated?.length || 0, '売上に関連するXBRL要素'],
        ['利益関連要素数', debug.facts?.profitRelated?.length || 0, '利益に関連するXBRL要素'],
        ['資産関連要素数', debug.facts?.assetRelated?.length || 0, '資産に関連するXBRL要素'],
        ['', '', ''],
        ['抽出テスト結果', '', ''],
        ['売上高マッチ数', debug.extractionTest?.netSales?.matches?.length || 0, '検索条件マッチ数'],
        ['営業利益マッチ数', debug.extractionTest?.operatingIncome?.matches?.length || 0, '検索条件マッチ数'],
        ['総資産マッチ数', debug.extractionTest?.totalAssets?.matches?.length || 0, '検索条件マッチ数']
      ];
    }
    
    // 6. 売上関連要素詳細
    let salesRelatedDetails = [
      ['【売上関連要素詳細】', '', '', '', ''],
      ['XBRL要素名', 'カウント', 'サンプル値', 'コンテキスト例', '備考'],
      ['データなし', '', '', '', '']
    ];
    
    if (debugData?.デバッグ情報?.facts?.salesRelated) {
      salesRelatedDetails = [
        ['【売上関連要素詳細】', '', '', '', ''],
        ['XBRL要素名', 'カウント', 'サンプル値', 'コンテキスト例', '備考'],
        ...debugData.デバッグ情報.facts.salesRelated.map(item => [
          item.key || '',
          item.count || '',
          item.sampleValue || '',
          (item.contexts && item.contexts[0] && item.contexts[0][0]) || '',
          ''
        ])
      ];
    }
    
    // 7. 利益関連要素詳細
    let profitRelatedDetails = [
      ['【利益関連要素詳細】', '', '', '', ''],
      ['XBRL要素名', 'カウント', 'サンプル値', 'コンテキスト例', '備考'],
      ['データなし', '', '', '', '']
    ];
    
    if (debugData?.デバッグ情報?.facts?.profitRelated) {
      profitRelatedDetails = [
        ['【利益関連要素詳細】', '', '', '', ''],
        ['XBRL要素名', 'カウント', 'サンプル値', 'コンテキスト例', '備考'],
        ...debugData.デバッグ情報.facts.profitRelated.map(item => [
          item.key || '',
          item.count || '',
          item.sampleValue || '',
          (item.contexts && item.contexts[0] && item.contexts[0][0]) || '',
          ''
        ])
      ];
    }
    
    // 8. 資産関連要素詳細
    let assetRelatedDetails = [
      ['【資産関連要素詳細】', '', '', '', ''],
      ['XBRL要素名', 'カウント', 'サンプル値', 'コンテキスト例', '備考'],
      ['データなし', '', '', '', '']
    ];
    
    if (debugData?.デバッグ情報?.facts?.assetRelated) {
      assetRelatedDetails = [
        ['【資産関連要素詳細】', '', '', '', ''],
        ['XBRL要素名', 'カウント', 'サンプル値', 'コンテキスト例', '備考'],
        ...debugData.デバッグ情報.facts.assetRelated.map(item => [
          item.key || '',
          item.count || '',
          item.sampleValue || '',
          (item.contexts && item.contexts[0] && item.contexts[0][0]) || '',
          ''
        ])
      ];
    }
    
    // 9. 利用可能コンテキスト一覧
    let availableContexts = [
      ['【利用可能コンテキスト一覧】', ''],
      ['コンテキストID', '備考'],
      ['データなし', '']
    ];
    
    if (debugData?.デバッグ情報?.contexts?.availableContextIds) {
      availableContexts = [
        ['【利用可能コンテキスト一覧】', ''],
        ['コンテキストID', '備考'],
        ...debugData.デバッグ情報.contexts.availableContextIds.slice(0, 50).map(contextId => [
          contextId || '',
          ''
        ])
      ];
    }
    
    // 10. 有価証券報告書確認チェックリスト
    const checklistData = [
      ['【有価証券報告書確認チェックリスト】', '', '', '', '', ''],
      ['確認項目', 'API取得値', '有報記載値', '差異', '確認状況', '備考'],
      ['売上高（連結）', finalData.財務データ?.売上高?.表示 || '', '', '', '未確認', '連結損益計算書から確認'],
      ['営業利益（連結）', finalData.財務データ?.営業利益?.表示 || '', '', '', '未確認', '連結損益計算書から確認'],
      ['総資産（連結）', finalData.財務データ?.総資産?.表示 || '', '', '', '未確認', '連結貸借対照表から確認'],
      ['', '', '', '', '', ''],
      ['確認手順', '', '', '', '', ''],
      ['1. EDINETアクセス', 'https://disclosure.edinet-fsa.go.jp/', '', '', '', ''],
      ['2. 企業検索', 'トヨタ自動車（7203）', '', '', '', ''],
      ['3. 有価証券報告書選択', '2024年度', '', '', '', ''],
      ['4. 連結損益計算書確認', '売上高・営業利益', '', '', '', ''],
      ['5. 連結貸借対照表確認', '総資産', '', '', '', ''],
      ['6. 数値転記', '「有報記載値」列に入力', '', '', '', ''],
      ['7. 差異計算', '(API値 - 有報値)', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['判定基準', '', '', '', '', ''],
      ['差異±5%以内', '良好', '', '', '', ''],
      ['差異±10%以内', '許容範囲', '', '', '', ''],
      ['差異±10%超', '要調査', '', '', '', '']
    ];
    
    console.log('💾 ファイル保存中...');
    
    // 個別ファイル保存
    fs.writeFileSync('toyota_01_基本情報.csv', arrayToCSV(basicInfo), 'utf8');
    fs.writeFileSync('toyota_02_財務データ.csv', arrayToCSV(financialData), 'utf8');
    fs.writeFileSync('toyota_03_ROIC計算.csv', arrayToCSV(roicCalculation), 'utf8');
    fs.writeFileSync('toyota_04_修正効果.csv', arrayToCSV(improvementComparison), 'utf8');
    fs.writeFileSync('toyota_05_XBRL構造.csv', arrayToCSV(xbrlStructure), 'utf8');
    fs.writeFileSync('toyota_06_売上関連要素.csv', arrayToCSV(salesRelatedDetails), 'utf8');
    fs.writeFileSync('toyota_07_利益関連要素.csv', arrayToCSV(profitRelatedDetails), 'utf8');
    fs.writeFileSync('toyota_08_資産関連要素.csv', arrayToCSV(assetRelatedDetails), 'utf8');
    fs.writeFileSync('toyota_09_コンテキスト一覧.csv', arrayToCSV(availableContexts), 'utf8');
    fs.writeFileSync('toyota_10_有報確認チェックリスト.csv', arrayToCSV(checklistData), 'utf8');
    
    // 統合版作成
    const combinedData = [
      arrayToCSV(basicInfo),
      '',
      arrayToCSV(financialData),
      '',
      arrayToCSV(roicCalculation),
      '',
      arrayToCSV(improvementComparison),
      '',
      arrayToCSV(xbrlStructure),
      '',
      arrayToCSV(salesRelatedDetails),
      '',
      arrayToCSV(profitRelatedDetails),
      '',
      arrayToCSV(assetRelatedDetails),
      '',
      arrayToCSV(availableContexts),
      '',
      arrayToCSV(checklistData)
    ].join('\n');
    
    // 統合版保存
    fs.writeFileSync('toyota_API完全版データ.csv', combinedData, 'utf8');
    
    // BOM付きExcel対応版保存
    const bom = '\uFEFF';
    fs.writeFileSync('toyota_API完全版データ_Excel対応.csv', bom + combinedData, 'utf8');
    
    console.log('✅ 完全版API出力完了！');
    
    console.log('\n📁 作成されたファイル一覧:');
    console.log('1. toyota_01_基本情報.csv');
    console.log('2. toyota_02_財務データ.csv');
    console.log('3. toyota_03_ROIC計算.csv');
    console.log('4. toyota_04_修正効果.csv');
    console.log('5. toyota_05_XBRL構造.csv');
    console.log('6. toyota_06_売上関連要素.csv');
    console.log('7. toyota_07_利益関連要素.csv');
    console.log('8. toyota_08_資産関連要素.csv');
    console.log('9. toyota_09_コンテキスト一覧.csv');
    console.log('10. toyota_10_有報確認チェックリスト.csv');
    console.log('11. toyota_API完全版データ.csv (統合版)');
    console.log('12. toyota_API完全版データ_Excel対応.csv (BOM付き)');
    
    console.log('\n🎯 データ概要:');
    console.log(`企業名: ${finalData.企業名}`);
    console.log(`売上高: ${finalData.財務データ?.売上高?.表示}`);
    console.log(`営業利益: ${finalData.財務データ?.営業利益?.表示}`);
    console.log(`総資産: ${finalData.財務データ?.総資産?.表示}`);
    console.log(`ROIC: ${finalData.ROIC計算?.ROIC}`);
    
    if (debugData?.デバッグ情報) {
      console.log('\n📊 XBRL構造統計:');
      console.log(`- XBRL要素数: ${debugData.デバッグ情報.xbrlStructure?.xbrlChildCount || 0}`);
      console.log(`- コンテキスト数: ${debugData.デバッグ情報.contexts?.total || 0}`);
      console.log(`- ファクト数: ${debugData.デバッグ情報.facts?.total || 0}`);
      console.log(`- 売上関連要素: ${debugData.デバッグ情報.facts?.salesRelated?.length || 0}`);
      console.log(`- 利益関連要素: ${debugData.デバッグ情報.facts?.profitRelated?.length || 0}`);
      console.log(`- 資産関連要素: ${debugData.デバッグ情報.facts?.assetRelated?.length || 0}`);
    }
    
    console.log('\n📋 有価証券報告書突合手順:');
    console.log('1. 「toyota_10_有報確認チェックリスト.csv」をExcelで開く');
    console.log('2. EDINET (https://disclosure.edinet-fsa.go.jp/) にアクセス');
    console.log('3. トヨタ自動車（7203）の2024年度有価証券報告書を検索');
    console.log('4. 連結財務諸表の数値を確認・転記');
    console.log('5. 差異を計算・評価');
    
    return {
      success: true,
      filesCreated: 12,
      totalDataElements: debugData?.デバッグ情報?.facts?.total || 0,
      xbrlElements: debugData?.デバッグ情報?.xbrlStructure?.xbrlChildCount || 0,
      contexts: debugData?.デバッグ情報?.contexts?.total || 0
    };
    
  } catch (error) {
    console.error('❌ 完全版出力エラー:', error);
    return { success: false, error: error.message };
  }
}

// 実行
const result = createCompleteApiExport();

if (result.success) {
  console.log('\n🎉 APIから取得されたすべてのデータのExcel出力が完了しました！');
  console.log(`\n📊 出力統計:`);
  console.log(`- 作成ファイル数: ${result.filesCreated}`);
  console.log(`- データ要素数: ${result.totalDataElements}`);
  console.log(`- XBRL要素数: ${result.xbrlElements}`);
  console.log(`- コンテキスト数: ${result.contexts}`);
  console.log('\n✅ 有価証券報告書との突合確認の準備が整いました！');
} else {
  console.log('\n❌ 完全版出力に失敗しました:', result.error);
}