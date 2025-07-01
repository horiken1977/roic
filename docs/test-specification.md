# ROIC分析アプリケーション テスト仕様書

## 📋 文書情報

| 項目 | 内容 |
|------|------|
| 文書名 | ROIC分析アプリケーション テスト仕様書 |
| バージョン | 1.0 |
| 作成日 | 2025年7月1日 |
| 更新日 | 2025年7月1日 |
| 関連文書 | テスト計画書 v1.0 |

## 🎯 テスト仕様概要

このドキュメントは、ROIC分析アプリケーションの具体的なテストケース、テストデータ、期待結果を定義します。

## 🧪 フロントエンド テスト仕様

### 1. ホームページ (/) テスト

#### テストケース: HP-001 基本表示テスト
```typescript
describe('Homepage Display Tests', () => {
  test('HP-001: Should display main heading and description', async () => {
    // Given: ユーザーがホームページにアクセス
    render(<HomePage />)
    
    // When: ページが読み込まれる
    
    // Then: メインタイトルが表示される
    expect(screen.getByRole('heading', { name: /ROIC分析アプリケーション/i })).toBeInTheDocument()
    
    // And: 説明文が表示される
    expect(screen.getByText(/日系上場企業のROIC/i)).toBeInTheDocument()
    
    // And: 主要機能リストが表示される
    expect(screen.getByText('ROIC自動計算（4つの計算方式対応）')).toBeInTheDocument()
    expect(screen.getByText('企業検索・フィルタリング機能')).toBeInTheDocument()
    expect(screen.getByText('業界内比較・ランキング表示')).toBeInTheDocument()
    expect(screen.getByText('トレンドチャート・可視化')).toBeInTheDocument()
  })
})
```

#### テストケース: HP-002 ナビゲーションテスト
```typescript
test('HP-002: Should navigate to correct pages via navigation links', async () => {
  // Given: ホームページが表示されている
  render(<RootLayout><HomePage /></RootLayout>)
  
  // When: 企業検索リンクをクリック
  const companiesLink = screen.getByRole('link', { name: /企業検索/i })
  await userEvent.click(companiesLink)
  
  // Then: 企業検索ページに遷移する
  expect(window.location.pathname).toBe('/companies')
})
```

### 2. 企業検索ページ (/companies) テスト

#### テストケース: CS-001 検索フォーム基本機能
```typescript
describe('Company Search Form Tests', () => {
  test('CS-001: Should accept search input and trigger search', async () => {
    // Given: 企業検索ページが表示されている
    render(<CompaniesPage />)
    
    // When: 検索フィールドに企業名を入力
    const searchInput = screen.getByPlaceholderText('企業名で検索...')
    await userEvent.type(searchInput, 'トヨタ自動車')
    
    // Then: 入力値が正しく表示される
    expect(searchInput).toHaveValue('トヨタ自動車')
    
    // When: 検索ボタンをクリック
    const searchButton = screen.getByRole('button', { name: '検索' })
    await userEvent.click(searchButton)
    
    // Then: 検索APIが呼び出される (モック確認)
    expect(mockSearchAPI).toHaveBeenCalledWith({
      name: 'トヨタ自動車',
      page: 1,
      limit: 20
    })
  })
})
```

#### テストケース: CS-002 フィルタリング機能
```typescript
test('CS-002: Should filter companies by industry and market', async () => {
  // Given: 企業検索ページが表示されている
  render(<CompaniesPage />)
  
  // When: 業界フィルターを選択
  const industrySelect = screen.getByDisplayValue('業界を選択')
  await userEvent.selectOptions(industrySelect, 'manufacturing')
  
  // And: 市場フィルターを選択
  const marketSelect = screen.getByDisplayValue('市場を選択')
  await userEvent.selectOptions(marketSelect, 'prime')
  
  // And: 検索を実行
  const searchButton = screen.getByRole('button', { name: '検索' })
  await userEvent.click(searchButton)
  
  // Then: フィルター条件付きで検索APIが呼び出される
  expect(mockSearchAPI).toHaveBeenCalledWith({
    name: '',
    industry: 'manufacturing',
    market: 'prime',
    page: 1,
    limit: 20
  })
})
```

