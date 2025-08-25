import { test, expect } from '@playwright/test'

test.describe('Production Auth Test', () => {
  
  test('Test production login page access', async ({ page }) => {
    console.log('🔍 Testing production login page...')
    
    // Test the URL you mentioned
    await page.goto('/public/auth/login')
    
    // Check if page loads correctly
    await expect(page).toHaveTitle(/CustomerSignal/)
    console.log('✅ Public login page loads correctly')
    
    // Check if form fields are present
    const emailField = page.locator('input[type="email"]')
    const passwordField = page.locator('input[type="password"]')
    const submitButton = page.locator('button[type="submit"]')
    
    await expect(emailField).toBeVisible()
    await expect(passwordField).toBeVisible()
    await expect(submitButton).toBeVisible()
    console.log('✅ All form fields are present')
    
    // Test form validation
    await submitButton.click()
    const validationErrors = await page.locator('.text-red-600').allTextContents()
    expect(validationErrors.length).toBeGreaterThan(0)
    console.log('✅ Form validation working:', validationErrors)
  })

  test('Test production signup page access', async ({ page }) => {
    console.log('🔍 Testing production signup page...')
    
    await page.goto('/public/auth/signup')
    
    // Check if page loads correctly
    await expect(page).toHaveTitle(/CustomerSignal/)
    console.log('✅ Public signup page loads correctly')
    
    // Check if all signup fields are present
    const nameField = page.locator('input[id="name"]')
    const emailField = page.locator('input[type="email"]')
    const passwordField = page.locator('input[type="password"]')
    const submitButton = page.locator('button[type="submit"]')
    
    await expect(nameField).toBeVisible()
    await expect(emailField).toBeVisible()
    await expect(passwordField).toBeVisible()
    await expect(submitButton).toBeVisible()
    console.log('✅ All signup form fields are present')
  })

  test('Test API endpoints in production', async ({ page }) => {
    console.log('🔍 Testing production API endpoints...')
    
    const endpoints = [
      '/api/health',
      '/api/auth/session',
      '/api/user/tenant-status'
    ]
    
    for (const endpoint of endpoints) {
      try {
        const response = await page.request.get(endpoint)
        const status = response.status()
        console.log(`${endpoint}: ${status}`)
        
        if (endpoint === '/api/health' && status === 200) {
          const healthData = await response.json()
          console.log('Health check data:', healthData)
        }
      } catch (error) {
        console.log(`${endpoint}: ERROR - ${error}`)
      }
    }
  })

  test('Test actual sign-in attempt with real credentials', async ({ page }) => {
    console.log('🔍 Testing sign-in with form interaction...')
    
    await page.goto('/public/auth/login')
    
    // Fill form with test data (will fail but we can see the error)
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'testpassword123')
    
    // Listen for network requests
    const networkRequests: string[] = []
    page.on('request', request => {
      if (request.url().includes('supabase') || request.url().includes('/api/')) {
        networkRequests.push(`${request.method()} ${request.url()}`)
      }
    })
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Wait for response
    await page.waitForTimeout(3000)
    
    // Check for error messages
    const errorMessages = await page.locator('.text-red-600, .bg-red-50').allTextContents()
    console.log('Error messages:', errorMessages)
    
    // Check network requests
    console.log('Network requests:', networkRequests)
    
    // Check current URL
    console.log('Current URL:', page.url())
  })
})