import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createClient } from '@/lib/supabase/client'
import { tagService } from '@/lib/services/tag'

// Integration tests for the tagging system
// These tests require a test database to be set up

describe('Tagging System Integration', () => {
  let supabase: ReturnType<typeof createClient>
  let testTenantId: string
  let testUserId: string
  let testConversationId: string

  beforeEach(async () => {
    supabase = createClient()
    
    // Create test tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .insert({ name: 'Test Tenant', subscription: 'free' })
      .select()
      .single()
    
    testTenantId = tenant.id

    // Create test user
    const { data: user } = await supabase
      .from('user_profiles')
      .insert({
        id: 'test-user-id',
        tenant_id: testTenantId,
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'admin'
      })
      .select()
      .single()
    
    testUserId = user.id

    // Create test conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .insert({
        tenant_id: testTenantId,
        content: 'This is a test conversation with a bug report',
        platform: 'reddit',
        sentiment: 'negative'
      })
      .select()
      .single()
    
    testConversationId = conversation.id
  })

  afterEach(async () => {
    // Clean up test data
    await supabase.from('conversation_tags').delete().eq('conversation_id', testConversationId)
    await supabase.from('tag_suggestions').delete().eq('conversation_id', testConversationId)
    await supabase.from('tags').delete().eq('tenant_id', testTenantId)
    await supabase.from('conversations').delete().eq('id', testConversationId)
    await supabase.from('user_profiles').delete().eq('id', testUserId)
    await supabase.from('tenants').delete().eq('id', testTenantId)
  })

  describe('Tag Management', () => {
    it('should create, read, update, and delete tags', async () => {
      // Create tag
      const newTag = await tagService.createTag({
        tenant_id: testTenantId,
        name: 'Test Tag',
        description: 'A test tag',
        color: '#10B981',
        created_by: testUserId
      })

      expect(newTag.name).toBe('Test Tag')
      expect(newTag.color).toBe('#10B981')
      expect(newTag.tenant_id).toBe(testTenantId)

      // Read tag
      const fetchedTag = await tagService.getTag(newTag.id)
      expect(fetchedTag).toEqual(newTag)

      // Update tag
      const updatedTag = await tagService.updateTag(newTag.id, {
        name: 'Updated Test Tag',
        color: '#EF4444'
      })

      expect(updatedTag.name).toBe('Updated Test Tag')
      expect(updatedTag.color).toBe('#EF4444')

      // Delete tag
      await tagService.deleteTag(newTag.id)
      const deletedTag = await tagService.getTag(newTag.id)
      expect(deletedTag).toBeNull()
    })

    it('should enforce unique tag names per tenant', async () => {
      // Create first tag
      await tagService.createTag({
        tenant_id: testTenantId,
        name: 'Unique Tag',
        color: '#10B981',
        created_by: testUserId
      })

      // Try to create duplicate tag
      await expect(tagService.createTag({
        tenant_id: testTenantId,
        name: 'Unique Tag',
        color: '#EF4444',
        created_by: testUserId
      })).rejects.toThrow()
    })

    it('should search tags by name', async () => {
      // Create test tags
      await tagService.createTag({
        tenant_id: testTenantId,
        name: 'Bug Report',
        color: '#EF4444',
        created_by: testUserId
      })

      await tagService.createTag({
        tenant_id: testTenantId,
        name: 'Feature Request',
        color: '#3B82F6',
        created_by: testUserId
      })

      // Search for tags
      const searchResults = await tagService.searchTags('bug')
      expect(searchResults).toHaveLength(1)
      expect(searchResults[0].name).toBe('Bug Report')
    })
  })

  describe('Tag Hierarchy', () => {
    it('should create and manage hierarchical tags', async () => {
      // Create parent tag
      const parentTag = await tagService.createTag({
        tenant_id: testTenantId,
        name: 'Issues',
        color: '#6B7280',
        created_by: testUserId
      })

      // Create child tag
      const childTag = await tagService.createTag({
        tenant_id: testTenantId,
        name: 'Critical Issues',
        color: '#EF4444',
        parent_tag_id: parentTag.id,
        created_by: testUserId
      })

      expect(childTag.parent_tag_id).toBe(parentTag.id)

      // Fetch hierarchical tags
      const hierarchicalTags = await tagService.getTags(true)
      expect(hierarchicalTags).toBeDefined()
    })
  })

  describe('Conversation Tagging', () => {
    let testTag: any

    beforeEach(async () => {
      testTag = await tagService.createTag({
        tenant_id: testTenantId,
        name: 'Test Tag',
        color: '#10B981',
        created_by: testUserId
      })
    })

    it('should tag and untag conversations', async () => {
      // Tag conversation
      const conversationTags = await tagService.tagConversation(
        testConversationId,
        [testTag.id],
        testUserId
      )

      expect(conversationTags).toHaveLength(1)
      expect(conversationTags[0].conversation_id).toBe(testConversationId)
      expect(conversationTags[0].tag_id).toBe(testTag.id)

      // Verify tag usage count increased
      const updatedTag = await tagService.getTag(testTag.id)
      expect(updatedTag?.usage_count).toBe(1)

      // Get conversation tags
      const tags = await tagService.getConversationTags(testConversationId)
      expect(tags).toHaveLength(1)
      expect(tags[0].name).toBe('Test Tag')

      // Untag conversation
      await tagService.untagConversation(testConversationId, [testTag.id])

      // Verify tag was removed
      const remainingTags = await tagService.getConversationTags(testConversationId)
      expect(remainingTags).toHaveLength(0)

      // Verify tag usage count decreased
      const finalTag = await tagService.getTag(testTag.id)
      expect(finalTag?.usage_count).toBe(0)
    })

    it('should bulk tag multiple conversations', async () => {
      // Create another test conversation
      const { data: conversation2 } = await supabase
        .from('conversations')
        .insert({
          tenant_id: testTenantId,
          content: 'Another test conversation',
          platform: 'twitter',
          sentiment: 'neutral'
        })
        .select()
        .single()

      // Create another test tag
      const testTag2 = await tagService.createTag({
        tenant_id: testTenantId,
        name: 'Test Tag 2',
        color: '#3B82F6',
        created_by: testUserId
      })

      // Bulk tag conversations
      const taggedCount = await tagService.bulkTagConversations({
        conversationIds: [testConversationId, conversation2.id],
        tagIds: [testTag.id, testTag2.id]
      }, testUserId)

      expect(taggedCount).toBe(4) // 2 conversations × 2 tags

      // Verify tags were applied
      const conv1Tags = await tagService.getConversationTags(testConversationId)
      const conv2Tags = await tagService.getConversationTags(conversation2.id)

      expect(conv1Tags).toHaveLength(2)
      expect(conv2Tags).toHaveLength(2)

      // Clean up
      await supabase.from('conversations').delete().eq('id', conversation2.id)
    })
  })

  describe('Tag Suggestions', () => {
    let testTag: any

    beforeEach(async () => {
      testTag = await tagService.createTag({
        tenant_id: testTenantId,
        name: 'Bug Report',
        color: '#EF4444',
        created_by: testUserId
      })

      // Create a tag suggestion
      await supabase
        .from('tag_suggestions')
        .insert({
          conversation_id: testConversationId,
          tag_id: testTag.id,
          confidence: 0.85,
          reason: 'Contains bug-related keywords',
          status: 'pending'
        })
    })

    it('should get tag suggestions for a conversation', async () => {
      const suggestions = await tagService.getTagSuggestions(testConversationId)

      expect(suggestions).toHaveLength(1)
      expect(suggestions[0].tag_name).toBe('Bug Report')
      expect(suggestions[0].confidence).toBe(0.85)
      expect(suggestions[0].reason).toBe('Contains bug-related keywords')
    })

    it('should accept tag suggestions', async () => {
      await tagService.acceptTagSuggestion(testConversationId, testTag.id, testUserId)

      // Verify suggestion was marked as accepted
      const { data: suggestion } = await supabase
        .from('tag_suggestions')
        .select('status')
        .eq('conversation_id', testConversationId)
        .eq('tag_id', testTag.id)
        .single()

      expect(suggestion.status).toBe('accepted')

      // Verify tag was applied to conversation
      const tags = await tagService.getConversationTags(testConversationId)
      expect(tags).toHaveLength(1)
      expect(tags[0].name).toBe('Bug Report')
    })

    it('should reject tag suggestions', async () => {
      await tagService.rejectTagSuggestion(testConversationId, testTag.id)

      // Verify suggestion was marked as rejected
      const { data: suggestion } = await supabase
        .from('tag_suggestions')
        .select('status')
        .eq('conversation_id', testConversationId)
        .eq('tag_id', testTag.id)
        .single()

      expect(suggestion.status).toBe('rejected')

      // Verify tag was not applied to conversation
      const tags = await tagService.getConversationTags(testConversationId)
      expect(tags).toHaveLength(0)
    })
  })

  describe('Tag Statistics', () => {
    it('should calculate tag statistics correctly', async () => {
      // Create system and user tags
      const systemTag = await tagService.createTag({
        tenant_id: testTenantId,
        name: 'System Tag',
        color: '#6B7280',
        is_system_tag: true,
        created_by: testUserId
      })

      const userTag = await tagService.createTag({
        tenant_id: testTenantId,
        name: 'User Tag',
        color: '#10B981',
        is_system_tag: false,
        created_by: testUserId
      })

      // Tag a conversation to increase usage count
      await tagService.tagConversation(testConversationId, [userTag.id], testUserId)

      // Get statistics
      const stats = await tagService.getTagStats()

      expect(stats.totalTags).toBeGreaterThanOrEqual(2)
      expect(stats.systemTags).toBeGreaterThanOrEqual(1)
      expect(stats.userTags).toBeGreaterThanOrEqual(1)
      expect(stats.mostUsedTags).toBeDefined()
      expect(stats.mostUsedTags.length).toBeGreaterThan(0)
    })
  })

  describe('RLS (Row Level Security)', () => {
    it('should enforce tenant isolation for tags', async () => {
      // Create another tenant
      const { data: otherTenant } = await supabase
        .from('tenants')
        .insert({ name: 'Other Tenant', subscription: 'free' })
        .select()
        .single()

      // Create tag in other tenant
      await supabase
        .from('tags')
        .insert({
          tenant_id: otherTenant.id,
          name: 'Other Tenant Tag',
          color: '#10B981'
        })

      // Fetch tags for current tenant - should not include other tenant's tags
      const tags = await tagService.getTags()
      const otherTenantTags = tags.filter((tag: any) => tag.tenant_id === otherTenant.id)
      expect(otherTenantTags).toHaveLength(0)

      // Clean up
      await supabase.from('tenants').delete().eq('id', otherTenant.id)
    })
  })
})