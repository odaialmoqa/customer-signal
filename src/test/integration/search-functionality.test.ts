import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { ConversationService, SearchFilters } from '@/lib/services/conversation'
import { Database } from '@/lib/types/database'

type ConversationInsert = Database['public']['Tables']['conversations']['Insert']

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key'

describe('Search Functionality Integration Tests', () => {
  let supabase: any
  let conversationService: ConversationService
  const testTenantId = 'test-tenant-search'

  beforeEach(async () => {
    supabase = createClient(supabaseUrl, supabaseKey)
    conversationService = new ConversationService(supabase)

    // Clean up any existing test data
    await supabase
      .from('conversations')
      .delete()
      .eq('tenant_id', testTenantId)
  })

  afterEach(async () => {
    // Clean up test data
    await supabase
      .from('conversations')
      .delete()
      .eq('tenant_id', testTenantId)
  })

  it('should search conversations by query text', async () => {
    // Create test conversations
    const conversations: ConversationInsert[] = [
      {
        tenant_id: testTenantId,
        content: 'I love this amazing product, it works perfectly!',
        author: 'happy_customer',
        platform: 'reddit',
        url: 'https://reddit.com/r/test/1',
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        sentiment: 'positive',
        keywords: ['product', 'amazing'],
        tags: ['feedback']
      },
      {
        tenant_id: testTenantId,
        content: 'The service is terrible and slow',
        author: 'angry_user',
        platform: 'twitter',
        url: 'https://twitter.com/angry_user/1',
        timestamp: new Date('2024-01-14T15:30:00Z').toISOString(),
        sentiment: 'negative',
        keywords: ['service', 'terrible'],
        tags: ['complaint']
      },
      {
        tenant_id: testTenantId,
        content: 'Neutral comment about the company',
        author: 'neutral_observer',
        platform: 'linkedin',
        url: 'https://linkedin.com/posts/1',
        timestamp: new Date('2024-01-13T12:00:00Z').toISOString(),
        sentiment: 'neutral',
        keywords: ['company'],
        tags: ['general']
      }
    ]

    // Insert test data
    for (const conv of conversations) {
      await conversationService.createConversation(testTenantId, conv)
    }

    // Test text search
    const searchFilters: SearchFilters = {
      query: 'amazing product'
    }

    const result = await conversationService.searchConversations(testTenantId, searchFilters)

    expect(result.conversations).toHaveLength(1)
    expect(result.conversations[0].content).toContain('amazing product')
    expect(result.totalCount).toBe(1)
  })

  it('should filter conversations by platform', async () => {
    // Create test conversations on different platforms
    const conversations: ConversationInsert[] = [
      {
        tenant_id: testTenantId,
        content: 'Reddit post about the product',
        platform: 'reddit',
        timestamp: new Date().toISOString()
      },
      {
        tenant_id: testTenantId,
        content: 'Twitter tweet about the service',
        platform: 'twitter',
        timestamp: new Date().toISOString()
      },
      {
        tenant_id: testTenantId,
        content: 'LinkedIn post about the company',
        platform: 'linkedin',
        timestamp: new Date().toISOString()
      }
    ]

    for (const conv of conversations) {
      await conversationService.createConversation(testTenantId, conv)
    }

    // Filter by Reddit platform
    const searchFilters: SearchFilters = {
      platforms: ['reddit']
    }

    const result = await conversationService.searchConversations(testTenantId, searchFilters)

    expect(result.conversations).toHaveLength(1)
    expect(result.conversations[0].platform).toBe('reddit')
  })

  it('should filter conversations by sentiment', async () => {
    // Create test conversations with different sentiments
    const conversations: ConversationInsert[] = [
      {
        tenant_id: testTenantId,
        content: 'Positive feedback',
        platform: 'reddit',
        sentiment: 'positive',
        timestamp: new Date().toISOString()
      },
      {
        tenant_id: testTenantId,
        content: 'Negative complaint',
        platform: 'twitter',
        sentiment: 'negative',
        timestamp: new Date().toISOString()
      },
      {
        tenant_id: testTenantId,
        content: 'Neutral observation',
        platform: 'linkedin',
        sentiment: 'neutral',
        timestamp: new Date().toISOString()
      }
    ]

    for (const conv of conversations) {
      await conversationService.createConversation(testTenantId, conv)
    }

    // Filter by positive sentiment
    const searchFilters: SearchFilters = {
      sentiments: ['positive']
    }

    const result = await conversationService.searchConversations(testTenantId, searchFilters)

    expect(result.conversations).toHaveLength(1)
    expect(result.conversations[0].sentiment).toBe('positive')
  })

  it('should filter conversations by date range', async () => {
    // Create test conversations with different dates
    const conversations: ConversationInsert[] = [
      {
        tenant_id: testTenantId,
        content: 'Old conversation',
        platform: 'reddit',
        timestamp: new Date('2024-01-01T10:00:00Z').toISOString()
      },
      {
        tenant_id: testTenantId,
        content: 'Recent conversation',
        platform: 'twitter',
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString()
      },
      {
        tenant_id: testTenantId,
        content: 'Very recent conversation',
        platform: 'linkedin',
        timestamp: new Date('2024-01-20T10:00:00Z').toISOString()
      }
    ]

    for (const conv of conversations) {
      await conversationService.createConversation(testTenantId, conv)
    }

    // Filter by date range
    const searchFilters: SearchFilters = {
      startDate: new Date('2024-01-10T00:00:00Z').toISOString(),
      endDate: new Date('2024-01-18T23:59:59Z').toISOString()
    }

    const result = await conversationService.searchConversations(testTenantId, searchFilters)

    expect(result.conversations).toHaveLength(1)
    expect(result.conversations[0].content).toBe('Recent conversation')
  })

  it('should filter conversations by keywords', async () => {
    // Create test conversations with different keywords
    const conversations: ConversationInsert[] = [
      {
        tenant_id: testTenantId,
        content: 'Discussion about product features',
        platform: 'reddit',
        keywords: ['product', 'features'],
        timestamp: new Date().toISOString()
      },
      {
        tenant_id: testTenantId,
        content: 'Service quality feedback',
        platform: 'twitter',
        keywords: ['service', 'quality'],
        timestamp: new Date().toISOString()
      },
      {
        tenant_id: testTenantId,
        content: 'Company news update',
        platform: 'linkedin',
        keywords: ['company', 'news'],
        timestamp: new Date().toISOString()
      }
    ]

    for (const conv of conversations) {
      await conversationService.createConversation(testTenantId, conv)
    }

    // Filter by keywords
    const searchFilters: SearchFilters = {
      keywords: ['product']
    }

    const result = await conversationService.searchConversations(testTenantId, searchFilters)

    expect(result.conversations).toHaveLength(1)
    expect(result.conversations[0].keywords).toContain('product')
  })

  it('should filter conversations by tags', async () => {
    // Create test conversations with different tags
    const conversations: ConversationInsert[] = [
      {
        tenant_id: testTenantId,
        content: 'Customer feedback',
        platform: 'reddit',
        tags: ['feedback', 'customer'],
        timestamp: new Date().toISOString()
      },
      {
        tenant_id: testTenantId,
        content: 'Support request',
        platform: 'twitter',
        tags: ['support', 'help'],
        timestamp: new Date().toISOString()
      },
      {
        tenant_id: testTenantId,
        content: 'General inquiry',
        platform: 'linkedin',
        tags: ['inquiry', 'general'],
        timestamp: new Date().toISOString()
      }
    ]

    for (const conv of conversations) {
      await conversationService.createConversation(testTenantId, conv)
    }

    // Filter by tags
    const searchFilters: SearchFilters = {
      tags: ['feedback']
    }

    const result = await conversationService.searchConversations(testTenantId, searchFilters)

    expect(result.conversations).toHaveLength(1)
    expect(result.conversations[0].tags).toContain('feedback')
  })

  it('should combine multiple filters', async () => {
    // Create test conversations
    const conversations: ConversationInsert[] = [
      {
        tenant_id: testTenantId,
        content: 'Positive Reddit feedback about product',
        platform: 'reddit',
        sentiment: 'positive',
        keywords: ['product'],
        tags: ['feedback'],
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString()
      },
      {
        tenant_id: testTenantId,
        content: 'Negative Twitter complaint about service',
        platform: 'twitter',
        sentiment: 'negative',
        keywords: ['service'],
        tags: ['complaint'],
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString()
      },
      {
        tenant_id: testTenantId,
        content: 'Positive Reddit review of product',
        platform: 'reddit',
        sentiment: 'positive',
        keywords: ['product'],
        tags: ['review'],
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString()
      }
    ]

    for (const conv of conversations) {
      await conversationService.createConversation(testTenantId, conv)
    }

    // Combine multiple filters
    const searchFilters: SearchFilters = {
      platforms: ['reddit'],
      sentiments: ['positive'],
      keywords: ['product']
    }

    const result = await conversationService.searchConversations(testTenantId, searchFilters)

    expect(result.conversations).toHaveLength(2)
    result.conversations.forEach(conv => {
      expect(conv.platform).toBe('reddit')
      expect(conv.sentiment).toBe('positive')
      expect(conv.keywords).toContain('product')
    })
  })

  it('should handle pagination correctly', async () => {
    // Create multiple test conversations
    const conversations: ConversationInsert[] = []
    for (let i = 1; i <= 25; i++) {
      conversations.push({
        tenant_id: testTenantId,
        content: `Test conversation ${i}`,
        platform: 'reddit',
        timestamp: new Date(`2024-01-${i.toString().padStart(2, '0')}T10:00:00Z`).toISOString()
      })
    }

    for (const conv of conversations) {
      await conversationService.createConversation(testTenantId, conv)
    }

    // Test first page
    const firstPageFilters: SearchFilters = {
      limit: 10,
      offset: 0
    }

    const firstPageResult = await conversationService.searchConversations(testTenantId, firstPageFilters)

    expect(firstPageResult.conversations).toHaveLength(10)
    expect(firstPageResult.totalCount).toBe(25)

    // Test second page
    const secondPageFilters: SearchFilters = {
      limit: 10,
      offset: 10
    }

    const secondPageResult = await conversationService.searchConversations(testTenantId, secondPageFilters)

    expect(secondPageResult.conversations).toHaveLength(10)
    expect(secondPageResult.totalCount).toBe(25)

    // Ensure different results
    const firstPageIds = firstPageResult.conversations.map(c => c.id)
    const secondPageIds = secondPageResult.conversations.map(c => c.id)
    expect(firstPageIds).not.toEqual(secondPageIds)
  })

  it('should return empty results for non-matching filters', async () => {
    // Create test conversation
    await conversationService.createConversation(testTenantId, {
      tenant_id: testTenantId,
      content: 'Test conversation',
      platform: 'reddit',
      sentiment: 'positive',
      timestamp: new Date().toISOString()
    })

    // Search with non-matching filters
    const searchFilters: SearchFilters = {
      platforms: ['twitter'],
      sentiments: ['negative']
    }

    const result = await conversationService.searchConversations(testTenantId, searchFilters)

    expect(result.conversations).toHaveLength(0)
    expect(result.totalCount).toBe(0)
  })

  it('should handle tenant isolation correctly', async () => {
    const otherTenantId = 'other-tenant-search'

    // Create conversations for different tenants
    await conversationService.createConversation(testTenantId, {
      tenant_id: testTenantId,
      content: 'Test tenant conversation',
      platform: 'reddit',
      timestamp: new Date().toISOString()
    })

    await conversationService.createConversation(otherTenantId, {
      tenant_id: otherTenantId,
      content: 'Other tenant conversation',
      platform: 'reddit',
      timestamp: new Date().toISOString()
    })

    // Search should only return conversations for the specified tenant
    const result = await conversationService.searchConversations(testTenantId, {})

    expect(result.conversations).toHaveLength(1)
    expect(result.conversations[0].content).toBe('Test tenant conversation')
    expect(result.conversations[0].tenant_id).toBe(testTenantId)

    // Clean up other tenant data
    await supabase
      .from('conversations')
      .delete()
      .eq('tenant_id', otherTenantId)
  })
})