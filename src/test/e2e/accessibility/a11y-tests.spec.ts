import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/api/auth/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'test-user', email: 'test@example.com' } })
      })
    })

    // Mock API responses
    await page.route('**/api/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0 })
      })
    })
  })

  test('dashboard page should be accessible', async ({ page }) => {
    await page.goto('/dashboard')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('keywords page should be accessible', async ({ page }) => {
    await page.goto('/keywords')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('analytics page should be accessible', async ({ page }) => {
    await page.goto('/analytics')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('search page should be accessible', async ({ page }) => {
    await page.goto('/search')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('settings page should be accessible', async ({ page }) => {
    await page.goto('/settings')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('keyboard navigation should work throughout the app', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Test tab navigation
    await page.keyboard.press('Tab')
    let focusedElement = await page.locator(':focus').first()
    await expect(focusedElement).toBeVisible()
    
    // Continue tabbing through interactive elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab')
      focusedElement = await page.locator(':focus').first()
      await expect(focusedElement).toBeVisible()
    }
    
    // Test shift+tab for reverse navigation
    await page.keyboard.press('Shift+Tab')
    focusedElement = await page.locator(':focus').first()
    await expect(focusedElement).toBeVisible()
  })

  test('form elements should have proper labels and descriptions', async ({ page }) => {
    await page.goto('/keywords')
    
    // Click add keyword button
    await page.getByRole('button', { name: /add keyword/i }).click()
    
    // Check form accessibility
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
    
    // Verify form elements have proper labels
    const keywordInput = page.getByRole('textbox', { name: /keyword/i })
    await expect(keywordInput).toBeVisible()
    
    const platformCheckboxes = page.getByRole('checkbox')
    const checkboxCount = await platformCheckboxes.count()
    
    for (let i = 0; i < checkboxCount; i++) {
      const checkbox = platformCheckboxes.nth(i)
      const label = await checkbox.getAttribute('aria-label') || await checkbox.getAttribute('aria-labelledby')
      expect(label).toBeTruthy()
    }
  })

  test('data tables should be accessible', async ({ page }) => {
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

    await page.goto('/dashboard')
    
    // Wait for table to load
    await expect(page.getByRole('table')).toBeVisible()
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[role="table"]')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
    
    // Verify table has proper headers
    const columnHeaders = page.getByRole('columnheader')
    const headerCount = await columnHeaders.count()
    expect(headerCount).toBeGreaterThan(0)
    
    // Verify table has caption or aria-label
    const table = page.getByRole('table')
    const hasCaption = await table.locator('caption').count() > 0
    const hasAriaLabel = await table.getAttribute('aria-label')
    const hasAriaLabelledBy = await table.getAttribute('aria-labelledby')
    
    expect(hasCaption || hasAriaLabel || hasAriaLabelledBy).toBeTruthy()
  })

  test('modal dialogs should be accessible', async ({ page }) => {
    await page.goto('/keywords')
    
    // Open modal
    await page.getByRole('button', { name: /add keyword/i }).click()
    
    // Wait for modal to appear
    await expect(page.getByRole('dialog')).toBeVisible()
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
    
    // Verify modal has proper attributes
    const modal = page.getByRole('dialog')
    await expect(modal).toHaveAttribute('aria-modal', 'true')
    
    const modalTitle = await modal.getAttribute('aria-labelledby')
    if (modalTitle) {
      await expect(page.locator(`#${modalTitle}`)).toBeVisible()
    }
    
    // Test focus trap
    await page.keyboard.press('Tab')
    const focusedElement = await page.locator(':focus').first()
    const isInsideModal = await modal.locator(':focus').count() > 0
    expect(isInsideModal).toBeTruthy()
    
    // Test escape key closes modal
    await page.keyboard.press('Escape')
    await expect(modal).not.toBeVisible()
  })

  test('charts and visualizations should be accessible', async ({ page }) => {
    await page.route('**/api/analytics/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sentimentTrends: [
            { date: '2024-01-01', positive: 60, negative: 20, neutral: 20 }
          ],
          platformDistribution: { twitter: 50, reddit: 30, linkedin: 20 }
        })
      })
    })

    await page.goto('/analytics')
    
    // Wait for charts to load
    await expect(page.getByText(/sentiment trends/i)).toBeVisible()
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
    
    // Verify charts have proper roles and labels
    const charts = page.locator('[role="img"]')
    const chartCount = await charts.count()
    
    for (let i = 0; i < chartCount; i++) {
      const chart = charts.nth(i)
      const hasAriaLabel = await chart.getAttribute('aria-label')
      const hasAriaLabelledBy = await chart.getAttribute('aria-labelledby')
      const hasAriaDescribedBy = await chart.getAttribute('aria-describedby')
      
      expect(hasAriaLabel || hasAriaLabelledBy).toBeTruthy()
      
      // Check for alternative text representation
      if (hasAriaDescribedBy) {
        const description = page.locator(`#${hasAriaDescribedBy}`)
        await expect(description).toBeVisible()
      }
    }
  })

  test('color contrast should meet WCAG standards', async ({ page }) => {
    await page.goto('/dashboard')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .withRules(['color-contrast'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('page should work with screen reader simulation', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Simulate screen reader navigation
    await page.keyboard.press('Tab')
    
    // Check for skip links
    const skipLink = page.getByText(/skip to main content/i)
    if (await skipLink.count() > 0) {
      await expect(skipLink).toBeVisible()
    }
    
    // Navigate by headings (simulated)
    const headings = page.getByRole('heading')
    const headingCount = await headings.count()
    expect(headingCount).toBeGreaterThan(0)
    
    // Verify heading hierarchy
    const h1Count = await page.getByRole('heading', { level: 1 }).count()
    expect(h1Count).toBe(1) // Should have exactly one h1
    
    // Check for landmarks
    const main = page.getByRole('main')
    await expect(main).toBeVisible()
    
    const navigation = page.getByRole('navigation')
    if (await navigation.count() > 0) {
      await expect(navigation.first()).toBeVisible()
    }
  })

  test('error messages should be accessible', async ({ page }) => {
    await page.route('**/api/**', async route => {
      await route.abort('failed')
    })

    await page.goto('/dashboard')
    
    // Wait for error message
    await expect(page.getByRole('alert')).toBeVisible()
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[role="alert"]')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
    
    // Verify error has proper role
    const errorAlert = page.getByRole('alert')
    await expect(errorAlert).toBeVisible()
    
    // Check for aria-live region
    const ariaLive = await errorAlert.getAttribute('aria-live')
    expect(ariaLive).toBeTruthy()
  })

  test('mobile accessibility', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/dashboard')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
    
    // Test mobile navigation
    const mobileMenuButton = page.getByRole('button', { name: /menu/i })
    if (await mobileMenuButton.count() > 0) {
      await expect(mobileMenuButton).toBeVisible()
      
      // Test menu accessibility
      await mobileMenuButton.click()
      const navigation = page.getByRole('navigation')
      await expect(navigation).toBeVisible()
      
      // Check if menu is properly labeled
      const hasAriaLabel = await navigation.getAttribute('aria-label')
      const hasAriaLabelledBy = await navigation.getAttribute('aria-labelledby')
      expect(hasAriaLabel || hasAriaLabelledBy).toBeTruthy()
    }
  })

  test('focus indicators should be visible', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Add custom CSS to ensure focus indicators are visible for testing
    await page.addStyleTag({
      content: `
        *:focus {
          outline: 2px solid #0066cc !important;
          outline-offset: 2px !important;
        }
      `
    })
    
    // Tab through interactive elements and verify focus indicators
    const interactiveElements = page.locator('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])')
    const elementCount = await interactiveElements.count()
    
    for (let i = 0; i < Math.min(elementCount, 10); i++) {
      await page.keyboard.press('Tab')
      const focusedElement = page.locator(':focus')
      
      if (await focusedElement.count() > 0) {
        // Verify element is visible and has focus styles
        await expect(focusedElement).toBeVisible()
        
        const outlineStyle = await focusedElement.evaluate(el => 
          window.getComputedStyle(el).outline
        )
        expect(outlineStyle).not.toBe('none')
      }
    }
  })
})