#### テストケース: CS-003 検索結果表示
```typescript
test('CS-003: Should display search results correctly', async () => {
  // Given: 検索結果のモックデータが設定されている
  const mockResults = [
    {
      id: '1',
      name: 'トヨタ自動車株式会社',
      ticker_symbol: '7203',
      industry: '輸送用機器',
      market: 'プライム市場'
    },
    {
      id: '2', 
      name: '本田技研工業株式会社',
      ticker_symbol: '7267',
      industry: '輸送用機器',
      market: 'プライム市場'
    }
  ]
  mockSearchAPI.mockResolvedValueOnce({ data: mockResults })
  
  // When: 検索を実行
  render(<CompaniesPage />)
  const searchButton = screen.getByRole('button', { name: '検索' })
  await userEvent.click(searchButton)
  
  // Then: 検索結果が表示される
  await waitFor(() => {
    expect(screen.getByText('トヨタ自動車株式会社')).toBeInTheDocument()
    expect(screen.getByText('本田技研工業株式会社')).toBeInTheDocument()
    expect(screen.getByText('7203')).toBeInTheDocument()
    expect(screen.getByText('7267')).toBeInTheDocument()
  })
})
```

### 3. ROICダッシュボード (/dashboard) テスト

#### テストケース: DB-001 統計情報表示
```typescript
describe('ROIC Dashboard Tests', () => {
  test('DB-001: Should display statistics cards with correct data', async () => {
    // Given: ダッシュボードデータのモックが設定されている
    const mockStats = {
      totalCompanies: 3847,
      averageROIC: 8.5,
      lastUpdated: '2025/07/01'
    }
    mockDashboardAPI.mockResolvedValueOnce({ data: mockStats })
    
    // When: ダッシュボードページが読み込まれる
    render(<DashboardPage />)
    
    // Then: 統計情報が正しく表示される
    await waitFor(() => {
      expect(screen.getByText('3,847')).toBeInTheDocument()
      expect(screen.getByText('8.5%')).toBeInTheDocument()
      expect(screen.getByText('2025/07/01')).toBeInTheDocument()
    })
  })
})
```

#### テストケース: DB-002 ROIC上位企業テーブル
```typescript
test('DB-002: Should display top ROIC companies table', async () => {
  // Given: 上位企業データのモックが設定されている
  const mockTopCompanies = [
    { rank: 1, name: 'サンプル企業A', industry: 'テクノロジー', roic: 25.3 },
    { rank: 2, name: 'サンプル企業B', industry: 'ヘルスケア', roic: 22.1 },
    { rank: 3, name: 'サンプル企業C', industry: '消費財', roic: 19.8 }
  ]
  mockTopCompaniesAPI.mockResolvedValueOnce({ data: mockTopCompanies })
  
  // When: ダッシュボードページが読み込まれる
  render(<DashboardPage />)
  
  // Then: テーブルヘッダーが表示される
  expect(screen.getByText('順位')).toBeInTheDocument()
  expect(screen.getByText('企業名')).toBeInTheDocument()
  expect(screen.getByText('業界')).toBeInTheDocument()
  expect(screen.getByText('ROIC')).toBeInTheDocument()
  
  // And: 企業データが正しく表示される
  await waitFor(() => {
    expect(screen.getByText('サンプル企業A')).toBeInTheDocument()
    expect(screen.getByText('25.3%')).toBeInTheDocument()
    expect(screen.getByText('テクノロジー')).toBeInTheDocument()
  })
})
```

## 🔧 バックエンド API テスト仕様

### 1. 企業検索API テスト

