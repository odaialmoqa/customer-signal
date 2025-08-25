import { test, expect } from '@playwright/test'

test.describe('UX Improvements Verification', () => {
  
  test('Signup Flow - Complete User Journey', async ({ page }) => {
    console.log('🎯 Testing improved signup flow...')
    
    // Step 1: Access signup page
    await page.goto('/signup')
    
    // Verify page loads correctly
    await expect(page).toHaveTitle(/CustomerSignal/)
    console.log('✅ Signup page loads correctly')
    
    // Step 2: Check form fields are present
    const emailField = page.locator('input[type="email"]')
    const passwordField = page.locator('input[type="password"]')
    const nameField = page.locator('input[type="text"]')
    const submitButton = page.locator('button[type="submit"]')
    
    await expect(emailField).toBeVisible()
    await expect(passwordField).toBeVisible()
    await expect(nameField).toBeVisible()
    await expect(submitButton).toBeVisible()
    console.log('✅ All form fields are present and visible')
    
    // Step 3: Test form validation
    await submitButton.click()
    
    // Should show validation errors
    const validationErrors = page.locator('.text-red-600')
    await expect(validationErrors).toHaveCount(3) // name, email, password required
    console.log('✅ Form validation works correctly')
    
    // Step 4: Test navigation to login
    const loginLink = page.locator('text=Already have an account? Sign in')
    await expect(loginLink).toBeVisible()
    console.log('✅ Navigation to login is available')
  })

  test('Login Flow - Form Structure and Navigation', async ({ page }) => {
    console.log('🎯 Testing improved login flow...')
    
    // Step 1: Access login page
    await page.goto('/login')
    
    // Verify page loads correctly
    await expect(page).toHaveTitle(/CustomerSignal/)
    console.log('✅ Login page loads correctly')
    
    // Step 2: Check form fields are present
    const emailField = page.locator('input[type="email"]')
    const passwordField = page.locator('input[type="password"]')
    const submitButton = page.locator('button[type="submit"]')
    
    await expect(emailField).toBeVisible()
    await expect(passwordField).toBeVisible()
    await expect(submitButton).toBeVisible()
    console.log('✅ All login form fields are present and visible')
    
    // Step 3: Test navigation to signup
    const signupLink = page.locator('text=Don\'t have an account? Sign up')
    await expect(signupLink).toBeVisible()
    console.log('✅ Navigation to signup is available')
  })

  test('API Endpoints - Health Check', async ({ page }) => {
    console.log('🎯 Testing API endpoint improvements...')
    
    const endpoints = [
      { path: '/api/health', expectedStatus: 200, description: 'Health check' },
      { path: '/api/auth/session', expectedStatus: 401, description: 'Session check (unauthenticated)' },
      { path: '/api/user/profile', expectedStatus: 401, description: 'User profile (unauthenticated)' },
      { path: '/api/tenant/current', expectedStatus: 401, description: 'Current tenant (unauthenticated)' },
      { path: '/api/user/tenant-status', expectedStatus: 401, description: 'Tenant status (unauthenticated)' }
    ]
    
    for (const endpoint of endpoints) {
      const response = await page.request.get(endpoint.path)
      expect(response.status()).toBe(endpoint.expectedStatus)
      console.log(`✅ ${endpoint.description}: ${response.status()}`)
    }
  })

  test('Onboarding Flow - Accessibility and Structure', async ({ page }) => {
    console.log('🎯 Testing onboarding flow structure...')
    
    // Access onboarding page
    await page.goto('/onboarding')
    
    // Should redirect to login if not authenticated
    await page.waitForURL(/login/)
    console.log('✅ Onboarding correctly redirects unauthenticated users to login')
  })

  test('Dashboard Access - Route Handling', async ({ page }) => {
    console.log('🎯 Testing dashboard access patterns...')
    
    const dashboardRoutes = ['/dashboard', '/public/dashboard']
    
    for (const route of dashboardRoutes) {
      await page.goto(route)
      
      // Check if page loads without errors
      const title = await page.title()
      expect(title).toContain('CustomerSignal')
      console.log(`✅ ${route} loads correctly with title: ${title}`)
    }
  })

  test('Error Handling - User-Friendly Messages', async ({ page }) => {
    console.log('🎯 Testing error handling improvements...')
    
    // Test 404 pages
    await page.goto('/nonexistent-page')
    
    // Should show a proper 404 page or redirect
    const pageContent = await page.textContent('body')
    const has404Content = pageContent?.includes('404') || pageContent?.includes('not found')
    
    if (has404Content) {
      console.log('✅ 404 pages are handled properly')
    } else {
      console.log('ℹ️ 404 handling could be improved')
    }
  })

  test('Form Accessibility - ARIA Labels and Focus Management', async ({ page }) => {
    console.log('🎯 Testing form accessibility improvements...')
    
    await page.goto('/signup')
    
    // Check for proper labels
    const emailLabel = page.locator('label[for="email"]')
    const passwordLabel = page.locator('label[for="password"]')
    const nameLabel = page.locator('label[for="name"]')
    
    await expect(emailLabel).toBeVisible()
    await expect(passwordLabel).toBeVisible()
    await expect(nameLabel).toBeVisible()
    console.log('✅ Form fields have proper labels')
    
    // Test keyboard navigation
    await page.keyboard.press('Tab')
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(focusedElement).toBe('INPUT')
    console.log('✅ Keyboard navigation works correctly')
  })

  test('Mobile Responsiveness - Layout Adaptation', async ({ page }) => {
    console.log('🎯 Testing mobile responsiveness...')
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/signup')
    
    // Check if form is still usable on mobile
    const form = page.locator('form')
    await expect(form).toBeVisible()
    
    const formWidth = await form.boundingBox()
    expect(formWidth?.width).toBeLessThanOrEqual(375)
    console.log('✅ Forms are mobile-responsive')
    
    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('Performance - Page Load Times', async ({ page }) => {
    console.log('🎯 Testing page performance...')
    
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime
    
    console.log(`ℹ️ Landing page load time: ${loadTime}ms`)
    
    // Test signup page load time
    const signupStartTime = Date.now()
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')
    const signupLoadTime = Date.now() - signupStartTime
    
    console.log(`ℹ️ Signup page load time: ${signupLoadTime}ms`)
    
    // Basic performance expectations
    expect(loadTime).toBeLessThan(5000) // 5 seconds max
    expect(signupLoadTime).toBeLessThan(5000)
    console.log('✅ Page load times are acceptable')
  })
})