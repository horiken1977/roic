# ROIC分析アプリケーション 開発環境セットアップガイド

## 概要

このドキュメントは、ROIC分析アプリケーションの開発環境構築からCI/CDパイプライン、本番環境へのデプロイまでの手順を記載しています。

## 開発環境構成

### 1. ローカル開発環境
- **開発ツール**: VSCode + Claude Code
- **開発ディレクトリ**: `/Users/aa479881/Library/CloudStorage/OneDrive-IBM/Personal/development/roic`
- **バージョン管理**: Git + GitHub

### 2. リポジトリ情報
- **GitHubリポジトリ**: https://github.com/horiken1977/roic
- **ブランチ戦略**: 
  - `main`: 本番環境用ブランチ
  - `develop`: 開発用ブランチ
  - `feature/*`: 機能開発用ブランチ

### 3. デプロイ環境
- **サーバー**: AWS EC2インスタンス
- **IPアドレス**: 54.199.201.201
- **アプリケーションサーバー**: Apache Tomcat
- **デプロイディレクトリ**: `/opt/tomcat/webapps/`

### 4. CI/CDパイプライン
- **CIツール**: Jenkins
- **自動化内容**:
  - 単体テスト実行
  - 結合テスト実行
  - コード品質チェック
  - ビルド
  - デプロイ

## セットアップ手順

### 1. ローカル環境の準備

#### 1.1 必要なソフトウェアのインストール
```bash
# Node.js (v18以上推奨)
brew install node

# Python (3.9以上)
brew install python@3.9

# Docker
brew install --cask docker

# AWS CLI
brew install awscli
```

#### 1.2 プロジェクトのクローン
```bash
cd /Users/aa479881/Library/CloudStorage/OneDrive-IBM/Personal/development
git clone https://github.com/horiken1977/roic.git
cd roic
```

#### 1.3 依存関係のインストール

**フロントエンド（React/Next.js）**
```bash
cd frontend
npm install
```

**バックエンド（Python FastAPI）**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
```

### 2. Git設定

#### 2.1 ユーザー情報の設定
```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

#### 2.2 デフォルトブランチの設定
```bash
git config init.defaultBranch main
```

### 3. 開発用スクリプト

#### 3.1 ローカル開発サーバーの起動

**フロントエンド**
```bash
cd frontend
npm run dev
# http://localhost:3000 でアクセス可能
```

**バックエンド**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
# http://localhost:8000 でAPI利用可能
```

### 4. コミットとプッシュ

#### 4.1 変更のコミット
```bash
git add .
git commit -m "feat: 機能の説明"
```

#### 4.2 GitHubへのプッシュ
```bash
git push origin feature/branch-name
```

## CI/CDパイプライン

### 1. Jenkins設定

Jenkinsパイプラインは以下の段階で構成されます：

1. **Checkout**: GitHubからソースコードを取得
2. **Test**: 単体テスト・結合テストの実行
3. **Build**: アプリケーションのビルド
4. **Quality Check**: コード品質チェック
5. **Deploy**: AWS環境へのデプロイ

### 2. 自動テスト

#### 2.1 フロントエンドテスト
```bash
npm run test          # 単体テスト
npm run test:e2e      # E2Eテスト
npm run test:coverage # カバレッジレポート
```

#### 2.2 バックエンドテスト
```bash
pytest                     # 全テスト実行
pytest tests/unit          # 単体テスト
pytest tests/integration   # 結合テスト
pytest --cov=app          # カバレッジ測定
```

### 3. デプロイプロセス

#### 3.1 ビルド成果物の作成
- フロントエンド: `npm run build`でビルド
- バックエンド: Pythonアプリケーションのパッケージング

#### 3.2 AWS環境へのデプロイ
- SCP/RSYNCを使用してファイル転送
- Tomcatへのデプロイ（WARファイル形式）
- サービスの再起動

## 環境変数

### 開発環境 (.env.development)
```env
API_URL=http://localhost:8000
DATABASE_URL=postgresql://user:password@localhost/roic_dev
REDIS_URL=redis://localhost:6379
```

### 本番環境 (.env.production)
```env
API_URL=http://54.199.201.201:8080/api
DATABASE_URL=postgresql://user:password@rds-endpoint/roic_prod
REDIS_URL=redis://elasticache-endpoint:6379
```

## トラブルシューティング

### よくある問題と解決方法

1. **ポート競合**
   - 3000番ポートが使用中の場合: `PORT=3001 npm run dev`

2. **権限エラー**
   - npmインストール時: `sudo npm install -g`は避け、nvmを使用

3. **AWS接続エラー**
   - AWS CLIの認証情報を確認: `aws configure`

## セキュリティ考慮事項

1. **シークレット管理**
   - 環境変数に機密情報を保存
   - .envファイルは.gitignoreに追加
   - AWS Systems Manager Parameter Storeの活用

2. **アクセス制限**
   - AWS Security Groupの適切な設定
   - Jenkinsへのアクセス制限

## 更新履歴

- 2025-06-29: 初版作成