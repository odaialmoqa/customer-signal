import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagInput, TagFilter, ConversationTagger } from '@/components/tags'
import { useTags, useConversationTags } from '@/lib/hooks/useTags'

// Mock the hooks
vi.mock('@/lib/hooks/useTags')

const mockTags = [
  { id: '1', name: 'Bug Report', color: '#EF4444', usage_count: 5, is_system_tag: true, tenant_id: 'tenant-1', description: null, parent_tag_id: null, created_by: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '2', name: 'Feature Request', color: '#3B82F6', usage_count: 3, is_system_tag: false, tenant_id: 'tenant-1', description: null, parent_tag_id: null, created_by: null, created_at: '2024-01-01', updated_at: '2024-01-01' }
]

describe('TagInput', () => {
  const mockOnTagsChange = vi.fn()
  const mockSearchTags = vi.fn()
  const mockCreateTag = vi.fn()
  const mockGetPopularTags = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useTags as Mock).mockReturnValue({
      searchTags: mockSearchTags,
      createTag: mockCreateTag,
      getPopularTags: mockGetPopularTags
    })
    mockSearchTags.mockResolvedValue(mockTags)
    mockGetPopularTags.mockResolvedValue(mockTags)
  })

  it('should render with placeholder', () => {
    render(
      <TagInput
        selectedTags={[]}
        onTagsChange={mockOnTagsChange}
        placeholder="Add tags..."
      />
    )

    expect(screen.getByPlaceholderText('Add tags...')).toBeInTheDocument()
  })

  it('should display selected tags', () => {
    render(
      <TagInput
        selectedTags={[mockTags[0]]}
        onTagsChange={mockOnTagsChange}
      />
    )

    expect(screen.getByText('Bug Report')).toBeInTheDocument()
  })

  it('should show suggestions when typing', async () => {
    const user = userEvent.setup()
    
    render(
      <TagInput
        selectedTags={[]}
        onTagsChange={mockOnTagsChange}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'bug')

    await waitFor(() => {
      expect(mockSearchTags).toHaveBeenCalledWith('bug', 10)
    })
  })

  it('should select a tag from suggestions', async () => {
    const user = userEvent.setup()
    
    render(
      <TagInput
        selectedTags={[]}
        onTagsChange={mockOnTagsChange}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'bug')

    await waitFor(() => {
      expect(screen.getByText('Bug Report')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Bug Report'))

    expect(mockOnTagsChange).toHaveBeenCalledWith([mockTags[0]])
  })

  it('should create a new tag when allowCreate is true', async () => {
    const user = userEvent.setup()
    const newTag = { id: '3', name: 'New Tag', color: '#10B981' }
    mockCreateTag.mockResolvedValue(newTag)
    mockSearchTags.mockResolvedValue([])

    render(
      <TagInput
        selectedTags={[]}
        onTagsChange={mockOnTagsChange}
        allowCreate={true}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'New Tag')

    await waitFor(() => {
      expect(screen.getByText('Create "New Tag"')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Create "New Tag"'))

    await waitFor(() => {
      expect(mockCreateTag).toHaveBeenCalledWith({ name: 'New Tag' })
    })
  })

  it('should remove a tag when clicking the remove button', async () => {
    const user = userEvent.setup()
    
    render(
      <TagInput
        selectedTags={[mockTags[0]]}
        onTagsChange={mockOnTagsChange}
      />
    )

    const removeButton = screen.getByRole('button')
    await user.click(removeButton)

    expect(mockOnTagsChange).toHaveBeenCalledWith([])
  })

  it('should respect maxTags limit', () => {
    render(
      <TagInput
        selectedTags={[mockTags[0], mockTags[1]]}
        onTagsChange={mockOnTagsChange}
        maxTags={2}
      />
    )

    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()
  })
})

describe('TagFilter', () => {
  const mockOnChange = vi.fn()
  const mockUseTags = {
    tags: mockTags,
    loading: false,
    getPopularTags: vi.fn().mockResolvedValue(mockTags)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useTags as Mock).mockReturnValue(mockUseTags)
  })

  it('should render collapsed by default', () => {
    render(
      <TagFilter
        value={{ includeTags: [], excludeTags: [], tagOperator: 'AND' }}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByText('Filter by Tags')).toBeInTheDocument()
    expect(screen.queryByText('Active Filters')).not.toBeInTheDocument()
  })

  it('should expand when clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <TagFilter
        value={{ includeTags: [], excludeTags: [], tagOperator: 'AND' }}
        onChange={mockOnChange}
      />
    )

    await user.click(screen.getByText('Filter by Tags'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search tags...')).toBeInTheDocument()
    })
  })

  it('should show active filters count', () => {
    render(
      <TagFilter
        value={{ includeTags: ['1'], excludeTags: ['2'], tagOperator: 'AND' }}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('should toggle tag inclusion', async () => {
    const user = userEvent.setup()
    
    render(
      <TagFilter
        value={{ includeTags: [], excludeTags: [], tagOperator: 'AND' }}
        onChange={mockOnChange}
      />
    )

    await user.click(screen.getByText('Filter by Tags'))

    await waitFor(() => {
      expect(screen.getByText('Bug Report')).toBeInTheDocument()
    })

    const includeButton = screen.getAllByRole('button').find(btn => 
      btn.getAttribute('title') === 'Include this tag'
    )
    
    if (includeButton) {
      await user.click(includeButton)
      
      expect(mockOnChange).toHaveBeenCalledWith({
        includeTags: ['1'],
        excludeTags: [],
        tagOperator: 'AND'
      })
    }
  })

  it('should clear all filters', async () => {
    const user = userEvent.setup()
    
    render(
      <TagFilter
        value={{ includeTags: ['1'], excludeTags: ['2'], tagOperator: 'AND' }}
        onChange={mockOnChange}
      />
    )

    await user.click(screen.getByText('Filter by Tags'))

    await waitFor(() => {
      expect(screen.getByText('Clear All')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Clear All'))

    expect(mockOnChange).toHaveBeenCalledWith({
      includeTags: [],
      excludeTags: [],
      tagOperator: 'AND'
    })
  })
})

describe('ConversationTagger', () => {
  const conversationId = 'conv-1'
  const mockConversationTags = [
    { 
      id: '1', 
      name: 'Bug Report', 
      color: '#EF4444', 
      tagged_at: '2024-01-01', 
      tagged_by: 'user-1', 
      is_auto_tagged: false,
      tenant_id: 'tenant-1',
      description: null,
      parent_tag_id: null,
      usage_count: 5,
      is_system_tag: true,
      created_by: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    }
  ]
  const mockSuggestions = [
    { tag_id: 'tag-2', tag_name: 'Feature Request', confidence: 0.85, reason: 'Contains feature keywords' }
  ]

  const mockUseConversationTags = {
    tags: mockConversationTags,
    suggestions: mockSuggestions,
    loading: false,
    error: null,
    addTags: vi.fn(),
    removeTags: vi.fn(),
    acceptSuggestion: vi.fn(),
    rejectSuggestion: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useConversationTags as Mock).mockReturnValue(mockUseConversationTags)
  })

  it('should display current tags', () => {
    render(<ConversationTagger conversationId={conversationId} />)

    expect(screen.getByText('Tags')).toBeInTheDocument()
    expect(screen.getByText('Bug Report')).toBeInTheDocument()
  })

  it('should show edit button', () => {
    render(<ConversationTagger conversationId={conversationId} />)

    expect(screen.getByText('Edit')).toBeInTheDocument()
  })

  it('should display tag suggestions', () => {
    render(<ConversationTagger conversationId={conversationId} />)

    expect(screen.getByText('Suggested Tags')).toBeInTheDocument()
    expect(screen.getByText('Feature Request')).toBeInTheDocument()
    expect(screen.getByText('85% confidence')).toBeInTheDocument()
  })

  it('should accept tag suggestion', async () => {
    const user = userEvent.setup()
    
    render(<ConversationTagger conversationId={conversationId} />)

    const acceptButton = screen.getByTitle('Accept suggestion')
    await user.click(acceptButton)

    expect(mockUseConversationTags.acceptSuggestion).toHaveBeenCalledWith('tag-2')
  })

  it('should reject tag suggestion', async () => {
    const user = userEvent.setup()
    
    render(<ConversationTagger conversationId={conversationId} />)

    const rejectButton = screen.getByTitle('Reject suggestion')
    await user.click(rejectButton)

    expect(mockUseConversationTags.rejectSuggestion).toHaveBeenCalledWith('tag-2')
  })

  it('should show loading state', () => {
    ;(useConversationTags as Mock).mockReturnValue({
      ...mockUseConversationTags,
      loading: true
    })

    render(<ConversationTagger conversationId={conversationId} />)

    expect(screen.getByText('Loading tags...')).toBeInTheDocument()
  })

  it('should show error state', () => {
    ;(useConversationTags as Mock).mockReturnValue({
      ...mockUseConversationTags,
      error: 'Failed to load tags'
    })

    render(<ConversationTagger conversationId={conversationId} />)

    expect(screen.getByText('Failed to load tags')).toBeInTheDocument()
  })

  it('should show no tags message when empty', () => {
    ;(useConversationTags as Mock).mockReturnValue({
      ...mockUseConversationTags,
      tags: []
    })

    render(<ConversationTagger conversationId={conversationId} />)

    expect(screen.getByText('No tags')).toBeInTheDocument()
  })
})