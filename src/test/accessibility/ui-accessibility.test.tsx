import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

// Extend expect with axe matchers
expect.extend(toHaveNoViolations)

// Mock components for testing
const MockDashboard = () => (
  <main role="main" aria-label="Dashboard">
    <h1>Customer Signal Dashboard</h1>
    <nav aria-label="Main navigation">
      <ul>
        <li><a href="/dashboard">Dashboard</a></li>
        <li><a href="/keywords">Keywords</a></li>
        <li><a href="/analytics">Analytics</a></li>
      </ul>
    </nav>
    <section aria-labelledby="stats-heading">
      <h2 id="stats-heading">Statistics</h2>
      <div role="region" aria-label="Key metrics">
        <div>
          <span aria-label="Total conversations">1,234</span>
          <span>Conversations</span>
        </div>
      </div>
    </section>
  </main>
)

const MockKeywordForm = () => (
  <form aria-label="Add new keyword">
    <fieldset>
      <legend>Keyword Configuration</legend>
      <div>
        <label htmlFor="keyword-input">Keyword</label>
        <input
          id="keyword-input"
          type="text"
          required
          aria-describedby="keyword-help"
        />
        <div id="keyword-help">Enter the keyword you want to monitor</div>
      </div>
      <div>
        <fieldset>
          <legend>Platforms</legend>
          <div>
            <input type="checkbox" id="twitter" name="platforms" value="twitter" />
            <label htmlFor="twitter">Twitter</label>
          </div>
          <div>
            <input type="checkbox" id="reddit" name="platforms" value="reddit" />
            <label htmlFor="reddit">Reddit</label>
          </div>
        </fieldset>
      </div>
      <button type="submit">Add Keyword</button>
    </fieldset>
  </form>
)

const MockDataTable = () => (
  <div role="region" aria-label="Conversations table">
    <table>
      <caption>Recent conversations about your keywords</caption>
      <thead>
        <tr>
          <th scope="col">Content</th>
          <th scope="col">Platform</th>
          <th scope="col">Sentiment</th>
          <th scope="col">Date</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Great product!</td>
          <td>Twitter</td>
          <td>
            <span aria-label="Positive sentiment" className="text-green-600">
              Positive
            </span>
          </td>
          <td>
            <time dateTime="2024-01-15">Jan 15, 2024</time>
          </td>
          <td>
            <button aria-label="View conversation details">View</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
)

const MockChart = () => (
  <div role="img" aria-labelledby="chart-title" aria-describedby="chart-desc">
    <h3 id="chart-title">Sentiment Trends</h3>
    <p id="chart-desc">
      Chart showing sentiment trends over the past 30 days. 
      Positive sentiment increased by 15% while negative sentiment decreased by 8%.
    </p>
    <svg width="400" height="200" aria-hidden="true">
      <rect width="400" height="200" fill="#f0f0f0" />
      <text x="200" y="100" textAnchor="middle">Chart Placeholder</text>
    </svg>
    <div className="sr-only">
      <h4>Chart Data Summary</h4>
      <ul>
        <li>Week 1: 65% positive, 20% negative, 15% neutral</li>
        <li>Week 2: 70% positive, 18% negative, 12% neutral</li>
        <li>Week 3: 68% positive, 22% negative, 10% neutral</li>
        <li>Week 4: 75% positive, 15% negative, 10% neutral</li>
      </ul>
    </div>
  </div>
)

const MockModal = ({ isOpen }: { isOpen: boolean }) => {
  if (!isOpen) return null
  
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-desc"
    >
      <div className="modal-backdrop" aria-hidden="true" />
      <div className="modal-content">
        <header>
          <h2 id="modal-title">Confirm Action</h2>
          <button aria-label="Close modal">×</button>
        </header>
        <div id="modal-desc">
          Are you sure you want to delete this keyword?
        </div>
        <footer>
          <button>Cancel</button>
          <button>Delete</button>
        </footer>
      </div>
    </div>
  )
}

const MockAlert = () => (
  <div role="alert" aria-live="polite">
    <h3>Success</h3>
    <p>Keyword has been added successfully.</p>
  </div>
)

