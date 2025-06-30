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

## 現在の開発位置

### 🗺️ 開発フェーズ概要
現在位置：**Phase 1 - 基盤構築段階**（60%完了）

```
✅ Phase 0: 要件定義・技術選定 (100%)
🔄 Phase 1: 基盤構築 (60%)
   ├── ✅ 環境構築 (95%)
   ├── ✅ AWS接続確立 (100%)
   └── 🔄 データベース基盤 (80%)
⏭️ Phase 2: MVP機能開発 (0%)
⏭️ Phase 3: 機能拡張 (0%)
⏭️ Phase 4: 最適化・本番移行 (0%)
```

### 📊 詳細進捗状況

#### ✅ 完了済み項目
1. **要件定義とアプリケーション仕様策定**
   - 機能要件・非機能要件の明確化
   - ユーザーストーリー作成
   - ROIC計算仕様書作成

2. **技術スタック最終決定**
   - フロントエンド: Next.js + TypeScript
   - バックエンド: Node.js (Express.js)
   - データベース: PostgreSQL + Redis
   - クラウド: AWS (RDS, EC2)

3. **開発環境セットアップ**
   - VSCode + Claude Code
   - Git + GitHub連携完了
   - Jenkins CI/CD基本設定

4. **EDINET API調査・設計**
   - 日本企業財務データ取得方法確定
   - API実装設計書作成
   - エラーハンドリング設計

5. **データベース設計**
   - PostgreSQL スキーマ設計完了
   - 10テーブル構成（企業、財務諸表、ROIC計算等）
   - インデックス・制約定義

6. **AWS基盤構築**
   - RDS PostgreSQL (db.t3.micro) セットアップ
   - IAMユーザー作成・権限設定
   - セキュリティグループ設定

7. **Node.jsバックエンド基本構築**
   - Express.js サーバー構築
   - AWS SDK連携実装
   - データベース接続プール設定
   - ヘルスチェックAPI実装

#### 🔄 現在進行中
- **EDINET API実装**
  - 企業マスタデータ取得機能の開発
  - XBRL財務諸表解析機能の開発

#### ⏭️ 次の実装予定
1. **ROIC計算エンジン** (優先度: 高)
   - 計算ロジック実装
   - バッチ処理設計
   - 履歴管理機能

3. **企業検索API** (優先度: 中)
   - 検索エンドポイント実装
   - フィルタリング機能
   - ページネーション

4. **フロントエンド基本画面** (優先度: 中)
   - Next.js プロジェクト作成
   - ダッシュボード画面
   - 企業検索画面

## 開発進捗状況

### 高優先度タスク

- [x] **要件定義とアプリケーション仕様の策定**
  - 機能要件：ROIC計算、企業検索・フィルタリング、比較表示、データエクスポート
  - 非機能要件：パフォーマンス、セキュリティ、可用性、スケーラビリティ
  - ユーザーストーリー：投資家、アナリスト、研究者の利用シナリオ
  - 完了内容：requirements-definition.md、roic-calculation-spec.mdを作成

- [x] **技術スタックとアーキテクチャの選定**
  - フロントエンド：Next.js + TypeScript、状態管理（Zustand）、チャートライブラリ（Recharts + D3.js）
  - バックエンド：Node.js（Express.js）メイン + Spring Boot（補助）、REST API
  - データベース：PostgreSQL（財務データ）+ Redis（セッション・キャッシュ）
  - セキュリティ：JWT + OAuth2、HTTPS、RBAC
  - アーキテクチャ：モジュラーモノリス（将来のマイクロサービス化を考慮）
  - 完了内容：final-tech-stack-decision.mdを作成、企業利用重視の技術選定完了

- [ ] **データソースとAPI設計の検討**
  - 財務データ取得：EDINET API、Yahoo Finance API、Bloomberg API
  - データ更新頻度：四半期決算後の自動更新
  - ROIC計算式：NOPAT ÷ 投下資本の標準化
  - API設計：RESTful設計、ページネーション、レート制限

### 中優先度タスク

- [ ] **UI/UXデザインとワイヤーフレーム作成**
  - 画面設計：ダッシュボード、検索画面、比較表、詳細画面
  - レスポンシブ対応：モバイル・タブレット対応

- [x] **データベース設計とスキーマ定義**
  - テーブル設計：企業マスタ、財務データ、ROIC履歴、業界分類
  - **PostgreSQLスキーマ設計完了**: 9テーブル構成（companies, financial_statements, roic_calculations等）
  - **AWS RDS PostgreSQL環境構築**: db.t3.micro無料枠セットアップ完了
  - **Node.jsバックエンド接続確立**: Express.js + AWS SDK連携、ヘルスチェックAPI実装
  - **スキーマ適用完了**: 9テーブル + 2ビュー + 初期データ投入済み
  - **機能確認済み**: 全拡張機能、インデックス、制約、トリガー正常動作
  - **発生した問題と解決策**: [データベース構築トラブルシューティング](database-troubleshooting.html)を参照

