import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { MonitoringService } from '../_shared/monitoring-service.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const monitoringService = new MonitoringService(supabase)

    const { method } = req
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/').filter(Boolean)

    switch (method) {
      case 'POST':
        if (pathSegments[pathSegments.length - 1] === 'start') {
          // Start monitoring for specific keyword
          const { keywordId, tenantId } = await req.json()
          await monitoringService.startMonitoring(keywordId, tenantId)
          return new Response(
            JSON.stringify({ success: true, message: 'Monitoring started' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else if (pathSegments[pathSegments.length - 1] === 'stop') {
          // Stop monitoring for specific keyword
          const { keywordId, tenantId } = await req.json()
          await monitoringService.stopMonitoring(keywordId, tenantId)
          return new Response(
            JSON.stringify({ success: true, message: 'Monitoring stopped' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else if (pathSegments[pathSegments.length - 1] === 'scan') {
          // Manual scan trigger
          const { keywordId, tenantId, platforms } = await req.json()
          const results = await monitoringService.scanKeyword(keywordId, tenantId, platforms)
          return new Response(
            JSON.stringify({ success: true, results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        break

      case 'GET':
        if (pathSegments[pathSegments.length - 1] === 'status') {
          // Get monitoring status
          const tenantId = url.searchParams.get('tenant_id')
          if (!tenantId) {
            throw new Error('tenant_id is required')
          }
          const status = await monitoringService.getMonitoringStatus(tenantId)
          return new Response(
            JSON.stringify({ success: true, status }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid endpoint' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in monitor-keywords function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})