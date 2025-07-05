# EDINET API 手動デプロイメント手順

## オプション1: Vercel（推奨）

### 1. Vercelアカウント作成
1. https://vercel.com にアクセス
2. GitHubアカウントでサインアップ
3. GitHubリポジトリ（https://github.com/horiken1977/roic）を連携

### 2. プロジェクト設定
- **Framework Preset**: Other
- **Root Directory**: `/` (リポジトリルート)
- **Build Command**: 空欄
- **Output Directory**: 空欄
- **Install Command**: 空欄

### 3. 環境変数設定
Settings → Environment Variables で以下を追加:
```
EDINET_API_KEY = [あなたのEDINET APIキー]
```

### 4. 関数確認
デプロイ後、以下のURLをテスト:
- Health Check: `https://your-project.vercel.app/api/health`
- Company Search: `https://your-project.vercel.app/api/edinet/companies?q=トヨタ`

## オプション2: Netlify

### 1. Netlifyアカウント作成
1. https://netlify.com にアクセス
2. GitHubアカウントでサインアップ
3. GitHubリポジトリを連携

### 2. ビルド設定
- **Build command**: `cd frontend && npm run build`
- **Publish directory**: `frontend/out`
- **Functions directory**: `api`

### 3. 環境変数設定
Site settings → Environment variables で以下を追加:
```
EDINET_API_KEY = [あなたのEDINET APIキー]
```

### 4. 関数確認
デプロイ後、以下のURLをテスト:
- Company Search: `https://your-site.netlify.app/.netlify/functions/edinet-companies?q=トヨタ`

## 接続テスト

### GitHub Pagesでテスト
1. https://horiken1977.github.io/roic/companies/ を開く
2. 「接続テスト」ボタンをクリック
3. 成功メッセージを確認

### 企業検索テスト
1. 検索ボックスに「講談社」と入力
2. 検索ボタンをクリック
3. リアルタイムデータまたは適切なエラーメッセージを確認

## トラブルシューティング

### CORSエラーが続く場合
1. Vercel/Netlifyの設定でCORSヘッダーが正しく設定されているか確認
2. 関数のデプロイが成功しているか確認
3. 環境変数が正しく設定されているか確認

### APIキー関連エラー
1. EDINET APIキーが正しく設定されているか確認
2. APIキーの有効性を確認
3. 金融庁EDINETサイトでAPIキーの状態を確認

## 期待される動作

### 正常時
- 「講談社」検索 → 実際の企業データが表示
- 「キヤノン」検索 → 実際の企業データが表示
- 検索結果から「ROIC分析」クリック → 財務データ表示

### エラー時
- API未設定 → 「API_KEY_NOT_CONFIGURED」エラー
- CORS問題 → 「CORS_ERROR」エラー
- ネットワーク問題 → 「NETWORK_ERROR」エラー