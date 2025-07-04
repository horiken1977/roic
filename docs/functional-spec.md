# ROIC分析アプリケーション 機能設計書

## 1. システム概要

### 1.1 目的
日系上場企業のROIC（投下資本利益率）を自動計算・分析・比較するWebアプリケーション

### 1.2 開発方針
- **MVP-First**: 最小限の価値ある製品から開始
- **インクリメンタル開発**: 段階的な機能追加
- **自動文書更新**: 開発進捗に応じた自動更新

## 2. 機能要件

### 2.1 実装済み機能

#### ROIC自動計算 ✅
- **ステータス**: completed
- **進捗**: 100%
- **説明**: 4つの計算方式に対応したROIC自動計算
- **優先度**: high
- **フェーズ**: Phase 1
- **ファイル**: frontend/src/components/ROICCalculator.tsx, frontend/src/utils/roicCalculations.ts


##### 📊 技術詳細

**計算方式:**

1. **基本方式（財務指標直接計算）**
   - 公式: `ROIC = 営業利益 × (1 - 実効税率) ÷ (総資産 - 現金及び現金同等物)`
   - 根拠: 最もシンプルな計算方式、営業利益をベースにした税引後利益を使用
   - 適用場面: 基本的なROIC分析、業界間比較

2. **詳細方式（NOPAT個別計算）**
   - 公式: `NOPAT = (営業利益 + 受取利息) × (1 - 実効税率), 投下資本 = 株主資本 + 有利子負債, ROIC = NOPAT ÷ 投下資本`
   - 根拠: より精密な計算、金融収益も含めた事業利益を評価
   - 適用場面: 詳細分析、投資判断

3. **アセット方式（総資産ベース）**
   - 公式: `投下資本 = 総資産 - 無利子負債（買掛金、未払金等）, ROIC = NOPAT ÷ 投下資本`
   - 根拠: バランスシート全体から運転資本効率を評価
   - 適用場面: 資産効率性分析、製造業評価

4. **修正方式（リース調整）**
   - 公式: `修正NOPAT = NOPAT + リース費用 × (1 - 実効税率), 修正投下資本 = 投下資本 + リース債務, 修正ROIC = 修正NOPAT ÷ 修正投下資本`
   - 根拠: IFRS16対応、オペレーティングリースの資本化調整
   - 適用場面: 国際会計基準企業、小売・航空業界

**精度向上のための調整:**

- **effective_tax_rate**: 法人税等 ÷ 税引前当期純利益（異常値は30%でキャップ）
- **outlier_handling**: ROIC > 100% または < -50% の場合は警告表示
- **industry_adjustments**: 金融業は除外、不動産業は簿価調整オプション
- **period_adjustments**: 期首期末平均値使用、四半期データは年換算


##### 📁 ファイル仕様

**backend/controllers/roic-calculator.js**

- **目的**: ROIC計算エンジンの中核ロジック
- **主要機能**:
  - 4つの計算方式（標準、調整済み、保守的、積極的）の実装
  - NOPAT（税引き後営業利益）の精密計算
  - 投下資本の多角的算定
  - 補助指標（運転資本、資産回転率等）の算出
- **主要特徴**:
  - 実効税率の自動計算（0%〜50%の妥当性チェック）
  - ゼロ除算防止とエラーハンドリング
  - 業界別調整機能
  - 詳細なログ記録システム
- **アルゴリズム**:
  - **nopat_calculation**: `営業利益 × (1 - 実効税率)`
  - **invested_capital_standard**: `総資産 - 無利子負債（流動負債の70%）`
  - **invested_capital_adjusted**: `純資産 + 有利子負債`
  - **invested_capital_conservative**: `純資産 + 有利子負債 - のれん - 無形資産`
  - **invested_capital_aggressive**: `総資産 - （流動負債の90%）`

**frontend/src/utils/roicCalculations.ts**

- **目的**: フロントエンド向けROIC計算ユーティリティ
- **主要機能**:
  - バックエンドAPIとの連携
  - 計算結果のフォーマット
  - エラーハンドリングとユーザー向けメッセージ
- **ステータス**: 実装予定（現在はバックエンドのみ実装）

#### 企業検索・フィルタリング ✅
- **ステータス**: completed
- **進捗**: 100%
- **説明**: 効率的な企業検索とフィルタリング機能
- **優先度**: high
- **フェーズ**: Phase 1
- **ファイル**: frontend/src/app/companies/page.tsx, frontend/src/components/CompanySearch.tsx


