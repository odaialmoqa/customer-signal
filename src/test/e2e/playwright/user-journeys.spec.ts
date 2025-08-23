import { test, expect } from '@playwright/test'

test.describe('Critical User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for testing
    await page.route('**/api/auth/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'test-user', email: 'test@example.com' } })
      })
    })
  })

  test('complete onboarding flow', async ({ page }) => {
    await page.goto('/onboarding')
    
    // Step 1: Welcome
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible()
    await page.getByRole('button', { name: /get started/i }).click()
    
    // Step 2: Platform Selection
    await expect(page.getByText(/select platforms/i)).toBeVisible()
    await page.getByRole('checkbox', { name: /twitter/i }).check()
    await page.getByRole('checkbox', { name: /reddit/i }).check()
    await page.getByRole('button', { name: /continue/i }).click()
    
    // Step 3: Keyword Setup
    await expect(page.getByText(/add keywords/i)).toBeVisible()
    await page.getByRole('textbox', { name: /keyword/i }).fill('customer feedback')
    await page.getByRole('button', { name: /add keyword/i }).click()
    await page.getByRole('button', { name: /continue/i }).click()
    
    // Step 4: Alert Configuration
    await expect(page.getByText(/configure alerts/i)).toBeVisible()
    await page.getByRole('checkbox', { name: /email notifications/i }).check()
    await page.getByRole('button', { name: /continue/i }).click()
    
    // Step 5: Dashboard Tour
    await expect(page.getByText(/dashboard tour/i)).toBeVisible()
    await page.getByRole('button', { name: /finish/i }).click()
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
  })

  test('keyword management workflow', async ({ page }) => {
    await page.goto('/keywords')
    
    // Create new keyword
    await page.getByRole('button', { name: /add keyword/i }).click()
    await page.getByRole('textbox', { name: /keyword/i }).fill('product review')
    await page.getByRole('checkbox', { name: /twitter/i }).check()
    await page.getByRole('checkbox', { name: /reddit/i }).check()
    await page.getByRole('button', { name: /save/i }).click()
    
    // Verify keyword appears in list
    await expect(page.getByText('product review')).toBeVisible()
    
    // Edit keyword
    await page.getByRole('button', { name: /edit.*product review/i }).click()
    await page.getByRole('textbox', { name: /keyword/i }).fill('product feedback')
    await page.getByRole('button', { name: /save/i }).click()
    
    // Verify updated keyword
    await expect(page.getByText('product feedback')).toBeVisible()
    
    // Delete keyword
    await page.getByRole('button', { name: /delete.*product feedback/i }).click()
    await page.getByRole('button', { name: /confirm/i }).click()
    
    // Verify keyword is removed
    await expect(page.getByText('product feedback')).not.toBeVisible()
  })

  test('dashboard navigation and analytics', async ({ page }) => {
    // Mock API responses
    await page.route('**/api/conversations**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          conversations: [
            {
              id: '1',
              content: 'Great product!',
              platform: 'twitter',
              sentiment: 'positive',
              timestamp: new Date().toISOString()
            }
          ],
          total: 1
        })
      })
    })

    await page.route('**/api/analytics/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalConversations: 1234,
          sentimentDistribution: { positive: 60, negative: 20, neutral: 20 },
          platformDistribution: { twitter: 50, reddit: 30, linkedin: 20 }
        })
      })
    })

    await page.goto('/dashboard')
    
    // Verify dashboard loads
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
    
    // Check stats display
    await expect(page.getByText('1,234')).toBeVisible()
    
    // Navigate to analytics
    await page.getByRole('link', { name: /analytics/i }).click()
    await expect(page).toHaveURL('/analytics')
    
    // Verify charts are present
    await expect(page.getByText(/sentiment trends/i)).toBeVisible()
    await expect(page.getByText(/platform distribution/i)).toBeVisible()
    
    // Apply filters
    await page.getByRole('combobox', { name: /time range/i }).selectOption('7d')
    await page.getByRole('combobox', { name: /platform/i }).selectOption('twitter')
    
    // Verify filter application
    await expect(page.getByText(/filtered by/i)).toBeVisible()
  })

  test('search and filtering functionality', async ({ page }) => {
    await page.route('**/api/conversations**', async route => {
      const url = new URL(route.request().url())
      const query = url.searchParams.get('q')
      const sentiment = url.searchParams.get('sentiment')
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          conversations: [
            {
              id: '1',
              content: query ? `Content containing ${query}` : 'Sample content',
              platform: 'twitter',
              sentiment: sentiment || 'positive',
              timestamp: new Date().toISOString()
            }
          ],
          total: 1
        })
      })
    })

    await page.goto('/search')
    
    // Perform text search
    await page.getByRole('searchbox', { name: /search/i }).fill('customer feedback')
    await page.getByRole('button', { name: /search/i }).click()
    
    // Verify search results
    await expect(page.getByText(/Content containing customer feedback/i)).toBeVisible()
    
    // Apply sentiment filter
    await page.getByRole('combobox', { name: /sentiment/i }).selectOption('positive')
    
    // Apply date filter
    await page.getByRole('textbox', { name: /start date/i }).fill('2024-01-01')
    await page.getByRole('textbox', { name: /end date/i }).fill('2024-12-31')
    
    // Apply platform filter
    await page.getByRole('checkbox', { name: /twitter/i }).check()
    
    // Save search
    await page.getByRole('button', { name: /save search/i }).click()
    await page.getByRole('textbox', { name: /search name/i }).fill('Customer Feedback Search')
    await page.getByRole('button', { name: /save/i }).click()
    
    // Verify saved search appears
    await expect(page.getByText('Customer Feedback Search')).toBeVisible()
  })

  test('alert configuration and management', async ({ page }) => {
    await page.goto('/settings')
    
    // Navigate to alerts section
    await page.getByRole('tab', { name: /alerts/i }).click()
    
    // Create new alert
    await page.getByRole('button', { name: /create alert/i }).click()
    await page.getByRole('textbox', { name: /alert name/i }).fill('High Priority Alert')
    
    // Configure alert conditions
    await page.getByRole('combobox', { name: /sentiment/i }).selectOption('negative')
    await page.getByRole('spinbutton', { name: /threshold/i }).fill('0.8')
    
    // Configure notifications
    await page.getByRole('checkbox', { name: /email/i }).check()
    await page.getByRole('checkbox', { name: /in-app/i }).check()
    
    await page.getByRole('button', { name: /create/i }).click()
    
    // Verify alert is created
    await expect(page.getByText('High Priority Alert')).toBeVisible()
    
    // Test alert editing
    await page.getByRole('button', { name: /edit.*High Priority Alert/i }).click()
    await page.getByRole('textbox', { name: /alert name/i }).fill('Critical Alert')
    await page.getByRole('button', { name: /save/i }).click()
    
    // Verify alert is updated
    await expect(page.getByText('Critical Alert')).toBeVisible()
  })

  test('data integration workflow', async ({ page }) => {
    await page.goto('/integrations')
    
    // Add new integration
    await page.getByRole('button', { name: /add integration/i }).click()
    await page.getByRole('combobox', { name: /platform/i }).selectOption('zendesk')
    
    // Configure integration
    await page.getByRole('textbox', { name: /subdomain/i }).fill('testcompany')
    await page.getByRole('textbox', { name: /email/i }).fill('admin@testcompany.com')
    await page.getByRole('textbox', { name: /api token/i }).fill('test-token')
    
    await page.getByRole('button', { name: /connect/i }).click()
    
    // Verify integration is added
    await expect(page.getByText('Zendesk')).toBeVisible()
    await expect(page.getByText('Connected')).toBeVisible()
    
    // Test file upload
    await page.getByRole('button', { name: /upload file/i }).click()
    
    // Create a test CSV file
    const csvContent = 'id,content,sentiment\n1,"Great product!",positive\n2,"Needs improvement",negative'
    const file = new File([csvContent], 'test-data.csv', { type: 'text/csv' })
    
    await page.getByRole('textbox', { name: /file/i }).setInputFiles([{
      name: 'test-data.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    }])
    
    await page.getByRole('button', { name: /upload/i }).click()
    
    // Verify upload success
    await expect(page.getByText(/upload successful/i)).toBeVisible()
  })

  test('report generation and export', async ({ page }) => {
    await page.route('**/api/reports**', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'report-123',
            status: 'completed',
            downloadUrl: '/api/reports/download/report-123'
          })
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            reports: [
              {
                id: 'report-123',
                name: 'Sentiment Analysis Report',
                status: 'completed',
                createdAt: new Date().toISOString()
              }
            ]
          })
        })
      }
    })

    await page.goto('/reports')
    
    // Generate new report
    await page.getByRole('button', { name: /generate report/i }).click()
    await page.getByRole('textbox', { name: /report name/i }).fill('Monthly Sentiment Report')
    await page.getByRole('combobox', { name: /report type/i }).selectOption('sentiment-analysis')
    await page.getByRole('combobox', { name: /time range/i }).selectOption('30d')
    await page.getByRole('combobox', { name: /format/i }).selectOption('pdf')
    
    await page.getByRole('button', { name: /generate/i }).click()
    
    // Verify report generation
    await expect(page.getByText('Monthly Sentiment Report')).toBeVisible()
    await expect(page.getByText('Completed')).toBeVisible()
    
    // Test report download
    const downloadPromise = page.waitForDownload()
    await page.getByRole('button', { name: /download/i }).click()
    const download = await downloadPromise
    
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/dashboard')
    
    // Verify mobile navigation
    await expect(page.getByRole('button', { name: /menu/i })).toBeVisible()
    
    // Open mobile menu
    await page.getByRole('button', { name: /menu/i }).click()
    await expect(page.getByRole('navigation')).toBeVisible()
    
    // Navigate using mobile menu
    await page.getByRole('link', { name: /keywords/i }).click()
    await expect(page).toHaveURL('/keywords')
    
    // Verify mobile-optimized layout
    await expect(page.getByRole('main')).toBeVisible()
    
    // Test mobile search
    await page.goto('/search')
    await page.getByRole('searchbox').fill('test query')
    await page.getByRole('button', { name: /search/i }).click()
    
    // Verify mobile search results
    await expect(page.getByRole('main')).toBeVisible()
  })

  test('error handling and recovery', async ({ page }) => {
    // Test network error handling
    await page.route('**/api/conversations**', async route => {
      await route.abort('failed')
    })

    await page.goto('/dashboard')
    
    // Verify error message is displayed
    await expect(page.getByText(/error loading/i)).toBeVisible()
    
    // Test retry functionality
    await page.route('**/api/conversations**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ conversations: [], total: 0 })
      })
    })

    await page.getByRole('button', { name: /retry/i }).click()
    
    // Verify recovery
    await expect(page.getByText(/error loading/i)).not.toBeVisible()
  })
})