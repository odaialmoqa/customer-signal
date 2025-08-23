import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// This test requires a running Supabase instance
// Skip if not in integration test environment
const isIntegrationTest = process.env.VITEST_INTEGRATION === 'true'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'

describe.skipIf(!isIntegrationTest)('Tenant Isolation Integration Tests', () => {
  let supabase: any
  let testTenant1: any
  let testTenant2: any
  let testUser1: any
  let testUser2: any

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Create test tenants
    const { data: tenant1 } = await supabase
      .from('tenants')
      .insert({ name: 'Test Tenant 1' })
      .select()
      .single()
    
    const { data: tenant2 } = await supabase
      .from('tenants')
      .insert({ name: 'Test Tenant 2' })
      .select()
      .single()

    testTenant1 = tenant1
    testTenant2 = tenant2

    // Create test users (bypassing auth for testing)
    const { data: user1 } = await supabase.auth.admin.createUser({
      email: 'user1@test.com',
      password: 'password123',
      email_confirm: true
    })

    const { data: user2 } = await supabase.auth.admin.createUser({
      email: 'user2@test.com',
      password: 'password123',
      email_confirm: true
    })

    testUser1 = user1.user
    testUser2 = user2.user

    // Create user profiles
    await supabase
      .from('user_profiles')
      .insert([
        {
          id: testUser1.id,
          tenant_id: testTenant1.id,
          email: testUser1.email,
          role: 'owner'
        },
        {
          id: testUser2.id,
          tenant_id: testTenant2.id,
          email: testUser2.email,
          role: 'owner'
        }
      ])
  })

  afterAll(async () => {
    // Cleanup test data
    if (testUser1) {
      await supabase.auth.admin.deleteUser(testUser1.id)
    }
    if (testUser2) {
      await supabase.auth.admin.deleteUser(testUser2.id)
    }
    
    if (testTenant1) {
      await supabase.from('tenants').delete().eq('id', testTenant1.id)
    }
    if (testTenant2) {
      await supabase.from('tenants').delete().eq('id', testTenant2.id)
    }
  })

  describe('Tenant Data Isolation', () => {
    it('should isolate keywords between tenants', async () => {
      // Create client for user 1
      const user1Client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      await user1Client.auth.signInWithPassword({
        email: 'user1@test.com',
        password: 'password123'
      })

      // Create client for user 2
      const user2Client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      await user2Client.auth.signInWithPassword({
        email: 'user2@test.com',
        password: 'password123'
      })

      // User 1 creates a keyword
      const { data: keyword1 } = await user1Client
        .from('keywords')
        .insert({
          tenant_id: testTenant1.id,
          term: 'test keyword 1',
          platforms: ['reddit']
        })
        .select()
        .single()

      // User 2 creates a keyword
      const { data: keyword2 } = await user2Client
        .from('keywords')
        .insert({
          tenant_id: testTenant2.id,
          term: 'test keyword 2',
          platforms: ['twitter']
        })
        .select()
        .single()

      // User 1 should only see their keyword
      const { data: user1Keywords } = await user1Client
        .from('keywords')
        .select('*')

      expect(user1Keywords).toHaveLength(1)
      expect(user1Keywords[0].term).toBe('test keyword 1')

      // User 2 should only see their keyword
      const { data: user2Keywords } = await user2Client
        .from('keywords')
        .select('*')

      expect(user2Keywords).toHaveLength(1)
      expect(user2Keywords[0].term).toBe('test keyword 2')

      // Cleanup
      await user1Client.from('keywords').delete().eq('id', keyword1.id)
      await user2Client.from('keywords').delete().eq('id', keyword2.id)
    })

    it('should isolate conversations between tenants', async () => {
      const user1Client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      await user1Client.auth.signInWithPassword({
        email: 'user1@test.com',
        password: 'password123'
      })

      const user2Client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      await user2Client.auth.signInWithPassword({
        email: 'user2@test.com',
        password: 'password123'
      })

      // User 1 creates a conversation
      const { data: conversation1 } = await user1Client
        .from('conversations')
        .insert({
          tenant_id: testTenant1.id,
          content: 'Test conversation 1',
          platform: 'reddit',
          author: 'test_author_1'
        })
        .select()
        .single()

      // User 2 creates a conversation
      const { data: conversation2 } = await user2Client
        .from('conversations')
        .insert({
          tenant_id: testTenant2.id,
          content: 'Test conversation 2',
          platform: 'twitter',
          author: 'test_author_2'
        })
        .select()
        .single()

      // User 1 should only see their conversation
      const { data: user1Conversations } = await user1Client
        .from('conversations')
        .select('*')

      expect(user1Conversations).toHaveLength(1)
      expect(user1Conversations[0].content).toBe('Test conversation 1')

      // User 2 should only see their conversation
      const { data: user2Conversations } = await user2Client
        .from('conversations')
        .select('*')

      expect(user2Conversations).toHaveLength(1)
      expect(user2Conversations[0].content).toBe('Test conversation 2')

      // Cleanup
      await user1Client.from('conversations').delete().eq('id', conversation1.id)
      await user2Client.from('conversations').delete().eq('id', conversation2.id)
    })

    it('should prevent cross-tenant data access', async () => {
      const user1Client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      await user1Client.auth.signInWithPassword({
        email: 'user1@test.com',
        password: 'password123'
      })

      // User 1 tries to access tenant 2's data directly
      const { data: otherTenantData, error } = await user1Client
        .from('keywords')
        .select('*')
        .eq('tenant_id', testTenant2.id)

      // Should return empty array due to RLS
      expect(otherTenantData).toEqual([])
      expect(error).toBeNull()

      // User 1 tries to insert data for tenant 2
      const { data: insertData, error: insertError } = await user1Client
        .from('keywords')
        .insert({
          tenant_id: testTenant2.id,
          term: 'malicious keyword',
          platforms: ['reddit']
        })
        .select()

      // Should fail due to RLS policy
      expect(insertData).toBeNull()
      expect(insertError).toBeTruthy()
    })
  })

  describe('Role-Based Access Control', () => {
    let memberUser: any
    let memberClient: any

    beforeEach(async () => {
      // Create a member user for tenant 1
      const { data: user } = await supabase.auth.admin.createUser({
        email: 'member@test.com',
        password: 'password123',
        email_confirm: true
      })

      memberUser = user.user

      await supabase
        .from('user_profiles')
        .insert({
          id: memberUser.id,
          tenant_id: testTenant1.id,
          email: memberUser.email,
          role: 'member'
        })

      memberClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      await memberClient.auth.signInWithPassword({
        email: 'member@test.com',
        password: 'password123'
      })
    })

    afterEach(async () => {
      if (memberUser) {
        await supabase.auth.admin.deleteUser(memberUser.id)
      }
    })

    it('should allow members to view tenant data', async () => {
      // Member should be able to view keywords in their tenant
      const { data: keywords, error } = await memberClient
        .from('keywords')
        .select('*')

      expect(error).toBeNull()
      expect(Array.isArray(keywords)).toBe(true)
    })

    it('should prevent members from creating invitations', async () => {
      // Member tries to create an invitation
      const { data, error } = await memberClient
        .from('tenant_invitations')
        .insert({
          tenant_id: testTenant1.id,
          email: 'newuser@test.com',
          role: 'member',
          invited_by: memberUser.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })

      // Should fail due to RLS policy requiring admin role
      expect(data).toBeNull()
      expect(error).toBeTruthy()
    })

    it('should allow admins to create invitations', async () => {
      // Update member to admin
      await supabase
        .from('user_profiles')
        .update({ role: 'admin' })
        .eq('id', memberUser.id)

      // Admin should be able to create invitations
      const { data, error } = await memberClient
        .from('tenant_invitations')
        .insert({
          tenant_id: testTenant1.id,
          email: 'newuser@test.com',
          role: 'member',
          invited_by: memberUser.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeTruthy()
      expect(data.email).toBe('newuser@test.com')

      // Cleanup
      if (data) {
        await supabase.from('tenant_invitations').delete().eq('id', data.id)
      }
    })
  })
})