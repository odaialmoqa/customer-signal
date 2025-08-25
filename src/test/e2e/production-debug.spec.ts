import { test, expect } from '@playwright/test'

test.describe('Production Debug', () => {
  
  test('Debug production tenant creation with real network calls', async ({ page }) => {
    console.log('🔍 Testing production tenant creation API...')
    
    // Test the production API directly
    const productionUrl = 'https://customer-signal-3jjnnrfc2-odais-projects-248ff8ad.vercel.app'
    
    try {
      const response = await page.request.post(`${productionUrl}/api/tenant/create`, {
        data: {
          name: 'Test Company'
        }
      })
      
      const status = response.status()
      const body = await response.text()
      
      console.log(`Production API Status: ${status}`)
      console.log(`Production API Response: ${body}`)
      
      if (status === 401) {
        console.log('✅ Production API is working - returns 401 (Unauthorized) as expected')
      } else if (status === 500) {
        console.log('❌ Production API still has issues')
        
        // Try to parse the error
        try {
          const errorData = JSON.parse(body)
          console.log('Production error details:', errorData)
        } catch {
          console.log('Raw production error:', body)
        }
      } else {
        console.log(`⚠️ Unexpected production status: ${status}`)
      }
      
    } catch (error) {
      console.log(`❌ Production API request failed: ${error}`)
    }
  })

  test('Check production health endpoint', async ({ page }) => {
    console.log('🔍 Checking production health...')
    
    const productionUrl = 'https://customer-signal-3jjnnrfc2-odais-projects-248ff8ad.vercel.app'
    
    try {
      const response = await page.request.get(`${productionUrl}/api/health`)
      const healthData = await response.json()
      
      console.log('Production health:', healthData)
      
      if (healthData.supabase) {
        console.log('✅ Production Supabase connection is working')
      }
      
      if (healthData.environment) {
        console.log(`Environment: ${healthData.environment}`)
      }
      
    } catch (error) {
      console.log(`❌ Production health check failed: ${error}`)
    }
  })

  test('Test production deployment timestamp', async ({ page }) => {
    console.log('🔍 Checking if production deployment is recent...')
    
    const productionUrl = 'https://customer-signal-3jjnnrfc2-odais-projects-248ff8ad.vercel.app'
    
    try {
      const response = await page.request.get(`${productionUrl}/api/health`)
      const healthData = await response.json()
      
      if (healthData.timestamp) {
        const deployTime = new Date(healthData.timestamp)
        const now = new Date()
        const timeDiff = (now.getTime() - deployTime.getTime()) / 1000 / 60 // minutes
        
        console.log(`Deployment timestamp: ${healthData.timestamp}`)
        console.log(`Time since deployment: ${timeDiff.toFixed(1)} minutes ago`)
        
        if (timeDiff < 10) {
          console.log('✅ Recent deployment detected')
        } else {
          console.log('⚠️ Deployment might be stale')
        }
      }
      
    } catch (error) {
      console.log(`❌ Could not check deployment timestamp: ${error}`)
    }
  })
})