# 環境設計書

**最終更新日:** 2025-07-01

## 🏗️ システム概要

### プロジェクト情報
- **プロジェクト名:** ROIC分析アプリケーション
- **バージョン:** 1.0.0
- **開発フェーズ:** MVP基盤構築（完了）
- **アーキテクチャ:** フルスタック Web アプリケーション

## 💻 開発環境

### ローカル開発環境
- **OS:** macOS 15.5 (BuildVersion: 24F74)
- **アーキテクチャ:** ARM64 (Apple Silicon)
- **カーネル:** Darwin 24.5.0

### 開発ツール
- **Node.js:** v24.3.0
- **npm:** 11.4.2
- **Git:** 2.39.5 (Apple Git-154)
- **エディタ:** VS Code (code --wait設定済み)

### Git設定
- **認証方式:** HTTPS
- **リモートリポジトリ:** https://github.com/horiken1977/roic.git
- **ユーザー:** horiken1977 (horiken1977@gmail.com)
- **パフォーマンス最適化:**
  - `core.preloadindex=true`
  - `core.fscache=true`
  - `status.submoduleSummary=false`

## 🏗️ アプリケーション構成

### フロントエンド (Next.js)
```json
{
  "framework": "Next.js 15.3.4",
  "runtime": "React 19.0.0",
  "language": "TypeScript 5.x",
  "styling": "Tailwind CSS 4.x",
  "state_management": "Zustand 5.0.6",
  "http_client": "Axios 1.10.0",
  "build_mode": "Static Export (GitHub Pages)",
  "dev_server": "Turbopack enabled"
}
```

#### 主要依存関係
- **React:** 19.0.0 (最新安定版)
- **Next.js:** 15.3.4 (App Router使用)
- **TypeScript:** 5.x (型安全性)
- **Tailwind CSS:** 4.x (レスポンシブデザイン)
- **Zustand:** 5.0.6 (軽量状態管理)

#### 開発・テストツール
- **ESLint:** 9.x (コード品質)
- **Jest:** 30.0.3 (ユニットテスト)
- **Playwright:** 1.53.2 (E2Eテスト)
- **Testing Library:** React 16.3.0 (コンポーネントテスト)

### バックエンド (Node.js/Express)
```json
{
  "framework": "Express.js 4.18.2",
  "runtime": "Node.js >=18.0.0",
  "database": "PostgreSQL (AWS RDS)",
  "cloud": "AWS (RDS, S3, Lambda予定)",
  "api_standard": "REST API",
  "security": "Helmet, CORS, Rate Limiting"
}
```

#### 主要依存関係
- **Express:** 4.18.2 (Webフレームワーク)
- **PostgreSQL:** pg 8.11.3 (データベースクライアント)
- **AWS SDK:** 2.1498.0 (クラウド統合)
- **Winston:** 3.11.0 (ログ管理)
- **JWT:** 9.0.2 (認証)

#### セキュリティ・運用
- **Helmet:** セキュリティヘッダー
- **CORS:** クロスオリジン制御
- **Rate Limiting:** API制限
- **Morgan:** HTTPログ
- **Compression:** レスポンス圧縮

## ☁️ インフラストラクチャ

### デプロイメント環境

#### 本番環境
- **フロントエンド:** GitHub Pages
  - URL: https://horiken1977.github.io/roic/
  - 自動デプロイ: GitHub Actions
  - 静的サイト生成: Next.js Export

- **バックエンド:** AWS (予定)
  - **API:** AWS Lambda + API Gateway
  - **データベース:** AWS RDS (PostgreSQL)
  - **ファイルストレージ:** AWS S3
  - **CDN:** CloudFront

#### 開発環境
- **フロントエンド:** localhost:3000 (Next.js Dev Server)
- **バックエンド:** localhost:8000 (Express Server)
- **データベース:** ローカル PostgreSQL / AWS RDS

