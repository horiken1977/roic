# ROIC分析アプリケーション 最終技術スタック決定書

## 1. フロントエンド技術スタック

### React vs Next.js
**✅ Next.js推奨 (決定)**

**理由:**
- **SSR（サーバーサイドレンダリング）**: 初期表示速度とSEO対応が容易
- **企業利用**: 将来の拡張性とパフォーマンス面で有利
- **React単体の課題**: SPAのみでSEOや初期表示速度に限界

### TypeScript採用
**✅ TypeScript推奨 (決定)**

**理由:**
- **型安全性**: バグ低減・品質向上に寄与
- **複数人開発**: チーム開発や保守性が大幅向上
- **企業利用**: 長期的なメンテナンス性を確保

### 状態管理
**✅ Zustand推奨 (決定)**

**理由:**
- **シンプル**: 学習コスト低く、中規模アプリに最適
- **複数人開発**: 状態管理の明確化でコード品質向上
- **Redux Toolkit**: 大規模化時の移行パスも確保

**実装例:**
```typescript
// stores/useCompanyStore.ts
import { create } from 'zustand'

interface CompanyState {
  selectedCompany: Company | null
  competitors: Company[]
  setSelectedCompany: (company: Company) => void
  addCompetitor: (company: Company) => void
}

export const useCompanyStore = create<CompanyState>((set) => ({
  selectedCompany: null,
  competitors: [],
  setSelectedCompany: (company) => set({ selectedCompany: company }),
  addCompetitor: (company) => set((state) => ({
    competitors: [...state.competitors, company]
  }))
}))
```

## 2. バックエンド技術スタック

### Node.js vs Python FastAPI
**✅ Node.js推奨 (決定)**

**理由:**
- **JavaScript/TypeScript統一**: フロントエンドと統一でき、開発効率が高い
- **エコシステム豊富**: リアルタイム通信やAPI開発に強い
- **既存スキル活用**: JavaScriptの学習コストが相対的に低い
- **企業向け堅牢性**: Express.js/Fastifyによる安定した実績

**補助技術:**
- **Spring Boot**: 既存のJavaスキルやTomcat環境を活かす場合
- **Python FastAPI**: データ分析やAI連携が増加した場合の選択肢

**アーキテクチャ構成:**
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Next.js   │────▶│    Nginx     │────▶│   Node.js   │
│  Frontend   │     │    (8080)    │     │  Express.js │
└─────────────┘     └──────────────┘     │   (3001)    │
                            │             └─────────────┘
                            │                     │
                    ┌──────────────┐     ┌─────────────┐
                    │ Spring Boot  │◀────│ PostgreSQL  │
                    │  (Tomcat)    │     │    (5432)   │
                    │   (8080)     │     └─────────────┘
                    └──────────────┘
```

## 3. データベース選定

### PostgreSQL vs MySQL vs MongoDB
**✅ PostgreSQL推奨 (決定)**

**理由:**
- **財務データ適合性**: 構造化データのリレーショナル処理に強い
- **ACIDトランザクション**: データ整合性の確保
- **拡張性**: 分析系機能が豊富（Window関数、CTE等）
- **企業実績**: エンタープライズ環境での安定した運用実績

**スキーマ設計:**
```sql
-- 企業マスタテーブル
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    ticker_symbol VARCHAR(10) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    industry_code VARCHAR(10),
    market_cap DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 財務データテーブル
CREATE TABLE financial_statements (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    fiscal_year INTEGER NOT NULL,
    quarter INTEGER CHECK (quarter IN (1,2,3,4)),
    revenue DECIMAL(15,2) NOT NULL,
    operating_profit DECIMAL(15,2),
    net_profit DECIMAL(15,2),
    total_assets DECIMAL(15,2),
    shareholders_equity DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, fiscal_year, quarter)
);

