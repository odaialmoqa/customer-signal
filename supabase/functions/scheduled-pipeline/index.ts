import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface ScheduledTask {
  id: string
  name: string
  type: 'sentiment_batch' | 'trend_analysis' | 'data_cleanup' | 'report_generation'
  schedule: string // cron expression
  enabled: boolean
  last_run?: string
  next_run?: string
  tenant_id?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { task_type, tenant_id } = await req.json()

    console.log(`Scheduled pipeline execution - Task: ${task_type}, Tenant: ${tenant_id}`)

    switch (task_type) {
      case 'sentiment_batch':
        await processSentimentBatch(supabase, tenant_id)
        break
      case 'trend_analysis':
        await processTrendAnalysis(supabase, tenant_id)
        break
      case 'data_cleanup':
        await processDataCleanup(supabase, tenant_id)
        break
      case 'report_generation':
        await processReportGeneration(supabase, tenant_id)
        break
      default:
        throw new Error(`Unknown task type: ${task_type}`)
    }

    return new Response(
      JSON.stringify({ 
        message: `Scheduled task ${task_type} completed successfully`,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Scheduled pipeline error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function processSentimentBatch(supabase: any, tenant_id?: string) {
  console.log('Processing sentiment analysis batch...')

  // Get conversations without sentiment analysis
  let query = supabase
    .from('conversations')
    .select('id')
    .is('sentiment_score', null)
    .limit(100)

  if (tenant_id) {
    query = query.eq('tenant_id', tenant_id)
  }

  const { data: conversations, error } = await query

  if (error) {
    throw new Error(`Failed to fetch conversations: ${error.message}`)
  }

  if (!conversations || conversations.length === 0) {
    console.log('No conversations found for sentiment analysis')
    return
  }

  // Create processing jobs for sentiment analysis
  const jobs = conversations.map(conv => ({
    type: 'sentiment_analysis',
    data: { conversation_ids: [conv.id] },
    priority: 'medium',
    tenant_id: tenant_id || null,
    status: 'pending',
    created_at: new Date().toISOString()
  }))

  const { error: jobError } = await supabase
    .from('processing_jobs')
    .insert(jobs)

  if (jobError) {
    throw new Error(`Failed to create sentiment jobs: ${jobError.message}`)
  }

  console.log(`Created ${jobs.length} sentiment analysis jobs`)

  // Trigger pipeline processing
  await supabase.functions.invoke('process-pipeline', {
    body: { batch_size: 20 }
  })
}

async function processTrendAnalysis(supabase: any, tenant_id?: string) {
  console.log('Processing trend analysis...')

  // Get active keywords for trend analysis
  let query = supabase
    .from('keywords')
    .select('id, keyword, tenant_id')
    .eq('is_active', true)

  if (tenant_id) {
    query = query.eq('tenant_id', tenant_id)
  }

  const { data: keywords, error } = await query

  if (error) {
    throw new Error(`Failed to fetch keywords: ${error.message}`)
  }

  if (!keywords || keywords.length === 0) {
    console.log('No active keywords found for trend analysis')
    return
  }

  // Group keywords by tenant
  const keywordsByTenant = keywords.reduce((acc, keyword) => {
    const tenantId = keyword.tenant_id || 'global'
    if (!acc[tenantId]) acc[tenantId] = []
    acc[tenantId].push(keyword.keyword)
    return acc
  }, {} as Record<string, string[]>)

  // Create trend analysis jobs
  const jobs = Object.entries(keywordsByTenant).map(([tenantId, keywordList]) => ({
    type: 'trend_analysis',
    data: {
      tenant_id: tenantId === 'global' ? null : tenantId,
      time_range: '24h',
      keywords: keywordList
    },
    priority: 'low',
    tenant_id: tenantId === 'global' ? null : tenantId,
    status: 'pending',
    created_at: new Date().toISOString()
  }))

  const { error: jobError } = await supabase
    .from('processing_jobs')
    .insert(jobs)

  if (jobError) {
    throw new Error(`Failed to create trend analysis jobs: ${jobError.message}`)
  }

  console.log(`Created ${jobs.length} trend analysis jobs`)
}

async function processDataCleanup(supabase: any, tenant_id?: string) {
  console.log('Processing data cleanup...')

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Clean up old processing jobs
  let jobQuery = supabase
    .from('processing_jobs')
    .delete()
    .eq('status', 'completed')
    .lt('created_at', thirtyDaysAgo.toISOString())

  if (tenant_id) {
    jobQuery = jobQuery.eq('tenant_id', tenant_id)
  }

  const { error: jobCleanupError } = await jobQuery

  if (jobCleanupError) {
    console.error('Failed to cleanup old jobs:', jobCleanupError.message)
  }

  // Clean up old conversation data based on retention policy
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id, settings')

  if (tenantsError) {
    console.error('Failed to fetch tenants for cleanup:', tenantsError.message)
    return
  }

  for (const tenant of tenants || []) {
    const retentionDays = tenant.settings?.data_retention_days || 365
    const retentionDate = new Date()
    retentionDate.setDate(retentionDate.getDate() - retentionDays)

    // Archive old conversations instead of deleting
    await supabase
      .from('conversations')
      .update({ archived: true })
      .eq('tenant_id', tenant.id)
      .lt('created_at', retentionDate.toISOString())
      .eq('archived', false)
  }

  console.log('Data cleanup completed')
}

async function processReportGeneration(supabase: any, tenant_id?: string) {
  console.log('Processing scheduled report generation...')

  // Get scheduled reports that are due
  let query = supabase
    .from('scheduled_reports')
    .select('*')
    .eq('enabled', true)
    .lte('next_run', new Date().toISOString())

  if (tenant_id) {
    query = query.eq('tenant_id', tenant_id)
  }

  const { data: reports, error } = await query

  if (error) {
    throw new Error(`Failed to fetch scheduled reports: ${error.message}`)
  }

  if (!reports || reports.length === 0) {
    console.log('No scheduled reports due')
    return
  }

  for (const report of reports) {
    try {
      // Generate report
      const { data: reportData, error: reportError } = await supabase.functions.invoke('generate-report', {
        body: {
          report_id: report.id,
          config: report.config,
          tenant_id: report.tenant_id
        }
      })

      if (reportError) {
        console.error(`Failed to generate report ${report.id}:`, reportError.message)
        continue
      }

      // Update next run time based on schedule
      const nextRun = calculateNextRun(report.schedule)
      
      await supabase
        .from('scheduled_reports')
        .update({
          last_run: new Date().toISOString(),
          next_run: nextRun,
          last_status: 'completed'
        })
        .eq('id', report.id)

      console.log(`Generated scheduled report ${report.id}`)

    } catch (error) {
      console.error(`Error processing report ${report.id}:`, error)
      
      await supabase
        .from('scheduled_reports')
        .update({
          last_run: new Date().toISOString(),
          last_status: 'failed',
          last_error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', report.id)
    }
  }
}

function calculateNextRun(schedule: string): string {
  // Simple cron-like schedule calculation
  // In production, use a proper cron library
  const now = new Date()
  
  switch (schedule) {
    case 'daily':
      now.setDate(now.getDate() + 1)
      break
    case 'weekly':
      now.setDate(now.getDate() + 7)
      break
    case 'monthly':
      now.setMonth(now.getMonth() + 1)
      break
    default:
      now.setHours(now.getHours() + 1) // Default to hourly
  }
  
  return now.toISOString()
}