import { test, expect } from '@playwright/test'

test.describe('UX Quality Assurance - Complete User Experience Audit', () => {
  
  test('Critical User Flow: First-Time User Journey', async ({ page }) => {
    console.log('🎯 Testing complete first-time user experience...')
    
    // Step 1: Landing page experience
    console.log('Step 1: Landing page first impression...')
    await page.goto('/')
    
    const currentUrl = page.url()
    const pageTitle = await page.title()
    
    console.log(`Landing URL: ${currentUrl}`)
    console.log(`Page Title: ${pageTitle}`)
    
    // Check if we can access the landing page
    if (currentUrl.includes('login')) {
      console.log('❌ CRITICAL: Users land on login instead of marketing page')
      console.log('🔧 IMPACT: No product discovery, poor conversion')
    } else {
      console.log('✅ Landing page accessible')
      
      // Check for key marketing elements
      const heroHeading = await page.locator('h1').first().textContent()
      const ctaButtons = await page.locator('text=/get started|sign up|try/i').count()
      const valueProposition = await page.locator('text=/monitor|track|analyze|insight/i').count()
      
      console.log(`Hero heading: "${heroHeading}"`)
      console.log(`CTA buttons found: ${ctaButtons}`)
      console.log(`Value proposition elements: ${valueProposition}`)
      
      if (ctaButtons === 0) {
        console.log('❌ No clear call-to-action buttons')
      }
      if (valueProposition === 0) {
        console.log('❌ No clear value proposition')
      }
    }
    
    // Step 2: Signup flow usability
    console.log('Step 2: Testing signup flow usability...')
    
    const signupButton = await page.locator('text=/get started|sign up/i').first()
    if (await signupButton.count() > 0) {
      await signupButton.click()
      
      const signupUrl = page.url()
      console.log(`Signup URL: ${signupUrl}`)
      
      // Check signup form quality
      const emailField = await page.locator('input[type="email"]')
      const passwordField = await page.locator('input[type="password"]')
      const nameField = await page.locator('input[name="name"], input[placeholder*="name"]')
      
      const hasEmailField = await emailField.count() > 0
      const hasPasswordField = await passwordField.count() > 0
      const hasNameField = await nameField.count() > 0
      
      console.log(`Email field: ${hasEmailField ? '✅' : '❌'}`)
      console.log(`Password field: ${hasPasswordField ? '✅' : '❌'}`)
      console.log(`Name field: ${hasNameField ? '✅' : '❌'}`)
      
      // Test form validation
      if (hasEmailField && hasPasswordField) {
        await emailField.fill('invalid-email')
        await passwordField.fill('123')
        
        const submitButton = await page.locator('button[type="submit"]').first()
        if (await submitButton.count() > 0) {
          await submitButton.click()
          
          // Check for validation messages
          const validationErrors = await page.locator('text=/invalid|error|required/i').count()
          console.log(`Form validation working: ${validationErrors > 0 ? '✅' : '❌'}`)
        }
      }
    }
  })

  test('Authentication UX Quality', async ({ page }) => {
    console.log('🎯 Testing authentication user experience...')
    
    // Test login page
    await page.goto('/login')
    const loginTitle = await page.title()
    console.log(`Login page title: ${loginTitle}`)
    
    // Check login form quality
    const loginForm = await page.locator('form').first()
    const emailField = await page.locator('input[type="email"]')
    const passwordField = await page.locator('input[type="password"]')
    const submitButton = await page.locator('button[type="submit"]')
    const signupLink = await page.locator('text=/sign up|create account/i')
    
    console.log(`Login form present: ${await loginForm.count() > 0 ? '✅' : '❌'}`)
    console.log(`Email field present: ${await emailField.count() > 0 ? '✅' : '❌'}`)
    console.log(`Password field present: ${await passwordField.count() > 0 ? '✅' : '❌'}`)
    console.log(`Submit button present: ${await submitButton.count() > 0 ? '✅' : '❌'}`)
    console.log(`Signup link present: ${await signupLink.count() > 0 ? '✅' : '❌'}`)
    
    // Test form accessibility
    const emailLabel = await page.locator('label[for="email"]')
    const passwordLabel = await page.locator('label[for="password"]')
    
    console.log(`Email field labeled: ${await emailLabel.count() > 0 ? '✅' : '❌'}`)
    console.log(`Password field labeled: ${await passwordLabel.count() > 0 ? '✅' : '❌'}`)
    
    // Test error handling
    if (await emailField.count() > 0 && await passwordField.count() > 0) {
      await emailField.fill('test@example.com')
      await passwordField.fill('wrongpassword')
      
      if (await submitButton.count() > 0) {
        await submitButton.click()
        
        // Wait for potential error message
        await page.waitForTimeout(2000)
        
        const errorMessage = await page.locator('text=/error|invalid|incorrect/i').count()
        console.log(`Error handling present: ${errorMessage > 0 ? '✅' : '❌'}`)
      }
    }
  })

  test('Dashboard UX and Onboarding Quality', async ({ page }) => {
    console.log('🎯 Testing dashboard and onboarding experience...')
    
    // Test public dashboard (should work without auth)
    await page.goto('/public/dashboard')
    const dashboardTitle = await page.title()
    console.log(`Dashboard title: ${dashboardTitle}`)
    
    // Check if dashboard is accessible
    const currentUrl = page.url()
    if (currentUrl.includes('login')) {
      console.log('❌ Dashboard redirects to login (expected for protected routes)')
    } else {
      console.log('✅ Public dashboard accessible')
      
      // Check dashboard elements
      const navigation = await page.locator('nav').count()
      const mainContent = await page.locator('main, [role="main"]').count()
      const actionButtons = await page.locator('button, a[href*="create"], a[href*="setup"]').count()
      
      console.log(`Navigation present: ${navigation > 0 ? '✅' : '❌'}`)
      console.log(`Main content area: ${mainContent > 0 ? '✅' : '❌'}`)
      console.log(`Action buttons: ${actionButtons}`)
      
      // Check for empty state handling
      const emptyStateMessage = await page.locator('text=/no data|get started|welcome/i').count()
      console.log(`Empty state guidance: ${emptyStateMessage > 0 ? '✅' : '❌'}`)
    }
    
    // Test onboarding flow
    console.log('Testing onboarding flow...')
    await page.goto('/public/onboarding')
    
    const onboardingUrl = page.url()
    if (!onboardingUrl.includes('login')) {
      console.log('✅ Onboarding accessible')
      
      // Check onboarding elements
      const progressIndicator = await page.locator('[class*="progress"], [class*="step"]').count()
      const instructionText = await page.locator('text=/step|welcome|setup/i').count()
      const nextButton = await page.locator('button:has-text("next"), button:has-text("continue")').count()
      
      console.log(`Progress indicator: ${progressIndicator > 0 ? '✅' : '❌'}`)
      console.log(`Clear instructions: ${instructionText > 0 ? '✅' : '❌'}`)
      console.log(`Navigation buttons: ${nextButton > 0 ? '✅' : '❌'}`)
    } else {
      console.log('❌ Onboarding redirects to login')
    }
  })

  test('Mobile Responsiveness Quality', async ({ page }) => {
    console.log('🎯 Testing mobile responsiveness...')
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
    await page.goto('/public')
    
    // Check if content is readable on mobile
    const bodyText = await page.locator('body').first()
    const computedStyle = await bodyText.evaluate(el => {
      const style = window.getComputedStyle(el)
      return {
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        overflow: style.overflow
      }
    })
    
    console.log(`Mobile font size: ${computedStyle.fontSize}`)
    console.log(`Mobile line height: ${computedStyle.lineHeight}`)
    
    // Check for horizontal scrolling
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth
    })
    
    console.log(`Horizontal scroll issue: ${hasHorizontalScroll ? '❌' : '✅'}`)
    
    // Check button sizes on mobile
    const buttons = await page.locator('button, a[class*="button"]')
    const buttonCount = await buttons.count()
    
    if (buttonCount > 0) {
      const firstButton = buttons.first()
      const buttonSize = await firstButton.boundingBox()
      
      if (buttonSize) {
        const isTouchFriendly = buttonSize.height >= 44 && buttonSize.width >= 44
        console.log(`Touch-friendly buttons: ${isTouchFriendly ? '✅' : '❌'} (${buttonSize.width}x${buttonSize.height})`)
      }
    }
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 }) // iPad
    await page.goto('/public')
    
    const tabletHorizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth
    })
    
    console.log(`Tablet horizontal scroll: ${tabletHorizontalScroll ? '❌' : '✅'}`)
  })

  test('Performance and Loading Quality', async ({ page }) => {
    console.log('🎯 Testing performance and loading experience...')
    
    // Measure page load time
    const startTime = Date.now()
    await page.goto('/public')
    const loadTime = Date.now() - startTime
    
    console.log(`Page load time: ${loadTime}ms ${loadTime < 3000 ? '✅' : '❌'}`)
    
    // Check for loading states
    const loadingIndicators = await page.locator('[class*="loading"], [class*="spinner"]').count()
    const loadingText = await page.locator('text=/loading/i').count()
    console.log(`Loading indicators: ${(loadingIndicators + loadingText) > 0 ? '✅' : '❌'}`)
    
    // Check for error boundaries
    const errorBoundaries = await page.locator('[class*="error"]').count()
    const errorText = await page.locator('text=/something went wrong/i').count()
    console.log(`Error boundaries: ${(errorBoundaries + errorText) > 0 ? '✅' : '❌'}`)
    
    // Test API response times
    const apiTests = [
      '/api/health',
      '/api/user/ensure-tenant'
    ]
    
    for (const endpoint of apiTests) {
      try {
        const apiStart = Date.now()
        const response = await page.request.get(endpoint)
        const apiTime = Date.now() - apiStart
        
        console.log(`${endpoint}: ${response.status()} in ${apiTime}ms ${apiTime < 1000 ? '✅' : '❌'}`)
      } catch (error) {
        console.log(`${endpoint}: ❌ Failed to test`)
      }
    }
  })

  test('Accessibility Quality Audit', async ({ page }) => {
    console.log('🎯 Testing accessibility compliance...')
    
    await page.goto('/public')
    
    // Check for semantic HTML
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').count()
    const landmarks = await page.locator('main, nav, header, footer, aside').count()
    const lists = await page.locator('ul, ol').count()
    
    console.log(`Semantic headings: ${headings > 0 ? '✅' : '❌'} (${headings} found)`)
    console.log(`Landmark elements: ${landmarks > 0 ? '✅' : '❌'} (${landmarks} found)`)
    console.log(`Structured lists: ${lists > 0 ? '✅' : '❌'} (${lists} found)`)
    
    // Check for alt text on images
    const images = await page.locator('img')
    const imageCount = await images.count()
    
    if (imageCount > 0) {
      let imagesWithAlt = 0
      for (let i = 0; i < imageCount; i++) {
        const alt = await images.nth(i).getAttribute('alt')
        if (alt !== null) imagesWithAlt++
      }
      
      console.log(`Images with alt text: ${imagesWithAlt}/${imageCount} ${imagesWithAlt === imageCount ? '✅' : '❌'}`)
    }
    
    // Check for form labels
    const inputs = await page.locator('input')
    const inputCount = await inputs.count()
    
    if (inputCount > 0) {
      let labeledInputs = 0
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i)
        const id = await input.getAttribute('id')
        const ariaLabel = await input.getAttribute('aria-label')
        
        if (id) {
          const label = await page.locator(`label[for="${id}"]`).count()
          if (label > 0 || ariaLabel) labeledInputs++
        } else if (ariaLabel) {
          labeledInputs++
        }
      }
      
      console.log(`Labeled inputs: ${labeledInputs}/${inputCount} ${labeledInputs === inputCount ? '✅' : '❌'}`)
    }
    
    // Check color contrast (basic check)
    const bodyStyle = await page.locator('body').evaluate(el => {
      const style = window.getComputedStyle(el)
      return {
        color: style.color,
        backgroundColor: style.backgroundColor
      }
    })
    
    console.log(`Body text color: ${bodyStyle.color}`)
    console.log(`Body background: ${bodyStyle.backgroundColor}`)
  })

  test('Error Handling and Edge Cases', async ({ page }) => {
    console.log('🎯 Testing error handling and edge cases...')
    
    // Test 404 page
    await page.goto('/nonexistent-page')
    const notFoundTitle = await page.title()
    const notFoundContent = await page.locator('text=/404|not found|page not found/i').count()
    
    console.log(`404 page title: ${notFoundTitle}`)
    console.log(`404 content present: ${notFoundContent > 0 ? '✅' : '❌'}`)
    
    // Test network error handling
    await page.route('**/api/**', route => route.abort())
    await page.goto('/public/dashboard')
    
    // Wait for potential error messages
    await page.waitForTimeout(3000)
    
    const networkErrorHandling = await page.locator('text=/error|failed|try again/i').count()
    console.log(`Network error handling: ${networkErrorHandling > 0 ? '✅' : '❌'}`)
    
    // Reset network interception
    await page.unroute('**/api/**')
    
    // Test empty states
    await page.goto('/public/dashboard')
    const emptyStateGuidance = await page.locator('text=/no data|get started|empty|welcome/i').count()
    console.log(`Empty state guidance: ${emptyStateGuidance > 0 ? '✅' : '❌'}`)
  })

  test('User Feedback and Help System', async ({ page }) => {
    console.log('🎯 Testing user feedback and help system...')
    
    // Test help page
    await page.goto('/public/help')
    const helpTitle = await page.title()
    const helpContent = await page.locator('text=/help|support|faq|guide/i').count()
    const contactInfo = await page.locator('text=/contact|email|support/i').count()
    
    console.log(`Help page title: ${helpTitle}`)
    console.log(`Help content present: ${helpContent > 0 ? '✅' : '❌'}`)
    console.log(`Contact information: ${contactInfo > 0 ? '✅' : '❌'}`)
    
    // Test demo/tour availability
    await page.goto('/demo')
    const demoAccessible = !page.url().includes('login')
    console.log(`Demo accessible: ${demoAccessible ? '✅' : '❌'}`)
    
    // Check for contextual help
    await page.goto('/public/dashboard')
    const helpButtons = await page.locator('button:has-text("help"), a:has-text("help"), [title*="help"]').count()
    const tooltips = await page.locator('[title], [aria-label]').count()
    
    console.log(`Help buttons available: ${helpButtons > 0 ? '✅' : '❌'}`)
    console.log(`Tooltips/labels present: ${tooltips > 0 ? '✅' : '❌'}`)
  })
})