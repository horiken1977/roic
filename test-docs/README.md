# テストドキュメント

## ディレクトリ構造

### test-scripts/
テストスクリプト及び開発用スクリプトを格納
- 分析・調査スクリプト（analyze-*, investigate-*）
- テストスクリプト（test-*）
- デバッグスクリプト（debug-*）
- 修正・改善スクリプト（fix-*, improve-*）
- エクスポート・作成スクリプト（export-*, create-*）

### test-data/
テストデータ及び検証結果を格納
- CSVファイル（*.csv）
- JSONファイル（*.json）
- マークダウンレポート（*.md）
- XBRL分析結果
- 本番環境検証データ

## 使用方法

### テストスクリプトの実行
```bash
cd test-docs/test-scripts
node [スクリプト名].js
```

### データファイルの確認
```bash
cd test-docs/test-data
ls -la
```

## 注意事項
- APIキーが必要なスクリプトは環境変数の設定が必要
- パスの調整が必要な場合は相対パス（../../）を使用