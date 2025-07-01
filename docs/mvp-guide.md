# MVPインクリメンタル開発ガイド

## 🎯 MVPから始まるインクリメンタル開発

このプロジェクトは**MVP（Minimum Viable Product）**から開始し、段階的に機能を追加していく**インクリメンタル開発**を採用しています。

## 🔄 自動化システムの仕組み

### 一元管理システム
```bash
npm run start-automation
```

このコマンドで以下が自動実行されます：

1. **ファイル監視**: コード変更を自動検知
2. **機能設計書更新**: 新機能追加時に自動更新
3. **テスト仕様書更新**: テスト追加時に自動更新  
4. **ダッシュボード反映**: 進捗状況を自動計算・表示

### 情報の一元管理

すべての情報は `config/project-config.json` で一元管理され、以下に自動反映されます：

- 📊 **トップページダッシュボード**: https://horiken1977.github.io/roic/
- 📋 **機能設計書**: https://horiken1977.github.io/roic/functional-spec/
- 🧪 **テスト仕様書**: https://horiken1977.github.io/roic/test-docs/test-spec/

## 🚀 開発フロー

### 1. 新機能の追加

```typescript
// 例: 新しいコンポーネントを作成
// frontend/src/components/NewFeature.tsx
export default function NewFeature() {
  return <div>New Feature</div>;
}
```

→ **自動検知** → **設定ファイル更新** → **文書更新** → **ダッシュボード反映**

### 2. テストの追加

```javascript
// 例: 新しいテストを作成
// frontend/__tests__/NewFeature.test.tsx
test('NewFeature renders correctly', () => {
  // テストコード
});
```

→ **自動検知** → **テストメトリクス更新** → **テスト仕様書更新**

### 3. 機能完了時

設定ファイルで機能のステータスを更新：

```json
{
  "id": "new-feature",
  "status": "completed",
  "progress": 100
}
```

→ **全文書自動更新** → **進捗率再計算**

## 📊 進捗管理

### フェーズ管理
- **Phase 1**: MVP基盤構築 ✅ 100%
- **Phase 2**: コア機能拡張 🚧 進行中
- **Phase 3**: データ統合 📋 計画中

### 自動メトリクス
- 機能完了率の自動計算
- テストカバレッジの自動更新
- 進捗バーの自動調整

## 🛠️ 設定ファイル構造

```json
{
  "project": { "name": "...", "development_mode": "incremental" },
  "features": {
    "core": [/* 完了済み機能 */],
    "planned": [/* 計画中機能 */]
  },
  "phases": [/* 開発フェーズ */],
  "tests": {/* テストメトリクス */},
  "automation": { "auto_update": true }
}
```

## 🔧 トラブルシューティング

### 文書が更新されない場合
```bash
# 手動で一元管理システムを再起動
npm run centralized-manager
```

### 設定ファイルのリセット
```bash
# 設定ファイルを削除して自動再生成
rm config/project-config.json
npm run start-automation
```

## 📈 効果

- ✅ **開発効率向上**: 文書更新作業の自動化
- ✅ **一貫性保持**: 単一ソースからの自動生成
- ✅ **リアルタイム監視**: 常に最新の進捗状況を把握
- ✅ **品質向上**: テストメトリクスの自動追跡

---

**🤖 このシステムにより、開発に集中しながら自動的に進捗管理が行われます**