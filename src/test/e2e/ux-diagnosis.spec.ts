import { test, expect } from '@playwright/test'

const PRODUCTION_URL = 'https://customer-signal-8pevnactz-odais-projects-248ff8ad.vercel.app'

test.describe('UX Diagnosis - Core Issues', () => {
  test('Critical Issue: Vercel SSO Redirect Problem', async ({ page }) => {
    console.log('🔍 Testing the main landing page...')
    
    await page.goto(PRODUCTION_URL)
    await page.waitForTimeout(3000)
    
    const currentUrl = page.url()
    const title = await page.title()
    
    console.log('Current URL:', currentUrl)
    console.log('Page Title:', title)
    
    // Take screenshot for analysis
    await page.screenshot({ path: 'test-results/landing-diagnosis.png', fullPage: true })
    
    if (currentUrl.includes('vercel.com')) {
      console.log('❌ CRITICAL ISSUE: App redirects to Vercel SSO instead of showing landing page')
      console.log('This means users cannot access the application at all!')
    } else {
      console.log('✅ Landing page loads correctly')
    }
  })

  test('Authentication System Analysis', async ({ page }) => {
    console.log('🔍 Testing authentication endpoints...')
    
    // Test if we can access login page directly
    const loginResponse = await page.request.get(`${PRODUCTION_URL}/login`)
    console.log('Login page status:', loginResponse.status())
    
    if (loginResponse.status() === 200) {
      await page.goto(`${PRODUCTION_URL}/login`)
      await page.waitForTimeout(2000)
      
      const loginUrl = page.url()
      console.log('Login page URL:', loginUrl)
      
      if (loginUrl.includes('vercel.com')) {
        console.log('❌ CRITICAL: Login redirects to Vercel instead of showing login form')
      } else {
        console.log('✅ Login page accessible')
        
        // Check for actual login form elements
        const emailInput = await page.locator('input[type="email"]').count()
        const passwordInput = await page.locator('input[type="password"]').count()
        const submitButton = await page.locator('button[type="submit"]').count()
        
        console.log('Login form elements found:')
        console.log('- Email inputs:', emailInput)
        console.log('- Password inputs:', passwordInput) 
        console.log('- Submit buttons:', submitButton)
        
        if (emailInput === 0 || passwordInput === 0) {
          console.log('❌ CRITICAL: No proper login form found')
        }
      }
      
      await page.screenshot({ path: 'test-results/login-diagnosis.png', fullPage: true })
    }
  })

  test('Database Connection Analysis', async ({ page }) => {
    console.log('🔍 Testing database connectivity...')
    
    const endpoints = [
      { path: '/api/health', name: 'Health Check' },
      { path: '/api/keywords', name: 'Keywords API' },
      { path: '/api/conversations', name: 'Conversations API' }
    ]
    
    for (const endpoint of endpoints) {
      const response = await page.request.get(`${PRODUCTION_URL}${endpoint.path}`)
      console.log(`${endpoint.name} (${endpoint.path}): ${response.status()}`)
      
      if (response.status() === 401) {
        console.log(`❌ ${endpoint.name} requires authentication - this is expected but indicates auth system issues`)
      } else if (response.status() === 500) {
        console.log(`❌ ${endpoint.name} has server errors - possible database issues`)
        const errorText = await response.text()
        console.log('Error preview:', errorText.substring(0, 200))
      } else if (response.status() === 200) {
        console.log(`✅ ${endpoint.name} working correctly`)
      }
    }
  })

  test('Supabase Integration Check', async ({ page }) => {
    console.log('🔍 Testing Supabase integration...')
    
    // Try to access a page that should trigger Supabase auth
    await page.goto(`${PRODUCTION_URL}/dashboard`)
    await page.waitForTimeout(3000)
    
    const dashboardUrl = page.url()
    console.log('Dashboard access URL:', dashboardUrl)
    
    if (dashboardUrl.includes('vercel.com')) {
      console.log('❌ CRITICAL: Dashboard redirects to Vercel SSO - Supabase auth not working')
    } else if (dashboardUrl.includes('login')) {
      console.log('✅ Dashboard correctly redirects to login (Supabase auth working)')
    } else {
      console.log('⚠️ Dashboard accessible without auth - potential security issue')
    }
    
    await page.screenshot({ path: 'test-results/dashboard-diagnosis.png', fullPage: true })
  })

  test('Tenant System Analysis', async ({ page }) => {
    console.log('🔍 Analyzing tenant association issues...')
    
    // Look for any pages that might show tenant-related errors
    const testPages = ['/onboarding', '/setup', '/dashboard']
    
    for (const pagePath of testPages) {
      console.log(`Testing ${pagePath}...`)
      
      await page.goto(`${PRODUCTION_URL}${pagePath}`)
      await page.waitForTimeout(2000)
      
      const pageContent = await page.content()
      const currentUrl = page.url()
      
      // Look for tenant-related content or errors
      if (pageContent.toLowerCase().includes('tenant')) {
        console.log(`Found tenant-related content on ${pagePath}`)
        
        // Look for specific error patterns
        if (pageContent.includes('not associated with') || pageContent.includes('no tenant')) {
          console.log(`❌ TENANT ERROR found on ${pagePath}`)
        }
      }
      
      if (currentUrl.includes('vercel.com')) {
        console.log(`❌ ${pagePath} redirects to Vercel SSO`)
      }
    }
  })
})