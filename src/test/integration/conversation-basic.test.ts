import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { ConversationService } from '@/lib/services/conversation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Skip if no environment variables
const skipTests = !supabaseUrl || !supabaseServiceKey

describe.skipIf(skipTests)('Conversation Service Basic Integration Tests', () => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const conversationService = new ConversationService(supabase)
  let testTenantId: string
  let testUserId: string
  let testConversationId: string

  beforeAll(async () => {
    // Create test tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: 'Test Tenant for Basic Conversation',
        subscription: 'pro',
      })
      .select()
      .single()

    if (tenantError) throw tenantError
    testTenantId = tenant.id

    // Create test user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'conversation-basic-test@example.com',
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
        email: 'conversation-basic-test@example.com',
        full_name: 'Test User',
        role: 'admin',
      })

    if (profileError) throw profileError
  })

  afterAll(async () => {
    // Clean up test data
    if (testConversationId) {
      await supabase
        .from('conversations')
        .delete()
        .eq('id', testConversationId)
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

  it('should create and retrieve a conversation', async () => {
    const conversationData = {
      content: 'This is a basic test conversation',
      author: 'test_user',
      platform: 'twitter' as const,
      url: 'https://twitter.com/test/123',
      external_id: 'basic_test_123',
      sentiment: 'positive' as const,
      sentiment_confidence: 0.85,
      keywords: ['test', 'basic'],
      tags: ['integration-test'],
    }

    // Create conversation
    const created = await conversationService.createConversation(
      testTenantId,
      conversationData
    )

    expect(created).toBeDefined()
    expect(created.content).toBe(conversationData.content)
    expect(created.tenant_id).toBe(testTenantId)
    expect(created.platform).toBe('twitter')

    testConversationId = created.id

    // Retrieve conversation
    const retrieved = await conversationService.getConversation(
      testTenantId,
      created.id
    )

    expect(retrieved).toBeDefined()
    expect(retrieved!.id).toBe(created.id)
    expect(retrieved!.content).toBe(conversationData.content)
  })

  it('should search conversations', async () => {
    // Search for the conversation we created
    const result = await conversationService.searchConversations(testTenantId, {
      query: 'basic test',
      limit: 10,
    })

    expect(result.conversations.length).toBeGreaterThan(0)
    expect(result.conversations[0].content).toContain('basic test')
  })

  it('should get recent conversations', async () => {
    const recent = await conversationService.getRecentConversations(testTenantId, 10)

    expect(recent.length).toBeGreaterThan(0)
    expect(recent[0].tenant_id).toBe(testTenantId)
  })

  it('should handle non-existent conversation', async () => {
    const nonExistent = await conversationService.getConversation(
      testTenantId,
      '00000000-0000-0000-0000-000000000000'
    )

    expect(nonExistent).toBeNull()
  })
})