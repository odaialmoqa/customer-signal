import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { AlertService, ServerAlertService } from '@/lib/services/alert'

// Test configuration
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'

describe('Alert System Integration Tests', () => {
  let supabase: any
  let alertService: AlertService
  let serverAlertService: ServerAlertService
  let testTenantId: string
  let testUserId: string
  let testKeywordId: string
  let testConversationId: string

  beforeEach(async () => {
    // Skip if no test database configured
    if (!process.env.SUPABASE_URL) {
      console.log('Skipping integration tests - no Supabase URL configured')
      return
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey)
    alertService = new AlertService()
    serverAlertService = new ServerAlertService(supabase)

    // Create test tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert([{
        name: 'Test Tenant',
        subscription: 'pro'
      }])
      .select()
      .single()

    if (tenantError) throw tenantError
    testTenantId = tenant.id

    // Create test user
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'testpassword123',
      email_confirm: true
    })

    if (userError) throw userError
    testUserId = user.user.id

    // Create user profile
    await supabase
      .from('user_profiles')
      .insert([{
        id: testUserId,
        tenant_id: testTenantId,
        email: 'test@example.com',
        full_name: 'Test User'
      }])

    // Create test keyword
    const { data: keyword, error: keywordError } = await supabase
      .from('keywords')
      .insert([{
        tenant_id: testTenantId,
        term: 'test keyword',
        platforms: ['twitter', 'reddit'],
        is_active: true,
        created_by: testUserId
      }])
      .select()
      .single()

    if (keywordError) throw keywordError
    testKeywordId = keyword.id

    // Create test conversation
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert([{
        tenant_id: testTenantId,
        content: 'This is a test conversation about our test keyword',
        author: 'test_user',
        platform: 'twitter',
        url: 'https://twitter.com/test/status/123',
        external_id: 'twitter_123',
        timestamp: new Date().toISOString(),
        sentiment: 'negative',
        sentiment_confidence: 0.85,
        keywords: ['test keyword'],
        engagement_metrics: {
          likes: 10,
          shares: 5,
          comments: 3
        }
      }])
      .select()
      .single()

    if (conversationError) throw conversationError
    testConversationId = conversation.id
  })

  afterEach(async () => {
    if (!process.env.SUPABASE_URL) return

    // Clean up test data
    try {
      await supabase.from('alert_deliveries').delete().eq('user_id', testUserId)
      await supabase.from('alerts').delete().eq('tenant_id', testTenantId)
      await supabase.from('alert_configurations').delete().eq('tenant_id', testTenantId)
      await supabase.from('alert_notification_preferences').delete().eq('tenant_id', testTenantId)
      await supabase.from('conversations').delete().eq('tenant_id', testTenantId)
      await supabase.from('keywords').delete().eq('tenant_id', testTenantId)
      await supabase.from('user_profiles').delete().eq('id', testUserId)
      await supabase.from('tenants').delete().eq('id', testTenantId)
      await supabase.auth.admin.deleteUser(testUserId)
    } catch (error) {
      console.warn('Cleanup error:', error)
    }
  })

  describe('Alert Configuration Management', () => {
    it('should create and retrieve alert configurations', async () => {
      if (!process.env.SUPABASE_URL) return

      // Create alert configuration
      const configData = {
        name: 'Test Alert Config',
        description: 'Test description',
        alert_type: 'keyword_mention' as const,
        keyword_ids: [testKeywordId],
        platforms: ['twitter', 'reddit'],
        notification_channels: ['email', 'in_app'] as const,
        frequency: 'immediate' as const,
        priority: 'high' as const,
        sentiment_threshold: 0.7
      }

      // Set up auth context (simulate authenticated user)
      await supabase.auth.setSession({
        access_token: 'test-token',
        refresh_token: 'test-refresh'
      })

      const { data: config, error } = await supabase
        .from('alert_configurations')
        .insert([{ ...configData, tenant_id: testTenantId, created_by: testUserId }])
        .select()
        .single()

      expect(error).toBeNull()
      expect(config).toBeDefined()
      expect(config.name).toBe(configData.name)
      expect(config.alert_type).toBe(configData.alert_type)
      expect(config.is_active).toBe(true)

      // Retrieve configurations
      const { data: configs, error: fetchError } = await supabase
        .from('alert_configurations')
        .select('*')
        .eq('tenant_id', testTenantId)

      expect(fetchError).toBeNull()
      expect(configs).toHaveLength(1)
      expect(configs[0].id).toBe(config.id)
    })

    it('should update alert configuration', async () => {
      if (!process.env.SUPABASE_URL) return

      // Create initial configuration
      const { data: config } = await supabase
        .from('alert_configurations')
        .insert([{
          tenant_id: testTenantId,
          name: 'Initial Config',
          alert_type: 'keyword_mention',
          is_active: true,
          created_by: testUserId
        }])
        .select()
        .single()

      // Update configuration
      const updates = {
        name: 'Updated Config',
        description: 'Updated description',
        is_active: false
      }

      const { data: updatedConfig, error } = await supabase
        .from('alert_configurations')
        .update(updates)
        .eq('id', config.id)
        .select()
        .single()

      expect(error).toBeNull()
      expect(updatedConfig.name).toBe(updates.name)
      expect(updatedConfig.description).toBe(updates.description)
      expect(updatedConfig.is_active).toBe(false)
    })
  })

  describe('Alert Creation and Prioritization', () => {
    it('should create alert with correct priority based on sentiment', async () => {
      if (!process.env.SUPABASE_URL) return

      // Create alert configuration
      const { data: config } = await supabase
        .from('alert_configurations')
        .insert([{
          tenant_id: testTenantId,
          name: 'Sentiment Alert',
          alert_type: 'sentiment_threshold',
          sentiment_threshold: 0.8,
          priority: 'medium',
          is_active: true,
          created_by: testUserId
        }])
        .select()
        .single()

      // Create alert using server service
      const alertData = {
        tenant_id: testTenantId,
        conversation_id: testConversationId,
        alert_configuration_id: config.id,
        priority: 'high' as const,
        title: 'High Priority Negative Sentiment Alert',
        message: 'Negative sentiment detected with high confidence',
        metadata: {
          sentiment: 'negative',
          confidence: 0.85,
          platform: 'twitter'
        }
      }

      const alert = await serverAlertService.createAlert(alertData)

      expect(alert).toBeDefined()
      expect(alert.priority).toBe('high')
      expect(alert.tenant_id).toBe(testTenantId)
      expect(alert.conversation_id).toBe(testConversationId)
      expect(alert.metadata.sentiment).toBe('negative')
    })

    it('should trigger alert automatically when conversation is created', async () => {
      if (!process.env.SUPABASE_URL) return

      // Create alert configuration for keyword mentions
      await supabase
        .from('alert_configurations')
        .insert([{
          tenant_id: testTenantId,
          name: 'Keyword Alert',
          alert_type: 'keyword_mention',
          keyword_ids: [testKeywordId],
          platforms: ['twitter'],
          is_active: true,
          created_by: testUserId
        }])

      // Create new conversation that should trigger alert
      const { data: newConversation } = await supabase
        .from('conversations')
        .insert([{
          tenant_id: testTenantId,
          content: 'Another mention of our test keyword with negative sentiment',
          author: 'another_user',
          platform: 'twitter',
          external_id: 'twitter_456',
          timestamp: new Date().toISOString(),
          sentiment: 'negative',
          sentiment_confidence: 0.9,
          keywords: ['test keyword']
        }])
        .select()
        .single()

      // Wait a moment for trigger to process
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Check if alert was created
      const { data: alerts } = await supabase
        .from('alerts')
        .select('*')
        .eq('tenant_id', testTenantId)
        .eq('conversation_id', newConversation.id)

      expect(alerts).toBeDefined()
      expect(alerts.length).toBeGreaterThan(0)
      
      const alert = alerts[0]
      expect(alert.priority).toBe('high') // Should be high due to negative sentiment with high confidence
    })
  })

  describe('Notification Preferences', () => {
    it('should create and update notification preferences', async () => {
      if (!process.env.SUPABASE_URL) return

      const preferences = {
        user_id: testUserId,
        tenant_id: testTenantId,
        email_enabled: true,
        email_frequency: 'immediate' as const,
        in_app_enabled: true,
        push_notifications: false,
        webhook_enabled: false,
        quiet_hours_start: '22:00:00',
        quiet_hours_end: '08:00:00',
        timezone: 'America/New_York'
      }

      // Create preferences
      const { data: createdPrefs, error } = await supabase
        .from('alert_notification_preferences')
        .insert([preferences])
        .select()
        .single()

      expect(error).toBeNull()
      expect(createdPrefs.email_enabled).toBe(true)
      expect(createdPrefs.timezone).toBe('America/New_York')

      // Update preferences
      const updates = {
        email_enabled: false,
        webhook_enabled: true,
        webhook_url: 'https://example.com/webhook'
      }

      const { data: updatedPrefs, error: updateError } = await supabase
        .from('alert_notification_preferences')
        .update(updates)
        .eq('user_id', testUserId)
        .eq('tenant_id', testTenantId)
        .select()
        .single()

      expect(updateError).toBeNull()
      expect(updatedPrefs.email_enabled).toBe(false)
      expect(updatedPrefs.webhook_enabled).toBe(true)
      expect(updatedPrefs.webhook_url).toBe('https://example.com/webhook')
    })
  })

  describe('Alert Delivery Tracking', () => {
    it('should track alert delivery attempts', async () => {
      if (!process.env.SUPABASE_URL) return

      // Create an alert first
      const { data: alert } = await supabase
        .from('alerts')
        .insert([{
          tenant_id: testTenantId,
          title: 'Test Alert for Delivery',
          message: 'Test message',
          priority: 'medium'
        }])
        .select()
        .single()

      // Process alert delivery
      await serverAlertService.processAlertDelivery(alert.id, testUserId, 'email')

      // Check delivery record was created
      const { data: deliveries } = await supabase
        .from('alert_deliveries')
        .select('*')
        .eq('alert_id', alert.id)
        .eq('user_id', testUserId)

      expect(deliveries).toBeDefined()
      expect(deliveries.length).toBe(1)
      expect(deliveries[0].channel).toBe('email')
      expect(deliveries[0].status).toBe('pending')

      // Update delivery status
      await serverAlertService.updateDeliveryStatus(
        deliveries[0].id,
        'delivered',
        { provider: 'test', message_id: 'test-123' }
      )

      // Verify status update
      const { data: updatedDelivery } = await supabase
        .from('alert_deliveries')
        .select('*')
        .eq('id', deliveries[0].id)
        .single()

      expect(updatedDelivery.status).toBe('delivered')
      expect(updatedDelivery.delivery_details.provider).toBe('test')
      expect(updatedDelivery.delivered_at).toBeDefined()
    })
  })

  describe('Alert Statistics', () => {
    it('should calculate alert statistics correctly', async () => {
      if (!process.env.SUPABASE_URL) return

      // Create multiple alerts with different priorities and read status
      const alertsData = [
        {
          tenant_id: testTenantId,
          title: 'High Priority Alert',
          message: 'Test message',
          priority: 'high',
          is_read: false
        },
        {
          tenant_id: testTenantId,
          title: 'Medium Priority Alert',
          message: 'Test message',
          priority: 'medium',
          is_read: true
        },
        {
          tenant_id: testTenantId,
          title: 'Low Priority Alert',
          message: 'Test message',
          priority: 'low',
          is_read: false
        }
      ]

      await supabase
        .from('alerts')
        .insert(alertsData)

      // Get statistics
      const { data: alerts } = await supabase
        .from('alerts')
        .select('priority, created_at, is_read')
        .eq('tenant_id', testTenantId)

      expect(alerts).toBeDefined()
      expect(alerts.length).toBeGreaterThanOrEqual(3)

      // Calculate stats
      const total = alerts.length
      const unread = alerts.filter(a => !a.is_read).length
      const byPriority = alerts.reduce((acc, alert) => {
        acc[alert.priority] = (acc[alert.priority] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      expect(total).toBeGreaterThanOrEqual(3)
      expect(unread).toBeGreaterThanOrEqual(2)
      expect(byPriority.high).toBeGreaterThanOrEqual(1)
      expect(byPriority.medium).toBeGreaterThanOrEqual(1)
      expect(byPriority.low).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Real-time Functionality', () => {
    it('should support real-time subscriptions', async () => {
      if (!process.env.SUPABASE_URL) return

      let receivedAlert: any = null
      const alertReceived = new Promise((resolve) => {
        const channel = supabase
          .channel('test-alerts')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'alerts',
              filter: `tenant_id=eq.${testTenantId}`
            },
            (payload: any) => {
              receivedAlert = payload.new
              resolve(payload.new)
            }
          )
          .subscribe()
      })

      // Create a new alert
      const { data: newAlert } = await supabase
        .from('alerts')
        .insert([{
          tenant_id: testTenantId,
          title: 'Real-time Test Alert',
          message: 'This alert should trigger real-time notification',
          priority: 'medium'
        }])
        .select()
        .single()

      // Wait for real-time notification
      await Promise.race([
        alertReceived,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Real-time notification timeout')), 5000)
        )
      ])

      expect(receivedAlert).toBeDefined()
      expect(receivedAlert.id).toBe(newAlert.id)
      expect(receivedAlert.title).toBe('Real-time Test Alert')
    })
  })
})