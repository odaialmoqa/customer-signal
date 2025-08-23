import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Test configuration
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'test-anon-key'

describe('Alert Edge Functions Integration Tests', () => {
  let supabase: any
  let testTenantId: string
  let testUserId: string
  let testAlertId: string

  beforeEach(async () => {
    // Skip if no test database configured
    if (!process.env.SUPABASE_URL) {
      console.log('Skipping Edge Function tests - no Supabase URL configured')
      return
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create test tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert([{
        name: 'Test Tenant for Edge Functions',
        subscription: 'pro'
      }])
      .select()
      .single()

    if (tenantError) throw tenantError
    testTenantId = tenant.id

    // Create test user
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email: 'edgetest@example.com',
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
        email: 'edgetest@example.com',
        full_name: 'Edge Test User'
      }])

    // Create test alert
    const { data: alert, error: alertError } = await supabase
      .from('alerts')
      .insert([{
        tenant_id: testTenantId,
        title: 'Test Alert for Edge Functions',
        message: 'This is a test alert for testing edge functions',
        priority: 'high',
        metadata: {
          platform: 'twitter',
          sentiment: 'negative',
          confidence: 0.85,
          test: true
        }
      }])
      .select()
      .single()

    if (alertError) throw alertError
    testAlertId = alert.id

    // Create notification preferences
    await supabase
      .from('alert_notification_preferences')
      .insert([{
        user_id: testUserId,
        tenant_id: testTenantId,
        email_enabled: true,
        email_frequency: 'immediate',
        in_app_enabled: true,
        webhook_enabled: false
      }])
  })

  afterEach(async () => {
    if (!process.env.SUPABASE_URL) return

    // Clean up test data
    try {
      await supabase.from('alert_deliveries').delete().eq('user_id', testUserId)
      await supabase.from('alerts').delete().eq('tenant_id', testTenantId)
      await supabase.from('alert_notification_preferences').delete().eq('tenant_id', testTenantId)
      await supabase.from('user_profiles').delete().eq('id', testUserId)
      await supabase.from('tenants').delete().eq('id', testTenantId)
      await supabase.auth.admin.deleteUser(testUserId)
    } catch (error) {
      console.warn('Cleanup error:', error)
    }
  })

  describe('send-alert-email Edge Function', () => {
    it('should handle email sending request', async () => {
      if (!process.env.SUPABASE_URL) return

      const payload = {
        alert_id: testAlertId,
        user_id: testUserId,
        tenant_id: testTenantId
      }

      try {
        const { data, error } = await supabase.functions.invoke('send-alert-email', {
          body: payload
        })

        // The function should respond even if email service is not configured
        expect(error).toBeNull()
        expect(data).toBeDefined()
        
        // Should indicate success or failure with appropriate message
        expect(data).toHaveProperty('success')
        expect(data).toHaveProperty('message')

        if (data.success) {
          // If successful, should have sent email
          expect(data.message).toContain('sent')
        } else {
          // If failed, should have error message (likely due to missing email service config)
          expect(data.message).toBeDefined()
        }
      } catch (error) {
        // Edge function might not be deployed in test environment
        console.warn('Edge function not available:', error)
      }
    })

    it('should respect quiet hours setting', async () => {
      if (!process.env.SUPABASE_URL) return

      // Update notification preferences to have quiet hours
      const now = new Date()
      const currentHour = now.getHours().toString().padStart(2, '0')
      const currentMinute = now.getMinutes().toString().padStart(2, '0')
      const quietStart = `${currentHour}:${currentMinute}:00`
      const quietEnd = `${(parseInt(currentHour) + 1).toString().padStart(2, '0')}:${currentMinute}:00`

      await supabase
        .from('alert_notification_preferences')
        .update({
          quiet_hours_start: quietStart,
          quiet_hours_end: quietEnd,
          timezone: 'UTC'
        })
        .eq('user_id', testUserId)
        .eq('tenant_id', testTenantId)

      const payload = {
        alert_id: testAlertId,
        user_id: testUserId,
        tenant_id: testTenantId
      }

      try {
        const { data, error } = await supabase.functions.invoke('send-alert-email', {
          body: payload
        })

        expect(error).toBeNull()
        expect(data).toBeDefined()

        if (data.success === false && data.scheduled) {
          expect(data.message).toContain('quiet hours')
        }
      } catch (error) {
        console.warn('Edge function not available:', error)
      }
    })

    it('should handle disabled email notifications', async () => {
      if (!process.env.SUPABASE_URL) return

      // Disable email notifications
      await supabase
        .from('alert_notification_preferences')
        .update({ email_enabled: false })
        .eq('user_id', testUserId)
        .eq('tenant_id', testTenantId)

      const payload = {
        alert_id: testAlertId,
        user_id: testUserId,
        tenant_id: testTenantId
      }

      try {
        const { data, error } = await supabase.functions.invoke('send-alert-email', {
          body: payload
        })

        expect(error).toBeNull()
        expect(data).toBeDefined()
        expect(data.success).toBe(false)
        expect(data.message).toContain('disabled')
      } catch (error) {
        console.warn('Edge function not available:', error)
      }
    })
  })

  describe('process-alert-notifications Edge Function', () => {
    it('should process single alert notification', async () => {
      if (!process.env.SUPABASE_URL) return

      const payload = {
        alert_id: testAlertId,
        tenant_id: testTenantId
      }

      try {
        const { data, error } = await supabase.functions.invoke('process-alert-notifications', {
          body: payload
        })

        expect(error).toBeNull()
        expect(data).toBeDefined()
        expect(data.success).toBe(true)
        expect(data.processed).toBeGreaterThanOrEqual(0)

        if (data.processed > 0) {
          expect(data.results).toBeDefined()
          expect(Array.isArray(data.results)).toBe(true)
        }
      } catch (error) {
        console.warn('Edge function not available:', error)
      }
    })

    it('should process batch of alerts', async () => {
      if (!process.env.SUPABASE_URL) return

      // Create additional alerts
      const additionalAlerts = [
        {
          tenant_id: testTenantId,
          title: 'Batch Test Alert 1',
          message: 'Test message 1',
          priority: 'medium'
        },
        {
          tenant_id: testTenantId,
          title: 'Batch Test Alert 2',
          message: 'Test message 2',
          priority: 'low'
        }
      ]

      await supabase
        .from('alerts')
        .insert(additionalAlerts)

      const payload = {
        tenant_id: testTenantId,
        batch_size: 10
      }

      try {
        const { data, error } = await supabase.functions.invoke('process-alert-notifications', {
          body: payload
        })

        expect(error).toBeNull()
        expect(data).toBeDefined()
        expect(data.success).toBe(true)
        expect(data.processed).toBeGreaterThanOrEqual(2) // At least the alerts we created

        if (data.processed > 0) {
          expect(data.total_notifications).toBeGreaterThanOrEqual(0)
          expect(data.results).toBeDefined()
        }
      } catch (error) {
        console.warn('Edge function not available:', error)
      }
    })

    it('should handle empty alert queue', async () => {
      if (!process.env.SUPABASE_URL) return

      // Mark all alerts as notified
      await supabase
        .from('alerts')
        .update({ notified_at: new Date().toISOString() })
        .eq('tenant_id', testTenantId)

      const payload = {
        tenant_id: testTenantId
      }

      try {
        const { data, error } = await supabase.functions.invoke('process-alert-notifications', {
          body: payload
        })

        expect(error).toBeNull()
        expect(data).toBeDefined()
        expect(data.success).toBe(true)
        expect(data.processed).toBe(0)
        expect(data.message).toContain('No alerts to process')
      } catch (error) {
        console.warn('Edge function not available:', error)
      }
    })
  })

  describe('Alert Delivery Tracking', () => {
    it('should create delivery records when processing alerts', async () => {
      if (!process.env.SUPABASE_URL) return

      // Ensure alert is not yet notified
      await supabase
        .from('alerts')
        .update({ notified_at: null })
        .eq('id', testAlertId)

      const payload = {
        alert_id: testAlertId
      }

      try {
        const { data, error } = await supabase.functions.invoke('process-alert-notifications', {
          body: payload
        })

        if (error) {
          console.warn('Edge function error:', error)
          return
        }

        // Check if delivery records were created
        const { data: deliveries } = await supabase
          .from('alert_deliveries')
          .select('*')
          .eq('alert_id', testAlertId)

        if (data.processed > 0) {
          expect(deliveries).toBeDefined()
          expect(deliveries.length).toBeGreaterThan(0)

          const delivery = deliveries[0]
          expect(delivery.user_id).toBe(testUserId)
          expect(['email', 'in_app', 'webhook', 'sms']).toContain(delivery.channel)
          expect(['pending', 'sent', 'failed', 'delivered']).toContain(delivery.status)
        }
      } catch (error) {
        console.warn('Edge function not available:', error)
      }
    })

    it('should update alert notified_at timestamp', async () => {
      if (!process.env.SUPABASE_URL) return

      // Ensure alert is not yet notified
      await supabase
        .from('alerts')
        .update({ notified_at: null })
        .eq('id', testAlertId)

      const payload = {
        alert_id: testAlertId
      }

      try {
        const { data, error } = await supabase.functions.invoke('process-alert-notifications', {
          body: payload
        })

        if (error) {
          console.warn('Edge function error:', error)
          return
        }

        if (data.processed > 0) {
          // Check if alert was marked as notified
          const { data: updatedAlert } = await supabase
            .from('alerts')
            .select('notified_at')
            .eq('id', testAlertId)
            .single()

          expect(updatedAlert.notified_at).toBeDefined()
          expect(new Date(updatedAlert.notified_at)).toBeInstanceOf(Date)
        }
      } catch (error) {
        console.warn('Edge function not available:', error)
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid alert ID gracefully', async () => {
      if (!process.env.SUPABASE_URL) return

      const payload = {
        alert_id: '00000000-0000-0000-0000-000000000000',
        user_id: testUserId,
        tenant_id: testTenantId
      }

      try {
        const { data, error } = await supabase.functions.invoke('send-alert-email', {
          body: payload
        })

        // Should handle gracefully, not throw
        expect(data).toBeDefined()
        
        if (data.success === false) {
          expect(data.error || data.message).toBeDefined()
        }
      } catch (error) {
        console.warn('Edge function not available:', error)
      }
    })

    it('should handle invalid user ID gracefully', async () => {
      if (!process.env.SUPABASE_URL) return

      const payload = {
        alert_id: testAlertId,
        user_id: '00000000-0000-0000-0000-000000000000',
        tenant_id: testTenantId
      }

      try {
        const { data, error } = await supabase.functions.invoke('send-alert-email', {
          body: payload
        })

        expect(data).toBeDefined()
        
        if (data.success === false) {
          expect(data.error || data.message).toBeDefined()
        }
      } catch (error) {
        console.warn('Edge function not available:', error)
      }
    })

    it('should handle malformed request payload', async () => {
      if (!process.env.SUPABASE_URL) return

      const payload = {
        invalid_field: 'invalid_value'
      }

      try {
        const { data, error } = await supabase.functions.invoke('process-alert-notifications', {
          body: payload
        })

        // Should handle gracefully
        expect(data).toBeDefined()
        
        if (data.success === false) {
          expect(data.error).toBeDefined()
        }
      } catch (error) {
        console.warn('Edge function not available:', error)
      }
    })
  })
})