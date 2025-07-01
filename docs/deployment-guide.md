# ROIC分析アプリケーション - デプロイメントガイド

## 概要

このドキュメントでは、ROIC分析アプリケーションのCI/CDパイプラインとデプロイメント手順について説明します。

## アーキテクチャ

### インフラストラクチャ
- **AWS S3**: 静的サイトホスティング
- **AWS CloudFront**: CDN配信
- **AWS CloudFormation**: インフラ管理
- **Jenkins**: CI/CDパイプライン
- **GitHub Actions**: 補完的なCI/CD

### 環境構成
1. **ステージング環境**: テスト・検証用
2. **本番環境**: エンドユーザー向け

## セットアップ手順

### 1. AWS インフラストラクチャの構築

#### CloudFormationスタックのデプロイ

```bash
# ステージング環境
aws cloudformation create-stack \
  --stack-name roic-infrastructure-staging \
  --template-body file://infrastructure/cloudformation/roic-infrastructure.yaml \
  --parameters ParameterKey=Environment,ParameterValue=staging \
  --capabilities CAPABILITY_IAM \
  --region ap-northeast-1

# 本番環境
aws cloudformation create-stack \
  --stack-name roic-infrastructure-production \
  --template-body file://infrastructure/cloudformation/roic-infrastructure.yaml \
  --parameters ParameterKey=Environment,ParameterValue=production \
  --capabilities CAPABILITY_IAM \
  --region ap-northeast-1
```

#### 必要な出力値の取得

```bash
# ステージング環境の情報取得
aws cloudformation describe-stacks \
  --stack-name roic-infrastructure-staging \
  --query 'Stacks[0].Outputs'

# 本番環境の情報取得
aws cloudformation describe-stacks \
  --stack-name roic-infrastructure-production \
  --query 'Stacks[0].Outputs'
```

### 2. Jenkins CI/CDパイプライン設定

#### 環境変数の設定

Jenkinsfile内で以下の環境変数を更新：

```groovy
environment {
    AWS_REGION = 'ap-northeast-1'
    AWS_S3_STAGING_BUCKET = '[STAGING_S3_BUCKET_NAME]'
    AWS_S3_PRODUCTION_BUCKET = '[PRODUCTION_S3_BUCKET_NAME]'
    AWS_CLOUDFRONT_STAGING_ID = '[STAGING_CLOUDFRONT_ID]'
    AWS_CLOUDFRONT_PRODUCTION_ID = '[PRODUCTION_CLOUDFRONT_ID]'
}
```

#### 必要な認証情報

Jenkins内で以下の認証情報を設定：

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- GitHub アクセストークン

### 3. GitHub Actions設定

#### Secrets設定

GitHubリポジトリの Settings > Secrets で以下を設定：

```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_STAGING_BUCKET=roic-infrastructure-staging-website
S3_PRODUCTION_BUCKET=roic-infrastructure-production-website
CLOUDFRONT_STAGING_ID=E1234567STAGING
CLOUDFRONT_PRODUCTION_ID=E1234567PRODUCTION
```

## デプロイメント手順

### 自動デプロイメント

#### GitHub Actions (推奨)

1. **mainブランチへのプッシュ**で自動実行
2. **ステージング**へ自動デプロイ
3. **E2Eテスト**の自動実行
4. **本番環境**への手動承認デプロイ

```bash
# 通常のGitワークフロー
git add .
git commit -m "新機能追加"
git push origin main
```

#### Jenkins Pipeline

1. GitHubへのプッシュでWebhook起動
2. 全ステージの自動実行
3. 本番デプロイ前に手動承認

### 手動デプロイメント

#### ステージング環境

```bash
# スクリプトを使用
./scripts/deploy-staging.sh

# オプション: CloudFront invalidation完了まで待機
./scripts/deploy-staging.sh --wait-invalidation
```

#### 本番環境

```bash
# スクリプトを使用（確認プロンプトあり）
./scripts/deploy-production.sh

# 強制実行（確認プロンプトスキップ）
./scripts/deploy-production.sh --force
```

## パイプライン詳細

### Jenkins パイプライン ステージ

