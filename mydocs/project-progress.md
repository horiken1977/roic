# ROIC分析アプリケーション 開発進捗管理

## プロジェクト概要

**目的：** 日系上場企業のROIC（投下資本利益率）を算出し、競合他社と比較できる分析ツールの開発  
**対象ユーザー：** 投資家、アナリスト、研究者  
**主要機能：** ROIC計算、企業検索・フィルタリング、比較表示、データエクスポート  

## 進捗統計

- **総タスク数：** 8
- **完了タスク：** 2
- **進行中タスク：** 0
- **未着手タスク：** 6
- **完了率：** 25%

## 開発進捗状況

### 高優先度タスク

- [x] **要件定義とアプリケーション仕様の策定**
  - 機能要件：ROIC計算、企業検索・フィルタリング、比較表示、データエクスポート
  - 非機能要件：パフォーマンス、セキュリティ、可用性、スケーラビリティ
  - ユーザーストーリー：投資家、アナリスト、研究者の利用シナリオ
  - 完了内容：requirements-definition.md、roic-calculation-spec.mdを作成

- [ ] **技術スタックとアーキテクチャの選定**
  - フロントエンド：React/Next.js + TypeScript、チャートライブラリ（Chart.js/D3.js）
  - バックエンド：Node.js/Python（FastAPI）、REST API/GraphQL
  - データベース：PostgreSQL（財務データ）+ Redis（キャッシュ）
  - インフラ：AWS/Azure、Docker、Kubernetes

- [ ] **データソースとAPI設計の検討**
  - 財務データ取得：EDINET API、Yahoo Finance API、Bloomberg API
  - データ更新頻度：四半期決算後の自動更新
  - ROIC計算式：NOPAT ÷ 投下資本の標準化
  - API設計：RESTful設計、ページネーション、レート制限

### 中優先度タスク

- [ ] **UI/UXデザインとワイヤーフレーム作成**
  - 画面設計：ダッシュボード、検索画面、比較表、詳細画面
  - レスポンシブ対応：モバイル・タブレット対応

- [ ] **データベース設計とスキーマ定義**
  - テーブル設計：企業マスタ、財務データ、ROIC履歴、業界分類

