import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ProcessAlertsPayload {
  alert_id?: string
  tenant_id?: string
  batch_size?: number
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json() as ProcessAlertsPayload
    const { alert_id, tenant_id, batch_size = 50 } = payload

    // Get unprocessed alerts
    let query = supabase
      .from('alerts')
      .select(`
        *,
        alert_configuration:alert_configurations(*),
        tenant:tenants(*)
      `)
      .is('notified_at', null)
      .order('created_at', { ascending: true })
      .limit(batch_size)

    if (alert_id) {
      query = query.eq('id', alert_id)
    }

    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id)
    }

    const { data: alerts, error: alertsError } = await query

    if (alertsError) {
      throw new Error(`Failed to fetch alerts: ${alertsError.message}`)
    }

    if (!alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No alerts to process',
          processed: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    const results = []

    for (const alert of alerts) {
      try {
        // Get users in the tenant who should receive notifications
        const { data: users, error: usersError } = await supabase
          .from('user_profiles')
          .select(`
            *,
            notification_preferences:alert_notification_preferences(*)
          `)
          .eq('tenant_id', alert.tenant_id)

        if (usersError) {
          console.error(`Failed to get users for tenant ${alert.tenant_id}:`, usersError)
          continue
        }

        const notificationResults = []

        for (const user of users || []) {
          const preferences = user.notification_preferences?.[0]
          
          // Determine which notification channels to use
          const channels = []
          
          // Check alert configuration for notification channels
          if (alert.alert_configuration?.notification_channels) {
            channels.push(...alert.alert_configuration.notification_channels)
          } else {
            // Default to in-app notifications
            channels.push('in_app')
          }

          // Process each notification channel
          for (const channel of channels) {
            try {
              let notificationResult = { success: false, channel, error: 'Unknown error' }

              switch (channel) {
                case 'email':
                  if (preferences?.email_enabled !== false) {
                    notificationResult = await sendEmailNotification(supabase, alert.id, user.id, alert.tenant_id)
                  } else {
                    notificationResult = { success: false, channel, error: 'Email notifications disabled' }
                  }
                  break

                case 'in_app':
                  // In-app notifications are handled by the real-time subscription
                  // Just record the delivery
                  notificationResult = await recordInAppNotification(supabase, alert.id, user.id)
                  break

                case 'webhook':
                  if (preferences?.webhook_enabled && preferences?.webhook_url) {
                    notificationResult = await sendWebhookNotification(alert, user, preferences.webhook_url)
                  } else {
                    notificationResult = { success: false, channel, error: 'Webhook not configured' }
                  }
                  break

                case 'sms':
                  // SMS implementation would go here
                  notificationResult = { success: false, channel, error: 'SMS not implemented' }
                  break

                default:
                  notificationResult = { success: false, channel, error: 'Unknown notification channel' }
              }

              notificationResults.push({
                user_id: user.id,
                channel,
                ...notificationResult
              })

            } catch (error) {
              console.error(`Failed to send ${channel} notification to user ${user.id}:`, error)
              notificationResults.push({
                user_id: user.id,
                channel,
                success: false,
                error: error.message
              })
            }
          }
        }

        // Update alert as notified
        await supabase
          .from('alerts')
          .update({ notified_at: new Date().toISOString() })
          .eq('id', alert.id)

        results.push({
          alert_id: alert.id,
          notifications: notificationResults,
          success: true
        })

      } catch (error) {
        console.error(`Failed to process alert ${alert.id}:`, error)
        results.push({
          alert_id: alert.id,
          success: false,
          error: error.message
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const totalNotifications = results.reduce((sum, r) => 
      sum + (r.notifications?.length || 0), 0
    )

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: alerts.length,
        successful: successCount,
        failed: alerts.length - successCount,
        total_notifications: totalNotifications,
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in process-alert-notifications function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

async function sendEmailNotification(
  supabase: any, 
  alertId: string, 
  userId: string, 
  tenantId: string
): Promise<{ success: boolean, channel: string, error?: string }> {
  try {
    // Call the send-alert-email function
    const { data, error } = await supabase.functions.invoke('send-alert-email', {
      body: {
        alert_id: alertId,
        user_id: userId,
        tenant_id: tenantId
      }
    })

    if (error) {
      throw new Error(error.message)
    }

    return {
      success: data.success,
      channel: 'email',
      error: data.success ? undefined : data.message
    }
  } catch (error) {
    return {
      success: false,
      channel: 'email',
      error: error.message
    }
  }
}

async function recordInAppNotification(
  supabase: any,
  alertId: string,
  userId: string
): Promise<{ success: boolean, channel: string, error?: string }> {
  try {
    const { error } = await supabase
      .from('alert_deliveries')
      .insert([{
        alert_id: alertId,
        user_id: userId,
        channel: 'in_app',
        status: 'delivered',
        delivered_at: new Date().toISOString()
      }])

    if (error) {
      throw new Error(error.message)
    }

    return {
      success: true,
      channel: 'in_app'
    }
  } catch (error) {
    return {
      success: false,
      channel: 'in_app',
      error: error.message
    }
  }
}

async function sendWebhookNotification(
  alert: any,
  user: any,
  webhookUrl: string
): Promise<{ success: boolean, channel: string, error?: string }> {
  try {
    const payload = {
      event: 'alert.created',
      alert: {
        id: alert.id,
        title: alert.title,
        message: alert.message,
        priority: alert.priority,
        created_at: alert.created_at,
        metadata: alert.metadata
      },
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name
      },
      tenant: {
        id: alert.tenant_id,
        name: alert.tenant?.name
      }
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CustomerSignal-Webhook/1.0'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}: ${response.statusText}`)
    }

    return {
      success: true,
      channel: 'webhook'
    }
  } catch (error) {
    return {
      success: false,
      channel: 'webhook',
      error: error.message
    }
  }
}