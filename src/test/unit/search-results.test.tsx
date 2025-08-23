import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchResults } from '@/components/search/SearchResults'
import { Database } from '@/lib/types/database'

type ConversationRow = Database['public']['Tables']['conversations']['Row']

import { vi } from 'vitest'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => '2024-01-15')
}))

describe('SearchResults', () => {
  const mockConversations: ConversationRow[] = [
    {
      id: 'conv-1',
      tenant_id: 'tenant-1',
      content: 'This is a positive review about the product',
      author: 'john_doe',
      platform: 'reddit',
      url: 'https://reddit.com/r/test/comments/123',
      timestamp: '2024-01-15T10:00:00Z',
      sentiment: 'positive',
      keywords: ['product', 'review'],
      tags: ['feedback', 'positive'],
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z'
    },
    {
      id: 'conv-2',
      tenant_id: 'tenant-1',
      content: 'Having issues with the service',
      author: 'jane_smith',
      platform: 'twitter',
      url: 'https://twitter.com/jane_smith/status/123',
      timestamp: '2024-01-14T15:30:00Z',
      sentiment: 'negative',
      keywords: ['service', 'issues'],
      tags: ['support'],
      created_at: '2024-01-14T15:30:00Z',
      updated_at: '2024-01-14T15:30:00Z'
    }
  ]

  const mockProps = {
    conversations: mockConversations,
    totalCount: 2,
    loading: false,
    error: null,
    currentPage: 1,
    pageSize: 20,
    onPageChange: vi.fn(),
    onConversationClick: vi.fn(),
    onAddTag: vi.fn(),
    showPagination: true
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders search results', () => {
    render(<SearchResults {...mockProps} />)
    
    expect(screen.getByText('Search Results')).toBeInTheDocument()
    expect(screen.getByText('2 conversations')).toBeInTheDocument()
    expect(screen.getByText('This is a positive review about the product')).toBeInTheDocument()
    expect(screen.getByText('Having issues with the service')).toBeInTheDocument()
  })

  it('displays conversation details correctly', () => {
    render(<SearchResults {...mockProps} />)
    
    // Check first conversation
    expect(screen.getByText('Reddit')).toBeInTheDocument()
    expect(screen.getByText('positive')).toBeInTheDocument()
    expect(screen.getByText('john_doe')).toBeInTheDocument()
    expect(screen.getByText('product')).toBeInTheDocument()
    expect(screen.getByText('review')).toBeInTheDocument()
    expect(screen.getByText('#feedback')).toBeInTheDocument()
    expect(screen.getByText('#positive')).toBeInTheDocument()
    
    // Check second conversation
    expect(screen.getByText(/Twitter/)).toBeInTheDocument()
    expect(screen.getByText('negative')).toBeInTheDocument()
    expect(screen.getByText('jane_smith')).toBeInTheDocument()
    expect(screen.getByText('service')).toBeInTheDocument()
    expect(screen.getByText('issues')).toBeInTheDocument()
    expect(screen.getByText('#support')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    const loadingProps = { ...mockProps, loading: true }
    render(<SearchResults {...loadingProps} />)
    
    expect(screen.getByText('Searching conversations...')).toBeInTheDocument()
    expect(screen.getByText('Searching conversations...')).toBeInTheDocument()
  })

  it('shows error state', () => {
    const errorProps = { ...mockProps, error: 'Failed to load conversations' }
    render(<SearchResults {...errorProps} />)
    
    expect(screen.getByText('Failed to load conversations')).toBeInTheDocument()
  })

  it('shows empty state when no conversations found', () => {
    const emptyProps = { ...mockProps, conversations: [], totalCount: 0 }
    render(<SearchResults {...emptyProps} />)
    
    expect(screen.getByText('No conversations found')).toBeInTheDocument()
    expect(screen.getByText('Try adjusting your search criteria or filters to find more results.')).toBeInTheDocument()
  })

  it('handles conversation click', async () => {
    const user = userEvent.setup()
    render(<SearchResults {...mockProps} />)
    
    const viewButtons = screen.getAllByText('View')
    await user.click(viewButtons[0])
    
    expect(mockProps.onConversationClick).toHaveBeenCalledWith(mockConversations[0])
  })

  it('handles adding tags to conversations', async () => {
    const user = userEvent.setup()
    render(<SearchResults {...mockProps} />)
    
    // Click "Add tag" button on first conversation
    const addTagButtons = screen.getAllByText('Add tag')
    await user.click(addTagButtons[0])
    
    // Should show tag input
    const tagInput = screen.getByPlaceholderText('Add tag...')
    expect(tagInput).toBeInTheDocument()
    
    // Type tag and add
    await user.type(tagInput, 'new-tag')
    await user.click(screen.getByText('Add'))
    
    expect(mockProps.onAddTag).toHaveBeenCalledWith('conv-1', 'new-tag')
  })

  it('handles tag input with Enter key', async () => {
    const user = userEvent.setup()
    render(<SearchResults {...mockProps} />)
    
    // Click "Add tag" button
    const addTagButtons = screen.getAllByText('Add tag')
    await user.click(addTagButtons[0])
    
    // Type tag and press Enter
    const tagInput = screen.getByPlaceholderText('Add tag...')
    await user.type(tagInput, 'enter-tag')
    await user.keyboard('{Enter}')
    
    expect(mockProps.onAddTag).toHaveBeenCalledWith('conv-1', 'enter-tag')
  })

  it('handles tag input cancellation', async () => {
    const user = userEvent.setup()
    render(<SearchResults {...mockProps} />)
    
    // Click "Add tag" button
    const addTagButtons = screen.getAllByText('Add tag')
    await user.click(addTagButtons[0])
    
    // Should show tag input and cancel button
    expect(screen.getByPlaceholderText('Add tag...')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    
    // Click cancel
    await user.click(screen.getByText('Cancel'))
    
    // Should hide tag input
    expect(screen.queryByPlaceholderText('Add tag...')).not.toBeInTheDocument()
  })

  it('opens external links correctly', () => {
    render(<SearchResults {...mockProps} />)
    
    const originalLinks = screen.getAllByText('Original')
    expect(originalLinks[0]).toHaveAttribute('href', 'https://reddit.com/r/test/comments/123')
    expect(originalLinks[0]).toHaveAttribute('target', '_blank')
    expect(originalLinks[0]).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('displays pagination when multiple pages', () => {
    const paginationProps = {
      ...mockProps,
      totalCount: 100,
      currentPage: 2,
      pageSize: 20
    }
    
    render(<SearchResults {...paginationProps} />)
    
    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument()
    expect(screen.getByText('Previous')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
    expect(screen.getByText('Showing 21 - 40 of 100')).toBeInTheDocument()
  })

  it('handles pagination navigation', async () => {
    const user = userEvent.setup()
    const paginationProps = {
      ...mockProps,
      totalCount: 100,
      currentPage: 2,
      pageSize: 20
    }
    
    render(<SearchResults {...paginationProps} />)
    
    // Click previous page
    await user.click(screen.getByText('Previous'))
    expect(mockProps.onPageChange).toHaveBeenCalledWith(1)
    
    // Click next page
    await user.click(screen.getByText('Next'))
    expect(mockProps.onPageChange).toHaveBeenCalledWith(3)
    
    // Click specific page number
    await user.click(screen.getByText('4'))
    expect(mockProps.onPageChange).toHaveBeenCalledWith(4)
  })

  it('disables pagination buttons at boundaries', () => {
    const firstPageProps = {
      ...mockProps,
      totalCount: 100,
      currentPage: 1,
      pageSize: 20
    }
    
    render(<SearchResults {...firstPageProps} />)
    
    expect(screen.getByText('Previous')).toBeDisabled()
    expect(screen.getByText('Next')).not.toBeDisabled()
  })

  it('handles pagination with ellipsis for many pages', () => {
    const manyPagesProps = {
      ...mockProps,
      totalCount: 1000,
      currentPage: 10,
      pageSize: 20
    }
    
    render(<SearchResults {...manyPagesProps} />)
    
    expect(screen.getByText('Page 10 of 50')).toBeInTheDocument()
    // Should show ellipsis for large page ranges
    expect(screen.getAllByText('...')).toHaveLength(2)
  })

  it('hides pagination when showPagination is false', () => {
    const noPaginationProps = {
      ...mockProps,
      totalCount: 100,
      showPagination: false
    }
    
    render(<SearchResults {...noPaginationProps} />)
    
    expect(screen.queryByText('Previous')).not.toBeInTheDocument()
    expect(screen.queryByText('Next')).not.toBeInTheDocument()
  })

  it('formats platform names correctly', () => {
    const conversationWithUnderscorePlatform: ConversationRow = {
      ...mockConversations[0],
      platform: 'google_reviews'
    }
    
    const propsWithSpecialPlatform = {
      ...mockProps,
      conversations: [conversationWithUnderscorePlatform]
    }
    
    render(<SearchResults {...propsWithSpecialPlatform} />)
    
    expect(screen.getByText('Google Reviews')).toBeInTheDocument()
  })

  it('handles conversations without optional fields', () => {
    const minimalConversation: ConversationRow = {
      id: 'conv-minimal',
      tenant_id: 'tenant-1',
      content: 'Minimal conversation',
      author: null,
      platform: 'other',
      url: null,
      timestamp: null,
      sentiment: null,
      keywords: null,
      tags: null,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z'
    }
    
    const minimalProps = {
      ...mockProps,
      conversations: [minimalConversation]
    }
    
    render(<SearchResults {...minimalProps} />)
    
    expect(screen.getByText('Minimal conversation')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
    expect(screen.queryByText('Original')).not.toBeInTheDocument()
  })
})