#### テストケース: API-001 企業一覧取得
```typescript
describe('Companies API Tests', () => {
  test('API-001: GET /api/companies should return companies list', async () => {
    // Given: データベースに企業データが存在する
    await seedDatabase([
      { name: 'トヨタ自動車', ticker_symbol: '7203', industry: '輸送用機器' },
      { name: 'ソニーグループ', ticker_symbol: '6758', industry: '電気機器' }
    ])
    
    // When: 企業一覧APIを呼び出す
    const response = await request(app)
      .get('/api/companies')
      .expect(200)
    
    // Then: 正しい形式でデータが返される
    expect(response.body).toMatchObject({
      success: true,
      data: expect.arrayContaining([
        expect.objectContaining({
          name: 'トヨタ自動車',
          ticker_symbol: '7203',
          industry: '輸送用機器'
        })
      ])
    })
  })
})
```

#### テストケース: API-002 企業検索（クエリパラメータ）
```typescript
test('API-002: GET /api/companies with search parameters', async () => {
  // Given: 複数の企業データが存在する
  await seedDatabase([
    { name: 'トヨタ自動車', industry: '輸送用機器', market: 'prime' },
    { name: 'ソニーグループ', industry: '電気機器', market: 'prime' },
    { name: 'スタートアップA', industry: 'テクノロジー', market: 'growth' }
  ])
  
  // When: 業界フィルターで検索
  const response = await request(app)
    .get('/api/companies')
    .query({ industry: '輸送用機器', market: 'prime' })
    .expect(200)
  
  // Then: フィルター条件に合致する企業のみ返される
  expect(response.body.data).toHaveLength(1)
  expect(response.body.data[0].name).toBe('トヨタ自動車')
})
```

### 2. ROIC計算API テスト

#### テストケース: API-003 ROIC計算
```typescript
describe('ROIC Calculation API Tests', () => {
  test('API-003: POST /api/roic/calculate/:id should calculate ROIC correctly', async () => {
    // Given: 企業の財務データが存在する
    const companyId = 'company-123'
    await seedFinancialData(companyId, {
      fiscal_year: 2023,
      revenue: 100000000000, // 10兆円
      operating_income: 5000000000, // 5000億円
      total_assets: 50000000000, // 5兆円
      total_debt: 20000000000 // 2兆円
    })
    
    // When: ROIC計算APIを呼び出す
    const response = await request(app)
      .post(`/api/roic/calculate/${companyId}`)
      .send({ 
        fiscal_year: 2023,
        calculation_method: 'standard'
      })
      .expect(200)
    
    // Then: 正しくROICが計算される
    expect(response.body).toMatchObject({
      success: true,
      data: expect.objectContaining({
        company_id: companyId,
        fiscal_year: 2023,
        roic_percentage: expect.any(Number),
        calculation_method: 'standard'
      })
    })
    
    // And: ROIC値が妥当な範囲内である
    expect(response.body.data.roic_percentage).toBeGreaterThan(0)
    expect(response.body.data.roic_percentage).toBeLessThan(100)
  })
})
```

#### テストケース: API-004 計算方式別ROIC
```typescript
test('API-004: Different calculation methods should yield different results', async () => {
  const companyId = 'company-123'
  
  // When: 異なる計算方式でROICを計算
  const standardResponse = await request(app)
    .post(`/api/roic/calculate/${companyId}`)
    .send({ calculation_method: 'standard' })
  
  const adjustedResponse = await request(app)
    .post(`/api/roic/calculate/${companyId}`)
    .send({ calculation_method: 'adjusted' })
  
  // Then: 異なる結果が返される
  expect(standardResponse.body.data.roic_percentage)
    .not.toBe(adjustedResponse.body.data.roic_percentage)
})
```

## 🎭 E2Eテスト仕様

