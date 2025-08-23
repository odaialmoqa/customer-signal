import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import AnalyticsPage from '@/app/analytics/page'

// Mock the AnalyticsDashboard component
vi.mock('@/components/analytics', () => ({
  AnalyticsDashboard: ({ autoRefresh, refreshInterval }: any) => (
    <div data-testid="analytics-dashboard">
      <div data-testid="auto-refresh">{autoRefresh ? 'enabled' : 'disabled'}</div>
      <div data-testid="refresh-interval">{refreshInterval}</div>
    </div>
  )
}))

describe('AnalyticsPage', () => {
  it('renders analytics dashboard with correct props', () => {
    render(<AnalyticsPage />)
    
    expect(screen.getByTestId('analytics-dashboard')).toBeInTheDocument()
    expect(screen.getByTestId('auto-refresh')).toHaveTextContent('disabled')
    expect(screen.getByTestId('refresh-interval')).toHaveTextContent('300000')
  })

  it('applies correct styling classes', () => {
    const { container } = render(<AnalyticsPage />)
    
    const mainDiv = container.firstChild as HTMLElement
    expect(mainDiv).toHaveClass('min-h-screen', 'bg-gray-50')
    
    const contentDiv = mainDiv.firstChild as HTMLElement
    expect(contentDiv).toHaveClass('max-w-7xl', 'mx-auto', 'px-4', 'sm:px-6', 'lg:px-8', 'py-8')
  })
})