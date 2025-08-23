import { useState, useEffect, useCallback } from 'react'
import { tagService, TagWithHierarchy, TagStats, BulkTagRequest, TagSuggestionResponse } from '@/lib/services/tag'
import { Database } from '@/lib/types/database'

type Tag = Database['public']['Tables']['tags']['Row']
type TagInsert = Database['public']['Tables']['tags']['Insert']
type TagUpdate = Database['public']['Tables']['tags']['Update']

export interface UseTagsOptions {
  includeHierarchy?: boolean
  autoRefresh?: boolean
}

export interface UseTagsReturn {
  tags: Tag[] | TagWithHierarchy[]
  loading: boolean
  error: string | null
  createTag: (tag: Omit<TagInsert, 'tenant_id' | 'created_by'>) => Promise<Tag>
  updateTag: (id: string, updates: TagUpdate) => Promise<Tag>
  deleteTag: (id: string) => Promise<void>
  searchTags: (query: string, limit?: number) => Promise<Tag[]>
  getPopularTags: (limit?: number) => Promise<Tag[]>
  refreshTags: () => Promise<void>
}

export function useTags(options: UseTagsOptions = {}): UseTagsReturn {
  const { includeHierarchy = false, autoRefresh = true } = options
  
  const [tags, setTags] = useState<Tag[] | TagWithHierarchy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const fetchedTags = await tagService.getTags(includeHierarchy)
      setTags(fetchedTags)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tags')
    } finally {
      setLoading(false)
    }
  }, [includeHierarchy])

  const createTag = useCallback(async (tag: Omit<TagInsert, 'tenant_id' | 'created_by'>): Promise<Tag> => {
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tag)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create tag')
      }

      const { tag: newTag } = await response.json()
      
      if (autoRefresh) {
        await fetchTags()
      }
      
      return newTag
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create tag'
      setError(errorMessage)
      throw err
    }
  }, [autoRefresh, fetchTags])

  const updateTag = useCallback(async (id: string, updates: TagUpdate): Promise<Tag> => {
    try {
      const response = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update tag')
      }

      const { tag: updatedTag } = await response.json()
      
      if (autoRefresh) {
        await fetchTags()
      }
      
      return updatedTag
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update tag'
      setError(errorMessage)
      throw err
    }
  }, [autoRefresh, fetchTags])

  const deleteTag = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/tags/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete tag')
      }
      
      if (autoRefresh) {
        await fetchTags()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete tag'
      setError(errorMessage)
      throw err
    }
  }, [autoRefresh, fetchTags])

  const searchTags = useCallback(async (query: string, limit = 10): Promise<Tag[]> => {
    try {
      const response = await fetch(`/api/tags?search=${encodeURIComponent(query)}&limit=${limit}`)
      
      if (!response.ok) {
        throw new Error('Failed to search tags')
      }

      const { tags: searchResults } = await response.json()
      return searchResults
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search tags')
      return []
    }
  }, [])

  const getPopularTags = useCallback(async (limit = 20): Promise<Tag[]> => {
    try {
      const response = await fetch(`/api/tags?popular=true&limit=${limit}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch popular tags')
      }

      const { tags: popularTags } = await response.json()
      return popularTags
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch popular tags')
      return []
    }
  }, [])

  const refreshTags = useCallback(async () => {
    await fetchTags()
  }, [fetchTags])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  return {
    tags,
    loading,
    error,
    createTag,
    updateTag,
    deleteTag,
    searchTags,
    getPopularTags,
    refreshTags
  }
}

export interface UseConversationTagsReturn {
  tags: Array<Tag & { tagged_at: string; tagged_by: string | null; is_auto_tagged: boolean }>
  suggestions: TagSuggestionResponse[]
  loading: boolean
  error: string | null
  addTags: (tagIds: string[]) => Promise<void>
  removeTags: (tagIds: string[]) => Promise<void>
  acceptSuggestion: (tagId: string) => Promise<void>
  rejectSuggestion: (tagId: string) => Promise<void>
  refreshTags: () => Promise<void>
}

export function useConversationTags(conversationId: string): UseConversationTagsReturn {
  const [tags, setTags] = useState<Array<Tag & { tagged_at: string; tagged_by: string | null; is_auto_tagged: boolean }>>([])
  const [suggestions, setSuggestions] = useState<TagSuggestionResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConversationTags = useCallback(async () => {
    if (!conversationId) return
    
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/conversations/${conversationId}/tags`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch conversation tags')
      }

      const { tags: conversationTags, suggestions: tagSuggestions } = await response.json()
      setTags(conversationTags)
      setSuggestions(tagSuggestions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch conversation tags')
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  const addTags = useCallback(async (tagIds: string[]) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagIds })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add tags')
      }

      await fetchConversationTags()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tags')
      throw err
    }
  }, [conversationId, fetchConversationTags])

  const removeTags = useCallback(async (tagIds: string[]) => {
    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/tags?tagIds=${tagIds.join(',')}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove tags')
      }

      await fetchConversationTags()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove tags')
      throw err
    }
  }, [conversationId, fetchConversationTags])

  const acceptSuggestion = useCallback(async (tagId: string) => {
    try {
      const response = await fetch('/api/tags/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          tagId,
          action: 'accept'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to accept suggestion')
      }

      await fetchConversationTags()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept suggestion')
      throw err
    }
  }, [conversationId, fetchConversationTags])

  const rejectSuggestion = useCallback(async (tagId: string) => {
    try {
      const response = await fetch('/api/tags/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          tagId,
          action: 'reject'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reject suggestion')
      }

      await fetchConversationTags()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject suggestion')
      throw err
    }
  }, [conversationId, fetchConversationTags])

  const refreshTags = useCallback(async () => {
    await fetchConversationTags()
  }, [fetchConversationTags])

  useEffect(() => {
    fetchConversationTags()
  }, [fetchConversationTags])

  return {
    tags,
    suggestions,
    loading,
    error,
    addTags,
    removeTags,
    acceptSuggestion,
    rejectSuggestion,
    refreshTags
  }
}

export interface UseBulkTaggingReturn {
  bulkTag: (request: BulkTagRequest) => Promise<number>
  loading: boolean
  error: string | null
}

export function useBulkTagging(): UseBulkTaggingReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bulkTag = useCallback(async (request: BulkTagRequest): Promise<number> => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/conversations/bulk-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to bulk tag conversations')
      }

      const { taggedCount } = await response.json()
      return taggedCount
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to bulk tag conversations'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    bulkTag,
    loading,
    error
  }
}

export interface UseTagStatsReturn {
  stats: TagStats | null
  loading: boolean
  error: string | null
  refreshStats: () => Promise<void>
}

export function useTagStats(): UseTagStatsReturn {
  const [stats, setStats] = useState<TagStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/tags/stats')
      
      if (!response.ok) {
        throw new Error('Failed to fetch tag statistics')
      }

      const { stats: tagStats } = await response.json()
      setStats(tagStats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tag statistics')
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshStats = useCallback(async () => {
    await fetchStats()
  }, [fetchStats])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    loading,
    error,
    refreshStats
  }
}