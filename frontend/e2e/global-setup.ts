import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...')

  // Backend health check
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000'
  const backendURL = process.env.E2E_BACKEND_URL || 'http://localhost:3001'

  console.log(`🔍 Checking backend health at: ${backendURL}`)
  
  try {
    const response = await fetch(`${backendURL}/api/health`)
    if (!response.ok) {
      console.warn('⚠️ Backend health check failed, tests may fail')
    } else {
      console.log('✅ Backend is healthy')
    }
  } catch (error) {
    console.warn('⚠️ Backend not accessible, some tests may fail:', error)
  }

  // Seed test data if needed
  try {
    console.log('🌱 Seeding test data...')
    await seedTestData(backendURL)
    console.log('✅ Test data seeded successfully')
  } catch (error) {
    console.warn('⚠️ Failed to seed test data:', error)
  }

  // Warm up the application
  console.log('🌡️ Warming up the application...')
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  try {
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')
    console.log('✅ Application warmed up successfully')
  } catch (error) {
    console.warn('⚠️ Failed to warm up application:', error)
  } finally {
    await browser.close()
  }

  console.log('🎉 Global setup completed')
}

async function seedTestData(backendURL: string) {
  // Sample companies for testing
  const testCompanies = [
    {
      name: 'テスト自動車株式会社',
      ticker_symbol: '9999',
      industry: '輸送用機器',
      market: 'プライム市場',
      is_active: true
    },
    {
      name: 'サンプル電機株式会社',
      ticker_symbol: '8888',
      industry: '電気機器',
      market: 'スタンダード市場',
      is_active: true
    }
  ]

  for (const company of testCompanies) {
    try {
      const response = await fetch(`${backendURL}/api/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(company)
      })
      
      if (!response.ok) {
        console.log(`Company ${company.name} might already exist or backend not ready`)
      }
    } catch (error) {
      // Ignore seeding errors in global setup
      console.log(`Failed to seed company ${company.name}, continuing...`)
    }
  }
}

export default globalSetup