# 環境設計書

**最終更新日:** 2025-07-04

## 🏗️ システム概要

### プロジェクト情報
- **プロジェクト名:** ROIC分析アプリケーション
- **バージョン:** 1.0.0
- **開発フェーズ:** MVP基盤構築（完了）
- **アーキテクチャ:** フルスタック Web アプリケーション

## 💻 開発環境

### ローカル開発環境
- **Node.js:** v24.3.0
- **npm:** 11.4.2
- **Git:** 2.39.5 (Apple Git-154)
- **OS:** macOS

### Git設定
- **認証方式:** HTTPS
- **リモートリポジトリ:** https://github.com/horiken1977/roic.git
- **パフォーマンス最適化:**
  - `core.preloadindex=true`
  - `core.fscache=true`
  - `status.submoduleSummary=false`
  - `**/node_modules/` .gitignore追加

## 🏗️ アプリケーション構成

### フロントエンド (Next.js)
- **Framework:** Next.js 15.3.4
- **Runtime:** React ^19.0.0
- **Language:** TypeScript ^5
- **Styling:** Tailwind CSS ^4
- **State Management:** Zustand ^5.0.6
- **HTTP Client:** Axios ^1.10.0

### バックエンド (Node.js/Express)
- **Framework:** Express.js ^4.18.2
- **Database:** PostgreSQL (AWS RDS) ^8.11.3
- **Cloud:** AWS SDK ^2.1498.0
- **Logger:** Winston ^3.11.0
- **Security:** Helmet, CORS, Rate Limiting

## ☁️ インフラストラクチャ

### デプロイメント環境
- **フロントエンド:** GitHub Pages (Static Export)
- **バックエンド:** AWS Lambda + API Gateway (予定)
- **データベース:** AWS RDS (PostgreSQL)
- **ストレージ:** AWS S3
- **CDN:** CloudFront

### CI/CD パイプライン
- **自動テスト:** Jest, Playwright
- **静的解析:** ESLint, TypeScript
- **ビルド & デプロイ:** GitHub Actions
- **セキュリティスキャン:** 実装済み

## 🛡️ セキュリティ設定

### Git セキュリティ
- **.gitignore設定:** 環境変数、認証キー、AWSクレデンシャル除外
- **機密ファイル除外:** .env*, *.pem, *.key, secrets/

### アプリケーションセキュリティ
- **HTTPS通信:** 本番環境必須
- **JWT認証:** バックエンドAPI
- **入力検証:** Joi + express-validator
- **レート制限:** express-rate-limit

## 🔄 自動化機能

### ファイル監視・自動更新
- **監視ファイル:**
  - Frontend: `frontend/src/**/*.{tsx,ts,js}`
  - Backend: `backend/**/*.{js,ts,py}`
  - Docs: `docs/**/*.md`
  - Tests: `tests/**/*.{js,ts,spec.js,test.js}`
  - Config: `config/project-config.json`

### 自動更新対象
- 機能設計書 (`docs/functional-spec.md`)
- テスト仕様書 (`docs/test-spec.md`)
- 環境設計書 (`docs/environment-design.md`)
- プロジェクト進捗 (`project-progress.md`)

## 📊 パフォーマンス最適化

### Git最適化 (最新実施: 2025-07-04)
- `**/node_modules/` .gitignore追加
- `core.preloadindex=true` (ファイルシステム最適化)
- `core.fscache=true` (キャッシュ有効化)
- `status.submoduleSummary=false` (サブモジュール無効化)

### Next.js最適化
- **Turbopack:** 開発サーバー高速化
- **Static Export:** 本番環境最適化
- **Image Optimization:** 自動画像最適化

## 🧪 テスト環境

### テスト設定
- **Unit Tests:** Jest ^30.0.3
- **Component Tests:** Testing Library ^16.3.0
- **E2E Tests:** Playwright ^1.53.2
- **Coverage Threshold:** 85%

### テスト実行状況
- **ユニットテスト:** 9件 (カバレッジ: 95%)
- **E2Eテスト:** 0件 (カバレッジ: 70%)
- **統合テスト:** 0件 (カバレッジ: 75%)

## 🔧 開発ワークフロー

### ローカル開発
```bash
# フロントエンド開発サーバー起動
cd frontend && npm run dev

# バックエンド開発サーバー起動  
cd backend && npm run dev

# テスト実行
npm test

# ビルド & デプロイ
npm run deploy
```

---

**注意:** この環境設計書は自動更新されます。環境設定変更時は `/config/project-config.json` および関連スクリプトが自動的に本ドキュメントを更新します。

**更新トリガー:**
- パッケージ依存関係の変更
- インフラ設定の変更  
- セキュリティ設定の変更
- パフォーマンス最適化の実施

*最終更新: 2025/7/5 0:10:18*
*この文書は環境変更に応じて自動更新されます*