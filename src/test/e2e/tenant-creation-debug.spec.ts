import { test, expect } from '@playwright/test'

test.describe('Tenant Creation Debug', () => {
  
  test('Debug tenant creation API', async ({ page }) => {
    console.log('🔍 Testing tenant creation API directly...')
    
    // Test the tenant creation endpoint
    try {
      const response = await page.request.post('/api/tenant/create', {
        data: {
          name: 'Test Company'
        }
      })
      
      const status = response.status()
      const body = await response.text()
      
      console.log(`Tenant creation API status: ${status}`)
      console.log(`Response body: ${body}`)
      
      if (status !== 201 && status !== 401) {
        console.log('❌ Unexpected status code')
      }
      
    } catch (error) {
      console.log(`❌ API request failed: ${error}`)
    }
  })

  test('Check database schema requirements', async ({ page }) => {
    console.log('🔍 Checking if required tables exist...')
    
    // Test if we can access the health endpoint to see database status
    try {
      const response = await page.request.get('/api/health')
      const healthData = await response.json()
      
      console.log('Health check data:', healthData)
      
      if (healthData.supabase) {
        console.log('✅ Supabase connection configured')
      } else {
        console.log('❌ Supabase connection issue')
      }
      
    } catch (error) {
      console.log(`❌ Health check failed: ${error}`)
    }
  })

  test('Test tenant creation with authentication', async ({ page }) => {
    console.log('🔍 Testing tenant creation flow with mock auth...')
    
    // Go to onboarding page
    await page.goto('/onboarding')
    
    // Check if we get redirected to login (expected for unauthenticated user)
    await page.waitForTimeout(2000)
    const currentUrl = page.url()
    
    if (currentUrl.includes('/login')) {
      console.log('✅ Correctly redirected to login when not authenticated')
    } else {
      console.log('⚠️ Not redirected to login - might be an issue')
      console.log(`Current URL: ${currentUrl}`)
    }
  })
})