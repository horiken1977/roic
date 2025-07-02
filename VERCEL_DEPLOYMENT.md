# Vercel Functions デプロイメント手順

## 1. Vercel アカウント設定
1. [Vercel](https://vercel.com) にアカウント登録
2. GitHubリポジトリと連携（https://github.com/horiken1977/roic）

## 2. Vercel CLI インストール・設定
```bash
npm i -g vercel
vercel login
```

## 3. プロジェクト初期化
```bash
# リポジトリルートで実行
vercel
# プロジェクト名: roic-api
# Framework: Other
# Build Command: [空欄]
# Output Directory: .
# Dev Command: [空欄]
```

## 4. 環境変数設定
Vercel ダッシュボードまたはCLIで設定:
```bash
vercel env add EDINET_API_KEY production
# EDINETのAPIキーを入力
```

## 5. デプロイ
```bash
vercel --prod
```

## 6. CORS確認
デプロイ後、以下をテスト:
```bash
curl -X OPTIONS https://your-project.vercel.app/api/health \
  -H "Origin: https://horiken1977.github.io" \
  -H "Access-Control-Request-Method: GET" \
  -v
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
- **企業検索**: EDINET API v2から過去60営業日の提出書類を検索し、企業を特定
- **リアルタイム検索**: 有価証券報告書・四半期報告書等から最新企業情報を取得
- **財務データ**: 指定された企業・年度の財務データを取得（XBRL解析実装予定）
- **CORS対応**: GitHub Pagesから直接アクセス可能
- **エラーハンドリング**: APIキー未設定時は明確なエラーメッセージ

## 正しいEDINET v2実装
- documents.json APIで提出書類一覧を取得
- 書類タイプフィルタ（120,130,140,150: 有価証券報告書系）
- 企業名での部分一致検索
- 業界推定機能付き
- 重複企業の除外

## データソース優先順位
1. **Vercel Functions（リアルタイム）** ← 最優先
2. GitHub Actions静的データ（フォールバック）
3. バックエンドサーバー（localhost開発用）
4. エラー表示（サンプルデータ廃止）