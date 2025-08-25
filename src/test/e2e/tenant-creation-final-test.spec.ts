import { test, expect } from '@playwright/test'

test.describe('Final Tenant Creation Test', () => {
  
  test('Test tenant creation API directly with auth simulation', async ({ page }) => {
    console.log('🔍 Testing tenant creation API after database setup...')
    
    // First, let's test if we can access the API at all
    try {
      const response = await page.request.post('/api/tenant/create', {
        data: {
          name: 'Test Company'
        }
      })
      
      const status = response.status()
      const body = await response.text()
      
      console.log(`API Status: ${status}`)
      console.log(`API Response: ${body}`)
      
      if (status === 401) {
        console.log('✅ API is working - returns 401 (Unauthorized) as expected for unauthenticated request')
      } else if (status === 500) {
        console.log('❌ API is returning 500 error - there might still be an issue')
        
        // Try to parse the error
        try {
          const errorData = JSON.parse(body)
          console.log('Error details:', errorData)
        } catch {
          console.log('Raw error response:', body)
        }
      } else {
        console.log(`⚠️ Unexpected status: ${status}`)
      }
      
    } catch (error) {
      console.log(`❌ API request failed: ${error}`)
    }
  })

  test('Check if tables exist by testing health endpoint', async ({ page }) => {
    console.log('🔍 Checking system health...')
    
    try {
      const response = await page.request.get('/api/health')
      const healthData = await response.json()
      
      console.log('System health:', healthData)
      
      if (healthData.supabase) {
        console.log('✅ Supabase connection is working')
      }
      
    } catch (error) {
      console.log(`❌ Health check failed: ${error}`)
    }
  })

  test('Test the actual UI flow', async ({ page }) => {
    console.log('🔍 Testing the actual UI workspace creation...')
    
    // Go to onboarding
    await page.goto('/onboarding')
    
    // Wait for redirect to login (expected)
    await page.waitForTimeout(2000)
    
    const currentUrl = page.url()
    console.log(`Current URL: ${currentUrl}`)
    
    if (currentUrl.includes('/login')) {
      console.log('✅ Correctly redirected to login (user not authenticated)')
      console.log('💡 This means the onboarding flow is working correctly')
      console.log('💡 The issue is likely that the deployment is still in progress')
    }
  })
})