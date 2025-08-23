import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface AlertEmailPayload {
  alert_id: string
  user_id: string
  tenant_id: string
}

interface EmailTemplate {
  subject: string
  html: string
  text: string
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

    const { alert_id, user_id, tenant_id } = await req.json() as AlertEmailPayload

    // Get alert details with related data
    const { data: alert, error: alertError } = await supabase
      .from('alerts')
      .select(`
        *,
        conversation:conversations(*),
        alert_configuration:alert_configurations(*),
        keyword:keywords(*)
      `)
      .eq('id', alert_id)
      .single()

    if (alertError || !alert) {
      throw new Error(`Alert not found: ${alertError?.message}`)
    }

    // Get user details and notification preferences
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user_id)
      .single()

    if (userError || !userProfile) {
      throw new Error(`User not found: ${userError?.message}`)
    }

    // Get notification preferences
    const { data: preferences } = await supabase
      .from('alert_notification_preferences')
      .select('*')
      .eq('user_id', user_id)
      .eq('tenant_id', tenant_id)
      .single()

    // Check if email notifications are enabled
    if (preferences && !preferences.email_enabled) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Email notifications disabled for user' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Check quiet hours
    if (preferences?.quiet_hours_start && preferences?.quiet_hours_end) {
      const now = new Date()
      const timezone = preferences.timezone || 'UTC'
      const currentTime = now.toLocaleTimeString('en-US', { 
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      })

      const quietStart = preferences.quiet_hours_start
      const quietEnd = preferences.quiet_hours_end

      if (currentTime >= quietStart && currentTime <= quietEnd) {
        // Schedule for later delivery
        console.log(`Skipping email due to quiet hours: ${currentTime} between ${quietStart} and ${quietEnd}`)
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Email skipped due to quiet hours',
            scheduled: true
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }
    }

    // Generate email template
    const emailTemplate = generateEmailTemplate(alert, userProfile, preferences)

    // Send email using your preferred email service
    // This example uses a generic email service - replace with your actual implementation
    const emailResult = await sendEmail({
      to: userProfile.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    })

    // Record delivery attempt
    const deliveryStatus = emailResult.success ? 'sent' : 'failed'
    const { error: deliveryError } = await supabase
      .from('alert_deliveries')
      .insert([{
        alert_id,
        user_id,
        channel: 'email',
        status: deliveryStatus,
        delivery_details: emailResult.details || {},
        error_message: emailResult.error || null,
        delivered_at: emailResult.success ? new Date().toISOString() : null
      }])

    if (deliveryError) {
      console.error('Failed to record delivery:', deliveryError)
    }

    // Update alert notification timestamp
    await supabase
      .from('alerts')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', alert_id)

    return new Response(
      JSON.stringify({ 
        success: emailResult.success,
        message: emailResult.success ? 'Email sent successfully' : 'Failed to send email',
        details: emailResult.details
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: emailResult.success ? 200 : 500
      }
    )

  } catch (error) {
    console.error('Error in send-alert-email function:', error)
    
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

function generateEmailTemplate(alert: any, user: any, preferences: any): EmailTemplate {
  const priorityColors = {
    low: '#10B981',
    medium: '#F59E0B', 
    high: '#EF4444',
    urgent: '#DC2626'
  }

  const priorityColor = priorityColors[alert.priority] || '#6B7280'
  
  const subject = `${getPriorityEmoji(alert.priority)} ${alert.title}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: ${priorityColor}; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; background: ${priorityColor}; color: white; margin-bottom: 15px; }
        .message { background: #f8fafc; padding: 20px; border-radius: 6px; border-left: 4px solid ${priorityColor}; margin: 20px 0; }
        .metadata { background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 20px 0; font-size: 14px; }
        .metadata-item { margin: 5px 0; }
        .metadata-label { font-weight: 600; color: #475569; }
        .button { display: inline-block; padding: 12px 24px; background: ${priorityColor}; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        .unsubscribe { color: #64748b; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">${getPriorityEmoji(alert.priority)} Alert Notification</h1>
        </div>
        
        <div class="content">
          <div class="priority-badge">${alert.priority} Priority</div>
          
          <h2 style="margin: 0 0 15px 0; color: #1e293b;">${alert.title}</h2>
          
          <div class="message">
            <p style="margin: 0;">${alert.message}</p>
          </div>
          
          ${alert.conversation ? `
            <div class="metadata">
              <div class="metadata-item">
                <span class="metadata-label">Platform:</span> ${alert.conversation.platform}
              </div>
              ${alert.conversation.author ? `
                <div class="metadata-item">
                  <span class="metadata-label">Author:</span> ${alert.conversation.author}
                </div>
              ` : ''}
              ${alert.conversation.sentiment ? `
                <div class="metadata-item">
                  <span class="metadata-label">Sentiment:</span> ${alert.conversation.sentiment} (${Math.round((alert.conversation.sentiment_confidence || 0) * 100)}% confidence)
                </div>
              ` : ''}
              <div class="metadata-item">
                <span class="metadata-label">Time:</span> ${new Date(alert.conversation.timestamp || alert.created_at).toLocaleString()}
              </div>
              ${alert.conversation.url ? `
                <div class="metadata-item">
                  <span class="metadata-label">Source:</span> <a href="${alert.conversation.url}" style="color: ${priorityColor};">View Original</a>
                </div>
              ` : ''}
            </div>
          ` : ''}
          
          <a href="${Deno.env.get('FRONTEND_URL')}/dashboard?alert=${alert.id}" class="button">
            View in Dashboard
          </a>
        </div>
        
        <div class="footer">
          <p>You received this alert because you have notifications enabled for your CustomerSignal account.</p>
          <p>
            <a href="${Deno.env.get('FRONTEND_URL')}/settings/notifications" class="unsubscribe">
              Manage notification preferences
            </a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
${getPriorityEmoji(alert.priority)} ALERT NOTIFICATION

${alert.title}

Priority: ${alert.priority.toUpperCase()}

${alert.message}

${alert.conversation ? `
Platform: ${alert.conversation.platform}
${alert.conversation.author ? `Author: ${alert.conversation.author}` : ''}
${alert.conversation.sentiment ? `Sentiment: ${alert.conversation.sentiment} (${Math.round((alert.conversation.sentiment_confidence || 0) * 100)}% confidence)` : ''}
Time: ${new Date(alert.conversation.timestamp || alert.created_at).toLocaleString()}
${alert.conversation.url ? `Source: ${alert.conversation.url}` : ''}
` : ''}

View in Dashboard: ${Deno.env.get('FRONTEND_URL')}/dashboard?alert=${alert.id}

---
You received this alert because you have notifications enabled for your CustomerSignal account.
Manage your notification preferences: ${Deno.env.get('FRONTEND_URL')}/settings/notifications
  `

  return { subject, html, text }
}

function getPriorityEmoji(priority: string): string {
  const emojis = {
    low: '🔵',
    medium: '🟡', 
    high: '🟠',
    urgent: '🔴'
  }
  return emojis[priority] || '⚪'
}

async function sendEmail(emailData: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<{ success: boolean, details?: any, error?: string }> {
  try {
    // Example using Resend (replace with your preferred email service)
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      throw new Error('Email service not configured')
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'CustomerSignal <alerts@customersignal.com>',
        to: [emailData.to],
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Failed to send email')
    }

    return {
      success: true,
      details: {
        id: result.id,
        provider: 'resend'
      }
    }
  } catch (error) {
    console.error('Email sending error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}