1. **Checkout**: コードの取得
2. **Environment Setup**: 環境構築
3. **Install Dependencies**: 依存関係インストール
4. **Code Quality & Linting**: コード品質チェック
5. **Unit Tests**: ユニットテスト実行
6. **Integration Tests**: 統合テスト実行
7. **Security Scan**: セキュリティスキャン
8. **Build**: アプリケーションビルド
9. **Performance Tests**: パフォーマンステスト
10. **Deploy to Staging**: ステージング環境デプロイ
11. **Staging Health Check**: ステージング動作確認
12. **Automated Testing on Staging**: ステージングでのテスト実行
13. **Production Deployment Approval**: 本番デプロイ承認
14. **Deploy to Production**: 本番環境デプロイ
15. **Production Health Check**: 本番動作確認

### GitHub Actions ワークフロー

1. **🧪 Test and Quality Checks**: テスト・品質チェック
2. **🏗️ Build Application**: アプリケーションビルド
3. **🚀 Deploy to Staging**: ステージングデプロイ
4. **🔄 E2E Tests on Staging**: ステージングE2Eテスト
5. **🌟 Deploy to Production**: 本番デプロイ（手動承認）
6. **🧹 Cleanup**: リソースクリーンアップ

## 監視・運用

### ヘルスチェック

#### ステージング環境
```bash
curl -f https://[STAGING_CLOUDFRONT_ID].cloudfront.net
```

#### 本番環境
```bash
curl -f https://[PRODUCTION_CLOUDFRONT_ID].cloudfront.net
```

### ログ監視

- **CloudWatch Logs**: アプリケーションログ
- **CloudFront ログ**: アクセスログ・エラーログ
- **S3 アクセスログ**: オブジェクトアクセスログ

### バックアップ・復旧

#### 自動バックアップ
- デプロイ前に自動バックアップ作成
- ステージング: 最新5世代保持
- 本番: 最新10世代保持

#### 手動ロールバック

```bash
# 最新バックアップからの復旧
aws s3 sync s3://[BUCKET]/backup/latest/ s3://[BUCKET]/ --delete --exclude "backup/*"

# CloudFrontキャッシュ無効化
aws cloudfront create-invalidation --distribution-id [DISTRIBUTION_ID] --paths "/*"
```

## トラブルシューティング

### よくある問題

#### 1. デプロイ失敗
- **原因**: AWS認証情報エラー
- **解決**: IAMロール・ポリシーの確認

#### 2. ヘルスチェック失敗
- **原因**: CloudFrontキャッシュ未更新
- **解決**: 手動invalidation実行

#### 3. テスト失敗
- **原因**: 依存関係の問題
- **解決**: `npm ci` で依存関係再インストール

### 緊急時対応

#### 本番環境障害時

1. **自動ロールバック**: パイプライン内で自動実行
2. **手動ロールバック**: 上記手動ロールバック手順実行
3. **インシデント報告**: SNS通知・Slack通知

## セキュリティ

### アクセス制御
- IAMロール・ポリシーの最小権限原則
- S3バケットポリシーでの適切なアクセス制御
- CloudFrontでのOAI（Origin Access Identity）使用

### 認証情報管理
- AWS IAMロールベース認証
- GitHub Secretsでの機密情報管理
- Jenkins認証情報ストアの使用

### セキュリティスキャン
- 依存関係の脆弱性チェック
- 静的コード解析
- セキュリティベストプラクティスの適用

## パフォーマンス最適化

### キャッシュ戦略
- **静的アセット**: 1年間キャッシュ
- **HTMLファイル**: キャッシュ無効化
- **APIレスポンス**: 適切なキャッシュヘッダー

### CloudFront最適化
- HTTP/2対応
- Gzip圧縮有効化
- 地理的分散配信

## 今後の拡張計画

1. **マルチリージョン展開**: 災害復旧対応
2. **カナリアデプロイ**: 段階的本番反映
3. **自動スケーリング**: トラフィック増減への対応
4. **メトリクス収集**: より詳細な監視・分析

---

## 連絡先・サポート

デプロイメントに関する質問・問題は、開発チームまでお問い合わせください。

**更新履歴**
- 2025/7/1: 初版作成
- 自動更新: CI/CDパイプライン構築完了