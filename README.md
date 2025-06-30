# ROIC分析アプリケーション

日系上場企業のROIC（投下資本利益率）を算出し、競合他社と比較できる分析ツールです。

## 📊 開発進捗ダッシュボード

**[👉 現在の開発進捗を確認する](https://horiken1977.github.io/roic/mydocs/)**

リアルタイムで更新される開発進捗、技術スタック、完了タスクを確認できます。

## 🎯 プロジェクト概要

- **目的**: 日系上場企業のROIC算出・比較分析ツールの開発
- **対象ユーザー**: 投資家、アナリスト、研究者
- **主要機能**: ROIC計算、企業検索・フィルタリング、比較表示、データエクスポート

## 🛠️ 技術スタック

### フロントエンド
- **Next.js 14+** + TypeScript
- **Zustand** (状態管理)
- **Recharts + D3.js** (チャートライブラリ)

### バックエンド  
- **Node.js + Express.js** (メイン)
- **Spring Boot** (補助)
- **REST API** → GraphQL (将来拡張)

### データベース
- **PostgreSQL 15+** (AWS RDS)
- **Redis 7+** (キャッシュ・セッション)

### インフラ
- **AWS** (RDS, EC2)
- **Jenkins** (CI/CD)
- **GitHub Actions** (将来移行予定)

## 📈 開発状況

- ✅ 要件定義・技術選定完了
- ✅ AWS基盤構築完了
- ✅ データベーススキーマ適用完了
- 🔄 EDINET API実装中
- ⏭️ ROIC計算エンジン実装予定

## 📂 プロジェクト構造

```
roic/
├── frontend/          # Next.js アプリケーション
├── backend/           # Node.js API サーバー
├── database/          # PostgreSQL スキーマ
├── docs/              # 設計ドキュメント
├── mydocs/            # 進捗管理・ダッシュボード
└── infrastructure/    # インフラ設定
```

## 🚀 クイックスタート

### 前提条件
- Node.js 18+
- PostgreSQL 15+
- AWS アカウント

### セットアップ
```bash
# リポジトリクローン
git clone https://github.com/horiken1977/roic.git
cd roic

# バックエンド環境構築
cd backend
npm install
cp .env.example .env
# .envファイルを編集してDB接続情報を設定

# データベーススキーマ適用
node scripts/apply-schema.js

# サーバー起動
npm start
```

## 📋 ドキュメント

- [📊 開発進捗ダッシュボード](https://horiken1977.github.io/roic/mydocs/)
- [🛠️ データベーストラブルシューティング](https://horiken1977.github.io/roic/mydocs/database-troubleshooting.html)
- [📝 要件定義書](docs/requirements-definition.md)
- [⚙️ EDINET API実装設計](docs/edinet-api-implementation-design.md)

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/新機能`)
3. 変更をコミット (`git commit -am '新機能追加'`)
4. ブランチにプッシュ (`git push origin feature/新機能`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 📞 お問い合わせ

- プロジェクト管理者: [@horiken1977](https://github.com/horiken1977)
- 課題報告: [GitHub Issues](https://github.com/horiken1977/roic/issues)