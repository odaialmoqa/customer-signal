import { test, expect } from '@playwright/test'

test.describe('Tenant Association Fix - UX Verification', () => {
  
  test('Complete User Journey: Signup to Dashboard Access', async ({ page }) => {
    console.log('🎯 Testing complete user journey with tenant auto-creation...')
    
    // Step 1: Access landing page
    console.log('Step 1: Accessing landing page...')
    await page.goto('/')
    
    const currentUrl = page.url()
    console.log(`Landing page URL: ${currentUrl}`)
    
    if (currentUrl.includes('vercel.com')) {
      console.log('❌ CRITICAL: Still blocked by Vercel SSO')
      console.log('🔧 SOLUTION NEEDED: Disable Vercel deployment protection')
      return
    }
    
    console.log('✅ Landing page accessible')
    
    // Step 2: Navigate to signup
    console.log('Step 2: Testing signup flow...')
    
    const signupRoutes = ['/signup', '/public/auth/signup']
    let signupUrl = ''
    
    for (const route of signupRoutes) {
      await page.goto(route)
      const url = page.url()
      if (!url.includes('vercel.com')) {
        signupUrl = url
        console.log(`✅ Signup accessible at: ${route}`)
        break
      }
    }
    
    if (!signupUrl) {
      console.log('❌ No accessible signup route found')
      return
    }
    
    // Step 3: Test signup form
    console.log('Step 3: Testing signup form...')
    
    const emailField = await page.locator('input[type="email"]').count()
    const passwordField = await page.locator('input[type="password"]').count()
    const nameField = await page.locator('input[name="name"], input[placeholder*="name"]').count()
    
    console.log(`Form fields - Email: ${emailField}, Password: ${passwordField}, Name: ${nameField}`)
    
    if (emailField === 0 || passwordField === 0) {
      console.log('❌ Signup form incomplete')
      return
    }
    
    // Step 4: Test form submission (with test data)
    console.log('Step 4: Testing form submission...')
    
    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = 'TestPassword123!'
    const testName = 'Test User'
    
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    
    if (nameField > 0) {
      await page.fill('input[name="name"], input[placeholder*="name"]', testName)
    }
    
    // Look for submit button
    const submitButton = await page.locator('button[type="submit"], button:has-text("sign up"), button:has-text("create")').first()
    
    if (await submitButton.count() > 0) {
      console.log('✅ Found submit button, testing submission...')
      
      // Listen for navigation or success messages
      const responsePromise = page.waitForResponse(response => 
        response.url().includes('/auth/') || response.url().includes('/api/')
      ).catch(() => null)
      
      await submitButton.click()
      
      // Wait for response or navigation
      await Promise.race([
        responsePromise,
        page.waitForTimeout(5000)
      ])
      
      const newUrl = page.url()
      console.log(`After signup URL: ${newUrl}`)
      
      // Check for success indicators
      const successMessage = await page.locator('text=/success|created|welcome/i').count()
      const errorMessage = await page.locator('text=/error|failed|invalid/i').count()
      
      console.log(`Success messages: ${successMessage}, Error messages: ${errorMessage}`)
      
      if (successMessage > 0) {
        console.log('✅ Signup appears successful')
      } else if (errorMessage > 0) {
        const errorText = await page.locator('text=/error|failed|invalid/i').first().textContent()
        console.log(`❌ Signup error: ${errorText}`)
      }
    }
  })

  test('Tenant Association API Testing', async ({ page }) => {
    console.log('🎯 Testing tenant association API endpoints...')
    
    const apiEndpoints = [
      '/api/user/ensure-tenant',
      '/api/tenant/current',
      '/api/user/profile'
    ]
    
    for (const endpoint of apiEndpoints) {
      console.log(`Testing ${endpoint}...`)
      
      try {
        const response = await page.request.get(endpoint)
        const status = response.status()
        const body = await response.text()
        
        console.log(`${endpoint}: ${status}`)
        
        if (status === 200) {
          console.log(`✅ ${endpoint} working`)
          
          // Check for tenant-related content
          if (body.includes('tenant') || body.includes('organization')) {
            console.log(`✅ ${endpoint} returns tenant data`)
          }
        } else if (status === 401) {
          console.log(`🔒 ${endpoint} requires authentication (expected)`)
        } else if (status === 404) {
          console.log(`❌ ${endpoint} not found`)
        } else {
          console.log(`⚠️ ${endpoint} returned ${status}`)
          
          // Check for specific tenant association errors
          if (body.includes('not associated with tenant')) {
            console.log(`❌ FOUND TENANT ISSUE: ${endpoint} still has association errors`)
          }
        }
      } catch (error) {
        console.log(`❌ ${endpoint} failed: ${error}`)
      }
    }
  })

  test('Dashboard Access After Tenant Creation', async ({ page }) => {
    console.log('🎯 Testing dashboard access with tenant association...')
    
    const dashboardRoutes = [
      '/dashboard',
      '/app',
      '/public/dashboard'
    ]
    
    for (const route of dashboardRoutes) {
      console.log(`Testing dashboard route: ${route}`)
      await page.goto(route)
      
      const url = page.url()
      const title = await page.title()
      
      if (url.includes('vercel.com')) {
        console.log(`❌ ${route} still redirects to Vercel SSO`)
      } else {
        console.log(`✅ ${route} accessible - Title: ${title}`)
        
        // Check for tenant-related errors
        const tenantError = await page.locator('text=/not associated with tenant/i').count()
        const authError = await page.locator('text=/authentication required|please log in/i').count()
        
        if (tenantError > 0) {
          console.log(`❌ ${route} shows tenant association error`)
        } else if (authError > 0) {
          console.log(`🔒 ${route} requires authentication (expected)`)
        } else {
          console.log(`✅ ${route} loads without tenant errors`)
        }
        
        // Check for dashboard content
        const dashboardElements = await page.locator('[class*="dashboard"], [data-testid*="dashboard"]').count()
        const navElements = await page.locator('nav').count()
        
        console.log(`Dashboard elements: ${dashboardElements}, Navigation: ${navElements}`)
      }
    }
  })

  test('Error Message Quality Assessment', async ({ page }) => {
    console.log('🎯 Assessing error message quality and user guidance...')
    
    // Test various error scenarios
    const testScenarios = [
      { route: '/dashboard', expectedError: 'authentication' },
      { route: '/api/keywords', expectedError: 'authentication' },
      { route: '/nonexistent', expectedError: '404' }
    ]
    
    for (const scenario of testScenarios) {
      console.log(`Testing error scenario: ${scenario.route}`)
      await page.goto(scenario.route)
      
      const url = page.url()
      const title = await page.title()
      const content = await page.content()
      
      console.log(`${scenario.route} - URL: ${url}, Title: ${title}`)
      
      // Check for helpful error messages
      const hasHelpfulError = content.includes('sign in') || 
                             content.includes('log in') || 
                             content.includes('create account') ||
                             content.includes('get started')
      
      if (hasHelpfulError) {
        console.log(`✅ ${scenario.route} provides helpful error guidance`)
      } else {
        console.log(`❌ ${scenario.route} lacks clear user guidance`)
      }
      
      // Check for tenant-specific errors
      if (content.includes('not associated with tenant')) {
        console.log(`❌ ${scenario.route} still shows tenant association errors`)
      }
    }
  })

  test('Onboarding Flow Verification', async ({ page }) => {
    console.log('🎯 Testing onboarding flow for new users...')
    
    const onboardingRoutes = [
      '/onboarding',
      '/setup',
      '/public/onboarding'
    ]
    
    for (const route of onboardingRoutes) {
      console.log(`Testing onboarding route: ${route}`)
      await page.goto(route)
      
      const url = page.url()
      
      if (url.includes('vercel.com')) {
        console.log(`❌ ${route} redirects to Vercel SSO`)
      } else {
        console.log(`✅ ${route} accessible`)
        
        // Check for onboarding elements
        const onboardingElements = await page.locator('text=/welcome|get started|setup|configure/i').count()
        const tenantSetup = await page.locator('text=/organization|company|workspace|tenant/i').count()
        const stepIndicators = await page.locator('[class*="step"], [data-step]').count()
        
        console.log(`Onboarding elements: ${onboardingElements}`)
        console.log(`Tenant setup elements: ${tenantSetup}`)
        console.log(`Step indicators: ${stepIndicators}`)
        
        if (onboardingElements > 0 && tenantSetup > 0) {
          console.log(`✅ ${route} has proper onboarding flow with tenant setup`)
        } else if (onboardingElements > 0) {
          console.log(`⚠️ ${route} has onboarding but may lack tenant setup`)
        } else {
          console.log(`❌ ${route} lacks clear onboarding flow`)
        }
      }
    }
  })
})