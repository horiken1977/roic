# GitHub Secrets 設定ガイド

## 必要なSecrets

以下の4つのSecretsをGitHubリポジトリに設定する必要があります：

### 1. VERCEL_TOKEN ✅ (設定済み)
Vercel CLIで取得したトークン

### 2. VERCEL_ORG_ID (要設定)
```
team_afAGtFLk2crzIzghLsYDAQux
```

### 3. VERCEL_PROJECT_ID (要設定)
```
prj_3prHjDKPtVVPqPJyexCGot0IY5DW
```

### 4. EDINET_API_KEY (要設定)
金融庁EDINETから取得したAPIキー

## 設定手順

1. GitHubリポジトリ（https://github.com/horiken1977/roic）にアクセス
2. Settings タブをクリック
3. 左メニューの「Secrets and variables」→「Actions」を選択
4. 「New repository secret」ボタンをクリック
5. 各Secretを以下の形式で追加：

### VERCEL_ORG_ID
- Name: `VERCEL_ORG_ID`
- Secret: `team_afAGtFLk2crzIzghLsYDAQux`

### VERCEL_PROJECT_ID
- Name: `VERCEL_PROJECT_ID`
- Secret: `prj_3prHjDKPtVVPqPJyexCGot0IY5DW`

### EDINET_API_KEY
- Name: `EDINET_API_KEY`
- Secret: [あなたの実際のEDINET APIキー]

## 設定確認

すべてのSecretsを設定後、以下を確認：

1. Actions タブで最新のワークフローを確認
2. 「Deploy to Vercel」が成功することを確認
3. デプロイ成功後、以下のURLでアクセス可能：
   - https://roic-horikens-projects.vercel.app/api/health
   - https://roic-horikens-projects.vercel.app/api/edinet/companies?q=トヨタ

## トラブルシューティング

### "Missing token value" エラー
- VERCEL_TOKENが正しく設定されているか確認
- トークンの前後に余分な空白がないか確認

### "Invalid project" エラー
- VERCEL_ORG_IDとVERCEL_PROJECT_IDが正しいか確認
- プロジェクトがVercel上に存在するか確認

### EDINET APIエラー
- EDINET_API_KEYが有効か確認
- 金融庁EDINETサイトでAPIキーの状態を確認