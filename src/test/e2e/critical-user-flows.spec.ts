import { test, expect, Page } from '@playwright/test'

// Test configuration
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  name: 'Test User'
}

const PRODUCTION_URL = 'https://customer-signal-8pevnactz-odais-projects-248ff8ad.vercel.app'

test.describe('Critical User Experience Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Use production URL for testing
    await page.goto(PRODUCTION_URL)
  })

  test('Landing Page - First Impression', async ({ page }) => {
    // Test the landing page loads and has key elements
    await expect(page).toHaveTitle(/Customer Signal/i)
    
    // Check for key navigation elements
    await expect(page.locator('nav')).toBeVisible()
    
    // Check for call-to-action buttons
    const signupButton = page.locator('text=Sign Up').first()
    const loginButton = page.locator('text=Log In').first()
    
    await expect(signupButton.or(loginButton)).toBeVisible()
    
    // Take screenshot for visual verification
    await page.screenshot({ path: 'test-results/landing-page.png', fullPage: true })
  })

  test('User Registration Flow', async ({ page }) => {
    // Navigate to signup
    await page.click('text=Sign Up')
    await expect(page).toHaveURL(/.*signup/)
    
    // Fill out registration form
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    
    // Look for name field if it exists
    const nameField = page.locator('input[name="name"], input[placeholder*="name" i]')
    if (await nameField.isVisible()) {
      await nameField.fill(TEST_USER.name)
    }
    
    // Submit form
    await page.click('button[type="submit"], button:has-text("Sign Up")')
    
    // Wait for response and check what happens
    await page.waitForTimeout(3000)
    
    // Take screenshot to see the result
    await page.screenshot({ path: 'test-results/after-signup.png', fullPage: true })
    
    // Check if we're redirected somewhere or if there are errors
    const currentUrl = page.url()
    console.log('After signup URL:', currentUrl)
    
    // Look for error messages
    const errorMessages = await page.locator('[role="alert"], .error, .text-red-500, .text-destructive').all()
    for (const error of errorMessages) {
      if (await error.isVisible()) {
        const errorText = await error.textContent()
        console.log('Error found:', errorText)
      }
    }
  })

  test('User Login Flow', async ({ page }) => {
    // Navigate to login
    await page.click('text=Log In')
    await expect(page).toHaveURL(/.*login/)
    
    // Try to login (this will likely fail but we want to see what happens)
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    
    await page.click('button[type="submit"], button:has-text("Log In"), button:has-text("Sign In")')
    
    // Wait for response
    await page.waitForTimeout(3000)
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/after-login.png', fullPage: true })
    
    const currentUrl = page.url()
    console.log('After login URL:', currentUrl)
    
    // Check for errors
    const errorMessages = await page.locator('[role="alert"], .error, .text-red-500, .text-destructive').all()
    for (const error of errorMessages) {
      if (await error.isVisible()) {
        const errorText = await error.textContent()
        console.log('Login error:', errorText)
      }
    }
  })

  test('Dashboard Access Without Authentication', async ({ page }) => {
    // Try to access dashboard directly
    await page.goto(`${PRODUCTION_URL}/dashboard`)
    
    // Wait for redirect or error
    await page.waitForTimeout(2000)
    
    const currentUrl = page.url()
    console.log('Dashboard access URL:', currentUrl)
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/dashboard-unauth.png', fullPage: true })
    
    // Check if redirected to login
    if (currentUrl.includes('login')) {
      console.log('✅ Correctly redirected to login')
    } else {
      console.log('❌ Not redirected to login - potential security issue')
    }
  })

  test('Onboarding Flow Access', async ({ page }) => {
    // Try to access onboarding
    await page.goto(`${PRODUCTION_URL}/onboarding`)
    
    await page.waitForTimeout(2000)
    
    const currentUrl = page.url()
    console.log('Onboarding URL:', currentUrl)
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/onboarding.png', fullPage: true })
    
    // Look for onboarding content
    const onboardingContent = await page.locator('h1, h2, .onboarding, [data-testid*="onboard"]').all()
    for (const element of onboardingContent) {
      if (await element.isVisible()) {
        const text = await element.textContent()
        console.log('Onboarding content:', text)
      }
    }
  })

  test('API Endpoints Health Check', async ({ page }) => {
    // Test key API endpoints
    const endpoints = [
      '/api/health',
      '/api/keywords',
      '/api/conversations',
      '/api/analytics/dashboard'
    ]
    
    for (const endpoint of endpoints) {
      const response = await page.request.get(`${PRODUCTION_URL}${endpoint}`)
      console.log(`${endpoint}: ${response.status()} ${response.statusText()}`)
      
      if (response.status() === 200) {
        const body = await response.text()
        console.log(`${endpoint} response preview:`, body.substring(0, 200))
      }
    }
  })

  test('Navigation and Core Pages', async ({ page }) => {
    const pages = [
      { path: '/', name: 'Home' },
      { path: '/demo', name: 'Demo' },
      { path: '/help', name: 'Help' },
      { path: '/setup', name: 'Setup' }
    ]
    
    for (const testPage of pages) {
      await page.goto(`${PRODUCTION_URL}${testPage.path}`)
      await page.waitForTimeout(1000)
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-results/page-${testPage.name.toLowerCase()}.png`, 
        fullPage: true 
      })
      
      // Check for errors
      const hasError = await page.locator('text=Error, text=404, text=500').isVisible()
      if (hasError) {
        console.log(`❌ Error on ${testPage.name} page`)
      } else {
        console.log(`✅ ${testPage.name} page loads`)
      }
    }
  })

  test('Tenant Association Issue Investigation', async ({ page }) => {
    // This test specifically looks for the "User not associated with tenant" issue
    
    // First, try to trigger the error by accessing protected pages
    const protectedPages = ['/dashboard', '/keywords', '/analytics', '/conversations']
    
    for (const pagePath of protectedPages) {
      await page.goto(`${PRODUCTION_URL}${pagePath}`)
      await page.waitForTimeout(2000)
      
      // Look for tenant-related errors
      const pageContent = await page.content()
      
      if (pageContent.includes('tenant') || pageContent.includes('Tenant')) {
        console.log(`Found tenant-related content on ${pagePath}`)
        
        // Take screenshot
        await page.screenshot({ 
          path: `test-results/tenant-issue-${pagePath.replace('/', '')}.png`, 
          fullPage: true 
        })
        
        // Look for specific error messages
        const tenantErrors = await page.locator('text*="tenant", text*="Tenant"').all()
        for (const error of tenantErrors) {
          if (await error.isVisible()) {
            const errorText = await error.textContent()
            console.log(`Tenant error on ${pagePath}:`, errorText)
          }
        }
      }
    }
  })
})

test.describe('Database and Backend Integration', () => {
  test('Supabase Connection Test', async ({ page }) => {
    // Test if Supabase is properly connected by checking API responses
    const response = await page.request.get(`${PRODUCTION_URL}/api/health`)
    
    console.log('Health check status:', response.status())
    
    if (response.status() === 200) {
      const healthData = await response.json()
      console.log('Health check data:', healthData)
    }
  })

  test('Database Schema Validation', async ({ page }) => {
    // Try to access endpoints that would require database tables
    const dbEndpoints = [
      '/api/keywords',
      '/api/conversations', 
      '/api/analytics/dashboard'
    ]
    
    for (const endpoint of dbEndpoints) {
      const response = await page.request.get(`${PRODUCTION_URL}${endpoint}`)
      console.log(`${endpoint}: ${response.status()}`)
      
      if (response.status() !== 200) {
        const errorText = await response.text()
        console.log(`${endpoint} error:`, errorText.substring(0, 300))
      }
    }
  })
})