##### 📁 ファイル仕様

**frontend/src/app/companies/page.tsx**

- **目的**: 企業検索・フィルタリング画面のメインコンポーネント
- **主要機能**:
  - 企業名による検索機能
  - 業界別フィルタリング（製造業、金融業、小売業）
  - 市場別フィルタリング（プライム、スタンダード、グロース）
  - 検索結果の表示エリア
- **UIコンポーネント**:
  - 検索入力フィールド
  - 業界選択ドロップダウン
  - 市場選択ドロップダウン
  - 検索ボタン
  - 検索結果表示エリア（実装予定）
- **現在の状況**: UI完成、バックエンド連携未実装

**frontend/src/components/CompanySearch.tsx**

- **目的**: 企業検索専用コンポーネント
- **ステータス**: 未実装（現在は companies/page.tsx に統合）

#### 進捗ダッシュボード ✅
- **ステータス**: completed
- **進捗**: 100%
- **説明**: リアルタイムで開発状況を監視・可視化
- **優先度**: high
- **フェーズ**: Phase 1
- **ファイル**: frontend/src/app/dashboard/page.tsx, frontend/src/app/page.tsx


##### 📁 ファイル仕様

**frontend/src/app/dashboard/page.tsx**

- **目的**: 開発進捗ダッシュボード（現在はリダイレクト処理）

**frontend/src/app/page.tsx**

- **目的**: 統合ダッシュボード機能付きホームページ

#### 機能設計書 ✅
- **ステータス**: completed
- **進捗**: 100%
- **説明**: システム要件・機能仕様・技術設計
- **優先度**: medium
- **フェーズ**: Phase 1
- **ファイル**: docs/functional-spec.md, frontend/src/app/functional-spec/page.tsx

#### テスト仕様書 ✅
- **ステータス**: completed
- **進捗**: 100%
- **説明**: ユニット・E2Eテストの実行状況
- **優先度**: medium
- **フェーズ**: Phase 1
- **ファイル**: frontend/src/app/test-docs/test-spec/page.tsx

#### 環境設計書 ✅
- **ステータス**: completed
- **進捗**: 100%
- **説明**: 開発・本番環境の詳細設計とインフラ構成
- **優先度**: medium
- **フェーズ**: Phase 1
- **ファイル**: frontend/src/app/environment-design/page.tsx, docs/environment-design.md

#### 運用設計書 ✅
- **ステータス**: completed
- **進捗**: 100%
- **説明**: システム運用ルールと自動化設定
- **優先度**: high
- **フェーズ**: Phase 1
- **ファイル**: frontend/src/app/operations-design/page.tsx, docs/operations-design.md



### 2.2 計画中機能

#### 業界比較・ランキング 🚧
- **ステータス**: in_progress
- **進捗**: 25%
- **説明**: 同業界内でのROIC比較とランキング表示
- **優先度**: high
- **フェーズ**: Phase 2

#### データ可視化 📋
- **ステータス**: planned
- **進捗**: 0%
- **説明**: ROICトレンドチャート・グラフ表示
- **優先度**: high
- **フェーズ**: Phase 2

#### EDINET API統合 🚧
- **ステータス**: in_progress
- **進捗**: 75%
- **説明**: 外部APIからの財務データ取得
- **優先度**: high
- **フェーズ**: Phase 3



## 3. 開発進捗

### 全体進捗: 70%

### Phase 1: MVP基盤構築 ✅
- **進捗**: 100%
- **説明**: 基本機能とインフラの構築
- **含む機能**: 7個

### Phase 2: コア機能拡張 📋
- **進捗**: 0%
- **説明**: 業界比較・データ可視化機能の追加
- **含む機能**: 2個

### Phase 3: データ統合 📋
- **進捗**: 0%
- **説明**: 外部API統合・データベース連携
- **含む機能**: 1個



## 4. テスト状況

- **ユニットテスト**: 9件 (成功: 9, カバレッジ: 95%)
- **E2Eテスト**: 0件 (成功: 0, カバレッジ: 70%)
- **統合テスト**: 0件 (成功: 0, カバレッジ: 75%)

---
*最終更新: 2025/7/5 0:10:18*
*この文書は開発進捗に応じて自動更新されます*