### シナリオ: E2E-001 完全なユーザージャーニー
```typescript
describe('Complete User Journey E2E Tests', () => {
  test('E2E-001: User should be able to search companies and view ROIC data', async ({ page }) => {
    // Given: アプリケーションが正常に起動している
    await page.goto('http://localhost:3000')
    
    // When: ホームページからダッシュボードに移動
    await page.click('text=ダッシュボード')
    
    // Then: ダッシュボードが表示される
    await expect(page.locator('h1')).toContainText('ROICダッシュボード')
    
    // When: 企業検索ページに移動
    await page.click('text=企業検索')
    
    // Then: 検索ページが表示される
    await expect(page.locator('h1')).toContainText('企業検索')
    
    // When: 企業名を検索
    await page.fill('input[placeholder="企業名で検索..."]', 'トヨタ')
    await page.click('button:has-text("検索")')
    
    // Then: 検索結果が表示される
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
    
    // When: 企業詳細をクリック
    await page.click('text=トヨタ自動車')
    
    // Then: 企業詳細ページが表示される
    await expect(page.locator('[data-testid="roic-value"]')).toBeVisible()
  })
})
```

### シナリオ: E2E-002 パフォーマンステスト
```typescript
test('E2E-002: Application should load within performance thresholds', async ({ page }) => {
  // Given: パフォーマンス測定を開始
  const startTime = Date.now()
  
  // When: ホームページにアクセス
  await page.goto('http://localhost:3000')
  
  // Then: 2秒以内に読み込みが完了する
  await expect(page.locator('h1')).toBeVisible()
  const loadTime = Date.now() - startTime
  expect(loadTime).toBeLessThan(2000)
  
  // When: 企業検索を実行
  await page.goto('http://localhost:3000/companies')
  await page.fill('input[placeholder="企業名で検索..."]', 'ト')
  
  const searchStartTime = Date.now()
  await page.click('button:has-text("検索")')
  
  // Then: 検索結果が1秒以内に表示される
  await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
  const searchTime = Date.now() - searchStartTime
  expect(searchTime).toBeLessThan(1000)
})
```

## 📊 パフォーマンステスト仕様

### 負荷テストシナリオ: PERF-001
```yaml
# Artillery.io設定
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10  # 10 users per second
    - duration: 120
      arrivalRate: 50  # 50 users per second
    - duration: 60
      arrivalRate: 100 # 100 users per second

scenarios:
  - name: "Homepage Load Test"
    weight: 30
    flow:
      - get:
          url: "/"
          
  - name: "Company Search Test"
    weight: 50
    flow:
      - get:
          url: "/companies"
      - post:
          url: "/api/companies/search"
          json:
            name: "{{ $randomString() }}"
            
  - name: "ROIC Dashboard Test"
    weight: 20
    flow:
      - get:
          url: "/dashboard"
      - get:
          url: "/api/roic/rankings"
```

### パフォーマンス期待値
```typescript
describe('Performance Expectations', () => {
  test('PERF-001: Response time should meet SLA requirements', () => {
    const expectations = {
      homepage: { maxResponseTime: 2000, target: 1500 },
      search: { maxResponseTime: 1000, target: 500 },
      roicCalculation: { maxResponseTime: 3000, target: 2000 },
      dashboard: { maxResponseTime: 2000, target: 1000 }
    }
    
    // テスト実行後に上記期待値と実測値を比較
  })
})
```

## 🔒 セキュリティテスト仕様

### セキュリティテストケース: SEC-001
```typescript
describe('Security Tests', () => {
  test('SEC-001: Should prevent SQL injection attacks', async () => {
    // Given: SQLインジェクション攻撃パターン
    const maliciousInputs = [
      "'; DROP TABLE companies; --",
      "1' OR '1'='1",
      "admin'/*",
      "' UNION SELECT * FROM users --"
    ]
    
    // When: 各攻撃パターンで検索API呼び出し
    for (const input of maliciousInputs) {
      const response = await request(app)
        .get('/api/companies/search')
        .query({ name: input })
      
      // Then: 攻撃が成功せず、通常のレスポンスが返される
      expect(response.status).toBeLessThan(500)
      expect(response.body).not.toContainEqual(
        expect.objectContaining({ 
          error: expect.stringContaining('SQL') 
        })
      )
    }
  })
  
  test('SEC-002: Should validate input parameters', async () => {
    // When: 無効なパラメータでAPI呼び出し
    const response = await request(app)
      .get('/api/companies')
      .query({ 
        page: -1,
        limit: 10000,
        industry: '<script>alert("xss")</script>'
      })
    
    // Then: 適切なバリデーションエラーが返される
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Validation error')
  })
})
```