-- ROIC計算結果キャッシュ
CREATE TABLE roic_calculations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    fiscal_year INTEGER NOT NULL,
    roic_percentage DECIMAL(8,4) NOT NULL,
    capital_turnover DECIMAL(8,4),
    operating_margin DECIMAL(8,4),
    calculation_metadata JSONB,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 4. アーキテクチャパターン

### モノリス vs マイクロサービス
**✅ 初期はモノリス推奨 (決定)**

**理由:**
- **開発効率**: 初期開発コスト・運用負荷が低い
- **企業利用**: 安定性と保守性を重視
- **将来対応**: 設計時に分割しやすい構造を意識して将来のマイクロサービス化に備える

**モジュール分割設計:**
```
src/
├── modules/
│   ├── companies/          # 企業管理モジュール
│   ├── financials/         # 財務データモジュール
│   ├── calculations/       # ROIC計算モジュール
│   ├── comparisons/        # 企業比較モジュール
│   └── reports/           # レポート生成モジュール
├── shared/
│   ├── database/          # DB接続・トランザクション
│   ├── cache/             # Redis操作
│   ├── auth/              # 認証・認可
│   └── utils/             # 共通ユーティリティ
└── api/
    └── routes/            # APIルーティング
```

## 5. セキュリティ・同時利用・セッション管理

### セッション管理
**✅ JWT + Redis セッション (決定)**

**理由:**
- **スケーラビリティ**: ステートレスなJWTで水平拡張に対応
- **セキュリティ**: Redis で Refresh Token 管理
- **企業標準**: 多くの企業システムで採用実績

**実装方針:**
```typescript
// JWT + Redis セッション管理
interface TokenPair {
  accessToken: string;   // 15分有効期限
  refreshToken: string;  // 7日有効期限（Redis保存）
}

// セキュリティヘッダー設定
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));
```

### HTTPS・認証・認可
**✅ OAuth2 + OpenID Connect (決定)**

**構成要素:**
- **HTTPS必須**: 全通信の暗号化
- **OAuth2**: 標準プロトコルによる認証
- **OpenID Connect**: ユーザー情報の標準化
- **RBAC**: ロールベースアクセス制御

## 6. データ保存・分析

### 分析基盤
**✅ RDB（PostgreSQL）+ BIツール連携 (決定)**

**理由:**
- **データ正規化**: 集計・再利用が容易
- **分析機能**: PostgreSQLの高度な分析関数活用
- **将来拡張**: ElasticsearchやBigQuery等への移行パスも確保

**データ分析API設計:**
```typescript
// 分析API設計例
GET /api/v1/analytics/roic/trends?companies=1,2,3&years=2020-2023
GET /api/v1/analytics/industry/{code}/averages?metric=roic
GET /api/v1/analytics/comparisons/export?format=excel&companies=1,2,3
```

## 7. 複数人・同時利用対応

### スケーラビリティ戦略
**✅ Webアプリ + 接続プール + キャッシュ (決定)**

**構成:**
- **Node.js クラスター**: マルチプロセスによる並行処理
- **PostgreSQL 接続プール**: 効率的なDB接続管理
- **Redis キャッシュ**: 高頻度アクセスデータの高速化
- **セッション共有**: Redis によるセッション情報共有

**パフォーマンス設定:**
```typescript
// PostgreSQL接続プール設定
const pool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  database: 'roic_db',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,          // 最大接続数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis キャッシュ戦略
const cacheConfig = {
  roicCalculations: { ttl: 86400 },    // 24時間
  companySearch: { ttl: 3600 },        // 1時間
  financialData: { ttl: 21600 },       // 6時間
};
```

## まとめ表

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

## 決定の根拠

この技術スタック選定は以下の要因を重視しています：

1. **企業利用の堅牢性**: 長期運用に耐える安定したフレームワーク
2. **複数人・同時利用**: チーム開発とマルチユーザー対応
3. **データ分析・再利用性**: 財務データの効率的な処理と活用
4. **将来の拡張性**: スケールアップとマイクロサービス化への対応

この構成により、ROIC分析アプリケーションの要件を満たしつつ、企業環境での安定運用を実現できます。