- [x] **開発環境のセットアップとCI/CD構築**
  - ローカル開発環境：VSCode + Claude Code
  - バージョン管理：Git + GitHub (https://github.com/horiken1977/roic)
  - CI/CDツール：Jenkins
  - デプロイ先：AWS Tomcat (IP: 54.199.201.201)
  - 自動テスト：単体テスト、結合テスト
  - 完了内容：development-setup.mdを作成、.gitignoreを更新、GitHubリポジトリ初期設定完了
  - **技術スタック最終決定**: Next.js + TypeScript, Node.js + Express, PostgreSQL + Redis
  - **GitHubリポジトリ初期設定**: リモートリポジトリ追加、初期コミット、mainブランチプッシュ完了
  - **AWS基盤構築**: RDS PostgreSQL (db.t3.micro), IAMユーザー作成、セキュリティグループ設定完了

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

### 最終決定された技術構成

| 項目 | 推奨技術 | 根拠・理由 |
|------|---------|-----------| 
| **フロント** | Next.js + TypeScript | SEO・SSR・保守性・複数人開発に強い |
| **状態管理** | Zustand | 複数人・中大規模開発での一貫性、学習コスト低 |
| **バックエンド** | Node.js (Express.js) | JS統一/エコシステム豊富・企業向け堅牢性 |
| **補助BE** | Spring Boot | 既存スキル活用・Tomcat環境親和性 |
| **DB** | PostgreSQL | 構造化データ・分析・拡張性・企業実績 |
| **アーキ構成** | モノリス→分割 | 初期効率・将来の拡張性・保守性 |
| **セキュリティ** | JWT/HTTPS/OAuth2 | 企業利用の標準セキュリティ・スケーラビリティ |
| **セッション** | Redis + JWT | 同時利用・高速アクセス・セッション共有 |
| **分析** | RDB+API/BI | データ再利用・分析のしやすさ・標準化 |

**決定の根拠:**
1. **企業利用の堅牢性**: 長期運用に耐える安定したフレームワーク
2. **複数人・同時利用**: チーム開発とマルチユーザー対応
3. **データ分析・再利用性**: 財務データの効率的な処理と活用  
4. **将来の拡張性**: スケールアップとマイクロサービス化への対応

### フロントエンド詳細
- **メインフレームワーク**: Next.js 14+ (SSR・SSG・ISR対応)
- **プログラミング言語**: TypeScript (型安全性・保守性重視)
- **状態管理**: Zustand (軽量・学習コスト低・中規模アプリ最適)
- **チャートライブラリ**: Recharts + D3.js (複雑な財務チャート対応)
- **スタイリング**: CSS Modules or Styled Components

### バックエンド詳細  
- **メインAPI**: Node.js + Express.js (フロントエンドとの技術統一)
- **補助システム**: Spring Boot (既存Tomcat環境活用)
- **API設計**: REST API (初期) → GraphQL (将来拡張)
- **非同期処理**: Node.js Cluster + Worker Threads
- **ファイル処理**: Excel/PDF生成対応

### データベース詳細
- **メインDB**: PostgreSQL 15+ (ACID準拠・高度分析関数)
- **キャッシュDB**: Redis 7+ (セッション・高速データアクセス)
- **接続プール**: 20並行接続 (企業利用想定)
- **データ分析**: Window関数・CTE・JSONB型活用

### セキュリティ詳細
- **認証**: OAuth2 + OpenID Connect
- **認可**: RBAC (ロールベースアクセス制御)
- **セッション**: JWT (15分) + Refresh Token (Redis・7日)
- **通信**: HTTPS必須・CSPヘッダー設定
- **データ保護**: 暗号化・入力検証・SQLインジェクション対策

## 次のアクションアイテム

### 🎯 今すぐ実施すべきタスク

1. **EDINET API実装** 🎯 **最優先タスク**
   - 企業マスタデータ取得機能
   - XBRL財務諸表解析機能
   - データベース保存処理

2. **ROIC計算エンジン実装** ⏭️ **中優先度**
   - NOPAT計算ロジック
   - 投下資本計算ロジック
   - 履歴管理とバッチ処理

### ✅ 完了済みタスク

これらのタスクは「開発進捗状況」の該当項目に統合されました：
- 技術スタックの最終決定 → 「開発環境のセットアップとCI/CD構築」
- GitHubリポジトリの初期設定 → 「開発環境のセットアップとCI/CD構築」  
- AWS基盤構築 → 「開発環境のセットアップとCI/CD構築」
- データベース基盤構築 → 「データベース設計とスキーマ定義」


### ⏰ 将来のタスク

4. **Jenkinsfileの作成**
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