## 🔧 テストデータ仕様

### マスターテストデータ
```typescript
export const testCompanies = [
  {
    id: 'toyota-7203',
    name: 'トヨタ自動車株式会社',
    ticker_symbol: '7203',
    industry: '輸送用機器',
    market: 'プライム市場',
    founded_year: 1937,
    employee_count: 366283,
    website: 'https://toyota.jp',
    is_active: true
  },
  {
    id: 'sony-6758',
    name: 'ソニーグループ株式会社',
    ticker_symbol: '6758',
    industry: '電気機器',
    market: 'プライム市場',
    founded_year: 1946,
    employee_count: 109700,
    website: 'https://sony.com',
    is_active: true
  }
]

export const testFinancialData = [
  {
    company_id: 'toyota-7203',
    fiscal_year: 2023,
    fiscal_period: 'annual',
    revenue: 31174600000000, // 31.17兆円
    operating_income: 3085200000000, // 3.08兆円
    net_income: 2449800000000, // 2.44兆円
    total_assets: 36552300000000, // 36.55兆円
    total_equity: 16004900000000, // 16.00兆円
    total_debt: 15555100000000, // 15.55兆円
    filing_date: '2023-06-14'
  }
]
```

### 動的テストデータ生成
```typescript
export class TestDataFactory {
  static generateCompany(overrides = {}) {
    return {
      id: faker.datatype.uuid(),
      name: faker.company.name() + '株式会社',
      ticker_symbol: faker.datatype.number({ min: 1000, max: 9999 }).toString(),
      industry: faker.helpers.arrayElement([
        '輸送用機器', '電気機器', '機械', '化学', '食料品'
      ]),
      market: faker.helpers.arrayElement([
        'プライム市場', 'スタンダード市場', 'グロース市場'
      ]),
      founded_year: faker.datatype.number({ min: 1950, max: 2020 }),
      employee_count: faker.datatype.number({ min: 100, max: 500000 }),
      is_active: true,
      ...overrides
    }
  }
  
  static generateFinancialData(companyId, overrides = {}) {
    return {
      company_id: companyId,
      fiscal_year: 2023,
      fiscal_period: 'annual',
      revenue: faker.datatype.number({ min: 1000000000, max: 10000000000000 }),
      operating_income: faker.datatype.number({ min: 100000000, max: 1000000000000 }),
      net_income: faker.datatype.number({ min: 50000000, max: 500000000000 }),
      total_assets: faker.datatype.number({ min: 1000000000, max: 50000000000000 }),
      total_equity: faker.datatype.number({ min: 500000000, max: 20000000000000 }),
      total_debt: faker.datatype.number({ min: 100000000, max: 20000000000000 }),
      filing_date: faker.date.recent().toISOString().split('T')[0],
      ...overrides
    }
  }
}
```

## 📈 テスト結果レポート仕様

### 自動生成レポート形式
```typescript
interface TestReport {
  testSuite: string
  executionDate: string
  environment: 'development' | 'staging' | 'production'
  summary: {
    totalTests: number
    passed: number
    failed: number
    skipped: number
    duration: number
    coverage: {
      statements: number
      branches: number
      functions: number
      lines: number
    }
  }
  results: TestResult[]
  performance: {
    averageResponseTime: number
    p95ResponseTime: number
    throughput: number
    errorRate: number
  }
  security: {
    vulnerabilities: SecurityIssue[]
    score: number
  }
}
```

---

## 📞 連絡先・更新履歴

| バージョン | 更新日 | 更新内容 | 更新者 |
|------------|--------|----------|--------|
| 1.0 | 2025/7/1 | 初版作成 | 開発チーム |

**※ この仕様書は機能追加に応じて自動更新されます**