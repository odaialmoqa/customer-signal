import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { MonitoringService } from '../_shared/monitoring-service.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const monitoringService = new MonitoringService(supabase)

    console.log('Starting scheduled monitoring run...')

    // Get all active monitoring jobs that are due to run
    const { data: jobs, error } = await supabase
      .from('monitoring_jobs')
      .select(`
        *,
        keywords (
          id,
          term,
          tenant_id,
          platforms,
          monitoring_frequency
        )
      `)
      .eq('is_active', true)
      .lte('next_run', new Date().toISOString())
      .limit(50) // Process up to 50 jobs per run

    if (error) {
      throw new Error(`Failed to fetch monitoring jobs: ${error.message}`)
    }

    if (!jobs || jobs.length === 0) {
      console.log('No monitoring jobs due for execution')
      return new Response(
        JSON.stringify({ success: true, message: 'No jobs to process', processed: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${jobs.length} monitoring jobs to process`)

    let processed = 0
    let errors = 0

    // Process each job
    for (const job of jobs) {
      try {
        console.log(`Processing job ${job.id} for keyword "${job.keywords.term}"`)

        // Scan the keyword
        const results = await monitoringService.scanKeyword(
          job.keyword_id,
          job.tenant_id,
          job.platforms
        )

        // Count total mentions found
        const totalMentions = results.reduce((sum, result) => sum + result.mentions.length, 0)
        
        // Calculate next run time based on frequency
        const nextRun = calculateNextRun(job.frequency)

        // Update the job's last run and next run times
        await supabase
          .from('monitoring_jobs')
          .update({
            last_run: new Date().toISOString(),
            next_run: nextRun,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)

        console.log(`Completed job ${job.id}: found ${totalMentions} mentions`)
        processed++

      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error)
        errors++

        // Update job with error status (optional: implement retry logic)
        await supabase
          .from('monitoring_jobs')
          .update({
            last_run: new Date().toISOString(),
            next_run: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Retry in 1 hour
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)
      }
    }

    console.log(`Scheduled monitoring completed: ${processed} processed, ${errors} errors`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Scheduled monitoring completed',
        processed,
        errors,
        total: jobs.length
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in scheduled monitoring:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

function calculateNextRun(frequency: string): string {
  const now = new Date()
  
  switch (frequency) {
    case 'realtime':
      return new Date(now.getTime() + 5 * 60 * 1000).toISOString() // 5 minutes
    case 'hourly':
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString() // 1 hour
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    default:
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString() // Default to 1 hour
  }
}