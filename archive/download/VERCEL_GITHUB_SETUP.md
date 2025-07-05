# Vercel GitHub連携デプロイ手順

## Vercel CLIがタイムアウトする場合の対処法

### 1. Vercel ダッシュボードからGitHub連携
1. https://vercel.com/dashboard にアクセス
2. 「New Project」をクリック
3. 「Import Git Repository」を選択
4. GitHubアカウントを連携（既に完了済み）
5. リポジトリ「horiken1977/roic」を選択

### 2. プロジェクト設定
- **Framework Preset**: Other
- **Root Directory**: `.` (デフォルト)
- **Build Command**: 空欄のまま
- **Output Directory**: 空欄のまま
- **Install Command**: 空欄のまま

### 3. 環境変数設定
Settings → Environment Variables で以下を追加:
```
Key: EDINET_API_KEY
Value: [あなたの実際のEDINET APIキー]
Environment: Production
```

### 4. 自動デプロイ
- GitHubにpushすると自動的にデプロイされます
- mainブランチへのpushが本番環境にデプロイされます

### 5. デプロイ状況確認
1. Vercel ダッシュボードでデプロイ状況を確認
2. Functions タブで以下の関数が正常にデプロイされているか確認:
   - `/api/health`
   - `/api/edinet/companies`
   - `/api/edinet/financial`

### 6. 接続テスト
デプロイ完了後:
1. https://horiken1977.github.io/roic/companies/ を開く
2. 「接続テスト（複数API）」ボタンをクリック
3. Vercel URLのテスト結果を確認

### 7. 企業検索テスト
1. 検索ボックスに「講談社」を入力
2. 検索ボタンをクリック
3. 以下のいずれかが表示されることを確認:
   - ✅ 実際の企業データ（APIキー正常）
   - ❌ API_KEY_NOT_CONFIGURED エラー（APIキー未設定）
   - ❌ その他のエラーメッセージ

## 期待されるVercel URL
プロジェクト名に応じて以下のようなURLが生成されます:
- `https://roic-[ランダム文字].vercel.app`
- `https://roic-horikens-projects.vercel.app`

## 現在の状況
- ✅ Vercelプロジェクト「roic」が作成済み
- ❌ GitHub連携デプロイは未完了
- ❌ 実際のデプロイURLは未確定

## トラブルシューティング

### Functions が表示されない場合
1. Vercel ダッシュボード → Functions タブを確認
2. `api/` フォルダの関数が認識されているか確認
3. ビルドログでエラーがないか確認

### CORS エラーが続く場合
1. `vercel.json` の設定が正しく適用されているか確認
2. 環境変数が正しく設定されているか確認
3. 関数が正常にデプロイされているか確認

### API キー関連エラー
1. Environment Variables で `EDINET_API_KEY` が設定されているか確認
2. 実際のEDINET APIキーが有効か確認
3. 金融庁EDINETサイトでAPIキーの状態を確認

## 成功時の動作
- 講談社、キヤノン、野村證券等の検索が可能
- リアルタイムEDINET APIからデータを取得
- ROIC分析まで完全に動作