### CI/CD パイプライン
```yaml
GitHub Actions:
  - 自動テスト実行 (Jest, Playwright)
  - 静的解析 (ESLint, TypeScript)
  - ビルド & デプロイ (GitHub Pages)
  - セキュリティスキャン
```

## 📁 プロジェクト構造

```
roic/
├── frontend/                 # Next.js フロントエンド
│   ├── src/app/             # App Router構成
│   ├── src/components/      # Reactコンポーネント
│   ├── src/lib/            # ユーティリティ・API
│   ├── __tests__/          # テストファイル
│   └── public/             # 静的アセット
├── backend/                 # Node.js バックエンド
│   ├── controllers/        # APIコントローラー
│   ├── models/            # データモデル
│   ├── services/          # ビジネスロジック
│   ├── routes/            # ルーティング
│   └── config/            # 設定ファイル
├── infrastructure/         # AWS CloudFormation
├── docs/                  # ドキュメント
├── scripts/               # 自動化スクリプト
└── config/               # プロジェクト設定
```

## 🛡️ セキュリティ設定

### Git セキュリティ
- **機密ファイル除外:** .gitignore設定済み
  - 環境変数 (.env*)
  - 認証キー (*.pem, *.key)
  - AWSクレデンシャル
  - データベースファイル

### アプリケーションセキュリティ
- **HTTPS通信:** 本番環境必須
- **CSP設定:** Next.js セキュリティヘッダー
- **JWT認証:** バックエンドAPI
- **入力検証:** Joi + express-validator
- **レート制限:** express-rate-limit

## 🔄 自動化機能

### ファイル監視・自動更新
- **設定ファイル:** `/config/project-config.json`
- **自動更新対象:**
  - 機能設計書 (`/docs/functional-spec.md`)
  - テスト仕様書 (`/docs/test-spec.md`) 
  - 環境設計書 (`/docs/environment-design.md`)
  - プロジェクト進捗 (`/project-progress.md`)

### 監視スクリプト
```javascript
// scripts/centralized-manager.js
- ファイル変更検知
- ドキュメント自動生成
- テスト結果反映
- GitHub Pages自動デプロイ
```

## 📊 パフォーマンス最適化

### Git最適化 (2025-07-01実施)
- `**/node_modules/` .gitignore追加
- `core.preloadindex=true` (ファイルシステム最適化)
- `core.fscache=true` (キャッシュ有効化)
- `status.submoduleSummary=false` (サブモジュール無効化)

### Next.js最適化
- **Turbopack:** 開発サーバー高速化
- **Static Export:** 本番環境最適化
- **Image Optimization:** 自動画像最適化
- **Bundle Analysis:** バンドルサイズ監視

## 🧪 テスト環境

### テスト設定
```json
{
  "unit_tests": "Jest 30.0.3",
  "component_tests": "Testing Library",
  "e2e_tests": "Playwright 1.53.2",
  "coverage_threshold": "85%",
  "ci_integration": "GitHub Actions"
}
```

### テスト実行環境
- **ローカル:** `npm test` (Jest)
- **カバレッジ:** `npm run test:coverage`
- **E2E:** `npx playwright test`
- **CI/CD:** GitHub Actions自動実行

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

### Git ワークフロー
1. **機能開発:** feature/xxx ブランチ
2. **テスト実行:** 自動テスト必須
3. **コミット:** 規約準拠メッセージ
4. **プッシュ:** main ブランチ自動デプロイ

## 📈 監視・ログ

### アプリケーション監視
- **フロントエンド:** ブラウザDevTools
- **バックエンド:** Winston Logger
- **データベース:** AWS RDS監視
- **パフォーマンス:** Next.js Analytics

### ログ管理
```javascript
// Winston設定例
{
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/app.log' })
  ]
}
```

---

**注意:** この環境設計書は自動更新されます。環境設定変更時は `/config/project-config.json` および関連スクリプトが自動的に本ドキュメントを更新します。

**更新トリガー:**
- パッケージ依存関係の変更
- インフラ設定の変更  
- セキュリティ設定の変更
- パフォーマンス最適化の実施