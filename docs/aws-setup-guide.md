# AWS認証設定ガイド

## 概要

このプロジェクトでは、GitHub ActionsからAWSリソースにアクセスするために、以下の2つの認証方式をサポートしています：

1. **アクセスキー認証** (簡単設定)
2. **OIDC認証** (推奨・セキュア)

## 🔑 方式1: アクセスキー認証

### IAMユーザー作成

1. AWS Console → IAM → Users → Create user
2. ユーザー名: `github-actions-roic`
3. アクセスタイプ: Programmatic access
4. 権限設定: 以下のポリシーをアタッチ

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:CreateBucket",
        "s3:PutBucketPolicy",
        "s3:PutBucketWebsite"
      ],
      "Resource": [
        "arn:aws:s3:::roic-app-*",
        "arn:aws:s3:::roic-app-*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "events:ListRules",
        "events:PutRule",
        "events:DescribeRule"
      ],
      "Resource": "arn:aws:events:*:*:rule/roic-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

### GitHub Secretsの設定

GitHub Repository → Settings → Secrets and variables → Actions

**必須シークレット:**
- `AWS_ACCESS_KEY_ID`: IAMユーザーのアクセスキーID
- `AWS_SECRET_ACCESS_KEY`: IAMユーザーのシークレットアクセスキー

**オプションシークレット:**
- `S3_BUCKET_NAME`: S3バケット名 (デフォルト: roic-app-{account-id})
- `CLOUDFRONT_DISTRIBUTION_ID`: CloudFrontディストリビューションID

## 🛡️ 方式2: OIDC認証 (推奨)

### 1. OIDC Identity Provider作成

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

### 2. IAMロール作成

**信頼ポリシー (Trust Policy):**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::{ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:horiken1977/roic:*"
        }
      }
    }
  ]
}
```

**権限ポリシー:**
上記のアクセスキー認証と同じポリシーを使用

### 3. GitHub Secretsの設定

**必須シークレット:**
- `AWS_ROLE_TO_ASSUME`: 作成したIAMロールのARN
  - 例: `arn:aws:iam::123456789012:role/GitHubActionsRole`

**オプションシークレット:**
- `S3_BUCKET_NAME`: S3バケット名
- `CLOUDFRONT_DISTRIBUTION_ID`: CloudFrontディストリビューションID

## 🔧 設定確認

### 動作テスト

1. GitHub Repository → Actions → "Deploy to AWS & GitHub Pages"
2. "Run workflow" ボタンをクリック
3. ワークフローログで認証状況を確認

### 正常な場合のログ例

```
✅ AWS Access Key credentials available
✅ AWS credentials verified
🏢 AWS Account: 123456789012
📦 Using default bucket name: roic-app-123456789012
📤 Syncing files to S3...
✅ Deployment complete!
🌐 Website URL: http://roic-app-123456789012.s3-website-ap-northeast-1.amazonaws.com
```

### エラーの場合のログ例

```
⚠️ AWS credentials not configured
Please configure either:
  1. AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY secrets, or
  2. AWS_ROLE_TO_ASSUME secret for OIDC authentication
```

## 🚀 CloudFront設定 (オプション)

### CloudFrontディストリビューション作成

1. AWS Console → CloudFront → Create Distribution
2. Origin Settings:
   - Origin Domain: `roic-app-{account-id}.s3-website-ap-northeast-1.amazonaws.com`
   - Protocol: HTTP only
3. Default Cache Behavior:
   - Viewer Protocol Policy: Redirect HTTP to HTTPS
   - Allowed HTTP Methods: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
4. Distribution Settings:
   - Default Root Object: `index.html`

### カスタムドメイン設定 (オプション)

1. Route 53でドメイン管理
2. ACM (AWS Certificate Manager)でSSL証明書作成
3. CloudFrontディストリビューションにドメインとSSL証明書を設定

## 📋 チェックリスト

- [ ] IAMユーザーまたはIAMロールの作成
- [ ] 必要な権限ポリシーの適用
- [ ] GitHub Secretsの設定
- [ ] ワークフロー実行テスト
- [ ] デプロイ先URLの確認
- [ ] CloudFront設定 (オプション)

## 🔍 トラブルシューティング

### よくあるエラー

1. **"Could not load credentials from any providers"**
   → GitHub Secretsが正しく設定されているか確認

2. **"Access Denied" on S3**
   → IAMポリシーでS3権限が付与されているか確認

3. **"InvalidBucketName"**
   → S3バケット名がユニークでAWSの命名規則に従っているか確認

4. **OIDC認証エラー**
   → 信頼ポリシーのリポジトリ名が正しいか確認

### サポート

- AWS公式ドキュメント: https://docs.aws.amazon.com/
- GitHub Actions OIDC: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- プロジェクトIssues: https://github.com/horiken1977/roic/issues