- [x] **開発環境のセットアップとCI/CD構築**
  - ローカル開発環境：VSCode + Claude Code
  - バージョン管理：Git + GitHub (https://github.com/horiken1977/roic)
  - CI/CDツール：Jenkins
  - デプロイ先：AWS Tomcat (IP: 54.199.201.201)
  - 自動テスト：単体テスト、結合テスト
  - 完了内容：development-setup.mdを作成、.gitignoreを更新、GitHubリポジトリ初期設定完了

- [ ] **セキュリティ要件とデータ保護対策の検討**
  - 認証・認可：JWT、RBAC
  - データ保護：暗号化、入力検証、SQL インジェクション対策

### 低優先度タスク

- [ ] **テスト計画とQA戦略の策定**
  - テスト：単体テスト、統合テスト、E2Eテスト、パフォーマンステスト

## 開発フェーズ計画

### フェーズ1: MVP開発（2-3ヶ月）
基本的なROIC計算機能と表示機能の実装。企業データの取得・保存・表示の基本機能を構築。

### フェーズ2: 機能拡張（1-2ヶ月）
比較機能、フィルタリング機能、データエクスポート機能の追加。ユーザビリティの向上。

### フェーズ3: 最適化（1ヶ月）
パフォーマンス改善、UI/UX向上、セキュリティ強化、本番環境での安定稼働の確保。

## 技術スタック詳細

### フロントエンド
- React
- Next.js
- TypeScript
- Chart.js
- D3.js

### バックエンド
- Node.js
- Python FastAPI
- REST API
- GraphQL

### データベース
- PostgreSQL
- Redis

### インフラ・DevOps
- AWS
- Azure
- Docker
- Kubernetes

### データソース
- EDINET API
- Yahoo Finance API
- Bloomberg API

## 次のアクションアイテム

### 🎯 今すぐ実施すべきタスク

1. **技術スタックの最終決定**
   - フロントエンド：React vs Next.jsの選定
   - バックエンド：Node.js vs Python FastAPIの選定
   - 選定基準：パフォーマンス、開発効率、保守性

2. **GitHubリポジトリの初期設定** ✅ **完了**
   ```bash
   git remote add origin https://github.com/horiken1977/roic.git
   git branch -M main
   git push -u origin main
   ```
   - リモートリポジトリ追加完了
   - プロジェクト初期コミット作成完了
   - mainブランチへのプッシュ完了

3. **Jenkinsfileの作成**
   - パイプライン定義
   - ステージ構成（Build, Test, Deploy）
   - AWS認証情報の設定

### 📋 準備が必要な情報

- **AWS環境**
  - EC2インスタンスへのSSH鍵
  - Tomcatの管理者権限
  - デプロイ用のIAMロール

- **Jenkins設定**
  - JenkinsサーバーのURL
  - 認証情報（ユーザー名/パスワード）
  - GitHubとの連携設定

- **データソースAPI**
  - EDINET APIキーの取得
  - Yahoo Finance API利用規約の確認
  - Bloomberg API契約状況

## 環境構築詳細

### ローカル開発環境

#### 必要なツール
```bash
# Homebrew経由でインストール
brew install node@18
brew install python@3.9
brew install --cask docker
brew install awscli
brew install jenkins-cli
```

#### VSCode拡張機能
- ESLint
- Prettier
- Python
- Docker
- GitLens
- AWS Toolkit

### GitHub設定

#### リポジトリ構造
```
roic/
├── frontend/          # React/Next.jsアプリケーション
├── backend/           # Python FastAPI/Node.js API
├── infrastructure/    # Terraform/CloudFormation
├── jenkins/          # CI/CD設定
├── docker/           # Dockerファイル
├── docs/             # ドキュメント
└── tests/            # テストコード
```

#### ブランチ運用
- `main`: 本番環境
- `develop`: 開発環境
- `feature/*`: 機能開発
- `hotfix/*`: 緊急修正

### CI/CDパイプライン

#### Jenkinsパイプライン構成
```groovy
pipeline {
    agent any
    stages {
        stage('Checkout') { /* GitHubからコード取得 */ }
        stage('Build') { /* ビルド処理 */ }
        stage('Test') { /* テスト実行 */ }
        stage('Quality') { /* 品質チェック */ }
        stage('Deploy') { /* AWSデプロイ */ }
    }
}
```

#### 自動テスト項目
- 単体テスト（Jest, pytest）
- 統合テスト
- E2Eテスト（Cypress）
- セキュリティスキャン
- パフォーマンステスト

### AWS環境

#### サーバー情報（SSH接続確認済み）
- **IP**: 54.199.201.201 (プライベート: 172.31.16.38)
- **OS**: Ubuntu 24.04.2 LTS (Noble Numbat)
- **カーネル**: Linux 6.8.0-1029-aws x86_64
- **Tomcat**: Apache Tomcat 10.1.42 (稼働中)
- **Java**: OpenJDK 17.0.15 (Ubuntu 24.04)
- **メモリ**: 957MB (使用可能: 517MB)
- **ディスク**: 6.8GB (使用: 3.0GB, 空き: 3.8GB)
- **デプロイパス**: `/opt/tomcat/webapps/`
- **ポート**: 8080（HTTP）
- **SSH接続**: `ssh -i AWS01.pem ubuntu@54.199.201.201`

#### デプロイ手順
1. WARファイルのビルド
2. SCPでファイル転送
3. Tomcatへのデプロイ
4. サービス再起動
5. ヘルスチェック

## 更新履歴

- 2025-06-29: プロジェクト開始、進捗管理ファイル作成
- 2025-06-29: 要件定義完了、requirements-definition.mdとroic-calculation-spec.md作成
- 2025-06-29: 開発環境セットアップ完了、development-setup.mdを作成、.gitignoreを更新