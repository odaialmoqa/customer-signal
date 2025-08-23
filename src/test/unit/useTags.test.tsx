import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTags, useConversationTags, useBulkTagging } from '@/lib/hooks/useTags'
import { tagService } from '@/lib/services/tag'

// Mock the tag service
vi.mock('@/lib/services/tag')

// Mock fetch for API calls
global.fetch = vi.fn()

const mockTags = [
  { id: '1', name: 'Bug Report', color: '#EF4444', usage_count: 5, is_system_tag: true },
  { id: '2', name: 'Feature Request', color: '#3B82F6', usage_count: 3, is_system_tag: false }
]

describe('useTags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(tagService.getTags as Mock).mockResolvedValue(mockTags)
    ;(tagService.searchTags as Mock).mockResolvedValue(mockTags.slice(0, 1))
    ;(tagService.getPopularTags as Mock).mockResolvedValue(mockTags)
  })

  it('should fetch tags on mount', async () => {
    const { result } = renderHook(() => useTags())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.tags).toEqual(mockTags)
    expect(result.current.error).toBeNull()
    expect(tagService.getTags).toHaveBeenCalledWith(false)
  })

  it('should fetch tags with hierarchy when requested', async () => {
    const { result } = renderHook(() => useTags({ includeHierarchy: true }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(tagService.getTags).toHaveBeenCalledWith(true)
  })

  it('should handle fetch error', async () => {
    const error = new Error('Failed to fetch tags')
    ;(tagService.getTags as Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useTags())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to fetch tags')
    expect(result.current.tags).toEqual([])
  })

  it('should create a new tag', async () => {
    const newTag = { id: '3', name: 'New Tag', color: '#10B981' }
    ;(fetch as Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tag: newTag })
    })

    const { result } = renderHook(() => useTags())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      const createdTag = await result.current.createTag({
        name: 'New Tag',
        color: '#10B981'
      })
      expect(createdTag).toEqual(newTag)
    })

    expect(fetch).toHaveBeenCalledWith('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Tag', color: '#10B981' })
    })
  })

  it('should update a tag', async () => {
    const updatedTag = { id: '1', name: 'Updated Bug Report', color: '#EF4444' }
    ;(fetch as Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tag: updatedTag })
    })

    const { result } = renderHook(() => useTags())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      const tag = await result.current.updateTag('1', { name: 'Updated Bug Report' })
      expect(tag).toEqual(updatedTag)
    })

    expect(fetch).toHaveBeenCalledWith('/api/tags/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Bug Report' })
    })
  })

  it('should delete a tag', async () => {
    ;(fetch as Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    })

    const { result } = renderHook(() => useTags())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.deleteTag('1')
    })

    expect(fetch).toHaveBeenCalledWith('/api/tags/1', {
      method: 'DELETE'
    })
  })

  it('should search tags', async () => {
    const { result } = renderHook(() => useTags())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      const searchResults = await result.current.searchTags('bug')
      expect(searchResults).toEqual(mockTags.slice(0, 1))
    })

    expect(tagService.searchTags).toHaveBeenCalledWith('bug', 10)
  })

  it('should get popular tags', async () => {
    const { result } = renderHook(() => useTags())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      const popularTags = await result.current.getPopularTags()
      expect(popularTags).toEqual(mockTags)
    })

    expect(tagService.getPopularTags).toHaveBeenCalledWith(20)
  })
})

describe('useConversationTags', () => {
  const conversationId = 'conv-1'
  const mockConversationTags = [
    { id: '1', name: 'Bug Report', color: '#EF4444', tagged_at: '2024-01-01', tagged_by: 'user-1', is_auto_tagged: false }
  ]
  const mockSuggestions = [
    { tag_id: 'tag-2', tag_name: 'Feature Request', confidence: 0.85, reason: 'Contains feature keywords' }
  ]

  beforeEach(() => {
    ;(fetch as Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        tags: mockConversationTags, 
        suggestions: mockSuggestions 
      })
    })
  })

  it('should fetch conversation tags and suggestions', async () => {
    const { result } = renderHook(() => useConversationTags(conversationId))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.tags).toEqual(mockConversationTags)
    expect(result.current.suggestions).toEqual(mockSuggestions)
    expect(fetch).toHaveBeenCalledWith(`/api/conversations/${conversationId}/tags`)
  })

  it('should add tags to conversation', async () => {
    ;(fetch as Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tags: mockConversationTags, suggestions: mockSuggestions })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ conversationTags: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tags: mockConversationTags, suggestions: mockSuggestions })
      })

    const { result } = renderHook(() => useConversationTags(conversationId))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.addTags(['tag-1', 'tag-2'])
    })

    expect(fetch).toHaveBeenCalledWith(`/api/conversations/${conversationId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagIds: ['tag-1', 'tag-2'] })
    })
  })

  it('should remove tags from conversation', async () => {
    ;(fetch as Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tags: mockConversationTags, suggestions: mockSuggestions })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tags: [], suggestions: mockSuggestions })
      })

    const { result } = renderHook(() => useConversationTags(conversationId))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.removeTags(['tag-1'])
    })

    expect(fetch).toHaveBeenCalledWith(
      `/api/conversations/${conversationId}/tags?tagIds=tag-1`,
      { method: 'DELETE' }
    )
  })

  it('should accept tag suggestion', async () => {
    ;(fetch as Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tags: mockConversationTags, suggestions: mockSuggestions })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'Tag suggestion accepted' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tags: mockConversationTags, suggestions: [] })
      })

    const { result } = renderHook(() => useConversationTags(conversationId))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.acceptSuggestion('tag-2')
    })

    expect(fetch).toHaveBeenCalledWith('/api/tags/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        tagId: 'tag-2',
        action: 'accept'
      })
    })
  })

  it('should reject tag suggestion', async () => {
    ;(fetch as Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tags: mockConversationTags, suggestions: mockSuggestions })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, message: 'Tag suggestion rejected' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tags: mockConversationTags, suggestions: [] })
      })

    const { result } = renderHook(() => useConversationTags(conversationId))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.rejectSuggestion('tag-2')
    })

    expect(fetch).toHaveBeenCalledWith('/api/tags/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        tagId: 'tag-2',
        action: 'reject'
      })
    })
  })
})

describe('useBulkTagging', () => {
  beforeEach(() => {
    ;(fetch as Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ taggedCount: 5, success: true })
    })
  })

  it('should bulk tag conversations', async () => {
    const { result } = renderHook(() => useBulkTagging())

    expect(result.current.loading).toBe(false)

    await act(async () => {
      const count = await result.current.bulkTag({
        conversationIds: ['conv-1', 'conv-2'],
        tagIds: ['tag-1', 'tag-2']
      })
      expect(count).toBe(5)
    })

    expect(fetch).toHaveBeenCalledWith('/api/conversations/bulk-tag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationIds: ['conv-1', 'conv-2'],
        tagIds: ['tag-1', 'tag-2']
      })
    })
  })

  it('should handle bulk tagging error', async () => {
    ;(fetch as Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Bulk tagging failed' })
    })

    const { result } = renderHook(() => useBulkTagging())

    await act(async () => {
      await expect(result.current.bulkTag({
        conversationIds: ['conv-1'],
        tagIds: ['tag-1']
      })).rejects.toThrow('Bulk tagging failed')
    })

    expect(result.current.error).toBe('Bulk tagging failed')
  })
})