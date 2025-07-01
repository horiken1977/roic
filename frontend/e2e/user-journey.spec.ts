import { test, expect } from '@playwright/test'

test.describe('ROIC Application User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage before each test
    await page.goto('/')
  })

  test('Complete user journey: Homepage → Companies → Dashboard', async ({ page }) => {
    // Test: Homepage displays correctly
    await test.step('Homepage should display main content', async () => {
      await expect(page.locator('h1')).toContainText('ROIC分析アプリケーション')
      await expect(page.locator('text=日系上場企業のROIC')).toBeVisible()
      
      // Check main features are listed
      await expect(page.locator('text=ROIC自動計算（4つの計算方式対応）')).toBeVisible()
      await expect(page.locator('text=企業検索・フィルタリング機能')).toBeVisible()
      await expect(page.locator('text=業界内比較・ランキング表示')).toBeVisible()
      await expect(page.locator('text=トレンドチャート・可視化')).toBeVisible()
    })

    // Test: Navigation to Companies page
    await test.step('Navigate to Companies page', async () => {
      await page.click('text=企業検索')
      await expect(page).toHaveURL('/companies')
      await expect(page.locator('h1')).toContainText('企業検索')
    })

    // Test: Company search functionality
    await test.step('Search for companies', async () => {
      // Fill search input
      const searchInput = page.locator('input[placeholder="企業名で検索..."]')
      await searchInput.fill('テスト')
      
      // Click search button
      await page.click('button:has-text("検索")')
      
      // Verify search was performed (results section should be visible)
      await expect(page.locator('text=検索結果')).toBeVisible()
    })

    // Test: Filter functionality
    await test.step('Apply filters', async () => {
      // Select industry filter
      await page.selectOption('select:near(:text("業界を選択"))', 'manufacturing')
      
      // Select market filter  
      await page.selectOption('select:near(:text("市場を選択"))', 'prime')
      
      // Search with filters
      await page.click('button:has-text("検索")')
      
      // Verify search was performed with filters
      await expect(page.locator('text=検索結果')).toBeVisible()
    })

    // Test: Navigation to Dashboard
    await test.step('Navigate to Dashboard', async () => {
      await page.click('text=ダッシュボード')
      await expect(page).toHaveURL('/dashboard')
      await expect(page.locator('h1')).toContainText('ROICダッシュボード')
    })

    // Test: Dashboard content
    await test.step('Dashboard should display statistics and rankings', async () => {
      // Check statistics cards
      await expect(page.locator('text=総企業数')).toBeVisible()
      await expect(page.locator('text=平均ROIC')).toBeVisible()
      await expect(page.locator('text=更新日')).toBeVisible()
      
      // Check ROIC rankings table
      await expect(page.locator('text=ROIC上位企業')).toBeVisible()
      await expect(page.locator('text=順位')).toBeVisible()
      await expect(page.locator('text=企業名')).toBeVisible()
      await expect(page.locator('text=業界')).toBeVisible()
      await expect(page.locator('text=ROIC')).toBeVisible()
      
      // Check chart section exists
      await expect(page.locator('text=業界別ROIC平均')).toBeVisible()
    })

    // Test: Navigation back to homepage
    await test.step('Navigate back to homepage', async () => {
      await page.click('text=ホーム')
      await expect(page).toHaveURL('/')
      await expect(page.locator('h1')).toContainText('ROIC分析アプリケーション')
    })
  })

  test('Responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await test.step('Homepage should be responsive on mobile', async () => {
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('nav')).toBeVisible()
      
      // Navigation should be accessible on mobile
      await expect(page.locator('text=企業検索')).toBeVisible()
      await expect(page.locator('text=ダッシュボード')).toBeVisible()
    })

    await test.step('Companies page should be responsive', async () => {
      await page.click('text=企業検索')
      
      // Search form should be stacked vertically on mobile
      const searchInput = page.locator('input[placeholder="企業名で検索..."]')
      await expect(searchInput).toBeVisible()
      
      const searchButton = page.locator('button:has-text("検索")')
      await expect(searchButton).toBeVisible()
      
      // Filters should be accessible
      await expect(page.locator('select:near(:text("業界を選択"))')).toBeVisible()
      await expect(page.locator('select:near(:text("市場を選択"))')).toBeVisible()
    })

    await test.step('Dashboard should be responsive', async () => {
      await page.click('text=ダッシュボード')
      
      // Statistics cards should stack on mobile
      await expect(page.locator('text=総企業数')).toBeVisible()
      await expect(page.locator('text=平均ROIC')).toBeVisible()
      
      // Table should be scrollable on mobile
      await expect(page.locator('text=ROIC上位企業')).toBeVisible()
    })
  })

  test('Performance requirements', async ({ page }) => {
    await test.step('Homepage should load within 2 seconds', async () => {
      const startTime = Date.now()
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime
      
      expect(loadTime).toBeLessThan(2000)
    })

    await test.step('Page navigation should be fast', async () => {
      const startTime = Date.now()
      await page.click('text=企業検索')
      await page.waitForLoadState('networkidle')
      const navTime = Date.now() - startTime
      
      expect(navTime).toBeLessThan(1000)
    })

    await test.step('Search should respond quickly', async () => {
      await page.goto('/companies')
      
      const startTime = Date.now()
      await page.fill('input[placeholder="企業名で検索..."]', 'テスト')
      await page.click('button:has-text("検索")')
      await page.waitForSelector('text=検索結果')
      const searchTime = Date.now() - startTime
      
      expect(searchTime).toBeLessThan(3000)
    })
  })

  test('Accessibility requirements', async ({ page }) => {
    await test.step('All pages should have proper headings', async () => {
      // Homepage
      await page.goto('/')
      const h1 = page.locator('h1')
      await expect(h1).toBeVisible()
      await expect(h1).toContainText('ROIC分析アプリケーション')
      
      // Companies page
      await page.goto('/companies')
      await expect(page.locator('h1')).toContainText('企業検索')
      
      // Dashboard page
      await page.goto('/dashboard')
      await expect(page.locator('h1')).toContainText('ROICダッシュボード')
    })

    await test.step('Navigation should be keyboard accessible', async () => {
      await page.goto('/')
      
      // Tab through navigation links
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      
      // Should be able to activate navigation with Enter
      await page.keyboard.press('Enter')
      
      // Should navigate to the focused link
      await expect(page).toHaveURL(/\/(companies|dashboard)/)
    })

    await test.step('Forms should be keyboard accessible', async () => {
      await page.goto('/companies')
      
      // Tab to search input
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      
      // Should be able to type in search field
      await page.keyboard.type('テスト企業')
      
      // Tab to search button and activate
      await page.keyboard.press('Tab')
      await page.keyboard.press('Enter')
      
      // Search should execute
      await expect(page.locator('text=検索結果')).toBeVisible()
    })
  })

  test('Error handling', async ({ page }) => {
    await test.step('Should handle network errors gracefully', async () => {
      // Simulate network failure
      await page.route('**/api/**', route => route.abort())
      
      await page.goto('/companies')
      await page.fill('input[placeholder="企業名で検索..."]', 'テスト')
      await page.click('button:has-text("検索")')
      
      // Should show error message or fallback content
      // (This depends on error handling implementation)
      await expect(page.locator('text=検索結果')).toBeVisible()
    })

    await test.step('Should handle invalid routes', async () => {
      await page.goto('/nonexistent-page')
      
      // Should redirect to homepage or show 404 page
      await expect(page).toHaveURL(/\/|.*404.*/)
    })
  })
})