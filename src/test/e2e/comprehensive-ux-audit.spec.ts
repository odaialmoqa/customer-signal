import { test, expect } from '@playwright/test'

test.describe('Comprehensive UX Audit - Real User Experience', () => {
  
  test('Critical User Journey: New User Signup Flow', async ({ page }) => {
    console.log('🎯 Testing complete new user signup journey...')
    
    // Step 1: Landing page access
    console.log('Step 1: Accessing landing page...')
    await page.goto('/')
    
    const currentUrl = page.url()
    const pageTitle = await page.title()
    
    console.log(`Current URL: ${currentUrl}`)
    console.log(`Page Title: ${pageTitle}`)
    
    if (currentUrl.includes('vercel.com/login')) {
      console.log('❌ CRITICAL: Landing page redirects to Vercel SSO')
      console.log('🔧 IMPACT: New users cannot discover the product')
      
      // Try alternative routes
      console.log('🔍 Testing alternative routes...')
      
      const alternativeRoutes = ['/public', '/demo', '/about', '/help']
      for (const route of alternativeRoutes) {
        await page.goto(route)
        const altUrl = page.url()
        console.log(`${route}: ${altUrl.includes('vercel.com') ? '❌ Blocked' : '✅ Accessible'}`)
      }
      return
    }
    
    // Step 2: Find signup button
    console.log('Step 2: Looking for signup options...')
    const signupButtons = await page.locator('text=/sign up|get started|create account/i').count()
    console.log(`Found ${signupButtons} signup buttons`)
    
    if (signupButtons === 0) {
      console.log('❌ No clear signup path found')
    }
    
    // Step 3: Test signup flow
    if (signupButtons > 0) {
      console.log('Step 3: Testing signup flow...')
      await page.locator('text=/sign up|get started/i').first().click()
      
      const signupUrl = page.url()
      console.log(`Signup URL: ${signupUrl}`)
      
      if (signupUrl.includes('vercel.com')) {
        console.log('❌ Signup redirects to Vercel SSO')
      } else {
        console.log('✅ Signup page accessible')
        
        // Test form fields
        const emailField = await page.locator('input[type="email"]').count()
        const passwordField = await page.locator('input[type="password"]').count()
        
        console.log(`Email fields: ${emailField}, Password fields: ${passwordField}`)
      }
    }
  })

  test('Existing User Login Journey', async ({ page }) => {
    console.log('🎯 Testing existing user login journey...')
    
    // Try direct login routes
    const loginRoutes = ['/login', '/signin', '/auth/login', '/public/auth/login']
    
    for (const route of loginRoutes) {
      console.log(`Testing login route: ${route}`)
      await page.goto(route)
      
      const url = page.url()
      if (url.includes('vercel.com')) {
        console.log(`❌ ${route} redirects to Vercel SSO`)
      } else {
        console.log(`✅ ${route} accessible`)
        
        // Check for login form
        const loginForm = await page.locator('form').count()
        const emailField = await page.locator('input[type="email"]').count()
        
        console.log(`Login forms: ${loginForm}, Email fields: ${emailField}`)
        
        if (loginForm > 0 && emailField > 0) {
          console.log('✅ Functional login form found')
          
          // Test form submission with dummy data
          await page.fill('input[type="email"]', 'test@example.com')
          
          const passwordFields = await page.locator('input[type="password"]').count()
          if (passwordFields > 0) {
            await page.fill('input[type="password"]', 'testpassword')
            
            // Look for submit button
            const submitButton = await page.locator('button[type="submit"], input[type="submit"]').count()
            if (submitButton > 0) {
              console.log('✅ Complete login form structure found')
            }
          }
        }
      }
    }
  })

  test('Dashboard Access Analysis', async ({ page }) => {
    console.log('🎯 Testing dashboard accessibility...')
    
    const dashboardRoutes = ['/dashboard', '/app', '/main', '/home', '/public/dashboard']
    
    for (const route of dashboardRoutes) {
      console.log(`Testing dashboard route: ${route}`)
      await page.goto(route)
      
      const url = page.url()
      const title = await page.title()
      
      if (url.includes('vercel.com')) {
        console.log(`❌ ${route} redirects to Vercel SSO`)
      } else {
        console.log(`✅ ${route} accessible - Title: ${title}`)
        
        // Check for dashboard elements
        const navElements = await page.locator('nav').count()
        const dashboardContent = await page.locator('[class*="dashboard"], [id*="dashboard"]').count()
        
        console.log(`Navigation elements: ${navElements}, Dashboard content: ${dashboardContent}`)
      }
    }
  })

  test('API Endpoints Health Check', async ({ page }) => {
    console.log('🎯 Testing API endpoint accessibility...')
    
    const apiEndpoints = [
      '/api/health',
      '/api/auth/session',
      '/api/user/profile',
      '/api/tenant/current',
      '/api/keywords',
      '/api/conversations'
    ]
    
    for (const endpoint of apiEndpoints) {
      try {
        const response = await page.request.get(endpoint)
        const status = response.status()
        
        console.log(`${endpoint}: ${status}`)
        
        if (status === 200) {
          const body = await response.text()
          console.log(`✅ ${endpoint} working - Response length: ${body.length}`)
        } else if (status === 401) {
          console.log(`🔒 ${endpoint} requires authentication (expected)`)
        } else if (status === 404) {
          console.log(`❌ ${endpoint} not found`)
        } else {
          console.log(`⚠️ ${endpoint} returned ${status}`)
        }
      } catch (error) {
        console.log(`❌ ${endpoint} failed: ${error}`)
      }
    }
  })

  test('Tenant Association Problem Analysis', async ({ page }) => {
    console.log('🎯 Analyzing tenant association issues...')
    
    // Check if we can access any tenant-related endpoints
    const tenantEndpoints = [
      '/api/tenant/current',
      '/api/tenant/create',
      '/api/user/tenant-status'
    ]
    
    for (const endpoint of tenantEndpoints) {
      try {
        const response = await page.request.get(endpoint)
        const status = response.status()
        const body = await response.text()
        
        console.log(`${endpoint}: ${status}`)
        
        if (body.includes('not associated with tenant')) {
          console.log(`❌ FOUND TENANT ISSUE: ${endpoint} returns tenant association error`)
        }
        
        if (status === 200) {
          console.log(`Response preview: ${body.substring(0, 200)}...`)
        }
      } catch (error) {
        console.log(`${endpoint} error: ${error}`)
      }
    }
    
    // Test onboarding flow
    console.log('Testing onboarding flow...')
    await page.goto('/onboarding')
    
    const onboardingUrl = page.url()
    if (onboardingUrl.includes('vercel.com')) {
      console.log('❌ Onboarding redirects to Vercel SSO')
    } else {
      console.log('✅ Onboarding accessible')
      
      // Look for tenant creation steps
      const tenantSetup = await page.locator('text=/organization|company|tenant|workspace/i').count()
      console.log(`Tenant setup elements found: ${tenantSetup}`)
    }
  })

  test('Error Message Analysis', async ({ page }) => {
    console.log('🎯 Analyzing error messages and user feedback...')
    
    // Listen for console errors
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    // Listen for network failures
    const networkErrors: string[] = []
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.url()}: ${response.status()}`)
      }
    })
    
    // Try to access main routes and collect errors
    const routes = ['/', '/dashboard', '/login', '/signup']
    
    for (const route of routes) {
      await page.goto(route)
      await page.waitForTimeout(2000) // Wait for any async errors
    }
    
    console.log(`Console errors found: ${consoleErrors.length}`)
    consoleErrors.forEach(error => console.log(`❌ Console: ${error}`))
    
    console.log(`Network errors found: ${networkErrors.length}`)
    networkErrors.forEach(error => console.log(`❌ Network: ${error}`))
  })
})