import { useState, useEffect } from 'react'
import { ConversationService, SearchFilters } from '@/lib/services/conversation'
import { Database } from '@/lib/types/database'

type ConversationRow = Database['public']['Tables']['conversations']['Row']

export interface UseConversationsOptions {
  tenantId: string
  filters?: SearchFilters
  autoFetch?: boolean
}

export interface UseConversationsReturn {
  conversations: ConversationRow[]
  loading: boolean
  error: string | null
  totalCount: number
  searchConversations: (filters?: SearchFilters) => Promise<void>
  createConversation: (data: Omit<Database['public']['Tables']['conversations']['Insert'], 'tenant_id'>) => Promise<ConversationRow | null>
  updateConversation: (id: string, updates: Database['public']['Tables']['conversations']['Update']) => Promise<ConversationRow | null>
  deleteConversation: (id: string) => Promise<boolean>
  addTags: (id: string, tags: string[]) => Promise<ConversationRow | null>
  removeTags: (id: string, tags: string[]) => Promise<ConversationRow | null>
  refresh: () => Promise<void>
}

export function useConversations({
  tenantId,
  filters = {},
  autoFetch = true,
}: UseConversationsOptions): UseConversationsReturn {
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const conversationService = new ConversationService()

  const searchConversations = async (searchFilters?: SearchFilters) => {
    if (!tenantId) return

    setLoading(true)
    setError(null)

    try {
      const result = await conversationService.searchConversations(
        tenantId,
        searchFilters || filters
      )
      setConversations(result.conversations)
      setTotalCount(result.totalCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search conversations')
      setConversations([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  const createConversation = async (
    data: Omit<Database['public']['Tables']['conversations']['Insert'], 'tenant_id'>
  ): Promise<ConversationRow | null> => {
    if (!tenantId) return null

    try {
      const conversation = await conversationService.createConversation(tenantId, data)
      setConversations(prev => [conversation, ...prev])
      setTotalCount(prev => prev + 1)
      return conversation
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create conversation')
      return null
    }
  }

  const updateConversation = async (
    id: string,
    updates: Database['public']['Tables']['conversations']['Update']
  ): Promise<ConversationRow | null> => {
    if (!tenantId) return null

    try {
      const updated = await conversationService.updateConversation(tenantId, id, updates)
      setConversations(prev =>
        prev.map(conv => (conv.id === id ? updated : conv))
      )
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update conversation')
      return null
    }
  }

  const deleteConversation = async (id: string): Promise<boolean> => {
    if (!tenantId) return false

    try {
      await conversationService.deleteConversation(tenantId, id)
      setConversations(prev => prev.filter(conv => conv.id !== id))
      setTotalCount(prev => prev - 1)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete conversation')
      return false
    }
  }

  const addTags = async (id: string, tags: string[]): Promise<ConversationRow | null> => {
    if (!tenantId) return null

    try {
      const updated = await conversationService.addTags(tenantId, id, tags)
      setConversations(prev =>
        prev.map(conv => (conv.id === id ? updated : conv))
      )
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tags')
      return null
    }
  }

  const removeTags = async (id: string, tags: string[]): Promise<ConversationRow | null> => {
    if (!tenantId) return null

    try {
      const updated = await conversationService.removeTags(tenantId, id, tags)
      setConversations(prev =>
        prev.map(conv => (conv.id === id ? updated : conv))
      )
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove tags')
      return null
    }
  }

  const refresh = async () => {
    await searchConversations(filters)
  }

  useEffect(() => {
    if (autoFetch && tenantId) {
      searchConversations()
    }
  }, [tenantId, autoFetch])

  return {
    conversations,
    loading,
    error,
    totalCount,
    searchConversations,
    createConversation,
    updateConversation,
    deleteConversation,
    addTags,
    removeTags,
    refresh,
  }
}