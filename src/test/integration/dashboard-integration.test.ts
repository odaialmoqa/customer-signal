import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { ConversationService } from '@/lib/services/conversation'

// Mock Supabase client for testing
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null }))
    }))
  })),
  rpc: vi.fn(() => Promise.resolve({ data: [], error: null })),
  channel: vi.fn(() => ({
    on: vi.fn(() => ({
      subscribe: vi.fn()
    }))
  })),
  removeChannel: vi.fn()
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase)
}))

describe('Dashboard Integration Tests', () => {
  let conversationService: ConversationService
  const testTenantId = 'test-tenant-123'

  beforeEach(() => {
    conversationService = new ConversationService(mockSupabase)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('ConversationService Integration', () => {
    it('should fetch conversation stats successfully', async () => {
      const mockStats = {
        total_conversations: 100,
        positive_count: 60,
        negative_count: 20,
        neutral_count: 20,
        platform_distribution: { twitter: 50, reddit: 30, facebook: 20 },
        daily_counts: { '2024-01-01': 10, '2024-01-02': 15 }
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [mockStats],
        error: null
      })

      const stats = await conversationService.getConversationStats(testTenantId)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_conversation_stats', {
        p_tenant_id: testTenantId,
        p_start_date: null,
        p_end_date: null
      })

      expect(stats).toEqual({
        totalConversations: 100,
        positiveCount: 60,
        negativeCount: 20,
        neutralCount: 20,
        platformDistribution: { twitter: 50, reddit: 30, facebook: 20 },
        dailyCounts: { '2024-01-01': 10, '2024-01-02': 15 }
      })
    })

    it('should search conversations with filters', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          tenant_id: testTenantId,
          content: 'Test conversation',
          author: 'Test User',
          platform: 'twitter',
          sentiment: 'positive',
          keywords: ['test'],
          tags: ['feedback'],
          created_at: '2024-01-01T00:00:00Z'
        }
      ]

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockConversations,
        error: null
      })

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            count: 1,
            error: null
          }))
        }))
      })

      const result = await conversationService.searchConversations(testTenantId, {
        query: 'test',
        platforms: ['twitter'],
        sentiments: ['positive'],
        limit: 10
      })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_conversations', {
        p_tenant_id: testTenantId,
        p_search_query: 'test',
        p_platforms: ['twitter'],
        p_sentiments: ['positive'],
        p_keywords: null,
        p_tags: null,
        p_start_date: null,
        p_end_date: null,
        p_limit: 10,
        p_offset: 0
      })

      expect(result.conversations).toEqual(mockConversations)
    })

    it('should create a new conversation', async () => {
      const newConversation = {
        content: 'New test conversation',
        author: 'New User',
        platform: 'reddit',
        sentiment: 'neutral' as const,
        keywords: ['new', 'test'],
        tags: []
      }

      const createdConversation = {
        id: 'conv-new',
        tenant_id: testTenantId,
        ...newConversation,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: createdConversation,
              error: null
            }))
          }))
        }))
      })

      const result = await conversationService.createConversation(testTenantId, newConversation)

      expect(result).toEqual(createdConversation)
    })

    it('should update conversation tags', async () => {
      const conversationId = 'conv-1'
      const existingConversation = {
        id: conversationId,
        tenant_id: testTenantId,
        content: 'Test conversation',
        tags: ['existing-tag'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      const updatedConversation = {
        ...existingConversation,
        tags: ['existing-tag', 'new-tag'],
        updated_at: '2024-01-01T01:00:00Z'
      }

      // Mock getting the existing conversation
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: existingConversation,
              error: null
            }))
          }))
        }))
      })

      // Mock updating the conversation
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: updatedConversation,
                error: null
              }))
            }))
          }))
        }))
      })

      const result = await conversationService.addTags(testTenantId, conversationId, ['new-tag'])

      expect(result.tags).toContain('existing-tag')
      expect(result.tags).toContain('new-tag')
    })

    it('should handle errors gracefully', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' }
      })

      await expect(
        conversationService.getConversationStats(testTenantId)
      ).rejects.toThrow('Failed to get conversation stats: Database connection failed')
    })

    it('should get recent conversations', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          tenant_id: testTenantId,
          content: 'Recent conversation 1',
          created_at: '2024-01-01T12:00:00Z'
        },
        {
          id: 'conv-2',
          tenant_id: testTenantId,
          content: 'Recent conversation 2',
          created_at: '2024-01-01T11:00:00Z'
        }
      ]

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: mockConversations,
                error: null
              }))
            }))
          }))
        }))
      })

      const result = await conversationService.getRecentConversations(testTenantId, 10)

      expect(result).toEqual(mockConversations)
      expect(mockSupabase.from).toHaveBeenCalledWith('conversations')
    })

    it('should find similar conversations', async () => {
      const conversationId = 'conv-1'
      const mockSimilarConversations = [
        {
          id: 'conv-2',
          content: 'Similar conversation',
          author: 'User 2',
          platform: 'twitter',
          timestamp: '2024-01-01T10:00:00Z',
          similarity_score: 0.85
        }
      ]

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockSimilarConversations,
        error: null
      })

      const result = await conversationService.findSimilarConversations(
        testTenantId,
        conversationId,
        5
      )

      expect(mockSupabase.rpc).toHaveBeenCalledWith('find_similar_conversations', {
        p_tenant_id: testTenantId,
        p_conversation_id: conversationId,
        p_limit: 5
      })

      expect(result).toHaveLength(1)
      expect(result[0].similarityScore).toBe(0.85)
    })

    it('should bulk insert conversations', async () => {
      const conversations = [
        {
          tenant_id: testTenantId,
          content: 'Bulk conversation 1',
          author: 'User 1',
          platform: 'twitter'
        },
        {
          tenant_id: testTenantId,
          content: 'Bulk conversation 2',
          author: 'User 2',
          platform: 'reddit'
        }
      ]

      const mockResult = {
        inserted_count: 2,
        updated_count: 0,
        skipped_count: 0
      }

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [mockResult],
        error: null
      })

      const result = await conversationService.bulkInsertConversations(conversations)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('bulk_insert_conversations', {
        p_conversations: JSON.stringify(conversations)
      })

      expect(result).toEqual({
        insertedCount: 2,
        updatedCount: 0,
        skippedCount: 0
      })
    })
  })

  describe('Real-time Functionality', () => {
    it('should set up real-time subscription for conversations', () => {
      const mockChannel = {
        on: vi.fn(() => ({
          subscribe: vi.fn()
        }))
      }

      mockSupabase.channel.mockReturnValueOnce(mockChannel)

      // Simulate setting up a real-time subscription
      const channel = mockSupabase.channel('conversations')
      channel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversations',
        filter: `tenant_id=eq.${testTenantId}`
      }, () => {})

      expect(mockSupabase.channel).toHaveBeenCalledWith('conversations')
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `tenant_id=eq.${testTenantId}`
        },
        expect.any(Function)
      )
    })

    it('should handle real-time conversation updates', () => {
      const mockChannel = {
        on: vi.fn((event, config, callback) => {
          // Simulate receiving a real-time update
          const payload = {
            new: {
              id: 'conv-realtime',
              tenant_id: testTenantId,
              content: 'Real-time conversation',
              author: 'Real-time User',
              platform: 'twitter',
              created_at: '2024-01-01T13:00:00Z'
            }
          }
          
          // Call the callback to simulate real-time event
          callback(payload)
          
          return { subscribe: vi.fn() }
        })
      }

      mockSupabase.channel.mockReturnValueOnce(mockChannel)

      let receivedConversation: any = null
      
      const channel = mockSupabase.channel('conversations')
      channel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversations',
        filter: `tenant_id=eq.${testTenantId}`
      }, (payload) => {
        receivedConversation = payload.new
      })

      expect(receivedConversation).toEqual({
        id: 'conv-realtime',
        tenant_id: testTenantId,
        content: 'Real-time conversation',
        author: 'Real-time User',
        platform: 'twitter',
        created_at: '2024-01-01T13:00:00Z'
      })
    })
  })
})