import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdvancedSearchFilters } from '@/components/search/AdvancedSearchFilters'
import { SearchFilters } from '@/lib/services/conversation'

import { vi } from 'vitest'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    if (formatStr === 'yyyy-MM-dd') {
      return '2024-01-15'
    }
    return '2024-01-15'
  }),
  subDays: vi.fn((date, days) => new Date('2024-01-08')),
  startOfDay: vi.fn((date) => new Date('2024-01-08T00:00:00')),
  endOfDay: vi.fn((date) => new Date('2024-01-15T23:59:59'))
}))

describe('AdvancedSearchFilters', () => {
  const mockProps = {
    filters: {} as SearchFilters,
    onFiltersChange: vi.fn(),
    onSearch: vi.fn(),
    loading: false,
    tenantId: 'test-tenant',
    savedSearches: [],
    onSaveSearch: vi.fn(),
    onDeleteSavedSearch: vi.fn(),
    onLoadSavedSearch: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders search filters component', () => {
    render(<AdvancedSearchFilters {...mockProps} />)
    
    expect(screen.getByText('Search & Filters')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter keywords to search conversations...')).toBeInTheDocument()
    expect(screen.getByText('Search')).toBeInTheDocument()
  })

  it('handles search query input', async () => {
    const user = userEvent.setup()
    render(<AdvancedSearchFilters {...mockProps} />)
    
    const searchInput = screen.getByPlaceholderText('Enter keywords to search conversations...')
    await user.type(searchInput, 'test query')
    
    // Should debounce and call onFiltersChange
    await waitFor(() => {
      expect(mockProps.onFiltersChange).toHaveBeenCalledWith({
        query: 'test query'
      })
    }, { timeout: 500 })
  })

  it('handles date range selection', async () => {
    const user = userEvent.setup()
    render(<AdvancedSearchFilters {...mockProps} />)
    
    // Click "Last 7 days" preset
    const last7DaysButton = screen.getByText('Last 7 days')
    await user.click(last7DaysButton)
    
    expect(mockProps.onFiltersChange).toHaveBeenCalledWith({
      startDate: expect.any(String),
      endDate: expect.any(String)
    })
  })

  it('expands and shows advanced filters', async () => {
    const user = userEvent.setup()
    render(<AdvancedSearchFilters {...mockProps} />)
    
    // Initially advanced filters should be hidden
    expect(screen.queryByText('Keywords')).not.toBeInTheDocument()
    
    // Click "Show more"
    const showMoreButton = screen.getByText('Show more')
    await user.click(showMoreButton)
    
    // Advanced filters should now be visible
    expect(screen.getByText('Keywords')).toBeInTheDocument()
    expect(screen.getByText('Tags')).toBeInTheDocument()
    expect(screen.getByText('Platforms')).toBeInTheDocument()
    expect(screen.getByText('Sentiment')).toBeInTheDocument()
  })

  it('handles platform selection', async () => {
    const user = userEvent.setup()
    render(<AdvancedSearchFilters {...mockProps} />)
    
    // Expand filters
    await user.click(screen.getByText('Show more'))
    
    // Select Reddit platform
    const redditButton = screen.getByText('Reddit')
    await user.click(redditButton)
    
    expect(mockProps.onFiltersChange).toHaveBeenCalledWith({
      platforms: ['reddit']
    })
  })

  it('handles sentiment selection', async () => {
    const user = userEvent.setup()
    render(<AdvancedSearchFilters {...mockProps} />)
    
    // Expand filters
    await user.click(screen.getByText('Show more'))
    
    // Select positive sentiment
    const positiveButton = screen.getByText('Positive')
    await user.click(positiveButton)
    
    expect(mockProps.onFiltersChange).toHaveBeenCalledWith({
      sentiments: ['positive']
    })
  })

  it('handles keyword addition and removal', async () => {
    const user = userEvent.setup()
    render(<AdvancedSearchFilters {...mockProps} />)
    
    // Expand filters
    await user.click(screen.getByText('Show more'))
    
    // Add keyword
    const keywordInput = screen.getByPlaceholderText('Add keyword...')
    await user.type(keywordInput, 'test keyword')
    await user.click(screen.getByText('Add'))
    
    expect(mockProps.onFiltersChange).toHaveBeenCalledWith({
      keywords: ['test keyword']
    })
    
    // Mock the updated filters prop
    const updatedProps = {
      ...mockProps,
      filters: { keywords: ['test keyword'] }
    }
    
    render(<AdvancedSearchFilters {...updatedProps} />)
    await user.click(screen.getByText('Show more'))
    
    // Remove keyword
    const removeButton = screen.getByRole('button', { name: /remove/i })
    await user.click(removeButton)
    
    expect(mockProps.onFiltersChange).toHaveBeenCalledWith({})
  })

  it('handles tag addition and removal', async () => {
    const user = userEvent.setup()
    render(<AdvancedSearchFilters {...mockProps} />)
    
    // Expand filters
    await user.click(screen.getByText('Show more'))
    
    // Add tag
    const tagInput = screen.getByPlaceholderText('Add tag...')
    await user.type(tagInput, 'test tag')
    await user.click(screen.getAllByText('Add')[1]) // Second "Add" button for tags
    
    expect(mockProps.onFiltersChange).toHaveBeenCalledWith({
      tags: ['test tag']
    })
  })

  it('applies filter presets', async () => {
    const user = userEvent.setup()
    render(<AdvancedSearchFilters {...mockProps} />)
    
    // Click on "Recent Negative Feedback" preset
    const presetButton = screen.getByText('Recent Negative Feedback')
    await user.click(presetButton)
    
    expect(mockProps.onFiltersChange).toHaveBeenCalledWith({
      sentiments: ['negative'],
      startDate: expect.any(String),
      endDate: expect.any(String)
    })
  })

  it('clears all filters', async () => {
    const user = userEvent.setup()
    const propsWithFilters = {
      ...mockProps,
      filters: {
        query: 'test',
        platforms: ['reddit'],
        sentiments: ['positive']
      } as SearchFilters
    }
    
    render(<AdvancedSearchFilters {...propsWithFilters} />)
    
    // Should show "Clear all" button when filters are active
    const clearButton = screen.getByText('Clear all')
    await user.click(clearButton)
    
    expect(mockProps.onFiltersChange).toHaveBeenCalledWith({})
  })

  it('handles search button click', async () => {
    const user = userEvent.setup()
    render(<AdvancedSearchFilters {...mockProps} />)
    
    const searchButton = screen.getByText('Search')
    await user.click(searchButton)
    
    expect(mockProps.onSearch).toHaveBeenCalledWith({})
  })

  it('shows loading state', () => {
    const loadingProps = { ...mockProps, loading: true }
    render(<AdvancedSearchFilters {...loadingProps} />)
    
    expect(screen.getByText('Searching...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /searching/i })).toBeDisabled()
  })

  it('handles saved searches', async () => {
    const user = userEvent.setup()
    const savedSearches = [
      {
        id: 'search-1',
        name: 'My Saved Search',
        filters: { query: 'saved query' },
        createdAt: '2024-01-15T10:00:00Z'
      }
    ]
    
    const propsWithSavedSearches = {
      ...mockProps,
      savedSearches
    }
    
    render(<AdvancedSearchFilters {...propsWithSavedSearches} />)
    
    // Click saved searches button
    const savedButton = screen.getByText('Saved (1)')
    await user.click(savedButton)
    
    // Should show saved search
    expect(screen.getByText('My Saved Search')).toBeInTheDocument()
    
    // Click on saved search
    const savedSearchButton = screen.getByText('My Saved Search')
    await user.click(savedSearchButton)
    
    expect(mockProps.onLoadSavedSearch).toHaveBeenCalledWith(savedSearches[0])
  })

  it('handles save search dialog', async () => {
    const user = userEvent.setup()
    const propsWithFilters = {
      ...mockProps,
      filters: { query: 'test query' } as SearchFilters
    }
    
    render(<AdvancedSearchFilters {...propsWithFilters} />)
    
    // Click save search button
    const saveButton = screen.getByText('Save Search')
    await user.click(saveButton)
    
    // Should show dialog
    expect(screen.getByText('Save Search')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter search name...')).toBeInTheDocument()
    
    // Enter name and save
    const nameInput = screen.getByPlaceholderText('Enter search name...')
    await user.type(nameInput, 'My New Search')
    
    const saveDialogButton = screen.getAllByText('Save')[1] // Second "Save" button in dialog
    await user.click(saveDialogButton)
    
    expect(mockProps.onSaveSearch).toHaveBeenCalledWith('My New Search', { query: 'test query' })
  })

  it('handles custom date input', async () => {
    const user = userEvent.setup()
    render(<AdvancedSearchFilters {...mockProps} />)
    
    // Find start date input
    const startDateInput = screen.getByLabelText('Start Date')
    await user.type(startDateInput, '2024-01-01')
    
    expect(mockProps.onFiltersChange).toHaveBeenCalledWith({
      startDate: expect.any(String)
    })
  })

  it('shows active filter indicator', () => {
    const propsWithFilters = {
      ...mockProps,
      filters: { query: 'test' } as SearchFilters
    }
    
    render(<AdvancedSearchFilters {...propsWithFilters} />)
    
    expect(screen.getByText('Active')).toBeInTheDocument()
  })
})