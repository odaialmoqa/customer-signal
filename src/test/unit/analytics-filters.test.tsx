import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnalyticsFilters } from '@/components/analytics'
import { AnalyticsFilters as FiltersType } from '@/lib/services/analytics'

describe('AnalyticsFilters', () => {
  const mockOnFiltersChange = vi.fn()
  const defaultFilters: FiltersType = {}

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders filter component with all sections', () => {
    render(
      <AnalyticsFilters 
        filters={defaultFilters} 
        onFiltersChange={mockOnFiltersChange} 
      />
    )
    
    expect(screen.getByText('Filters')).toBeInTheDocument()
    expect(screen.getByText('Quick Date Ranges')).toBeInTheDocument()
    expect(screen.getByText('Start Date')).toBeInTheDocument()
    expect(screen.getByText('End Date')).toBeInTheDocument()
  })

  it('shows active indicator when filters are applied', () => {
    const filtersWithData: FiltersType = {
      startDate: '2024-01-01T00:00:00Z',
      keywords: ['test']
    }
    
    render(
      <AnalyticsFilters 
        filters={filtersWithData} 
        onFiltersChange={mockOnFiltersChange} 
      />
    )
    
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Clear all')).toBeInTheDocument()
  })

  it('handles quick date range selection', async () => {
    render(
      <AnalyticsFilters 
        filters={defaultFilters} 
        onFiltersChange={mockOnFiltersChange} 
      />
    )
    
    const last7DaysButton = screen.getByText('Last 7 days')
    fireEvent.click(last7DaysButton)
    
    await waitFor(() => {
      expect(mockOnFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(String),
          endDate: expect.any(String)
        })
      )
    })
  })

  it('handles custom date input', async () => {
    render(
      <AnalyticsFilters 
        filters={defaultFilters} 
        onFiltersChange={mockOnFiltersChange} 
      />
    )
    
    const dateInputs = screen.getAllByDisplayValue('')
    const startDateInput = dateInputs[0] // First date input is start date
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } })
    
    await waitFor(() => {
      expect(mockOnFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.stringContaining('2024-01-01')
        })
      )
    })
  })

  it('expands to show additional filters', async () => {
    render(
      <AnalyticsFilters 
        filters={defaultFilters} 
        onFiltersChange={mockOnFiltersChange} 
      />
    )
    
    const showMoreButton = screen.getByText('Show more')
    fireEvent.click(showMoreButton)
    
    await waitFor(() => {
      expect(screen.getByText('Keywords')).toBeInTheDocument()
      expect(screen.getByText('Platforms')).toBeInTheDocument()
      expect(screen.getByText('Sentiment')).toBeInTheDocument()
      expect(screen.getByText('Time Interval')).toBeInTheDocument()
    })
  })

  it('handles keyword addition', async () => {
    render(
      <AnalyticsFilters 
        filters={defaultFilters} 
        onFiltersChange={mockOnFiltersChange} 
      />
    )
    
    // Expand filters first
    fireEvent.click(screen.getByText('Show more'))
    
    await waitFor(() => {
      const keywordInput = screen.getByPlaceholderText('Add keyword...')
      const addButton = screen.getByText('Add')
      
      fireEvent.change(keywordInput, { target: { value: 'customer service' } })
      fireEvent.click(addButton)
      
      expect(mockOnFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          keywords: ['customer service']
        })
      )
    })
  })

  it('handles keyword addition with Enter key', async () => {
    render(
      <AnalyticsFilters 
        filters={defaultFilters} 
        onFiltersChange={mockOnFiltersChange} 
      />
    )
    
    // Expand filters first
    fireEvent.click(screen.getByText('Show more'))
    
    await waitFor(() => {
      const keywordInput = screen.getByPlaceholderText('Add keyword...')
      
      fireEvent.change(keywordInput, { target: { value: 'test keyword' } })
      fireEvent.keyDown(keywordInput, { key: 'Enter', code: 'Enter' })
      
      expect(mockOnFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          keywords: ['test keyword']
        })
      )
    })
  })

  it('handles keyword removal', async () => {
    const filtersWithKeywords: FiltersType = {
      keywords: ['customer service', 'product quality']
    }
    
    render(
      <AnalyticsFilters 
        filters={filtersWithKeywords} 
        onFiltersChange={mockOnFiltersChange} 
      />
    )
    
    // Expand filters first
    fireEvent.click(screen.getByText('Show more'))
    
    await waitFor(() => {
      const removeButtons = screen.getAllByRole('button', { name: '' })
      const removeButton = removeButtons.find(button => 
        button.closest('.inline-flex')?.textContent?.includes('customer service')
      )
      
      if (removeButton) {
        fireEvent.click(removeButton)
        
        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            keywords: ['product quality']
          })
        )
      }
    })
  })

  it('handles platform selection', async () => {
    render(
      <AnalyticsFilters 
        filters={defaultFilters} 
        onFiltersChange={mockOnFiltersChange} 
      />
    )
    
    // Expand filters first
    fireEvent.click(screen.getByText('Show more'))
    
    await waitFor(() => {
      const twitterButton = screen.getByText('Twitter')
      fireEvent.click(twitterButton)
      
      expect(mockOnFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          platforms: ['twitter']
        })
      )
    })
  })

  it('handles sentiment selection', async () => {
    render(
      <AnalyticsFilters 
        filters={defaultFilters} 
        onFiltersChange={mockOnFiltersChange} 
      />
    )
    
    // Expand filters first
    fireEvent.click(screen.getByText('Show more'))
    
    await waitFor(() => {
      const positiveButton = screen.getByText('Positive')
      fireEvent.click(positiveButton)
      
      expect(mockOnFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          sentiments: ['positive']
        })
      )
    })
  })

  it('handles interval type selection', async () => {
    render(
      <AnalyticsFilters 
        filters={defaultFilters} 
        onFiltersChange={mockOnFiltersChange} 
      />
    )
    
    // Expand filters first
    fireEvent.click(screen.getByText('Show more'))
    
    await waitFor(() => {
      const weeklyButton = screen.getByText('Weekly')
      fireEvent.click(weeklyButton)
      
      expect(mockOnFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          intervalType: 'week'
        })
      )
    })
  })

  it('clears all filters when clear all is clicked', async () => {
    const filtersWithData: FiltersType = {
      startDate: '2024-01-01T00:00:00Z',
      keywords: ['test'],
      platforms: ['twitter'],
      sentiments: ['positive']
    }
    
    render(
      <AnalyticsFilters 
        filters={filtersWithData} 
        onFiltersChange={mockOnFiltersChange} 
      />
    )
    
    const clearAllButton = screen.getByText('Clear all')
    fireEvent.click(clearAllButton)
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({})
  })

  it('disables inputs when loading', () => {
    render(
      <AnalyticsFilters 
        filters={defaultFilters} 
        onFiltersChange={mockOnFiltersChange}
        loading={true}
      />
    )
    
    const dateInputs = screen.getAllByDisplayValue('')
    
    expect(dateInputs[0]).toBeDisabled()
    expect(dateInputs[1]).toBeDisabled()
  })

  it('shows selected platforms with active styling', async () => {
    const filtersWithPlatforms: FiltersType = {
      platforms: ['twitter', 'reddit']
    }
    
    render(
      <AnalyticsFilters 
        filters={filtersWithPlatforms} 
        onFiltersChange={mockOnFiltersChange} 
      />
    )
    
    // Expand filters first
    fireEvent.click(screen.getByText('Show more'))
    
    await waitFor(() => {
      const twitterButton = screen.getByText('Twitter')
      const redditButton = screen.getByText('Reddit')
      
      expect(twitterButton).toHaveClass('bg-blue-100', 'text-blue-800')
      expect(redditButton).toHaveClass('bg-blue-100', 'text-blue-800')
    })
  })

  it('shows selected sentiments with appropriate colors', async () => {
    const filtersWithSentiments: FiltersType = {
      sentiments: ['positive', 'negative']
    }
    
    render(
      <AnalyticsFilters 
        filters={filtersWithSentiments} 
        onFiltersChange={mockOnFiltersChange} 
      />
    )
    
    // Expand filters first
    fireEvent.click(screen.getByText('Show more'))
    
    await waitFor(() => {
      const positiveButton = screen.getByText('Positive')
      const negativeButton = screen.getByText('Negative')
      
      expect(positiveButton).toHaveClass('bg-green-100', 'text-green-800')
      expect(negativeButton).toHaveClass('bg-red-100', 'text-red-800')
    })
  })
})