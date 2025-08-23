import { createClient } from '@/lib/supabase/client'
import { createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database'

type AlertConfiguration = Database['public']['Tables']['alert_configurations']['Row']
type Alert = Database['public']['Tables']['alerts']['Row']
type AlertNotificationPreferences = Database['public']['Tables']['alert_notification_preferences']['Row']
type AlertDelivery = Database['public']['Tables']['alert_deliveries']['Row']

export interface CreateAlertConfigurationData {
  name: string
  description?: string
  alert_type: 'keyword_mention' | 'sentiment_threshold' | 'volume_spike' | 'custom'
  keyword_ids?: string[]
  sentiment_threshold?: number
  volume_threshold?: number
  platforms?: string[]
  notification_channels?: ('email' | 'in_app' | 'webhook' | 'sms')[]
  frequency?: 'immediate' | 'hourly' | 'daily' | 'weekly'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  conditions?: Record<string, any>
}

export interface UpdateNotificationPreferencesData {
  email_enabled?: boolean
  email_frequency?: 'immediate' | 'hourly' | 'daily' | 'weekly'
  email_digest_time?: string
  in_app_enabled?: boolean
  push_notifications?: boolean
  webhook_url?: string
  webhook_enabled?: boolean
  quiet_hours_start?: string
  quiet_hours_end?: string
  timezone?: string
}

export class AlertService {
  private supabase = createClient()

  /**
   * Get all alert configurations for the current tenant
   */
  async getAlertConfigurations(): Promise<AlertConfiguration[]> {
    const { data, error } = await this.supabase
      .from('alert_configurations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch alert configurations: ${error.message}`)
    }

    return data || []
  }

  /**
   * Create a new alert configuration
   */
  async createAlertConfiguration(configData: CreateAlertConfigurationData): Promise<AlertConfiguration> {
    const { data, error } = await this.supabase
      .from('alert_configurations')
      .insert([configData])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create alert configuration: ${error.message}`)
    }

    return data
  }

  /**
   * Update an existing alert configuration
   */
  async updateAlertConfiguration(
    id: string, 
    updates: Partial<CreateAlertConfigurationData>
  ): Promise<AlertConfiguration> {
    const { data, error } = await this.supabase
      .from('alert_configurations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update alert configuration: ${error.message}`)
    }

    return data
  }

  /**
   * Delete an alert configuration
   */
  async deleteAlertConfiguration(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('alert_configurations')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete alert configuration: ${error.message}`)
    }
  }

  /**
   * Get all alerts for the current tenant
   */
  async getAlerts(options?: {
    limit?: number
    offset?: number
    unreadOnly?: boolean
    priority?: 'low' | 'medium' | 'high' | 'urgent'
  }): Promise<{ alerts: Alert[], count: number }> {
    let query = this.supabase
      .from('alerts')
      .select(`
        *,
        conversation:conversations(*),
        alert_configuration:alert_configurations(*),
        keyword:keywords(*)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (options?.unreadOnly) {
      query = query.eq('is_read', false)
    }

    if (options?.priority) {
      query = query.eq('priority', options.priority)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    const { data, error, count } = await query

    if (error) {
      throw new Error(`Failed to fetch alerts: ${error.message}`)
    }

    return { alerts: data || [], count: count || 0 }
  }

  /**
   * Mark alert as read
   */
  async markAlertAsRead(alertId: string): Promise<void> {
    const { error } = await this.supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('id', alertId)

    if (error) {
      throw new Error(`Failed to mark alert as read: ${error.message}`)
    }
  }

  /**
   * Mark multiple alerts as read
   */
  async markAlertsAsRead(alertIds: string[]): Promise<void> {
    const { error } = await this.supabase
      .from('alerts')
      .update({ is_read: true })
      .in('id', alertIds)

    if (error) {
      throw new Error(`Failed to mark alerts as read: ${error.message}`)
    }
  }

  /**
   * Get notification preferences for current user
   */
  async getNotificationPreferences(): Promise<AlertNotificationPreferences | null> {
    const { data, error } = await this.supabase
      .from('alert_notification_preferences')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw new Error(`Failed to fetch notification preferences: ${error.message}`)
    }

    return data
  }

  /**
   * Update notification preferences for current user
   */
  async updateNotificationPreferences(
    preferences: UpdateNotificationPreferencesData
  ): Promise<AlertNotificationPreferences> {
    const { data, error } = await this.supabase
      .from('alert_notification_preferences')
      .upsert([{ ...preferences, updated_at: new Date().toISOString() }])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update notification preferences: ${error.message}`)
    }

    return data
  }

  /**
   * Subscribe to real-time alert updates
   */
  subscribeToAlerts(callback: (alert: Alert) => void) {
    const channel = this.supabase
      .channel('alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts'
        },
        (payload) => {
          callback(payload.new as Alert)
        }
      )
      .subscribe()

    return () => {
      this.supabase.removeChannel(channel)
    }
  }

  /**
   * Subscribe to alert configuration changes
   */
  subscribeToAlertConfigurations(callback: (config: AlertConfiguration) => void) {
    const channel = this.supabase
      .channel('alert_configurations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alert_configurations'
        },
        (payload) => {
          callback(payload.new as AlertConfiguration)
        }
      )
      .subscribe()

    return () => {
      this.supabase.removeChannel(channel)
    }
  }

  /**
   * Get alert delivery history
   */
  async getAlertDeliveries(alertId?: string): Promise<AlertDelivery[]> {
    let query = this.supabase
      .from('alert_deliveries')
      .select('*')
      .order('attempted_at', { ascending: false })

    if (alertId) {
      query = query.eq('alert_id', alertId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch alert deliveries: ${error.message}`)
    }

    return data || []
  }

  /**
   * Test alert configuration by simulating a trigger
   */
  async testAlertConfiguration(configId: string): Promise<{ success: boolean, message: string }> {
    try {
      // This would typically create a test alert or validate the configuration
      const config = await this.supabase
        .from('alert_configurations')
        .select('*')
        .eq('id', configId)
        .single()

      if (config.error) {
        throw new Error(config.error.message)
      }

      // Create a test alert
      const testAlert = {
        tenant_id: config.data.tenant_id,
        alert_configuration_id: configId,
        priority: config.data.priority,
        title: `Test Alert: ${config.data.name}`,
        message: 'This is a test alert to verify your configuration is working correctly.',
        metadata: {
          test: true,
          timestamp: new Date().toISOString()
        }
      }

      const { error: insertError } = await this.supabase
        .from('alerts')
        .insert([testAlert])

      if (insertError) {
        throw new Error(insertError.message)
      }

      return {
        success: true,
        message: 'Test alert created successfully'
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Get alert statistics for dashboard
   */
  async getAlertStats(timeRange?: { start: Date, end: Date }): Promise<{
    total: number
    unread: number
    byPriority: Record<string, number>
    byType: Record<string, number>
    recentTrend: Array<{ date: string, count: number }>
  }> {
    let query = this.supabase
      .from('alerts')
      .select('priority, created_at, alert_configuration_id')

    if (timeRange) {
      query = query
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString())
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch alert statistics: ${error.message}`)
    }

    const alerts = data || []
    
    // Calculate statistics
    const total = alerts.length
    const unread = alerts.filter(alert => !alert.is_read).length
    
    const byPriority = alerts.reduce((acc, alert) => {
      acc[alert.priority] = (acc[alert.priority] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Get recent trend (last 7 days)
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const recentAlerts = alerts.filter(alert => 
      new Date(alert.created_at) >= sevenDaysAgo
    )

    const recentTrend = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      const count = recentAlerts.filter(alert => 
        alert.created_at.startsWith(dateStr)
      ).length
      
      return { date: dateStr, count }
    })

    return {
      total,
      unread,
      byPriority,
      byType: {}, // Would need to join with alert_configurations to get types
      recentTrend
    }
  }
}

// Server-side alert service for Edge Functions
export class ServerAlertService {
  private supabase

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient
  }

  /**
   * Create alert from server context (used in Edge Functions)
   */
  async createAlert(alertData: {
    tenant_id: string
    conversation_id?: string
    keyword_id?: string
    alert_configuration_id?: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    title: string
    message: string
    metadata?: Record<string, any>
  }): Promise<Alert> {
    const { data, error } = await this.supabase
      .from('alerts')
      .insert([alertData])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create alert: ${error.message}`)
    }

    return data
  }

  /**
   * Process alert delivery
   */
  async processAlertDelivery(
    alertId: string,
    userId: string,
    channel: 'email' | 'in_app' | 'webhook' | 'sms'
  ): Promise<void> {
    const deliveryRecord = {
      alert_id: alertId,
      user_id: userId,
      channel,
      status: 'pending'
    }

    const { error } = await this.supabase
      .from('alert_deliveries')
      .insert([deliveryRecord])

    if (error) {
      throw new Error(`Failed to create alert delivery record: ${error.message}`)
    }
  }

  /**
   * Update alert delivery status
   */
  async updateDeliveryStatus(
    deliveryId: string,
    status: 'sent' | 'failed' | 'delivered',
    details?: Record<string, any>,
    errorMessage?: string
  ): Promise<void> {
    const updates: any = {
      status,
      delivered_at: status === 'delivered' ? new Date().toISOString() : null
    }

    if (details) {
      updates.delivery_details = details
    }

    if (errorMessage) {
      updates.error_message = errorMessage
    }

    const { error } = await this.supabase
      .from('alert_deliveries')
      .update(updates)
      .eq('id', deliveryId)

    if (error) {
      throw new Error(`Failed to update delivery status: ${error.message}`)
    }
  }
}

export const alertService = new AlertService()