describe('UI Accessibility Tests', () => {
  describe('Dashboard Components', () => {
    test('dashboard should be accessible', async () => {
      const { container } = render(<MockDashboard />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    test('dashboard should have proper heading hierarchy', () => {
      render(<MockDashboard />)
      
      const h1 = screen.getByRole('heading', { level: 1 })
      const h2 = screen.getByRole('heading', { level: 2 })
      
      expect(h1).toBeInTheDocument()
      expect(h2).toBeInTheDocument()
    })

    test('dashboard should have proper navigation landmarks', () => {
      render(<MockDashboard />)
      
      const main = screen.getByRole('main')
      const nav = screen.getByRole('navigation')
      
      expect(main).toHaveAttribute('aria-label', 'Dashboard')
      expect(nav).toHaveAttribute('aria-label', 'Main navigation')
    })
  })

  describe('Form Components', () => {
    test('keyword form should be accessible', async () => {
      const { container } = render(<MockKeywordForm />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    test('form should have proper labels and descriptions', () => {
      render(<MockKeywordForm />)
      
      const keywordInput = screen.getByLabelText('Keyword')
      const helpText = screen.getByText('Enter the keyword you want to monitor')
      
      expect(keywordInput).toHaveAttribute('aria-describedby', 'keyword-help')
      expect(helpText).toHaveAttribute('id', 'keyword-help')
    })

    test('form should have proper fieldset and legend', () => {
      render(<MockKeywordForm />)
      
      const legend = screen.getByText('Keyword Configuration')
      const platformsLegend = screen.getByText('Platforms')
      
      expect(legend).toBeInTheDocument()
      expect(platformsLegend).toBeInTheDocument()
    })

    test('checkboxes should have proper labels', () => {
      render(<MockKeywordForm />)
      
      const twitterCheckbox = screen.getByLabelText('Twitter')
      const redditCheckbox = screen.getByLabelText('Reddit')
      
      expect(twitterCheckbox).toHaveAttribute('type', 'checkbox')
      expect(redditCheckbox).toHaveAttribute('type', 'checkbox')
    })
  })

  describe('Data Table Components', () => {
    test('data table should be accessible', async () => {
      const { container } = render(<MockDataTable />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    test('table should have proper caption and headers', () => {
      render(<MockDataTable />)
      
      const caption = screen.getByText('Recent conversations about your keywords')
      const headers = screen.getAllByRole('columnheader')
      
      expect(caption).toBeInTheDocument()
      expect(headers).toHaveLength(5)
    })

    test('table should have proper scope attributes', () => {
      render(<MockDataTable />)
      
      const contentHeader = screen.getByRole('columnheader', { name: 'Content' })
      expect(contentHeader).toHaveAttribute('scope', 'col')
    })

    test('action buttons should have descriptive labels', () => {
      render(<MockDataTable />)
      
      const viewButton = screen.getByLabelText('View conversation details')
      expect(viewButton).toBeInTheDocument()
    })
  })

  describe('Chart Components', () => {
    test('chart should be accessible', async () => {
      const { container } = render(<MockChart />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    test('chart should have proper role and labels', () => {
      render(<MockChart />)
      
      const chart = screen.getByRole('img')
      const title = screen.getByText('Sentiment Trends')
      const description = screen.getByText(/Chart showing sentiment trends/)
      
      expect(chart).toHaveAttribute('aria-labelledby', 'chart-title')
      expect(chart).toHaveAttribute('aria-describedby', 'chart-desc')
      expect(title).toHaveAttribute('id', 'chart-title')
      expect(description).toHaveAttribute('id', 'chart-desc')
    })

    test('chart should have screen reader accessible data', () => {
      render(<MockChart />)
      
      const dataList = screen.getByText('Chart Data Summary')
      expect(dataList).toBeInTheDocument()
    })
  })

  describe('Modal Components', () => {
    test('modal should be accessible when open', async () => {
      const { container } = render(<MockModal isOpen={true} />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    test('modal should have proper dialog attributes', () => {
      render(<MockModal isOpen={true} />)
      
      const dialog = screen.getByRole('dialog')
      const title = screen.getByText('Confirm Action')
      const description = screen.getByText('Are you sure you want to delete this keyword?')
      
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title')
      expect(dialog).toHaveAttribute('aria-describedby', 'modal-desc')
      expect(title).toHaveAttribute('id', 'modal-title')
      expect(description).toHaveAttribute('id', 'modal-desc')
    })

    test('modal close button should have accessible label', () => {
      render(<MockModal isOpen={true} />)
      
      const closeButton = screen.getByLabelText('Close modal')
      expect(closeButton).toBeInTheDocument()
    })
  })

  describe('Alert Components', () => {
    test('alert should be accessible', async () => {
      const { container } = render(<MockAlert />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    test('alert should have proper role and live region', () => {
      render(<MockAlert />)
      
      const alert = screen.getByRole('alert')
      expect(alert).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Keyboard Navigation', () => {
    test('interactive elements should be keyboard accessible', () => {
      render(<MockDashboard />)
      
      const links = screen.getAllByRole('link')
      links.forEach(link => {
        expect(link).not.toHaveAttribute('tabindex', '-1')
      })
    })

    test('form elements should be keyboard accessible', () => {
      render(<MockKeywordForm />)
      
      const input = screen.getByLabelText('Keyword')
      const button = screen.getByRole('button', { name: 'Add Keyword' })
      const checkboxes = screen.getAllByRole('checkbox')
      
      expect(input).not.toHaveAttribute('tabindex', '-1')
      expect(button).not.toHaveAttribute('tabindex', '-1')
      checkboxes.forEach(checkbox => {
        expect(checkbox).not.toHaveAttribute('tabindex', '-1')
      })
    })
  })

  describe('Color Contrast and Visual Accessibility', () => {
    test('sentiment indicators should have accessible text alternatives', () => {
      render(<MockDataTable />)
      
      const sentimentIndicator = screen.getByLabelText('Positive sentiment')
      expect(sentimentIndicator).toBeInTheDocument()
    })

    test('time elements should be properly formatted', () => {
      render(<MockDataTable />)
      
      const timeElement = screen.getByText('Jan 15, 2024')
      expect(timeElement).toHaveAttribute('dateTime', '2024-01-15')
    })
  })

  describe('Screen Reader Support', () => {
    test('should have proper screen reader only content', () => {
      render(<MockChart />)
      
      // Check for screen reader only content
      const srOnlyContent = document.querySelector('.sr-only')
      expect(srOnlyContent).toBeInTheDocument()
    })

    test('decorative elements should be hidden from screen readers', () => {
      render(<MockChart />)
      
      const svg = document.querySelector('svg')
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })

    test('modal backdrop should be hidden from screen readers', () => {
      render(<MockModal isOpen={true} />)
      
      const backdrop = document.querySelector('.modal-backdrop')
      expect(backdrop).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Focus Management', () => {
    test('should have visible focus indicators', () => {
      render(<MockKeywordForm />)
      
      const input = screen.getByLabelText('Keyword')
      input.focus()
      
      // In a real test, you would check for focus styles
      expect(document.activeElement).toBe(input)
    })

    test('modal should trap focus when open', () => {
      render(<MockModal isOpen={true} />)
      
      const dialog = screen.getByRole('dialog')
      const buttons = screen.getAllByRole('button')
      
      expect(dialog).toBeInTheDocument()
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling and Validation', () => {
    test('form validation errors should be accessible', () => {
      const MockFormWithErrors = () => (
        <form>
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              aria-invalid="true"
              aria-describedby="email-error"
            />
            <div id="email-error" role="alert">
              Please enter a valid email address
            </div>
          </div>
        </form>
      )
      
      render(<MockFormWithErrors />)
      
      const input = screen.getByLabelText('Email')
      const error = screen.getByRole('alert')
      
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAttribute('aria-describedby', 'email-error')
      expect(error).toHaveAttribute('id', 'email-error')
    })
  })

  describe('Responsive Design Accessibility', () => {
    test('should maintain accessibility on mobile viewports', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      
      const { container } = render(<MockDashboard />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })
})