# AWS RDS PostgreSQL 無料枠セットアップガイド

## 概要
AWS RDS PostgreSQL db.t3.microインスタンスを無料枠で作成し、ROICアプリケーション用データベースを構築します。

## 🆓 無料枠の確認

### 対象条件
- AWSアカウント作成から12ヶ月以内
- db.t3.micro インスタンス（vCPU:1、メモリ:1GB）
- 月750時間まで（24時間×31日 = 744時間）
- ストレージ20GBまで無料
- バックアップ20GBまで無料

## 🛠️ RDSインスタンス作成手順

### Step 1: AWSコンソールにログイン
1. AWS Management Consoleにアクセス
2. 東京リージョン（ap-northeast-1）を選択

### Step 2: RDS ダッシュボードへ移動
1. サービス検索で「RDS」を入力
2. 「Amazon RDS」を選択

### Step 3: データベース作成
1. 「データベースの作成」ボタンをクリック

#### 3.1 作成方法
- **選択**: 標準作成

#### 3.2 エンジンのオプション
- **エンジンタイプ**: PostgreSQL
- **バージョン**: PostgreSQL 15.x（最新安定版）

#### 3.3 テンプレート
- **選択**: 無料利用枠 ✅

#### 3.4 設定
```
DB インスタンス識別子: roic-app-db
マスターユーザー名: roicadmin
マスターパスワード: [複雑なパスワード設定]
パスワード確認: [同じパスワード]
```

#### 3.5 DB インスタンスクラス
- **選択**: db.t3.micro（無料枠対象）

#### 3.6 ストレージ
```
ストレージタイプ: 汎用SSD（gp2）
割り当てストレージ: 20 GB（無料枠上限）
ストレージ暗号化: 有効化 ✅
```

#### 3.7 可用性と耐久性
- **Multi-AZ配置**: ❌ 無効（有効化すると2倍の料金）

#### 3.8 接続
```
Virtual Private Cloud (VPC): default VPC
DB サブネットグループ: default
パブリックアクセス: はい ✅（開発用）
VPC セキュリティグループ: 新しいセキュリティグループを作成
新しいVPCセキュリティグループ名: roic-app-sg
```

#### 3.9 データベース認証
- **選択**: パスワード認証

#### 3.10 追加設定
```
最初のデータベース名: roic_app
バックアップの保持期間: 7日（無料枠内）
削除保護: 無効（開発用）
```

### Step 4: 作成実行
1. 「データベースの作成」をクリック
2. 作成完了まで約10-15分待機

## 🔒 セキュリティグループ設定

### PostgreSQL接続許可設定
1. EC2 ダッシュボードへ移動
2. 「セキュリティグループ」を選択
3. 「roic-app-sg」を選択
4. 「インバウンドルール」タブ
5. 「ルールを編集」をクリック

#### インバウンドルール追加
```
タイプ: PostgreSQL
プロトコル: TCP
ポート範囲: 5432
ソース: マイIP（開発用）
説明: ROIC App PostgreSQL Access
```

## 📋 接続情報の取得

### エンドポイント情報
RDS ダッシュボードで作成したインスタンスを選択し、以下を記録：

```
エンドポイント: roic-app-db.xxxxxxxxxx.ap-northeast-1.rds.amazonaws.com
ポート: 5432
データベース名: roic_app
ユーザー名: roicadmin
パスワード: [設定したパスワード]
```

## 🧪 接続テスト

### psqlコマンドでの接続確認
```bash
# psqlをインストール（macOS）
brew install postgresql

# 接続テスト
psql -h roic-app-db.xxxxxxxxxx.ap-northeast-1.rds.amazonaws.com \
     -p 5432 \
     -U roicadmin \
     -d roic_app
```

### Node.js接続テスト
```javascript
// test-connection.js
const { Pool } = require('pg');

const pool = new Pool({
  host: 'roic-app-db.xxxxxxxxxx.ap-northeast-1.rds.amazonaws.com',
  port: 5432,
  database: 'roic_app',
  user: 'roicadmin',
  password: 'your-password',
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('接続成功:', result.rows[0]);
    client.release();
  } catch (err) {
    console.error('接続エラー:', err);
  } finally {
    await pool.end();
  }
}

testConnection();
```

## 💰 コスト監視設定

### AWS Budgets設定
1. AWS Billing ダッシュボードへ移動
2. 「Budgets」を選択
3. 「Create budget」をクリック

#### 予算設定
```
Budget type: Cost budget
Budget name: RDS-Free-Tier-Monitor
Budgeted amount: $1.00
Time period: Monthly
```

#### アラート設定
```
Threshold: 80% of budgeted amount
Email recipients: [your-email]
```

## 🔄 スキーマ適用

### スキーマファイル実行
```bash
# スキーマファイルを実行
psql -h [endpoint] -p 5432 -U roicadmin -d roic_app -f database/schema.sql
```

## ⚠️ 重要な注意点

### 無料枠超過を避けるため
1. **インスタンス停止**: 毎月750時間以内に収める
2. **ストレージ監視**: 20GB以内で運用
3. **バックアップ管理**: 不要な古いバックアップ削除
4. **Multi-AZ無効**: 費用を2倍にしないため

### セキュリティ対策
1. **強力なパスワード**: 最低12文字、英数字記号混在
2. **IP制限**: セキュリティグループで開発IPのみ許可
3. **SSL/TLS**: 本番運用時は必須
4. **定期パスワード変更**: 月1回推奨

## 📝 環境変数設定

### .env ファイル作成
```env
# AWS RDS PostgreSQL接続情報
DB_HOST=roic-app-db.xxxxxxxxxx.ap-northeast-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=roic_app
DB_USER=roicadmin
DB_PASSWORD=your-secure-password
DB_SSL=true

# AWS Region
AWS_REGION=ap-northeast-1

# アプリケーション設定
NODE_ENV=development
PORT=3001
```

## 🚀 次のステップ

1. RDSインスタンス作成完了確認
2. 接続テスト実行
3. スキーマ適用
4. Node.js バックエンドAPI実装開始

---

**注意**: この設定は開発環境用です。本番環境では追加のセキュリティ設定が必要になります。