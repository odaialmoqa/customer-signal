import { test, expect } from '@playwright/test'

test.describe('Sign-in Debug', () => {
  
  test('Debug sign-in flow step by step', async ({ page }) => {
    console.log('🔍 Debugging sign-in flow...')
    
    // Step 1: Go to login page
    await page.goto('/login')
    console.log('✅ Navigated to login page')
    
    // Step 2: Check if form is visible
    const emailField = page.locator('input[type="email"]')
    const passwordField = page.locator('input[type="password"]')
    const submitButton = page.locator('button[type="submit"]')
    
    await expect(emailField).toBeVisible()
    await expect(passwordField).toBeVisible()
    await expect(submitButton).toBeVisible()
    console.log('✅ Form fields are visible')
    
    // Step 3: Try to fill form with test data
    await emailField.fill('test@example.com')
    await passwordField.fill('testpassword123')
    console.log('✅ Form filled with test data')
    
    // Step 4: Listen for console errors and network requests
    const consoleMessages: string[] = []
    const networkRequests: string[] = []
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text())
      }
    })
    
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        networkRequests.push(`${request.method()} ${request.url()}`)
      }
    })
    
    // Step 5: Submit form and see what happens
    await submitButton.click()
    console.log('✅ Form submitted')
    
    // Wait a bit for any async operations
    await page.waitForTimeout(3000)
    
    // Step 6: Check current URL
    const currentUrl = page.url()
    console.log(`Current URL after submit: ${currentUrl}`)
    
    // Step 7: Check for any error messages on page
    const errorMessages = await page.locator('.text-red-600, .bg-red-50').allTextContents()
    if (errorMessages.length > 0) {
      console.log('❌ Error messages found:', errorMessages)
    } else {
      console.log('✅ No error messages visible')
    }
    
    // Step 8: Report console errors
    if (consoleMessages.length > 0) {
      console.log('❌ Console errors:', consoleMessages)
    } else {
      console.log('✅ No console errors')
    }
    
    // Step 9: Report network requests
    console.log('📡 Network requests made:', networkRequests)
    
    // Step 10: Check if we're still on login page or redirected
    if (currentUrl.includes('/login')) {
      console.log('⚠️ Still on login page - sign-in may have failed')
    } else {
      console.log('✅ Redirected away from login page')
    }
  })

  test('Test API endpoints directly', async ({ page }) => {
    console.log('🔍 Testing API endpoints directly...')
    
    const endpoints = [
      '/api/health',
      '/api/auth/session',
      '/api/user/tenant-status'
    ]
    
    for (const endpoint of endpoints) {
      try {
        const response = await page.request.get(endpoint)
        const status = response.status()
        const body = await response.text()
        
        console.log(`${endpoint}: ${status}`)
        if (status >= 400) {
          console.log(`  Response: ${body.substring(0, 200)}`)
        }
      } catch (error) {
        console.log(`${endpoint}: ERROR - ${error}`)
      }
    }
  })
})