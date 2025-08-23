import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { conversationService } from '@/lib/services/conversation'
import { Database } from '@/lib/types/database'

type ConversationInsert = Database['public']['Tables']['conversations']['Insert']

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

describe('Conversation Search System Integration Tests', () => {
  let testTenantId: string
  let testUserId: string
  let testConversations: string[] = []

  beforeAll(async () => {
    // Create test tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: 'Test Tenant for Conversation Search',
        subscription: 'pro',
      })
      .select()
      .single()

    if (tenantError) throw tenantError
    testTenantId = tenant.id

    // Create test user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'conversation-test@example.com',
      password: 'testpassword123',
      email_confirm: true,
    })

    if (authError) throw authError
    testUserId = authUser.user.id

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: testUserId,
        tenant_id: testTenantId,
        email: 'conversation-test@example.com',
        full_name: 'Test User',
        role: 'admin',
      })

    if (profileError) throw profileError
  })

  afterAll(async () => {
    // Clean up test data
    if (testConversations.length > 0) {
      await supabase
        .from('conversations')
        .delete()
        .in('id', testConversations)
    }

    await supabase
      .from('user_profiles')
      .delete()
      .eq('id', testUserId)

    await supabase.auth.admin.deleteUser(testUserId)

    await supabase
      .from('tenants')
      .delete()
      .eq('id', testTenantId)
  })

  beforeEach(async () => {
    // Clean up any existing test conversations
    if (testConversations.length > 0) {
      await supabase
        .from('conversations')
        .delete()
        .in('id', testConversations)
      testConversations = []
    }
  })

  describe('Basic Conversation Storage', () => {
    it('should create a conversation successfully', async () => {
      const conversationData: Omit<ConversationInsert, 'tenant_id'> = {
        content: 'This is a test conversation about our product',
        author: 'test_user',
        platform: 'twitter',
        url: 'https://twitter.com/test/123',
        external_id: 'twitter_123',
        timestamp: new Date().toISOString(),
        sentiment: 'positive',
        sentiment_confidence: 0.85,
        keywords: ['product', 'test'],
        tags: ['customer-feedback'],
        engagement_metrics: { likes: 10, shares: 5 },
      }

      const conversation = await conversationService.createConversation(
        testTenantId,
        conversationData
      )

      expect(conversation).toBeDefined()
      expect(conversation.content).toBe(conversationData.content)
      expect(conversation.tenant_id).toBe(testTenantId)
      expect(conversation.platform).toBe('twitter')
      expect(conversation.sentiment).toBe('positive')

      testConversations.push(conversation.id)
    })

    it('should retrieve a conversation by ID', async () => {
      // Create test conversation
      const conversationData: Omit<ConversationInsert, 'tenant_id'> = {
        content: 'Test conversation for retrieval',
        author: 'test_author',
        platform: 'reddit',
        external_id: 'reddit_456',
      }

      const created = await conversationService.createConversation(
        testTenantId,
        conversationData
      )
      testConversations.push(created.id)

      // Retrieve the conversation
      const retrieved = await conversationService.getConversation(
        testTenantId,
        created.id
      )

      expect(retrieved).toBeDefined()
      expect(retrieved!.id).toBe(created.id)
      expect(retrieved!.content).toBe(conversationData.content)
    })

    it('should update a conversation', async () => {
      // Create test conversation
      const conversationData: Omit<ConversationInsert, 'tenant_id'> = {
        content: 'Original content',
        platform: 'linkedin',
        external_id: 'linkedin_789',
      }

      const created = await conversationService.createConversation(
        testTenantId,
        conversationData
      )
      testConversations.push(created.id)

      // Update the conversation
      const updated = await conversationService.updateConversation(
        testTenantId,
        created.id,
        {
          content: 'Updated content',
          sentiment: 'negative',
          tags: ['updated'],
        }
      )

      expect(updated.content).toBe('Updated content')
      expect(updated.sentiment).toBe('negative')
      expect(updated.tags).toEqual(['updated'])
    })
  })

  describe('Full-Text Search', () => {
    beforeEach(async () => {
      // Create test conversations with different content
      const testData = [
        {
          content: 'I love this amazing product! It works perfectly.',
          author: 'happy_customer',
          platform: 'twitter' as const,
          sentiment: 'positive' as const,
          keywords: ['product', 'love'],
          external_id: 'search_test_1',
        },
        {
          content: 'The customer service was terrible and unhelpful.',
          author: 'angry_user',
          platform: 'reddit' as const,
          sentiment: 'negative' as const,
          keywords: ['service', 'customer'],
          external_id: 'search_test_2',
        },
        {
          content: 'Looking for alternatives to this software solution.',
          author: 'researcher',
          platform: 'linkedin' as const,
          sentiment: 'neutral' as const,
          keywords: ['software', 'alternatives'],
          external_id: 'search_test_3',
        },
      ]

      for (const data of testData) {
        const conversation = await conversationService.createConversation(
          testTenantId,
          data
        )
        testConversations.push(conversation.id)
      }
    })

    it('should search conversations by text content', async () => {
      const result = await conversationService.searchConversations(testTenantId, {
        query: 'product',
      })

      expect(result.conversations.length).toBeGreaterThan(0)
      expect(result.conversations[0].content).toContain('product')
    })

    it('should filter conversations by platform', async () => {
      const result = await conversationService.searchConversations(testTenantId, {
        platforms: ['twitter'],
      })

      expect(result.conversations.length).toBe(1)
      expect(result.conversations[0].platform).toBe('twitter')
    })

    it('should filter conversations by sentiment', async () => {
      const result = await conversationService.searchConversations(testTenantId, {
        sentiments: ['positive'],
      })

      expect(result.conversations.length).toBe(1)
      expect(result.conversations[0].sentiment).toBe('positive')
    })

    it('should filter conversations by keywords', async () => {
      const result = await conversationService.searchConversations(testTenantId, {
        keywords: ['service'],
      })

      expect(result.conversations.length).toBe(1)
      expect(result.conversations[0].keywords).toContain('service')
    })

    it('should combine multiple filters', async () => {
      const result = await conversationService.searchConversations(testTenantId, {
        query: 'customer',
        sentiments: ['negative'],
        platforms: ['reddit'],
      })

      expect(result.conversations.length).toBe(1)
      expect(result.conversations[0].platform).toBe('reddit')
      expect(result.conversations[0].sentiment).toBe('negative')
    })

    it('should handle pagination', async () => {
      const result1 = await conversationService.searchConversations(testTenantId, {
        limit: 2,
        offset: 0,
      })

      const result2 = await conversationService.searchConversations(testTenantId, {
        limit: 2,
        offset: 2,
      })

      expect(result1.conversations.length).toBeLessThanOrEqual(2)
      expect(result2.conversations.length).toBeLessThanOrEqual(2)
      
      // Ensure no overlap in results
      const ids1 = result1.conversations.map(c => c.id)
      const ids2 = result2.conversations.map(c => c.id)
      const overlap = ids1.filter(id => ids2.includes(id))
      expect(overlap.length).toBe(0)
    })
  })

  describe('Advanced Search Features', () => {
    beforeEach(async () => {
      // Create conversations with timestamps for date filtering
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const testData = [
        {
          content: 'Recent conversation',
          platform: 'twitter' as const,
          timestamp: now.toISOString(),
          external_id: 'date_test_1',
        },
        {
          content: 'Yesterday conversation',
          platform: 'reddit' as const,
          timestamp: yesterday.toISOString(),
          external_id: 'date_test_2',
        },
        {
          content: 'Old conversation',
          platform: 'linkedin' as const,
          timestamp: lastWeek.toISOString(),
          external_id: 'date_test_3',
        },
      ]

      for (const data of testData) {
        const conversation = await conversationService.createConversation(
          testTenantId,
          data
        )
        testConversations.push(conversation.id)
      }
    })

    it('should filter conversations by date range', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      
      const result = await conversationService.searchConversations(testTenantId, {
        startDate: yesterday.toISOString(),
      })

      expect(result.conversations.length).toBeGreaterThanOrEqual(2)
      result.conversations.forEach(conv => {
        if (conv.timestamp) {
          expect(new Date(conv.timestamp).getTime()).toBeGreaterThanOrEqual(yesterday.getTime())
        }
      })
    })

    it('should find similar conversations', async () => {
      // Create a base conversation
      const baseConv = await conversationService.createConversation(testTenantId, {
        content: 'This product has excellent customer support and great features',
        platform: 'twitter',
        external_id: 'similarity_base',
      })
      testConversations.push(baseConv.id)

      // Create similar conversations
      const similarConv = await conversationService.createConversation(testTenantId, {
        content: 'The customer support is really good and the features are amazing',
        platform: 'reddit',
        external_id: 'similarity_similar',
      })
      testConversations.push(similarConv.id)

      // Create dissimilar conversation
      const dissimilarConv = await conversationService.createConversation(testTenantId, {
        content: 'Weather forecast shows rain tomorrow',
        platform: 'linkedin',
        external_id: 'similarity_different',
      })
      testConversations.push(dissimilarConv.id)

      const similarConversations = await conversationService.findSimilarConversations(
        testTenantId,
        baseConv.id,
        5
      )

      expect(similarConversations.length).toBeGreaterThan(0)
      expect(similarConversations[0].id).toBe(similarConv.id)
      expect(similarConversations[0].similarityScore).toBeGreaterThan(0.3)
    })
  })

  describe('Conversation Statistics', () => {
    beforeEach(async () => {
      // Create conversations with different sentiments
      const testData = [
        { sentiment: 'positive' as const, platform: 'twitter' as const },
        { sentiment: 'positive' as const, platform: 'reddit' as const },
        { sentiment: 'negative' as const, platform: 'twitter' as const },
        { sentiment: 'neutral' as const, platform: 'linkedin' as const },
      ]

      for (let i = 0; i < testData.length; i++) {
        const conversation = await conversationService.createConversation(testTenantId, {
          content: `Test conversation ${i}`,
          platform: testData[i].platform,
          sentiment: testData[i].sentiment,
          external_id: `stats_test_${i}`,
          timestamp: new Date().toISOString(),
        })
        testConversations.push(conversation.id)
      }
    })

    it('should get conversation statistics', async () => {
      const stats = await conversationService.getConversationStats(testTenantId)

      expect(stats.totalConversations).toBe(4)
      expect(stats.positiveCount).toBe(2)
      expect(stats.negativeCount).toBe(1)
      expect(stats.neutralCount).toBe(1)
      expect(stats.platformDistribution).toBeDefined()
    })

    it('should get sentiment counts', async () => {
      const sentimentCounts = await conversationService.getSentimentCounts(testTenantId)

      expect(sentimentCounts.positive).toBe(2)
      expect(sentimentCounts.negative).toBe(1)
      expect(sentimentCounts.neutral).toBe(1)
    })
  })

  describe('Tag Management', () => {
    let testConversationId: string

    beforeEach(async () => {
      const conversation = await conversationService.createConversation(testTenantId, {
        content: 'Test conversation for tagging',
        platform: 'twitter',
        external_id: 'tag_test',
        tags: ['initial-tag'],
      })
      testConversationId = conversation.id
      testConversations.push(conversation.id)
    })

    it('should add tags to a conversation', async () => {
      const updated = await conversationService.addTags(
        testTenantId,
        testConversationId,
        ['new-tag', 'another-tag']
      )

      expect(updated.tags).toContain('initial-tag')
      expect(updated.tags).toContain('new-tag')
      expect(updated.tags).toContain('another-tag')
    })

    it('should remove tags from a conversation', async () => {
      // First add some tags
      await conversationService.addTags(
        testTenantId,
        testConversationId,
        ['tag-to-remove', 'tag-to-keep']
      )

      // Then remove one tag
      const updated = await conversationService.removeTags(
        testTenantId,
        testConversationId,
        ['tag-to-remove']
      )

      expect(updated.tags).not.toContain('tag-to-remove')
      expect(updated.tags).toContain('tag-to-keep')
      expect(updated.tags).toContain('initial-tag')
    })

    it('should get all unique tags for a tenant', async () => {
      // Create conversations with different tags
      await conversationService.createConversation(testTenantId, {
        content: 'Another conversation',
        platform: 'reddit',
        external_id: 'tag_test_2',
        tags: ['unique-tag', 'shared-tag'],
      })

      const tags = await conversationService.getAllTags(testTenantId)

      expect(tags).toContain('initial-tag')
      expect(tags).toContain('unique-tag')
      expect(tags).toContain('shared-tag')
      expect(tags.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Bulk Operations', () => {
    it('should bulk insert conversations with deduplication', async () => {
      const conversations = [
        {
          tenant_id: testTenantId,
          content: 'Bulk conversation 1',
          platform: 'twitter' as const,
          external_id: 'bulk_1',
        },
        {
          tenant_id: testTenantId,
          content: 'Bulk conversation 2',
          platform: 'reddit' as const,
          external_id: 'bulk_2',
        },
        {
          tenant_id: testTenantId,
          content: 'Bulk conversation 1 updated',
          platform: 'twitter' as const,
          external_id: 'bulk_1', // Duplicate external_id
        },
      ]

      const result = await conversationService.bulkInsertConversations(conversations)

      expect(result.insertedCount).toBeGreaterThan(0)
      expect(result.insertedCount + result.updatedCount + result.skippedCount).toBe(3)

      // Clean up
      const { data: createdConversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('tenant_id', testTenantId)
        .in('external_id', ['bulk_1', 'bulk_2'])

      if (createdConversations) {
        testConversations.push(...createdConversations.map(c => c.id))
      }
    })
  })

  describe('Performance Tests', () => {
    it('should handle large result sets efficiently', async () => {
      // Create many conversations
      const conversations = []
      for (let i = 0; i < 100; i++) {
        conversations.push({
          tenant_id: testTenantId,
          content: `Performance test conversation ${i}`,
          platform: 'twitter' as const,
          external_id: `perf_test_${i}`,
          keywords: ['performance', 'test'],
        })
      }

      await conversationService.bulkInsertConversations(conversations)

      // Clean up tracking
      const { data: createdConversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('tenant_id', testTenantId)
        .like('external_id', 'perf_test_%')

      if (createdConversations) {
        testConversations.push(...createdConversations.map(c => c.id))
      }

      // Test search performance
      const startTime = Date.now()
      const result = await conversationService.searchConversations(testTenantId, {
        keywords: ['performance'],
        limit: 50,
      })
      const endTime = Date.now()

      expect(result.conversations.length).toBe(50)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })
  })
})