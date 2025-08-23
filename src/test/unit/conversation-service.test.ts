import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the createClient function first
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { ConversationService } from '@/lib/services/conversation'
import { createClient } from '@/lib/supabase/server'

const mockQuery = {
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  in: vi.fn(),
  contains: vi.fn(),
  overlaps: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  like: vi.fn(),
  not: vi.fn(),
  order: vi.fn(),
  range: vi.fn(),
  limit: vi.fn(),
  single: vi.fn(),
}

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn().mockReturnValue(mockQuery),
  rpc: vi.fn(),
}

describe('ConversationService Unit Tests', () => {
  let conversationService: ConversationService
  const testTenantId = 'test-tenant-id'
  const testConversationId = 'test-conversation-id'

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup mock client
    vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any)
    
    conversationService = new ConversationService()

    // Setup default mock chain
    Object.keys(mockQuery).forEach(method => {
      mockQuery[method as keyof typeof mockQuery].mockReturnThis()
    })

    mockSupabaseClient.from.mockReturnValue(mockQuery)
    mockSupabaseClient.rpc.mockReturnValue({ data: [], error: null })
  })

  describe('createConversation', () => {
    it('should create a conversation successfully', async () => {
      const conversationData = {
        content: 'Test conversation',
        platform: 'twitter' as const,
        external_id: 'test_123',
      }

      const expectedResult = {
        id: testConversationId,
        tenant_id: testTenantId,
        ...conversationData,
        created_at: '2024-01-01T00:00:00Z',
      }

      mockQuery.single.mockResolvedValue({
        data: expectedResult,
        error: null,
      })

      const result = await conversationService.createConversation(
        testTenantId,
        conversationData
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('conversations')
      expect(mockQuery.insert).toHaveBeenCalledWith({
        ...conversationData,
        tenant_id: testTenantId,
      })
      expect(result).toEqual(expectedResult)
    })

    it('should throw error when creation fails', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      })

      await expect(
        conversationService.createConversation(testTenantId, {
          content: 'Test',
          platform: 'twitter',
        })
      ).rejects.toThrow('Failed to create conversation: Insert failed')
    })
  })

  describe('getConversation', () => {
    it('should retrieve a conversation by ID', async () => {
      const expectedConversation = {
        id: testConversationId,
        tenant_id: testTenantId,
        content: 'Test conversation',
        platform: 'twitter',
      }

      mockQuery.single.mockResolvedValue({
        data: expectedConversation,
        error: null,
      })

      const result = await conversationService.getConversation(
        testTenantId,
        testConversationId
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('conversations')
      expect(mockQuery.eq).toHaveBeenCalledWith('tenant_id', testTenantId)
      expect(mockQuery.eq).toHaveBeenCalledWith('id', testConversationId)
      expect(result).toEqual(expectedConversation)
    })

    it('should return null when conversation not found', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found error code
      })

      const result = await conversationService.getConversation(
        testTenantId,
        testConversationId
      )

      expect(result).toBeNull()
    })

    it('should throw error for other database errors', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'OTHER' },
      })

      await expect(
        conversationService.getConversation(testTenantId, testConversationId)
      ).rejects.toThrow('Failed to get conversation: Database error')
    })
  })

  describe('updateConversation', () => {
    it('should update a conversation successfully', async () => {
      const updates = {
        content: 'Updated content',
        sentiment: 'positive' as const,
      }

      const expectedResult = {
        id: testConversationId,
        tenant_id: testTenantId,
        ...updates,
      }

      mockQuery.single.mockResolvedValue({
        data: expectedResult,
        error: null,
      })

      const result = await conversationService.updateConversation(
        testTenantId,
        testConversationId,
        updates
      )

      expect(mockQuery.update).toHaveBeenCalledWith(updates)
      expect(mockQuery.eq).toHaveBeenCalledWith('tenant_id', testTenantId)
      expect(mockQuery.eq).toHaveBeenCalledWith('id', testConversationId)
      expect(result).toEqual(expectedResult)
    })
  })

  describe('deleteConversation', () => {
    it('should delete a conversation successfully', async () => {
      // Mock the delete chain properly
      const mockDeleteChain = {
        eq: vi.fn().mockReturnThis(),
      }
      mockQuery.delete.mockReturnValue(mockDeleteChain)
      mockDeleteChain.eq.mockResolvedValue({
        error: null,
      })

      await conversationService.deleteConversation(testTenantId, testConversationId)

      expect(mockQuery.delete).toHaveBeenCalled()
      expect(mockDeleteChain.eq).toHaveBeenCalledWith('tenant_id', testTenantId)
      expect(mockDeleteChain.eq).toHaveBeenCalledWith('id', testConversationId)
    })

    it('should throw error when deletion fails', async () => {
      const mockDeleteChain = {
        eq: vi.fn().mockReturnThis(),
      }
      mockQuery.delete.mockReturnValue(mockDeleteChain)
      mockDeleteChain.eq.mockResolvedValue({
        error: { message: 'Delete failed' },
      })

      await expect(
        conversationService.deleteConversation(testTenantId, testConversationId)
      ).rejects.toThrow('Failed to delete conversation: Delete failed')
    })
  })

  describe('searchConversations', () => {
    it('should search conversations with filters', async () => {
      const mockConversations = [
        {
          id: '1',
          content: 'Test conversation 1',
          platform: 'twitter',
          sentiment: 'positive',
        },
        {
          id: '2',
          content: 'Test conversation 2',
          platform: 'reddit',
          sentiment: 'negative',
        },
      ]

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockConversations,
        error: null,
      })

      // Mock count query - need to create a separate mock for the count query
      const mockCountQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        overlaps: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
      }
      
      // Mock the count query chain
      mockSupabaseClient.from.mockReturnValueOnce(mockCountQuery)
      mockCountQuery.select.mockResolvedValue({
        count: 2,
        error: null,
      })

      const filters = {
        query: 'test',
        platforms: ['twitter'],
        sentiments: ['positive' as const],
        limit: 10,
        offset: 0,
      }

      const result = await conversationService.searchConversations(
        testTenantId,
        filters
      )

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('search_conversations', {
        p_tenant_id: testTenantId,
        p_search_query: 'test',
        p_platforms: ['twitter'],
        p_sentiments: ['positive'],
        p_keywords: null,
        p_tags: null,
        p_start_date: null,
        p_end_date: null,
        p_limit: 10,
        p_offset: 0,
      })

      expect(result.conversations).toEqual(mockConversations)
      expect(result.totalCount).toBe(2)
    })

    it('should handle search with no filters', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [],
        error: null,
      })

      mockQuery.single.mockResolvedValue({
        count: 0,
        error: null,
      })

      const result = await conversationService.searchConversations(testTenantId)

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('search_conversations', {
        p_tenant_id: testTenantId,
        p_search_query: null,
        p_platforms: null,
        p_sentiments: null,
        p_keywords: null,
        p_tags: null,
        p_start_date: null,
        p_end_date: null,
        p_limit: 50,
        p_offset: 0,
      })

      expect(result.conversations).toEqual([])
      expect(result.totalCount).toBe(0)
    })
  })

  describe('getConversationStats', () => {
    it('should get conversation statistics', async () => {
      const mockStats = {
        total_conversations: 100,
        positive_count: 60,
        negative_count: 25,
        neutral_count: 15,
        platform_distribution: { twitter: 50, reddit: 30, linkedin: 20 },
        daily_counts: { '2024-01-01': 10, '2024-01-02': 15 },
      }

      mockSupabaseClient.rpc.mockResolvedValue({
        data: [mockStats],
        error: null,
      })

      const result = await conversationService.getConversationStats(testTenantId)

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_conversation_stats', {
        p_tenant_id: testTenantId,
        p_start_date: null,
        p_end_date: null,
      })

      expect(result).toEqual({
        totalConversations: 100,
        positiveCount: 60,
        negativeCount: 25,
        neutralCount: 15,
        platformDistribution: { twitter: 50, reddit: 30, linkedin: 20 },
        dailyCounts: { '2024-01-01': 10, '2024-01-02': 15 },
      })
    })

    it('should return empty stats when no data', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [],
        error: null,
      })

      const result = await conversationService.getConversationStats(testTenantId)

      expect(result).toEqual({
        totalConversations: 0,
        positiveCount: 0,
        negativeCount: 0,
        neutralCount: 0,
        platformDistribution: {},
        dailyCounts: {},
      })
    })
  })

  describe('findSimilarConversations', () => {
    it('should find similar conversations', async () => {
      const mockSimilar = [
        {
          id: 'similar-1',
          content: 'Similar content',
          author: 'user1',
          platform: 'twitter',
          timestamp: '2024-01-01T00:00:00Z',
          similarity_score: 0.85,
        },
      ]

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockSimilar,
        error: null,
      })

      const result = await conversationService.findSimilarConversations(
        testTenantId,
        testConversationId,
        5
      )

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('find_similar_conversations', {
        p_tenant_id: testTenantId,
        p_conversation_id: testConversationId,
        p_limit: 5,
      })

      expect(result).toEqual([
        {
          id: 'similar-1',
          content: 'Similar content',
          author: 'user1',
          platform: 'twitter',
          timestamp: '2024-01-01T00:00:00Z',
          similarityScore: 0.85,
        },
      ])
    })
  })

  describe('bulkInsertConversations', () => {
    it('should bulk insert conversations', async () => {
      const conversations = [
        {
          tenant_id: testTenantId,
          content: 'Bulk 1',
          platform: 'twitter' as const,
        },
        {
          tenant_id: testTenantId,
          content: 'Bulk 2',
          platform: 'reddit' as const,
        },
      ]

      const mockResult = {
        inserted_count: 2,
        updated_count: 0,
        skipped_count: 0,
      }

      mockSupabaseClient.rpc.mockResolvedValue({
        data: [mockResult],
        error: null,
      })

      const result = await conversationService.bulkInsertConversations(conversations)

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('bulk_insert_conversations', {
        p_conversations: JSON.stringify(conversations),
      })

      expect(result).toEqual({
        insertedCount: 2,
        updatedCount: 0,
        skippedCount: 0,
      })
    })
  })

  describe('tag management', () => {
    it('should add tags to a conversation', async () => {
      const existingConversation = {
        id: testConversationId,
        tenant_id: testTenantId,
        content: 'Test',
        tags: ['existing-tag'],
      }

      const updatedConversation = {
        ...existingConversation,
        tags: ['existing-tag', 'new-tag'],
      }

      // Mock getConversation
      mockQuery.single
        .mockResolvedValueOnce({
          data: existingConversation,
          error: null,
        })
        .mockResolvedValueOnce({
          data: updatedConversation,
          error: null,
        })

      const result = await conversationService.addTags(
        testTenantId,
        testConversationId,
        ['new-tag']
      )

      expect(result.tags).toContain('existing-tag')
      expect(result.tags).toContain('new-tag')
    })

    it('should remove tags from a conversation', async () => {
      const existingConversation = {
        id: testConversationId,
        tenant_id: testTenantId,
        content: 'Test',
        tags: ['tag1', 'tag2', 'tag3'],
      }

      const updatedConversation = {
        ...existingConversation,
        tags: ['tag1', 'tag3'],
      }

      mockQuery.single
        .mockResolvedValueOnce({
          data: existingConversation,
          error: null,
        })
        .mockResolvedValueOnce({
          data: updatedConversation,
          error: null,
        })

      const result = await conversationService.removeTags(
        testTenantId,
        testConversationId,
        ['tag2']
      )

      expect(result.tags).toContain('tag1')
      expect(result.tags).toContain('tag3')
      expect(result.tags).not.toContain('tag2')
    })

    it('should get all unique tags', async () => {
      const mockData = [
        { tags: ['tag1', 'tag2'] },
        { tags: ['tag2', 'tag3'] },
        { tags: ['tag1', 'tag4'] },
      ]

      mockQuery.not.mockResolvedValue({
        data: mockData,
        error: null,
      })

      const result = await conversationService.getAllTags(testTenantId)

      expect(result).toEqual(['tag1', 'tag2', 'tag3', 'tag4'])
    })
  })

  describe('error handling', () => {
    it('should handle RPC function errors', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC function failed' },
      })

      await expect(
        conversationService.searchConversations(testTenantId)
      ).rejects.toThrow('Failed to search conversations: RPC function failed')
    })

    it('should handle database connection errors', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout' },
      })

      await expect(
        conversationService.createConversation(testTenantId, {
          content: 'Test',
          platform: 'twitter',
        })
      ).rejects.toThrow('Failed to create conversation: Connection timeout')
    })
  })
})