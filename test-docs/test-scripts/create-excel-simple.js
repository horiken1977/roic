const fs = require('fs');

/**
 * シンプルなExcel形式出力（有価証券報告書突合用）
 */
function createExcelSimple() {
  console.log('📊 API取得データのExcel形式出力（シンプル版）');
  console.log('=' .repeat(60));
  
  try {
    // 最終テスト結果を読み込み
    const finalTestFile = 'toyota_final_test_2025-07-06.json';
    
    if (!fs.existsSync(finalTestFile)) {
      console.log('❌ 最終テストファイルが見つかりません');
      return;
    }
    
    console.log('📂 データ読み込み中...');
    const finalData = JSON.parse(fs.readFileSync(finalTestFile, 'utf8'));
    
    // デバッグデータも読み込み（存在する場合）
    let debugData = null;
    const debugFile = 'toyota_fixed_data_2025-07-06.json';
    if (fs.existsSync(debugFile)) {
      debugData = JSON.parse(fs.readFileSync(debugFile, 'utf8'));
    }
    
    console.log('📋 Excel用CSV生成中...');
    
    // === 基本情報シート ===
    const basicInfoCSV = [
      ['【基本情報】'],
      ['項目', '値', '備考'],
      ['企業名', finalData.企業名, '正式名称'],
      ['EDINETコード', finalData.EDINETコード, '金融庁企業識別コード'],
      ['決算年度', finalData.決算年度, '年度'],
      ['データソース', finalData.データソース, '取得方法'],
      ['抽出日時', finalData.抽出日時, 'ISO8601形式'],
      [''],
      ['有価証券報告書確認用情報'],
      ['決算期', '2024年3月期', '2024年4月1日-2025年3月31日'],
      ['報告書種類', '有価証券報告書', '年次報告'],
      ['EDINET検索URL', 'https://disclosure.edinet-fsa.go.jp/', ''],
      ['']
    ].map(row => row.join(',')).join('\\n');\n    \n    // === 財務データ詳細シート ===\n    const financialDataCSV = [\n      ['【財務データ詳細】'],\n      ['財務項目', 'API取得値（円）', '表示形式', 'XBRL要素名', '状態', '有報記載値', '差異（円）', '差異（%）', '備考'],\n      [\n        '売上高',\n        finalData.財務データ.売上高?.値 || 'N/A',\n        finalData.財務データ.売上高?.表示 || 'N/A',\n        finalData.財務データ.売上高?.XBRL要素 || 'N/A',\n        finalData.財務データ.売上高?.状態 || 'N/A',\n        '', // 有報記載値（手動入力用）\n        '', // 差異（円）\n        '', // 差異（%）\n        '連結売上高'\n      ],\n      [\n        '営業利益',\n        finalData.財務データ.営業利益?.値 || 'N/A',\n        finalData.財務データ.営業利益?.表示 || 'N/A',\n        finalData.財務データ.営業利益?.XBRL要素 || 'N/A',\n        finalData.財務データ.営業利益?.状態 || 'N/A',\n        '', // 有報記載値（手動入力用）\n        '', // 差異（円）\n        '', // 差異（%）\n        '連結営業利益'\n      ],\n      [\n        '総資産',\n        finalData.財務データ.総資産?.値 || 'N/A',\n        finalData.財務データ.総資産?.表示 || 'N/A',\n        finalData.財務データ.総資産?.XBRL要素 || 'N/A',\n        finalData.財務データ.総資産?.状態 || 'N/A',\n        '', // 有報記載値（手動入力用）\n        '', // 差異（円）\n        '', // 差異（%）\n        '連結総資産（期末時点）'\n      ],\n      [''],\n      ['参考：期待値'],\n      ['売上高期待値', '48036704000000', '48.0兆円', '有価証券報告書ベース', '参考', '', '', '', ''],\n      ['営業利益期待値', '4795586000000', '4.8兆円', '有価証券報告書ベース', '参考', '', '', '', ''],\n      ['総資産期待値', '93601350000000', '93.6兆円', '有価証券報告書ベース', '参考', '', '', '', '']\n    ].map(row => row.join(',')).join('\\n');\n    \n    // === ROIC計算詳細シート ===\n    const roicCalculationCSV = [\n      ['【ROIC計算詳細】'],\n      ['計算項目', '値', '単位', '計算式', '備考'],\n      ['営業利益率', finalData.ROIC計算?.営業利益率 || 'N/A', '%', '営業利益 ÷ 売上高', '収益性指標'],\n      ['総資産回転率', finalData.ROIC計算?.総資産回転率 || 'N/A', '回転', '売上高 ÷ 総資産', '効率性指標'],\n      ['ROIC', finalData.ROIC計算?.ROIC || 'N/A', '%', '営業利益率 × 総資産回転率', '総合収益性'],\n      [''],\n      ['計算方式', finalData.ROIC計算?.計算方式 || 'N/A'],\n      ['計算状態', finalData.ROIC計算?.状態 || 'N/A'],\n      [''],\n      ['詳細計算過程'],\n      ['営業利益（円）', finalData.財務データ.営業利益?.値 || 'N/A'],\n      ['売上高（円）', finalData.財務データ.売上高?.値 || 'N/A'],\n      ['総資産（円）', finalData.財務データ.総資産?.値 || 'N/A'],\n      ['営業利益率計算', '= 営業利益 ÷ 売上高'],\n      ['総資産回転率計算', '= 売上高 ÷ 総資産'],\n      ['ROIC計算', '= 営業利益率 × 総資産回転率']\n    ].map(row => row.join(',')).join('\\n');\n    \n    // === 有価証券報告書確認チェックリスト ===\n    const checklistCSV = [\n      ['【有価証券報告書確認チェックリスト】'],\n      ['確認項目', 'API取得値', '有報記載値（手動入力）', '差異（円）', '差異（%）', '確認状況', '備考'],\n      ['売上高（連結）', finalData.財務データ.売上高?.表示 || 'N/A', '', '', '', '未確認', '連結損益計算書から転記'],\n      ['営業利益（連結）', finalData.財務データ.営業利益?.表示 || 'N/A', '', '', '', '未確認', '連結損益計算書から転記'],\n      ['総資産（連結）', finalData.財務データ.総資産?.表示 || 'N/A', '', '', '', '未確認', '連結貸借対照表から転記'],\n      [''],\n      ['確認手順'],\n      ['1. EDINETアクセス', 'https://disclosure.edinet-fsa.go.jp/'],\n      ['2. 企業検索', 'トヨタ自動車（証券コード7203、EDINETコードE02144）'],\n      ['3. 書類選択', '2024年度有価証券報告書'],\n      ['4. 連結損益計算書確認', '売上高・営業利益を「有報記載値」列に転記'],\n      ['5. 連結貸借対照表確認', '総資産を「有報記載値」列に転記'],\n      ['6. 差異計算', '(API値 - 有報値) を計算'],\n      ['7. 差異率計算', '(差異 ÷ 有報値) × 100'],\n      [''],\n      ['判定基準'],\n      ['差異±5%以内', '良好'],\n      ['差異±10%以内', '許容範囲'],\n      ['差異±10%超', '要調査・分析'],\n      [''],\n      ['注意事項'],\n      ['・連結ベースの数値を使用すること'],\n      ['・期末時点（2025年3月31日）の数値を使用すること'],\n      ['・単位は「百万円」で統一されている場合は要換算'],\n      ['・四捨五入による微細な差異は許容範囲']\n    ].map(row => row.join(',')).join('\\n');\n    \n    // === XBRL技術詳細（デバッグデータがある場合）===\n    let xbrlDetailsCSV = '';\n    if (debugData?.デバッグ情報) {\n      const debug = debugData.デバッグ情報;\n      xbrlDetailsCSV = [\n        ['【XBRL技術詳細】'],\n        ['XBRL項目', '値', '備考'],\n        ['コンテキスト総数', debug.contexts?.total || 'N/A', 'XBRL内のコンテキスト数'],\n        ['ファクト総数', debug.facts?.total || 'N/A', 'XBRL内の財務データ要素数'],\n        ['現在期間コンテキストID', debug.contexts?.currentPeriodContextId || 'N/A', '当期データのコンテキスト'],\n        ['XBRL要素総数', debug.xbrlStructure?.xbrlChildCount || 'N/A', 'XML内の全要素数'],\n        [''],\n        ['要素別詳細'],\n        ['売上関連要素数', debug.facts?.salesRelated?.length || 'N/A', '売上に関連するXBRL要素'],\n        ['利益関連要素数', debug.facts?.profitRelated?.length || 'N/A', '利益に関連するXBRL要素'],\n        ['資産関連要素数', debug.facts?.assetRelated?.length || 'N/A', '資産に関連するXBRL要素'],\n        [''],\n        ['抽出テスト結果'],\n        ['売上高マッチ数', debug.extractionTest?.netSales?.matches?.length || 0, '検索条件にマッチした要素数'],\n        ['営業利益マッチ数', debug.extractionTest?.operatingIncome?.matches?.length || 0, '検索条件にマッチした要素数'],\n        ['総資産マッチ数', debug.extractionTest?.totalAssets?.matches?.length || 0, '検索条件にマッチした要素数']\n      ].map(row => row.join(',')).join('\\n');\n    }\n    \n    // === 統合版Excel（全シート結合）===\n    const combinedCSV = [\n      basicInfoCSV,\n      '',\n      financialDataCSV,\n      '',\n      roicCalculationCSV,\n      '',\n      checklistCSV\n    ];\n    \n    if (xbrlDetailsCSV) {\n      combinedCSV.push('', xbrlDetailsCSV);\n    }\n    \n    const combinedContent = combinedCSV.join('\\n');\n    \n    // ファイル保存\n    console.log('💾 ファイル保存中...');\n    \n    // 個別シート\n    fs.writeFileSync('toyota_基本情報.csv', basicInfoCSV, 'utf8');\n    fs.writeFileSync('toyota_財務データ詳細.csv', financialDataCSV, 'utf8');\n    fs.writeFileSync('toyota_ROIC計算詳細.csv', roicCalculationCSV, 'utf8');\n    fs.writeFileSync('toyota_有報確認チェックリスト.csv', checklistCSV, 'utf8');\n    \n    if (xbrlDetailsCSV) {\n      fs.writeFileSync('toyota_XBRL技術詳細.csv', xbrlDetailsCSV, 'utf8');\n    }\n    \n    // 統合版\n    fs.writeFileSync('toyota_API取得データ完全版.csv', combinedContent, 'utf8');\n    \n    // BOM付きUTF-8で保存（Excelでの文字化け対策）\n    const bom = '\\uFEFF';\n    fs.writeFileSync('toyota_API取得データ完全版_BOM.csv', bom + combinedContent, 'utf8');\n    \n    console.log('✅ Excel形式CSV出力完了！');\n    \n    console.log('\\n📁 作成されたファイル:');\n    console.log('1. toyota_基本情報.csv');\n    console.log('2. toyota_財務データ詳細.csv');\n    console.log('3. toyota_ROIC計算詳細.csv');\n    console.log('4. toyota_有報確認チェックリスト.csv');\n    if (xbrlDetailsCSV) {\n      console.log('5. toyota_XBRL技術詳細.csv');\n    }\n    console.log('※ toyota_API取得データ完全版.csv（統合版）');\n    console.log('※ toyota_API取得データ完全版_BOM.csv（Excel文字化け対策版）');\n    \n    console.log('\\n📋 有価証券報告書との突合手順:');\n    console.log('1. 「toyota_有報確認チェックリスト.csv」をExcelで開く');\n    console.log('2. EDINET (https://disclosure.edinet-fsa.go.jp/) にアクセス');\n    console.log('3. 「トヨタ自動車」（証券コード: 7203）を検索');\n    console.log('4. 「2024年度 有価証券報告書」を選択・ダウンロード');\n    console.log('5. 連結財務諸表を確認:');\n    console.log('   - 連結損益計算書 → 売上高・営業利益');\n    console.log('   - 連結貸借対照表 → 総資産');\n    console.log('6. 確認した数値を「有報記載値」列に入力');\n    console.log('7. 差異を計算・評価');\n    \n    console.log('\\n🎯 期待される結果:');\n    console.log('- API取得値と有報記載値の差異が±10%以内であること');\n    console.log('- XBRL要素名が正しく特定されていること');\n    console.log('- ROIC計算が妥当な範囲（5-15%程度）であること');\n    \n    return {\n      success: true,\n      files: [\n        'toyota_基本情報.csv',\n        'toyota_財務データ詳細.csv', \n        'toyota_ROIC計算詳細.csv',\n        'toyota_有報確認チェックリスト.csv',\n        'toyota_API取得データ完全版.csv',\n        'toyota_API取得データ完全版_BOM.csv'\n      ]\n    };\n    \n  } catch (error) {\n    console.error('❌ Excel出力エラー:', error);\n    return { success: false, error: error.message };\n  }\n}\n\n// 実行\nconst result = createExcelSimple();\n\nif (result.success) {\n  console.log('\\n🎉 すべてのExcelファイル（CSV形式）の出力が完了しました！');\n  console.log('\\n📥 ダウンロード手順:');\n  console.log('1. 上記ファイルをローカルにダウンロード');\n  console.log('2. Excelで開く（文字化けする場合はBOM版を使用）');\n  console.log('3. 有価証券報告書と突合確認を実施');\n  console.log('\\n✅ 技術課題解決とデータ検証の準備完了！');\n} else {\n  console.log('\\n❌ Excel出力に失敗しました:', result.error);\n}