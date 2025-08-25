import { test, expect } from '@playwright/test'

test.describe('Auth Configuration Check', () => {
  
  test('Check Supabase configuration', async ({ page }) => {
    console.log('🔍 Checking Supabase configuration...')
    
    // Go to a page that uses Supabase
    await page.goto('/login')
    
    // Check if Supabase client can be created
    const supabaseCheck = await page.evaluate(() => {
      try {
        // Check if environment variables are available
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        
        return {
          hasUrl: !!supabaseUrl && supabaseUrl !== 'your-supabase-url',
          hasKey: !!supabaseKey && supabaseKey !== 'your-supabase-anon-key',
          url: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'NOT SET',
          key: supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'NOT SET'
        }
      } catch (error) {
        return { error: error.message }
      }
    })
    
    console.log('Supabase configuration:', supabaseCheck)
    
    // Test if we can make a basic request to Supabase
    const healthCheck = await page.request.get('/api/health')
    console.log(`Health check status: ${healthCheck.status()}`)
    
    if (healthCheck.ok()) {
      const healthData = await healthCheck.json()
      console.log('Health check data:', healthData)
    }
  })

  test('Test basic auth flow without credentials', async ({ page }) => {
    console.log('🔍 Testing auth flow structure...')
    
    await page.goto('/login')
    
    // Fill form with empty values to test validation
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()
    
    // Should show validation errors
    const validationErrors = await page.locator('.text-red-600').allTextContents()
    console.log('Validation errors (expected):', validationErrors)
    
    expect(validationErrors.length).toBeGreaterThan(0)
    console.log('✅ Form validation is working')
  })

  test('Test signup page accessibility', async ({ page }) => {
    console.log('🔍 Testing signup page...')
    
    await page.goto('/signup')
    
    // Check if all required fields are present
    const nameField = page.locator('input[id="name"]')
    const emailField = page.locator('input[id="email"]')
    const passwordField = page.locator('input[id="password"]')
    
    await expect(nameField).toBeVisible()
    await expect(emailField).toBeVisible()
    await expect(passwordField).toBeVisible()
    
    console.log('✅ All signup form fields are present')
    
    // Test form validation
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()
    
    const validationErrors = await page.locator('.text-red-600').allTextContents()
    expect(validationErrors.length).toBe(3) // name, email, password required
    
    console.log('✅ Signup form validation is working')
  })
})