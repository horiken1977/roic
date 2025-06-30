# ROIC分析アプリケーション バックエンドAPI

Node.js + Express.js + PostgreSQL + AWS SDKを使用したROIC分析アプリケーションのバックエンドAPI

## 🚀 クイックスタート

### 1. 依存関係のインストール
```bash
cd backend
npm install
```

### 2. 環境変数設定
```bash
# .envファイルを作成
cp .env.example .env

# .envファイルを編集（AWS認証情報、DB接続情報を設定）
```

### 3. 接続テスト
```bash
# AWS & Database接続テスト
npm run aws:test
```

### 4. サーバー起動
```bash
# 開発モード
npm run dev

# 本番モード
npm start
```

## 📋 必要な環境変数

### AWS設定
```env
AWS_ACCESS_KEY_ID=your-iam-access-key-id
AWS_SECRET_ACCESS_KEY=your-iam-secret-access-key
AWS_REGION=ap-northeast-1
```

### RDS PostgreSQL設定
```env
DB_HOST=roic-app-db.xxxxxxxxxx.ap-northeast-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=roic_app
DB_USER=roicadmin
DB_PASSWORD=your-secure-password
DB_SSL=true
```

## 🛠️ 利用可能なスクリプト

| コマンド | 説明 |
|----------|------|
| `npm start` | 本番モードでサーバー起動 |
| `npm run dev` | 開発モードでサーバー起動（nodemon） |
| `npm run aws:test` | AWS & DB接続テスト |
| `npm run db:migrate` | データベースマイグレーション |
| `npm test` | テスト実行 |

## 📊 APIエンドポイント

### ヘルスチェック
```http
GET /health
```

### API情報
```http
GET /api
```

### 企業データ（予定）
```http
GET /api/v1/companies
GET /api/v1/companies/search?q={query}
GET /api/v1/companies/{id}
```

### ROIC計算（予定）
```http
GET /api/v1/roic/{companyId}
POST /api/v1/roic/{companyId}/calculate
```

### 財務データ（予定）
```http
GET /api/v1/financials/{companyId}
POST /api/v1/financials/{companyId}/fetch
```

## 🧪 動作確認

### 1. ヘルスチェック
```bash
curl http://localhost:3001/health
```

### 2. API情報取得
```bash
curl http://localhost:3001/api
```

### 3. AWS接続テスト
```bash
npm run aws:test
```

## 📁 プロジェクト構造

```
backend/
├── config/
│   ├── aws.js              # AWS SDK設定
│   ├── database.js         # PostgreSQL接続設定
│   └── logger.js           # ログ設定
├── scripts/
│   └── test-aws-connection.js  # 接続テストスクリプト
├── .env.example            # 環境変数テンプレート
├── package.json            # 依存関係定義
├── server.js               # メインサーバーファイル
└── README.md               # このファイル
```

## 🔐 セキュリティ

### 環境変数の保護
- `.env`ファイルを`.gitignore`に追加
- 本番環境では環境変数またはAWS Secrets Managerを使用

### AWS IAM権限
最小権限の原則に従い、必要な権限のみ付与：
- RDS接続権限
- CloudWatch Logs書き込み権限
- 必要に応じてEDINET API呼び出し権限

## 📝 ログ

### ログレベル
- `DEBUG`: 詳細なデバッグ情報
- `INFO`: 一般的な情報
- `WARN`: 警告
- `ERROR`: エラー

### ログファイル
- `logs/app.log`: 全ログ
- `logs/error.log`: エラーログのみ

## 🔧 トラブルシューティング

### AWS接続エラー
1. IAM認証情報確認
2. リージョン設定確認
3. セキュリティグループ設定確認

### データベース接続エラー
1. RDSインスタンス起動状態確認
2. セキュリティグループでポート5432許可確認
3. 認証情報確認

### 環境変数エラー
1. `.env`ファイル存在確認
2. 必要な環境変数設定確認
3. 値の形式確認

## 📈 次のステップ

1. [x] 基本サーバー構築
2. [ ] EDINET API連携実装
3. [ ] ROIC計算エンジン実装
4. [ ] データベース操作API実装
5. [ ] テスト追加
6. [ ] エラーハンドリング強化

## 🆓 無料枠での運用

- AWS RDS db.t3.micro（750時間/月）
- CloudWatch Logs基本メトリクス
- コスト監視アラート設定推奨

---

**作成日**: 2025-06-30  
**更新日**: 2025-06-30