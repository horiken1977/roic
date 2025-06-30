# アーキテクチャ決定記録 (ADR)

## ADR-001: フロントエンドフレームワークの選定

### ステータス
決定済み

### コンテキスト
ROIC分析アプリケーションのフロントエンド開発において、以下の要件を満たす必要がある：
- 財務データの複雑なグラフ表示
- リアルタイムデータ更新
- 高いパフォーマンス要求（検索500ms以内）
- レスポンシブデザイン

### 決定
**Next.js 14+ with TypeScript** を採用する

### 理由
1. **パフォーマンス最適化**
   - Static Site Generation (SSG) で初期表示高速化
   - Incremental Static Regeneration (ISR) でデータ更新対応
   - 自動的なコード分割とプリフェッチ

2. **開発効率**
   - Reactエコシステムの豊富なライブラリ
   - TypeScriptによる型安全性
   - 優れた開発者体験（Hot Module Replacement等）

3. **SEO対応**
   - サーバーサイドレンダリング対応（将来の要件）
   - メタデータ管理の容易さ

### 結果
- ✅ 高速な初期表示を実現
- ✅ Rechartsとの優れた互換性
- ⚠️ 学習コストが発生（チーム研修必要）

---

## ADR-002: バックエンド言語・フレームワークの選定

### ステータス
決定済み

### コンテキスト
- 複雑な財務計算処理
- 外部API（EDINET）との連携
- 既存のJava/Tomcat環境
- Excel/PDF生成要件

### 決定
**ハイブリッドアプローチ**: Python FastAPI（メイン） + Java Spring Boot（補助）

### 理由
1. **Python FastAPI（メイン処理）**
   - pandas, NumPyによる効率的な財務データ処理
   - 非同期処理による高パフォーマンス
   - EDINET API連携の実装容易性
   - Excel/PDF生成ライブラリの充実

2. **Java Spring Boot（既存資産活用）**
   - Tomcat環境との完全な互換性
   - 既存のJavaライブラリ活用
   - エンタープライズ機能の実装

### 実装方針
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Next.js   │────▶│ Nginx/Apache │────▶│   FastAPI   │
│  Frontend   │     │Reverse Proxy │     │   (8000)    │
└─────────────┘     └──────────────┘     └─────────────┘
                            │                     │
                            │              ┌──────────────┐
                            └─────────────▶│ Spring Boot  │
                                          │  (Tomcat)    │
                                          └──────────────┘
```

### 結果
- ✅ 各言語の強みを活かした実装
- ✅ 段階的な移行が可能
- ⚠️ 運用の複雑性増加（監視・ログ統合必要）

---

## ADR-003: データベースの選定

### ステータス
決定済み

### コンテキスト
- 財務データの整合性（ACID準拠必須）
- 複雑なリレーショナル操作
- 時系列データの効率的管理
- 将来的な分析機能拡張

### 決定
**PostgreSQL 15+** をメインデータベースとして採用

### 理由
1. **高度な機能**
   - Window関数による時系列分析
   - CTEによる複雑なクエリの可読性
   - JSONB型によるスキーマ柔軟性

2. **パフォーマンス**
   - 並列クエリ実行
   - 効率的なインデックス（B-tree, GiST, GIN）
   - パーティショニング対応

3. **拡張性**
   - TimescaleDB拡張による時系列最適化オプション
   - Foreign Data Wrapperによる外部データ連携

### スキーマ設計方針
```sql
-- 企業マスタ
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    ticker_symbol VARCHAR(10) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    industry_code VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 財務データ（年度別）
CREATE TABLE financial_data (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    fiscal_year INTEGER NOT NULL,
    revenue DECIMAL(15,2),
    operating_profit DECIMAL(15,2),
    -- 他の財務項目...
    UNIQUE(company_id, fiscal_year)
);

-- ROIC計算結果（キャッシュ）
CREATE TABLE roic_calculations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    fiscal_year INTEGER NOT NULL,
    roic DECIMAL(10,4),
    calculation_details JSONB,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 結果
- ✅ 財務データの整合性保証
- ✅ 複雑な分析クエリの効率的実行
- ✅ 将来の拡張性確保

---

## ADR-004: キャッシュ戦略

### ステータス
決定済み

### コンテキスト
- ROIC計算は計算コストが高い
- 財務データは四半期ごとの更新
- 複数ユーザーの同時アクセス

### 決定
**Redis 7+** をキャッシュレイヤーとして採用

### 理由
1. **高速性**: インメモリストアによるミリ秒単位のレスポンス
2. **柔軟性**: 様々なデータ構造サポート
3. **TTL管理**: 自動的なキャッシュ無効化

### キャッシュ戦略
```python
# キャッシュキー設計
company_roic_key = f"roic:company:{company_id}:year:{fiscal_year}"
company_list_key = f"companies:industry:{industry_code}"
search_result_key = f"search:query:{query_hash}"

# TTL設定
ROIC_CACHE_TTL = 86400  # 24時間
SEARCH_CACHE_TTL = 3600  # 1時間
```

### 結果
- ✅ レスポンスタイム大幅改善
- ✅ データベース負荷軽減
- ⚠️ キャッシュ無効化戦略の実装必要

---

## ADR-005: API設計アプローチ

### ステータス
決定済み

### コンテキスト
- 明確で予測可能なAPIエンドポイント
- 将来的な機能拡張への対応
- フロントエンドの効率的なデータ取得

### 決定
**REST API** で開始、将来的に **GraphQL** 移行を検討

### 理由
1. **REST API（初期実装）**
   - シンプルで理解しやすい
   - 既存ツールとの互換性
   - キャッシュ戦略の実装容易性

2. **GraphQL（将来オプション）**
   - Over-fetchingの解決
   - 複雑なデータ関係の効率的取得

### APIエンドポイント設計
```
GET  /api/v1/companies/search?q={query}
GET  /api/v1/companies/{id}
GET  /api/v1/companies/{id}/financials?years={start}-{end}
GET  /api/v1/companies/{id}/roic?years={start}-{end}
GET  /api/v1/industries/{code}/companies
POST /api/v1/calculations/roic
GET  /api/v1/comparisons/roic?companies={id1,id2,id3}
```

### 結果
- ✅ 段階的な実装が可能
- ✅ 明確なバージョニング
- ✅ RESTful原則に準拠

---

## ADR-006: 開発・デプロイメント戦略

### ステータス
決定済み

### コンテキスト
- 既存のJenkins CI/CD環境
- AWS Tomcat本番環境
- 複数技術スタックの統合

### 決定
**コンテナベース開発** + **段階的本番移行**

### 理由
1. **開発環境の統一**: Docker Composeで全スタック管理
2. **本番との一貫性**: コンテナイメージの再利用
3. **段階的移行**: 既存Tomcat環境を維持しつつ新機能追加

### デプロイメント構成
```yaml
# docker-compose.yml（開発環境）
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
  
  backend-python:
    build: ./backend-python
    ports:
      - "8000:8000"
  
  backend-java:
    build: ./backend-java
    ports:
      - "8080:8080"
  
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: roic_db
  
  redis:
    image: redis:7-alpine
```

### 結果
- ✅ 開発環境の即座の構築
- ✅ 本番環境への段階的移行
- ⚠️ インフラコストの一時的増加

---

## 今後の検討事項

1. **認証・認可システム**: Auth0 vs Keycloak vs 自前実装
2. **モニタリング**: Prometheus + Grafana vs CloudWatch
3. **ログ管理**: ELK Stack vs CloudWatch Logs
4. **CDN**: CloudFront vs Fastly
5. **マイクロサービス化**: タイミングと分割戦略