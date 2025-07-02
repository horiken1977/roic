# Vercel Functions デプロイメント手順

## 1. Vercel アカウント設定
1. [Vercel](https://vercel.com) にアカウント登録
2. GitHubリポジトリと連携

## 2. Vercel CLI インストール・設定
```bash
npm i -g vercel
vercel login
```

## 3. プロジェクト初期化
```bash
vercel
# プロジェクト設定に従って回答
```

## 4. 環境変数設定
Vercel ダッシュボードまたはCLIで設定:
```bash
vercel env add EDINET_API_KEY
# APIキーを入力
```

## 5. デプロイ
```bash
vercel --prod
```

## 6. フロントエンド環境変数設定
`.env.local` に以下を追加:
```
NEXT_PUBLIC_VERCEL_API_URL=https://your-project.vercel.app/api
```

## 7. テスト
デプロイ後、以下のURLでテスト:
- 企業検索: `https://your-project.vercel.app/api/edinet/companies?q=野村`
- 財務データ: `https://your-project.vercel.app/api/edinet/financial?edinetCode=E04430&fiscalYear=2023`

## 機能概要
- **企業検索**: EDINET APIから過去30営業日の書類を検索し、クエリに一致する企業を返す
- **財務データ**: 指定された企業・年度の財務データを取得（現在は拡張サンプルデータ）
- **CORS対応**: GitHub Pagesから直接アクセス可能
- **エラーハンドリング**: APIキー未設定時はサンプルデータを返す

## 優先順位
1. GitHub Actions静的データ（キャッシュ済み）
2. **Vercel Functions（リアルタイム）** ← 今回追加
3. バックエンドサーバー（localhost開発用）
4. サンプルデータ（フォールバック）