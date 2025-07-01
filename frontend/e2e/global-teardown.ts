import { FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test global teardown...')

  const backendURL = process.env.E2E_BACKEND_URL || 'http://localhost:3001'

  // Clean up test data
  try {
    console.log('🗑️ Cleaning up test data...')
    await cleanupTestData(backendURL)
    console.log('✅ Test data cleaned up successfully')
  } catch (error) {
    console.warn('⚠️ Failed to cleanup test data:', error)
  }

  console.log('🎉 Global teardown completed')
}

async function cleanupTestData(backendURL: string) {
  // Clean up test companies (those with ticker symbols starting with 8 or 9)
  try {
    const testTickers = ['9999', '8888']
    
    for (const ticker of testTickers) {
      const response = await fetch(`${backendURL}/api/companies/ticker/${ticker}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        console.log(`✅ Cleaned up test company: ${ticker}`)
      }
    }
  } catch (error) {
    // Ignore cleanup errors
    console.log('Cleanup completed with some warnings (this is normal)')
  }
}

export default globalTeardown