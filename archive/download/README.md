# ROIC分析アプリケーションあ

日系上場企業のROIC（投下資本利益率）を自動計算・分析・比較できるWebアプリケーションです。

## 🚀 ライブデモ

**🌐 https://horiken1977.github.io/roic/**

## ✨ 主な機能

- ✅ **ROIC自動計算** - 4つの計算方式に対応
- ✅ **企業検索・フィルタリング** - 効率的な企業検索
- ✅ **業界内比較・ランキング** - 同業界内でのROIC比較
- ✅ **トレンドチャート・可視化** - データの視覚的分析
- ✅ **自動テスト・デプロイ** - CI/CDパイプライン完備
- ✅ **リアルタイム進捗管理** - 開発状況の自動追跡

## 🏗️ 技術スタック

### フロントエンド
- **Next.js 15** - React ベースのフルスタックフレームワーク
- **TypeScript** - 型安全性を提供
- **Tailwind CSS** - ユーティリティファーストのCSSフレームワーク
- **Zustand** - 軽量な状態管理

### バックエンド
- **Node.js** - サーバーサイドJavaScript実行環境
- **Express.js** - Webアプリケーションフレームワーク
- **EDINET API** - 財務データ取得

### テスト・品質管理
- **Jest** - ユニットテストフレームワーク
- **React Testing Library** - Reactコンポーネントテスト
- **Playwright** - E2Eテストフレームワーク
- **ESLint** - コード品質管理

### CI/CD・デプロイ
- **GitHub Actions** - 自動化ワークフロー
- **GitHub Pages** - 静的サイトホスティング
- **Jenkins** - CI/CDパイプライン

## 🛠️ セットアップ

### 前提条件
- Node.js 18.0.0 以上
- npm 9.0.0 以上

### インストール

1. リポジトリをクローン
```bash
git clone https://github.com/horiken1977/roic.git
cd roic
```

2. 依存関係をインストール
```bash
npm run setup
```

3. 開発サーバーを起動
```bash
npm run dev
```

4. ブラウザで http://localhost:3000 を開く

## 📊 自動化システム

### 自動ダッシュボード更新
```bash
npm run auto-dashboard
```
- コードの変更を監視
- 機能一覧を自動更新
- 進捗状況を自動計算
- テスト仕様書を自動生成

### インクリメンタル開発サイクル
```bash
npm run auto-dev-cycle
```
- ファイル変更を検知
- 品質チェック実行
- テスト自動実行
- ビルド・デプロイ自動化

### 全自動化システム開始
```bash
npm run start-automation
```
- すべての自動化システムを同時起動
- リアルタイム進捗監視
- 自動エラー修正

## 🧪 テスト

### ユニットテスト
```bash
npm test
```

### E2Eテスト
```bash
npm run test:e2e
```

### テスト監視モード
```bash
npm run test:watch
```

## 🚀 デプロイ

### 本番ビルド
```bash
npm run build
```

### GitHub Pagesデプロイ
```bash
npm run deploy
```

## 📈 進捗管理

プロジェクトの進捗は以下で確認できます：

- **ダッシュボード**: https://horiken1977.github.io/roic/dashboard/
- **テスト計画書**: https://horiken1977.github.io/roic/test-docs/test-plan/
- **テスト仕様書**: https://horiken1977.github.io/roic/test-docs/test-spec/

## 📁 プロジェクト構成

```
roic/
├── frontend/                 # Next.jsフロントエンド
│   ├── src/app/             # アプリケーションページ
│   ├── src/components/      # 再利用可能コンポーネント
│   ├── src/stores/          # 状態管理
│   └── __tests__/           # フロントエンドテスト
├── backend/                 # Node.jsバックエンド（予定）
├── docs/                    # プロジェクトドキュメント
├── scripts/                 # 自動化スクリプト
│   ├── auto-dashboard-updater.js
│   ├── incremental-dev-cycle.js
│   ├── test-docs-generator.js
│   └── test-progress-updater.js
└── tests/                   # E2Eテスト
```

## 🔄 開発フロー

1. **機能開発** - 新機能の実装
2. **自動テスト** - コード変更時に自動実行
3. **品質チェック** - ESLint、TypeScript型チェック
4. **自動ビルド** - 成功時に自動ビルド
5. **自動デプロイ** - GitHub Pagesに自動デプロイ
6. **進捗更新** - ダッシュボード、文書の自動更新

## 🤝 コントリビューション

1. フォークを作成
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 📞 サポート

問題や質問がある場合は、GitHubのIssuesページでお知らせください。

## ⚠️ セキュリティ注記

**重要**: このリポジトリの過去のコミット履歴に秘密鍵のファイル名参照（AWS01.pem）が含まれていますが、**実際の秘密鍵ファイルの中身は一度もリポジトリに含まれていません**。

### 対応済み事項
- ✅ **2025年6月30日**: GitGuardianによるセキュリティアラート検出
- ✅ **即座の対応**: 全てのファイル名参照を`[PRIVATE_KEY]`に置換
- ✅ **予防策**: .gitignoreにセキュリティパターンを追加
- ✅ **AWS鍵のローテーション**: 該当の秘密鍵は無効化され、新しい鍵に置き換え済み

### セキュリティ状況
- 🔒 **現在のリスク**: なし（対策完了済み）
- 🛡️ **予防策**: 強化された.gitignoreパターンで今後の事故を防止
- 📊 **監視**: GitGuardianによる継続的なセキュリティ監視

---

**🤖 このプロジェクトは自動化システムにより継続的に更新されています**
